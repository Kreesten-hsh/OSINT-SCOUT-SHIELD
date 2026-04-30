from __future__ import annotations

from collections.abc import AsyncGenerator
from datetime import datetime, timezone
import uuid

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models import CitizenMessage, FormalReport, MessageAnalysis, SuspectNumber
from app.schemas.mobile import MobileHistoryData, MobileHistoryItem
from app.schemas.signal import IncidentReportRequest, VerifySignalRequest
from app.services.citizen_flow import create_citizen_report, verify_citizen_signal


class _ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalars(self):
        return self

    def all(self):
        if self._value is None:
            return []
        if isinstance(self._value, list):
            return self._value
        return [self._value]


class FakeSession:
    def __init__(self) -> None:
        self.added: list[object] = []
        self._id_seq = 1
        self.scalar_results: list[object | None] = []
        self.execute_results: list[object | None] = []

    def add(self, obj: object) -> None:
        self.added.append(obj)

    async def commit(self) -> None:
        return None

    async def flush(self) -> None:
        for obj in self.added:
            if getattr(obj, "id", None) is None:
                setattr(obj, "id", self._id_seq)
                self._id_seq += 1
            if hasattr(obj, "uuid") and getattr(obj, "uuid", None) is None:
                setattr(obj, "uuid", uuid.uuid4())

    async def refresh(self, _obj: object) -> None:
        return None

    async def scalar(self, _query):
        if self.scalar_results:
            return self.scalar_results.pop(0)
        return None

    async def execute(self, _query):
        if self.execute_results:
            return _ScalarResult(self.execute_results.pop(0))
        return _ScalarResult([])

    async def close(self) -> None:
        return None


def build_client(fake_session: FakeSession | None = None) -> TestClient:
    async def _override_get_db() -> AsyncGenerator[FakeSession, None]:
        yield fake_session or FakeSession()

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


def test_mobile_verify_persists_message_and_analysis() -> None:
    fake_session = FakeSession()

    result = __import__("asyncio").run(
        verify_citizen_signal(
            VerifySignalRequest(
                message="Agent MTN renvoyez le code OTP maintenant",
                phone="0169647090",
                channel="MOBILE_APP",
                department="Atlantique",
                device_install_id="device-verify-001",
            ),
            fake_session,
        )
    )

    assert result.verification_message_uuid is not None
    assert result.verification_analysis_uuid is not None
    assert any(isinstance(item, CitizenMessage) for item in fake_session.added)
    assert any(isinstance(item, MessageAnalysis) for item in fake_session.added)


def test_mobile_report_reuses_existing_verification(monkeypatch) -> None:
    fake_session = FakeSession()
    existing_message = CitizenMessage(
        id=11,
        uuid=uuid.uuid4(),
        content="Ancien message",
        channel="MOBILE_APP",
        device_install_id="device-report-001",
        history_entry_type="VERIFY",
        submitted_phone_masked="016****090",
        created_at=datetime.now(timezone.utc),
    )
    existing_analysis = MessageAnalysis(
        id=12,
        uuid=uuid.uuid4(),
        message_id=11,
        risk_score=84,
        risk_level="HIGH",
        primary_category="mobile_money",
        matched_rules=["otp"],
        categories_detected=["mobile_money"],
        explanation=["danger"],
        recommendations=["ne pas partager"],
        highlighted_spans=[],
        fon_alert="Fon alert",
        created_at=datetime.now(timezone.utc),
    )
    existing_message.analysis = existing_analysis
    existing_message.reports = []
    fake_session.execute_results = [existing_message]

    suspect_number = SuspectNumber(
        id=7,
        uuid=uuid.uuid4(),
        phone_hash="hash",
        phone_ciphertext="cipher",
        report_count=1,
    )

    async def _fake_upsert(**_kwargs):
        return suspect_number

    async def _fake_noop(*_args, **_kwargs):
        return None

    async def _fake_register(*_args, **_kwargs):
        return False

    monkeypatch.setattr("app.services.citizen_flow._upsert_suspect_number", _fake_upsert)
    monkeypatch.setattr("app.services.citizen_flow._create_impersonation_incidents_if_needed", _fake_noop)
    monkeypatch.setattr("app.services.citizen_flow._mirror_legacy_alert", _fake_noop)
    monkeypatch.setattr("app.services.citizen_flow._enqueue_forensic_capture", _fake_noop)
    monkeypatch.setattr("app.services.citizen_flow._register_campaign_detection", _fake_register)
    monkeypatch.setattr("app.services.citizen_flow.schedule_external_transmissions_for_report", _fake_noop)

    result = __import__("asyncio").run(
        create_citizen_report(
            IncidentReportRequest(
                message="Agent MTN renvoyez le code OTP maintenant",
                phone="0169647090",
                channel="MOBILE_APP",
                department="Atlantique",
                device_install_id="device-report-001",
                verification_message_uuid=existing_message.uuid,
                verification_analysis_uuid=existing_analysis.uuid,
            ),
            fake_session,
        )
    )

    assert result.report_uuid is not None
    assert result.public_reference is not None
    assert existing_message.history_entry_type == "REPORT"


def test_mobile_bootstrap_public_contract() -> None:
    client = build_client()

    response = client.get("/api/v1/mobile/bootstrap")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert "Atlantique" in payload["data"]["departments"]
    assert payload["data"]["minimum_supported_version"] == "1.0.0"


def test_mobile_history_public_contract(monkeypatch) -> None:
    client = build_client()

    async def _fake_fetch_mobile_history(*_args, **_kwargs):
        assert _kwargs["device_install_id"] == "device-history-001"
        return MobileHistoryData(
            items=[
                MobileHistoryItem(
                    type="REPORT",
                    created_at=datetime(2026, 4, 29, 15, 0, tzinfo=timezone.utc),
                    risk_score=88,
                    risk_level="HIGH",
                    primary_category="mobile_money",
                    masked_phone="016****090",
                    public_reference="BCS-20260429-ABCD1234",
                    status="NEW",
                )
            ]
        )

    monkeypatch.setattr("app.api.v1.endpoints.mobile.fetch_mobile_history", _fake_fetch_mobile_history)

    response = client.get("/api/v1/mobile/history?device_install_id=device-history-001")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["items"][0]["type"] == "REPORT"
    assert payload["data"]["items"][0]["masked_phone"] == "016****090"
