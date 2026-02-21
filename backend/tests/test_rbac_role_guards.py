from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from types import SimpleNamespace
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token
from app.database import get_db
from app.main import app
from app.schemas.deletion import AlertDeletionData
from app.schemas.shield import IncidentDecisionData, ShieldDispatchData


class FakeResult:
    def __init__(self, scalar_value: int = 0, items: list[object] | None = None) -> None:
        self._scalar_value = scalar_value
        self._items = items or []

    def scalar(self) -> int:
        return self._scalar_value

    def scalars(self) -> "FakeResult":
        return self

    def all(self) -> list[object]:
        return self._items

    def first(self) -> object | None:
        return self._items[0] if self._items else None


class FakeSession:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.deleted: list[object] = []
        self._source = SimpleNamespace(
            id=1,
            uuid=uuid.uuid4(),
            name="Source PME",
            url="https://example.com",
            source_type="WEB",
            frequency_minutes=60,
            is_active=True,
            last_run_at=None,
            last_status=None,
            next_run_at=None,
            created_at=datetime.now(timezone.utc),
        )

    def add(self, obj: object) -> None:
        self.added.append(obj)
        if hasattr(obj, "id") and getattr(obj, "id", None) is None:
            setattr(obj, "id", len(self.added))
        if hasattr(obj, "created_at") and getattr(obj, "created_at", None) is None:
            setattr(obj, "created_at", datetime.now(timezone.utc))

    async def commit(self) -> None:
        return None

    async def flush(self) -> None:
        return None

    async def refresh(self, obj: object) -> None:
        if hasattr(obj, "id") and getattr(obj, "id", None) is None:
            setattr(obj, "id", 1)
        if hasattr(obj, "created_at") and getattr(obj, "created_at", None) is None:
            setattr(obj, "created_at", datetime.now(timezone.utc))

    async def close(self) -> None:
        return None

    async def execute(self, _query: object) -> FakeResult:
        return FakeResult(scalar_value=0, items=[])

    async def get(self, model: type, identifier: int) -> object | None:
        if model.__name__ == "MonitoringSource" and identifier == 1:
            return self._source
        return None

    async def delete(self, obj: object) -> None:
        self.deleted.append(obj)


def build_client(fake_session: FakeSession) -> TestClient:
    settings.ENABLE_RESULT_CONSUMER = False

    async def _override_get_db() -> AsyncGenerator[FakeSession, None]:
        yield fake_session

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


def auth_headers(role: str) -> dict[str, str]:
    token = create_access_token(
        subject=f"{role.lower()}@local.test",
        uid=1,
        role=role,
    )
    return {"Authorization": f"Bearer {token}"}


def _patch_side_effects(monkeypatch: pytest.MonkeyPatch) -> None:
    incident_id = uuid.uuid4()
    dispatch_id = uuid.uuid4()
    deleted_alert_id = uuid.uuid4()

    async def _fake_apply_decision(*_args, **_kwargs):
        return IncidentDecisionData(
            incident_id=incident_id,
            alert_status="CONFIRMED",
            decision_status="VALIDATED",
            comment="validated",
        )

    async def _fake_dispatch(*_args, **_kwargs):
        return ShieldDispatchData(
            dispatch_id=dispatch_id,
            incident_id=incident_id,
            action_type="BLOCK_NUMBER",
            decision_status="EXECUTED",
            operator_status="EXECUTED",
            callback_required=False,
        )

    async def _fake_delete_alert(*_args, **_kwargs):
        return AlertDeletionData(
            alert_uuid=deleted_alert_id,
            deleted_reports_count=1,
            deleted_evidences_count=1,
            deleted_analysis_results_count=1,
            deleted_files_count=1,
            missing_files_count=0,
            deleted_shield_actions_count=0,
        )

    class FakeRedis:
        async def rpush(self, _queue: str, _payload: str) -> None:
            return None

        async def aclose(self) -> None:
            return None

    monkeypatch.setattr("app.api.v1.endpoints.incidents.apply_incident_decision", _fake_apply_decision)
    monkeypatch.setattr("app.api.v1.endpoints.shield.dispatch_shield_action", _fake_dispatch)
    monkeypatch.setattr("app.api.v1.endpoints.alerts.delete_alert_cascade", _fake_delete_alert)
    monkeypatch.setattr("app.api.v1.endpoints.incidents.delete_alert_cascade", _fake_delete_alert)
    monkeypatch.setattr("app.api.v1.endpoints.ingestion.redis.from_url", lambda *_args, **_kwargs: FakeRedis())


def _request(
    client: TestClient,
    method: str,
    path: str,
    headers: dict[str, str],
    payload: dict[str, object] | None = None,
):
    request_callable = getattr(client, method.lower())
    if payload is None:
        return request_callable(path, headers=headers)
    return request_callable(path, json=payload, headers=headers)


def _blocked_endpoint_cases() -> list[tuple[str, str, dict[str, object] | None, int]]:
    incident_id = str(uuid.uuid4())
    alert_id = str(uuid.uuid4())
    return [
        ("patch", f"/api/v1/incidents/{incident_id}/decision", {"decision": "CONFIRM", "comment": "ok"}, 200),
        (
            "post",
            "/api/v1/shield/actions/dispatch",
            {"incident_id": incident_id, "action_type": "BLOCK_NUMBER", "reason": "test"},
            200,
        ),
        ("delete", f"/api/v1/alerts/{alert_id}", None, 200),
        ("delete", f"/api/v1/incidents/citizen/{incident_id}", None, 200),
        ("delete", "/api/v1/sources/1", None, 200),
        ("get", "/api/v1/dashboard/stats/weekly", None, 200),
        ("get", "/api/v1/dashboard/stats/critical-threats", None, 200),
        ("get", "/api/v1/dashboard/stats/sources-active", None, 200),
        ("get", "/api/v1/dashboard/stats/reports-count", None, 200),
        ("get", "/api/v1/evidence/", None, 200),
        (
            "post",
            "/api/v1/ingestion/manual",
            {"url": "https://example.com/ingestion", "source_type": "WEB"},
            201,
        ),
    ]


@pytest.mark.parametrize("method,path,payload,_expected_success_status", _blocked_endpoint_cases())
def test_sme_forbidden_on_soc_critical_endpoints(
    method: str,
    path: str,
    payload: dict[str, object] | None,
    _expected_success_status: int,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)
    _patch_side_effects(monkeypatch)

    response = _request(
        client=client,
        method=method,
        path=path,
        payload=payload,
        headers=auth_headers("SME"),
    )

    assert response.status_code == 403
    payload_json = response.json()
    error_text = payload_json.get("detail") or payload_json.get("message")
    assert error_text == "Insufficient permissions"


@pytest.mark.parametrize("method,path,payload,expected_success_status", _blocked_endpoint_cases())
def test_analyst_allowed_on_soc_critical_endpoints(
    method: str,
    path: str,
    payload: dict[str, object] | None,
    expected_success_status: int,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)
    _patch_side_effects(monkeypatch)

    response = _request(
        client=client,
        method=method,
        path=path,
        payload=payload,
        headers=auth_headers("ANALYST"),
    )

    assert response.status_code == expected_success_status
