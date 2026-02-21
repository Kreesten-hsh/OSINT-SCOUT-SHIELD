from collections.abc import AsyncGenerator
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import AuthenticatedPrincipal, get_current_token_payload
from app.database import get_db
from app.main import app
from app.schemas.token import TokenPayload


class FakeSession:
    def __init__(self, user: object | None = None) -> None:
        self.user = user
        self.added: list[object] = []
        self.committed = False

    def add(self, obj: object) -> None:
        self.added.append(obj)

    async def scalar(self, _query):
        return self.user

    async def commit(self) -> None:
        self.committed = True

    async def close(self) -> None:
        return None


def build_client(fake_session: FakeSession | None = None) -> TestClient:
    settings.ENABLE_RESULT_CONSUMER = False

    async def _override_get_db() -> AsyncGenerator[FakeSession, None]:
        yield fake_session or FakeSession()

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


def test_change_password_requires_authentication() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "old-password",
            "new_password": "new-password-123",
            "confirm_password": "new-password-123",
        },
    )

    assert response.status_code == 401


def test_change_password_success(monkeypatch) -> None:
    fake_user = SimpleNamespace(id=5, email="analyst@osint.com", password_hash="old-hash")
    fake_session = FakeSession(user=fake_user)
    client = build_client(fake_session=fake_session)

    monkeypatch.setattr("app.api.v1.endpoints.auth.verify_password", lambda *_args, **_kwargs: True)
    monkeypatch.setattr("app.api.v1.endpoints.auth.get_password_hash", lambda *_args, **_kwargs: "new-hash")

    app.dependency_overrides[get_current_token_payload] = lambda: TokenPayload(
        sub="analyst@osint.com",
        uid=5,
        role="ANALYST",
    )
    try:
        response = client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "old-password",
                "new_password": "new-password-123",
                "confirm_password": "new-password-123",
            },
        )
    finally:
        app.dependency_overrides.pop(get_current_token_payload, None)

    assert response.status_code == 200
    assert fake_session.committed is True
    assert fake_user.password_hash == "new-hash"
