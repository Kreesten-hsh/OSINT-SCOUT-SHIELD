from collections.abc import AsyncGenerator

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import AuthenticatedPrincipal
from app.database import get_db
from app.main import app


class FakeSession:
    async def close(self) -> None:
        return None


def build_client() -> TestClient:
    settings.ENABLE_RESULT_CONSUMER = False

    async def _override_get_db() -> AsyncGenerator[FakeSession, None]:
        yield FakeSession()

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


def test_json_login_returns_user_role(monkeypatch) -> None:
    client = build_client()

    async def _fake_seed(_db) -> None:
        return None

    async def _fake_auth(_db, username: str, _password: str):
        return AuthenticatedPrincipal(id=7, email=username, role="ANALYST")

    monkeypatch.setattr("app.api.v1.endpoints.auth.ensure_default_auth_users", _fake_seed)
    monkeypatch.setattr("app.api.v1.endpoints.auth.authenticate_user", _fake_auth)

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "agent@anssi.bj", "password": "secret"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["token_type"] == "bearer"
    assert payload["user"]["id"] == 7
    assert payload["user"]["email"] == "agent@anssi.bj"
    assert payload["user"]["role"] == "ANALYST"


def test_json_login_invalid_credentials_returns_400(monkeypatch) -> None:
    client = build_client()

    async def _fake_seed(_db) -> None:
        return None

    async def _fake_auth(_db, _username: str, _password: str):
        return None

    monkeypatch.setattr("app.api.v1.endpoints.auth.ensure_default_auth_users", _fake_seed)
    monkeypatch.setattr("app.api.v1.endpoints.auth.authenticate_user", _fake_auth)

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "agent@anssi.bj", "password": "wrong"},
    )

    assert response.status_code == 400
