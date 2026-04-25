from collections.abc import AsyncGenerator

from fastapi.testclient import TestClient
from sqlalchemy.exc import ProgrammingError

from app.core.config import settings
from app.core.security import create_access_token
from app.database import get_db
from app.main import app


class EmptyResult:
    def scalars(self):
        return self

    def all(self):
        return []


class LegacySchemaMismatchSession:
    def __init__(self) -> None:
        self.execute_calls = 0

    async def execute(self, _query):
        self.execute_calls += 1
        if self.execute_calls == 1:
            return EmptyResult()
        raise ProgrammingError(
            "SELECT reports.snapshot_version FROM reports",
            {},
            Exception("column reports.snapshot_version does not exist"),
        )

    async def close(self) -> None:
        return None


def build_client(fake_session: LegacySchemaMismatchSession | None = None) -> TestClient:
    settings.ENABLE_RESULT_CONSUMER = False

    async def _override_get_db() -> AsyncGenerator[LegacySchemaMismatchSession, None]:
        yield fake_session or LegacySchemaMismatchSession()

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


def auth_headers(role: str = "ADMIN", uid: int = 1) -> dict[str, str]:
    token = create_access_token(
        subject=f"{role.lower()}@local.test",
        uid=uid,
        role=role,
    )
    return {"Authorization": f"Bearer {token}"}


def test_reports_list_returns_empty_when_legacy_report_schema_is_outdated() -> None:
    client = build_client()

    response = client.get("/api/v1/reports/", headers=auth_headers("ADMIN"))

    assert response.status_code == 200
    assert response.json() == []
