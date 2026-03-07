import io
import json
import zipfile
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
import hashlib
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token
from app.database import get_db
from app.main import app
from app.services.case_bundle import generate_case_bundle


class FakeResult:
    def __init__(self, report: object | None = None) -> None:
        self.report = report

    def scalars(self) -> "FakeResult":
        return self

    def first(self) -> object | None:
        return self.report


class FakeSession:
    def __init__(self, report: object | None = None) -> None:
        self.report = report

    async def execute(self, _query):
        return FakeResult(self.report)

    async def close(self) -> None:
        return None


def build_client(fake_session: FakeSession) -> TestClient:
    settings.ENABLE_RESULT_CONSUMER = False

    async def _override_get_db() -> AsyncGenerator[FakeSession, None]:
        yield fake_session

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


def auth_headers(role: str = "ANALYST", uid: int = 1) -> dict[str, str]:
    token = create_access_token(
        subject=f"{role.lower()}@local.test",
        uid=uid,
        role=role,
    )
    return {"Authorization": f"Bearer {token}"}


def build_fake_report(pdf_path: Path) -> SimpleNamespace:
    alert = SimpleNamespace(
        id=42,
        uuid=uuid.uuid4(),
        phone_number="+22990000001",
        reported_message="Urgent, envoyez votre code OTP maintenant",
        url="https://exemple.test/phishing",
        source_type="SMS",
        citizen_channel="WEB_PORTAL",
        region="Atlantique",
        risk_score=88,
        status="CONFIRMED",
        analysis_note="Signal hautement suspect",
        created_at=datetime(2026, 3, 7, 10, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 3, 7, 10, 5, tzinfo=timezone.utc),
    )
    return SimpleNamespace(
        id=99,
        uuid=uuid.uuid4(),
        alert_id=42,
        alert=alert,
        report_hash="abc123def456",
        snapshot_hash_sha256="abc123def456",
        snapshot_version="1.0",
        generated_by="system",
        pdf_path=str(pdf_path),
        generated_at=datetime(2026, 3, 7, 10, 6, tzinfo=timezone.utc),
        snapshot_json={
            "snapshot_version": "1.0",
            "generated_at": "2026-03-07T10:06:00",
            "data": {
                "alert": {
                    "uuid": str(alert.uuid),
                    "phone_number": alert.phone_number,
                    "reported_message": alert.reported_message,
                    "citizen_channel": alert.citizen_channel,
                    "created_at": alert.created_at.isoformat(),
                    "risk_score": alert.risk_score,
                    "status_at_snapshot": alert.status,
                },
                "analysis": {
                    "matched_rules": ["otp_request", "urgency"],
                    "risk_score": alert.risk_score,
                    "generated_at": "2026-03-07T10:06:00",
                },
                "evidences": [],
            },
        },
    )


async def _build_bundle_bytes() -> bytes:
    return await generate_case_bundle(
        {"id": "12345678-alert", "phone_number": "+22990000001"},
        {"id": "report-1", "created_at": "2026-03-07T10:00:00Z"},
        b"fake_pdf",
    )


@pytest.mark.asyncio
async def test_bundle_returns_bytes() -> None:
    bundle = await _build_bundle_bytes()
    assert isinstance(bundle, bytes)
    assert bundle


@pytest.mark.asyncio
async def test_bundle_contains_three_files() -> None:
    bundle = await _build_bundle_bytes()
    with zipfile.ZipFile(io.BytesIO(bundle), "r") as archive:
        assert len(archive.namelist()) == 3


@pytest.mark.asyncio
async def test_bundle_filenames() -> None:
    bundle = await _build_bundle_bytes()
    with zipfile.ZipFile(io.BytesIO(bundle), "r") as archive:
        names = archive.namelist()
    assert any(name.startswith("rapport_forensique_") and name.endswith(".pdf") for name in names)
    assert any(name.startswith("snapshot_") and name.endswith(".json") for name in names)
    assert "manifest_integrite.txt" in names


@pytest.mark.asyncio
async def test_manifest_contains_pdf_hash() -> None:
    pdf_bytes = b"fake_pdf"
    bundle = await generate_case_bundle(
        {"id": "12345678-alert"},
        {"id": "report-1"},
        pdf_bytes,
    )
    expected_hash = hashlib.sha256(pdf_bytes).hexdigest()
    with zipfile.ZipFile(io.BytesIO(bundle), "r") as archive:
        manifest = archive.read("manifest_integrite.txt").decode("utf-8")
    assert expected_hash in manifest


@pytest.mark.asyncio
async def test_snapshot_is_valid_json() -> None:
    bundle = await _build_bundle_bytes()
    with zipfile.ZipFile(io.BytesIO(bundle), "r") as archive:
        snapshot_name = next(name for name in archive.namelist() if name.startswith("snapshot_"))
        snapshot = json.loads(archive.read(snapshot_name).decode("utf-8"))
    assert isinstance(snapshot, dict)


@pytest.mark.asyncio
async def test_snapshot_has_required_fields() -> None:
    bundle = await _build_bundle_bytes()
    with zipfile.ZipFile(io.BytesIO(bundle), "r") as archive:
        snapshot_name = next(name for name in archive.namelist() if name.startswith("snapshot_"))
        snapshot = json.loads(archive.read(snapshot_name).decode("utf-8"))
    assert "generated_at" in snapshot
    assert "source" in snapshot
    assert "incident" in snapshot
    assert "report" in snapshot


def test_endpoint_returns_zip(monkeypatch, tmp_path: Path) -> None:
    fake_report = build_fake_report(tmp_path / "report_case_bundle.pdf")
    fake_session = FakeSession(fake_report)
    client = build_client(fake_session)

    def _fake_generate_forensic_pdf(_snapshot_data, output_path: str, _report_hash: str, report_uuid: str | None = None):
        Path(output_path).write_bytes(f"pdf-for-{report_uuid}".encode("utf-8"))
        return output_path

    monkeypatch.setattr("app.api.v1.endpoints.reports.generate_forensic_pdf", _fake_generate_forensic_pdf)

    response = client.get(
        f"/api/v1/reports/{fake_report.uuid}/download/case-bundle",
        headers=auth_headers("ANALYST"),
    )

    assert response.status_code == 200
    assert "application/zip" in response.headers["content-type"]


def test_endpoint_requires_auth(tmp_path: Path) -> None:
    fake_report = build_fake_report(tmp_path / "report_case_bundle.pdf")
    fake_session = FakeSession(fake_report)
    client = build_client(fake_session)

    response = client.get(f"/api/v1/reports/{fake_report.uuid}/download/case-bundle")

    assert response.status_code in (401, 403)


def test_endpoint_404_unknown(tmp_path: Path) -> None:
    fake_session = FakeSession(None)
    client = build_client(fake_session)

    response = client.get(
        f"/api/v1/reports/{uuid.uuid4()}/download/case-bundle",
        headers=auth_headers("ANALYST"),
    )

    assert response.status_code == 404
