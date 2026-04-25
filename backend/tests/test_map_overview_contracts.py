from collections.abc import AsyncGenerator
import uuid

from fastapi.testclient import TestClient

from app.core.config import settings
from app.database import get_db
from app.main import app


class FakeSession:
    async def close(self) -> None:
        return None


def build_client(fake_session: FakeSession | None = None) -> TestClient:
    settings.ENABLE_RESULT_CONSUMER = False

    async def _override_get_db() -> AsyncGenerator[FakeSession, None]:
        yield fake_session or FakeSession()

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


def test_map_overview_public_contract(monkeypatch) -> None:
    client = build_client()
    transmission_uuid = uuid.uuid4()
    received_params: dict[str, str | None] = {}

    async def _fake_get_map_overview(*_args, **_kwargs):
        received_params["window"] = _kwargs.get("window")
        received_params["risk"] = _kwargs.get("risk")
        received_params["category"] = _kwargs.get("category")
        return {
            "window": "30d",
            "risk": "high",
            "category": "mobile_money",
            "total_reports": 12,
            "high_risk_reports": 8,
            "active_departments": 4,
            "dominant_category": "mobile_money",
            "departments": [
                {
                    "department": "Littoral",
                    "latitude": 6.3703,
                    "longitude": 2.3912,
                    "count": 5,
                    "high_risk_count": 4,
                    "dominant_category": "mobile_money",
                    "latest_report_at": "2026-04-25T10:00:00Z",
                }
            ],
            "top_departments": [
                {
                    "department": "Littoral",
                    "latitude": 6.3703,
                    "longitude": 2.3912,
                    "count": 5,
                    "high_risk_count": 4,
                    "dominant_category": "mobile_money",
                    "latest_report_at": "2026-04-25T10:00:00Z",
                }
            ],
            "recent_transmissions": [
                {
                    "transmission_uuid": transmission_uuid,
                    "public_reference": "BCS-2026-0004",
                    "department": "Littoral",
                    "target_type": "ANSSI_OCRC",
                    "status": "DELIVERED",
                    "created_at": "2026-04-25T11:00:00Z",
                }
            ],
        }

    monkeypatch.setattr("app.api.v1.endpoints.map_overview.get_map_overview", _fake_get_map_overview)

    response = client.get("/api/v1/map/overview?window=30d&risk=high&category=mobile_money")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["window"] == "30d"
    assert payload["data"]["risk"] == "high"
    assert payload["data"]["total_reports"] == 12
    assert payload["data"]["departments"][0]["department"] == "Littoral"
    assert payload["data"]["recent_transmissions"][0]["status"] == "DELIVERED"
    assert received_params == {"window": "30d", "risk": "high", "category": "mobile_money"}
