from collections.abc import AsyncGenerator
from typing import Any
import uuid

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.core.config import settings
from app.core.security import get_current_subject
from app.schemas.shield import (
    IncidentDecisionData,
    OperatorActionStatusData,
    ShieldActionTimelineItem,
    ShieldDispatchData,
    ShieldIncidentTimelineData,
)
from app.schemas.citizen_incident import CitizenIncidentDetailData, CitizenIncidentListData
from app.schemas.deletion import AlertDeletionData


class FakeSession:
    def __init__(self) -> None:
        self.added: list[Any] = []

    def add(self, obj: Any) -> None:
        self.added.append(obj)

    async def commit(self) -> None:
        return None

    async def refresh(self, _obj: Any) -> None:
        return None

    async def close(self) -> None:
        return None


def build_client(fake_session: FakeSession, authenticated: bool = False) -> TestClient:
    settings.ENABLE_RESULT_CONSUMER = False

    async def _override_get_db() -> AsyncGenerator[FakeSession, None]:
        yield fake_session

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _override_get_db
    if authenticated:
        app.dependency_overrides[get_current_subject] = lambda: "analyst@local.test"
    return TestClient(app)


def test_verify_valid_returns_score_and_no_alert_created() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    response = client.post(
        "/api/v1/signals/verify",
        json={
            "message": "Urgent confirme ton code OTP pour activer ton compte",
            "channel": "WEB_PORTAL",
            "url": "https://example.com",
            "phone": "+22990000001",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["risk_score"] >= 0
    assert payload["data"]["risk_level"] in ("LOW", "MEDIUM", "HIGH")
    assert "should_report" in payload["data"]
    assert fake_session.added == []


def test_report_valid_without_url_creates_alert_and_not_queued(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    def _should_not_be_called(*_args, **_kwargs):
        raise AssertionError("Redis should not be called when URL is missing")

    monkeypatch.setattr("app.services.incidents.redis.from_url", _should_not_be_called)

    response = client.post(
        "/api/v1/incidents/report",
        json={
            "message": "Message suspect sans lien",
            "channel": "MOBILE_APP",
            "phone": "+22990000000",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["status"] == "NEW"
    assert payload["data"]["queued_for_osint"] is False
    assert len(fake_session.added) == 1


def test_report_valid_with_http_url_creates_alert_and_queued(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    class FakeRedis:
        def __init__(self) -> None:
            self.rpush_calls: list[tuple[str, str]] = []

        async def rpush(self, queue: str, payload: str) -> None:
            self.rpush_calls.append((queue, payload))

        async def aclose(self) -> None:
            return None

    fake_redis = FakeRedis()

    monkeypatch.setattr("app.services.incidents.redis.from_url", lambda *_args, **_kwargs: fake_redis)

    response = client.post(
        "/api/v1/incidents/report",
        json={
            "message": "Urgent clique ce lien et confirme ton code",
            "channel": "WEB_PORTAL",
            "url": "https://example.com/phishing",
            "phone": "+22990000002",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["queued_for_osint"] is True
    assert len(fake_session.added) == 1
    assert len(fake_redis.rpush_calls) == 1
    assert fake_redis.rpush_calls[0][0] == "osint_to_scan"


def test_report_invalid_payload_returns_422() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    response = client.post(
        "/api/v1/incidents/report",
        json={"message": "abc", "channel": "WEB_PORTAL", "phone": "+22990000000"},
    )

    assert response.status_code == 422


def test_public_endpoints_accessible_without_jwt() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    verify_response = client.post(
        "/api/v1/signals/verify",
        json={"message": "simple message de test", "channel": "WEB_PORTAL", "phone": "+22990000003"},
    )
    report_response = client.post(
        "/api/v1/incidents/report",
        json={"message": "simple message de test", "channel": "WEB_PORTAL", "phone": "+22990000004"},
    )

    assert verify_response.status_code == 200
    assert report_response.status_code == 200


def test_incident_decision_requires_jwt() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=False)

    response = client.patch(
        f"/api/v1/incidents/{uuid.uuid4()}/decision",
        json={"decision": "CONFIRM", "comment": "validated"},
    )

    assert response.status_code == 401


def test_incident_decision_authenticated_returns_contract(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=True)
    incident_id = uuid.uuid4()

    async def _fake_apply_incident_decision(*_args, **_kwargs):
        return IncidentDecisionData(
            incident_id=incident_id,
            alert_status="CONFIRMED",
            decision_status="VALIDATED",
            comment="ok",
        )

    monkeypatch.setattr(
        "app.api.v1.endpoints.incidents.apply_incident_decision",
        _fake_apply_incident_decision,
    )

    response = client.patch(
        f"/api/v1/incidents/{incident_id}/decision",
        json={"decision": "CONFIRM", "comment": "ok"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["incident_id"] == str(incident_id)
    assert payload["data"]["decision_status"] == "VALIDATED"


def test_shield_dispatch_requires_jwt() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=False)

    response = client.post(
        "/api/v1/shield/actions/dispatch",
        json={
            "incident_id": str(uuid.uuid4()),
            "action_type": "BLOCK_NUMBER",
        },
    )

    assert response.status_code == 401


def test_shield_dispatch_authenticated_returns_contract(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=True)
    incident_id = uuid.uuid4()
    dispatch_id = uuid.uuid4()

    async def _fake_dispatch(*_args, **_kwargs):
        return ShieldDispatchData(
            dispatch_id=dispatch_id,
            incident_id=incident_id,
            action_type="BLOCK_NUMBER",
            decision_status="EXECUTED",
            operator_status="EXECUTED",
            callback_required=False,
        )

    monkeypatch.setattr(
        "app.api.v1.endpoints.shield.dispatch_shield_action",
        _fake_dispatch,
    )

    response = client.post(
        "/api/v1/shield/actions/dispatch",
        json={
            "incident_id": str(incident_id),
            "action_type": "BLOCK_NUMBER",
            "reason": "test",
            "auto_callback": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["dispatch_id"] == str(dispatch_id)
    assert payload["data"]["decision_status"] == "EXECUTED"


def test_operator_callback_requires_valid_secret() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=False)

    response = client.post(
        "/api/v1/operators/callbacks/action-status",
        headers={"X-Operator-Secret": "wrong-secret"},
        json={
            "dispatch_id": str(uuid.uuid4()),
            "incident_id": str(uuid.uuid4()),
            "operator_status": "EXECUTED",
        },
    )

    assert response.status_code == 401


def test_operator_callback_valid_secret_returns_contract(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=False)
    dispatch_id = uuid.uuid4()
    incident_id = uuid.uuid4()

    async def _fake_callback(*_args, **_kwargs):
        return OperatorActionStatusData(
            dispatch_id=dispatch_id,
            incident_id=incident_id,
            action_type="BLOCK_NUMBER",
            decision_status="EXECUTED",
            alert_status="BLOCKED_SIMULATED",
            operator_status="EXECUTED",
            updated_at="2026-02-17T00:00:00Z",
        )

    monkeypatch.setattr(
        "app.api.v1.endpoints.operators.operator_callback_action_status",
        _fake_callback,
    )

    response = client.post(
        "/api/v1/operators/callbacks/action-status",
        headers={"X-Operator-Secret": settings.SHIELD_OPERATOR_SHARED_SECRET},
        json={
            "dispatch_id": str(dispatch_id),
            "incident_id": str(incident_id),
            "operator_status": "EXECUTED",
            "execution_note": "done",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["alert_status"] == "BLOCKED_SIMULATED"


def test_shield_timeline_requires_jwt() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=False)

    response = client.get(f"/api/v1/shield/incidents/{uuid.uuid4()}/actions")

    assert response.status_code == 401


def test_shield_timeline_authenticated_returns_contract(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=True)
    incident_id = uuid.uuid4()
    dispatch_id = uuid.uuid4()

    async def _fake_timeline(*_args, **_kwargs):
        return ShieldIncidentTimelineData(
            incident_id=incident_id,
            total_actions=1,
            actions=[
                ShieldActionTimelineItem(
                    dispatch_id=dispatch_id,
                    incident_id=incident_id,
                    action_type="BLOCK_NUMBER",
                    decision_status="EXECUTED",
                    operator_status="EXECUTED",
                    created_at="2026-02-17T00:00:00Z",
                    updated_at="2026-02-17T00:01:00Z",
                )
            ],
        )

    monkeypatch.setattr(
        "app.api.v1.endpoints.shield.get_incident_shield_timeline",
        _fake_timeline,
    )

    response = client.get(f"/api/v1/shield/incidents/{incident_id}/actions")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["incident_id"] == str(incident_id)
    assert payload["data"]["total_actions"] == 1
    assert payload["data"]["actions"][0]["dispatch_id"] == str(dispatch_id)


def test_report_with_media_accepts_form_without_jwt(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=False)
    incident_id = uuid.uuid4()

    async def _fake_report(*_args, **_kwargs):
        return {
            "alert_uuid": incident_id,
            "status": "NEW",
            "risk_score_initial": 85,
            "queued_for_osint": False,
        }

    monkeypatch.setattr("app.api.v1.endpoints.incidents.report_signal_to_incident", _fake_report)

    response = client.post(
        "/api/v1/incidents/report-with-media",
        data={
            "message": "Signalement citoyen test",
            "phone": "+22990000005",
            "channel": "WEB_PORTAL",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True


def test_citizen_incidents_list_requires_jwt() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=False)

    response = client.get("/api/v1/incidents/citizen")

    assert response.status_code == 401


def test_citizen_incidents_list_authenticated_contract(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=True)

    async def _fake_list(*_args, **_kwargs):
        return CitizenIncidentListData(
            items=[],
            total=0,
            skip=0,
            limit=50,
        )

    monkeypatch.setattr("app.api.v1.endpoints.incidents.list_citizen_incidents", _fake_list)

    response = client.get("/api/v1/incidents/citizen")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["total"] == 0


def test_citizen_incident_detail_authenticated_contract(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=True)
    incident_id = uuid.uuid4()

    async def _fake_detail(*_args, **_kwargs):
        return CitizenIncidentDetailData(
            alert_uuid=incident_id,
            phone_number="+22990000005",
            channel="WEB_PORTAL",
            message="Detail message",
            url="citizen://text-signal",
            risk_score=70,
            status="NEW",
            analysis_note=None,
            created_at="2026-02-17T00:00:00Z",
            attachments=[],
            stats={
                "reports_for_phone": 1,
                "open_reports_for_phone": 1,
                "confirmed_reports_for_phone": 0,
                "blocked_reports_for_phone": 0,
            },
            related_incidents=[],
        )

    monkeypatch.setattr("app.api.v1.endpoints.incidents.get_citizen_incident_detail", _fake_detail)

    response = client.get(f"/api/v1/incidents/citizen/{incident_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["alert_uuid"] == str(incident_id)


def test_alert_delete_requires_jwt() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=False)

    response = client.delete(f"/api/v1/alerts/{uuid.uuid4()}")

    assert response.status_code == 401


def test_alert_delete_authenticated_returns_contract(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=True)
    alert_id = uuid.uuid4()

    async def _fake_delete(*_args, **_kwargs):
        return AlertDeletionData(
            alert_uuid=alert_id,
            deleted_reports_count=1,
            deleted_evidences_count=2,
            deleted_analysis_results_count=1,
            deleted_files_count=3,
            missing_files_count=0,
            deleted_shield_actions_count=1,
        )

    monkeypatch.setattr("app.api.v1.endpoints.alerts.delete_alert_cascade", _fake_delete)

    response = client.delete(f"/api/v1/alerts/{alert_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["alert_uuid"] == str(alert_id)
    assert payload["data"]["deleted_reports_count"] == 1


def test_citizen_incident_delete_requires_jwt() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=False)

    response = client.delete(f"/api/v1/incidents/citizen/{uuid.uuid4()}")

    assert response.status_code == 401


def test_citizen_incident_delete_authenticated_returns_contract(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session, authenticated=True)
    incident_id = uuid.uuid4()

    async def _fake_delete(*_args, **_kwargs):
        return AlertDeletionData(
            alert_uuid=incident_id,
            deleted_reports_count=2,
            deleted_evidences_count=4,
            deleted_analysis_results_count=1,
            deleted_files_count=5,
            missing_files_count=0,
            deleted_shield_actions_count=2,
        )

    monkeypatch.setattr("app.api.v1.endpoints.incidents.delete_alert_cascade", _fake_delete)

    response = client.delete(f"/api/v1/incidents/citizen/{incident_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["alert_uuid"] == str(incident_id)
    assert payload["data"]["deleted_evidences_count"] == 4
