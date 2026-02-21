from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any
import uuid

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token
from app.database import get_db
from app.main import app
from app.schemas.citizen_incident import CitizenIncidentListData


class FakeResult:
    def __init__(self, items: list[Any] | None = None) -> None:
        self._items = items or []

    def scalars(self) -> "FakeResult":
        return self

    def all(self) -> list[Any]:
        return self._items

    def first(self) -> Any | None:
        return self._items[0] if self._items else None


class FakeSession:
    def __init__(self) -> None:
        self.added: list[Any] = []
        self.last_query: str | None = None

    def add(self, obj: Any) -> None:
        self.added.append(obj)

    async def commit(self) -> None:
        return None

    async def flush(self) -> None:
        return None

    async def refresh(self, obj: Any) -> None:
        if getattr(obj, "id", None) is None:
            obj.id = 1
        if getattr(obj, "uuid", None) is None:
            obj.uuid = uuid.uuid4()
        if getattr(obj, "created_at", None) is None:
            obj.created_at = datetime.now(timezone.utc)
        if hasattr(obj, "last_status") and getattr(obj, "last_status", None) is None:
            obj.last_status = "NEVER_RUN"
        if hasattr(obj, "last_run_at") and getattr(obj, "last_run_at", None) is None:
            obj.last_run_at = None
        if hasattr(obj, "next_run_at") and getattr(obj, "next_run_at", None) is None:
            obj.next_run_at = None

    async def execute(self, query: Any) -> FakeResult:
        self.last_query = str(query)
        return FakeResult(items=[])

    async def close(self) -> None:
        return None


def build_client(fake_session: FakeSession) -> TestClient:
    settings.ENABLE_RESULT_CONSUMER = False

    async def _override_get_db() -> AsyncGenerator[FakeSession, None]:
        yield fake_session

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


def auth_headers(role: str, uid: int) -> dict[str, str]:
    token = create_access_token(
        subject=f"{role.lower()}@local.test",
        uid=uid,
        role=role,
    )
    return {"Authorization": f"Bearer {token}"}


def test_report_public_without_token_keeps_owner_none(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)
    captured: dict[str, Any] = {"owner_user_id": "missing"}

    async def _fake_report(*_args, **kwargs):
        captured["owner_user_id"] = kwargs.get("owner_user_id")
        return {
            "alert_uuid": uuid.uuid4(),
            "status": "NEW",
            "risk_score_initial": 10,
            "queued_for_osint": False,
        }

    monkeypatch.setattr("app.api.v1.endpoints.incidents.report_signal_to_incident", _fake_report)

    response = client.post(
        "/api/v1/incidents/report",
        json={
            "message": "Signalement citoyen public",
            "channel": "WEB_PORTAL",
            "phone": "+22990000010",
        },
    )

    assert response.status_code == 200
    assert captured["owner_user_id"] is None


def test_report_public_with_sme_token_attaches_owner(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)
    captured: dict[str, Any] = {"owner_user_id": None}

    async def _fake_report(*_args, **kwargs):
        captured["owner_user_id"] = kwargs.get("owner_user_id")
        return {
            "alert_uuid": uuid.uuid4(),
            "status": "NEW",
            "risk_score_initial": 20,
            "queued_for_osint": False,
        }

    monkeypatch.setattr("app.api.v1.endpoints.incidents.report_signal_to_incident", _fake_report)

    response = client.post(
        "/api/v1/incidents/report",
        json={
            "message": "Signalement citoyen SME",
            "channel": "MOBILE_APP",
            "phone": "+22990000011",
        },
        headers=auth_headers("SME", uid=42),
    )

    assert response.status_code == 200
    assert captured["owner_user_id"] == 42


def test_create_source_assigns_owner_for_sme() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    response = client.post(
        "/api/v1/sources/",
        json={
            "name": "Entreprise Alpha",
            "url": "https://example.com/alpha",
            "source_type": "WEB",
            "frequency_minutes": 60,
            "is_active": True,
        },
        headers=auth_headers("SME", uid=77),
    )

    assert response.status_code == 201
    assert fake_session.added
    assert getattr(fake_session.added[0], "owner_user_id", None) == 77


def test_create_source_keeps_owner_null_for_analyst() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    response = client.post(
        "/api/v1/sources/",
        json={
            "name": "Veille globale",
            "url": "https://example.com/global",
            "source_type": "WEB",
            "frequency_minutes": 120,
            "is_active": True,
        },
        headers=auth_headers("ANALYST", uid=5),
    )

    assert response.status_code == 201
    assert fake_session.added
    assert getattr(fake_session.added[0], "owner_user_id", None) is None


def test_sources_scope_forced_for_sme() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    response = client.get("/api/v1/sources/", headers=auth_headers("SME", uid=12))

    assert response.status_code == 200
    assert fake_session.last_query is not None
    assert "WHERE monitoring_sources.owner_user_id" in fake_session.last_query


def test_sources_scope_optional_for_analyst() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    response = client.get("/api/v1/sources/", headers=auth_headers("ANALYST", uid=2))

    assert response.status_code == 200
    assert fake_session.last_query is not None
    assert "WHERE monitoring_sources.owner_user_id" not in fake_session.last_query


def test_sources_scope_me_for_analyst() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    response = client.get("/api/v1/sources/?scope=me", headers=auth_headers("ANALYST", uid=2))

    assert response.status_code == 200
    assert fake_session.last_query is not None
    assert "WHERE monitoring_sources.owner_user_id" in fake_session.last_query


def test_alerts_scope_forced_for_sme() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    response = client.get("/api/v1/alerts/", headers=auth_headers("SME", uid=9))

    assert response.status_code == 200
    assert fake_session.last_query is not None
    assert "WHERE alerts.owner_user_id" in fake_session.last_query


def test_alerts_scope_optional_for_analyst() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    response = client.get("/api/v1/alerts/", headers=auth_headers("ANALYST", uid=9))

    assert response.status_code == 200
    assert fake_session.last_query is not None
    assert "WHERE alerts.owner_user_id" not in fake_session.last_query


def test_alerts_scope_me_for_analyst() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    response = client.get("/api/v1/alerts/?scope=me", headers=auth_headers("ANALYST", uid=9))

    assert response.status_code == 200
    assert fake_session.last_query is not None
    assert "WHERE alerts.owner_user_id" in fake_session.last_query


def test_reports_scope_forced_for_sme() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    response = client.get("/api/v1/reports/?limit=10", headers=auth_headers("SME", uid=4))

    assert response.status_code == 200
    assert fake_session.last_query is not None
    assert "alerts.owner_user_id" in fake_session.last_query


def test_reports_scope_optional_for_analyst() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    response = client.get("/api/v1/reports/?limit=10", headers=auth_headers("ANALYST", uid=4))

    assert response.status_code == 200
    assert fake_session.last_query is not None
    assert "alerts.owner_user_id" not in fake_session.last_query


def test_reports_scope_me_for_analyst() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)

    response = client.get("/api/v1/reports/?scope=me&limit=10", headers=auth_headers("ANALYST", uid=4))

    assert response.status_code == 200
    assert fake_session.last_query is not None
    assert "alerts.owner_user_id" in fake_session.last_query


def test_incidents_scope_forced_for_sme(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)
    captured: dict[str, Any] = {}

    async def _fake_list(*_args, **kwargs):
        captured["owner_user_id"] = kwargs.get("owner_user_id")
        return CitizenIncidentListData(items=[], total=0, skip=0, limit=50)

    monkeypatch.setattr("app.api.v1.endpoints.incidents.list_citizen_incidents", _fake_list)

    response = client.get("/api/v1/incidents/citizen", headers=auth_headers("SME", uid=88))

    assert response.status_code == 200
    assert captured["owner_user_id"] == 88


def test_incidents_scope_optional_for_analyst(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)
    captured: dict[str, Any] = {}

    async def _fake_list(*_args, **kwargs):
        captured["owner_user_id"] = kwargs.get("owner_user_id")
        return CitizenIncidentListData(items=[], total=0, skip=0, limit=50)

    monkeypatch.setattr("app.api.v1.endpoints.incidents.list_citizen_incidents", _fake_list)

    response = client.get("/api/v1/incidents/citizen", headers=auth_headers("ANALYST", uid=3))

    assert response.status_code == 200
    assert captured["owner_user_id"] is None


def test_incidents_scope_me_for_analyst(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)
    captured: dict[str, Any] = {}

    async def _fake_list(*_args, **kwargs):
        captured["owner_user_id"] = kwargs.get("owner_user_id")
        return CitizenIncidentListData(items=[], total=0, skip=0, limit=50)

    monkeypatch.setattr("app.api.v1.endpoints.incidents.list_citizen_incidents", _fake_list)

    response = client.get("/api/v1/incidents/citizen?scope=me", headers=auth_headers("ANALYST", uid=3))

    assert response.status_code == 200
    assert captured["owner_user_id"] == 3
