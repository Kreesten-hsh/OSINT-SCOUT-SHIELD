from collections.abc import AsyncGenerator
import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
import uuid

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token
from app.database import get_db
from app.main import app
from app.models import CampaignAlert
from app.services.campaign_detector import create_or_update_campaign, register_signal


class FakeRedis:
    def __init__(self) -> None:
        self._zsets: dict[str, dict[str, float]] = {}
        self._expires: dict[str, int] = {}

    async def zremrangebyscore(self, key: str, min_score: float, max_score: float) -> int:
        zset = self._zsets.get(key, {})
        to_delete = [member for member, score in zset.items() if min_score <= score <= max_score]
        for member in to_delete:
            del zset[member]
        self._zsets[key] = zset
        return len(to_delete)

    async def zadd(self, key: str, mapping: dict[str, float]) -> int:
        zset = self._zsets.setdefault(key, {})
        for member, score in mapping.items():
            zset[member] = float(score)
        return len(mapping)

    async def expire(self, key: str, ttl_seconds: int) -> bool:
        self._expires[key] = ttl_seconds
        return True

    async def zcard(self, key: str) -> int:
        return len(self._zsets.get(key, {}))

    async def rpush(self, _queue: str, _payload: str) -> None:
        return None

    async def aclose(self) -> None:
        return None


class FakeResult:
    def __init__(self, items: list[object] | None = None, scalar_value: int | None = None) -> None:
        self._items = items or []
        self._scalar_value = scalar_value if scalar_value is not None else 0

    def scalars(self) -> "FakeResult":
        return self

    def all(self) -> list[object]:
        return self._items

    def first(self) -> object | None:
        return self._items[0] if self._items else None

    def scalar(self) -> int:
        return self._scalar_value

    def scalar_one(self) -> int:
        return self._scalar_value


class FakeSession:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.campaigns: list[CampaignAlert] = []

    def add(self, obj: object) -> None:
        self.added.append(obj)
        if isinstance(obj, CampaignAlert):
            if obj.id is None:
                obj.id = uuid.uuid4()
            if obj.first_seen is None:
                obj.first_seen = datetime.now(timezone.utc)
            if obj.last_seen is None:
                obj.last_seen = datetime.now(timezone.utc)
            if obj not in self.campaigns:
                self.campaigns.append(obj)
        if hasattr(obj, "id") and getattr(obj, "id", None) is None:
            setattr(obj, "id", len(self.added))

    async def commit(self) -> None:
        return None

    async def flush(self) -> None:
        return None

    async def refresh(self, obj: object) -> None:
        if hasattr(obj, "id") and getattr(obj, "id", None) is None:
            setattr(obj, "id", uuid.uuid4())
        if hasattr(obj, "uuid") and getattr(obj, "uuid", None) is None:
            setattr(obj, "uuid", uuid.uuid4())

    async def close(self) -> None:
        return None

    async def execute(self, query: object) -> FakeResult:
        query_text = str(query)
        compile_params = getattr(query, "compile", None)
        params = compile_params().params if callable(compile_params) else {}

        if (
            "FROM campaign_alerts" in query_text
            and "campaign_alerts.campaign_type =" in query_text
            and "campaign_alerts.status =" in query_text
        ):
            values = list(params.values())
            campaign_type = values[0] if values else None
            status = values[1] if len(values) > 1 else None
            matches = [
                campaign
                for campaign in self.campaigns
                if campaign.campaign_type == campaign_type and campaign.status == status
            ]
            return FakeResult(items=matches)

        if (
            "FROM campaign_alerts" in query_text
            and "ORDER BY campaign_alerts.incident_count DESC" in query_text
        ):
            items = sorted(self.campaigns, key=lambda item: int(item.incident_count or 0), reverse=True)
            return FakeResult(items=items[:10])

        return FakeResult(items=[], scalar_value=0)


def build_client(fake_session: FakeSession) -> TestClient:
    settings.ENABLE_RESULT_CONSUMER = False

    async def _override_get_db() -> AsyncGenerator[FakeSession, None]:
        yield fake_session

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


def auth_headers(role: str = "ANALYST") -> dict[str, str]:
    token = create_access_token(
        subject=f"{role.lower()}@local.test",
        uid=1,
        role=role,
    )
    return {"Authorization": f"Bearer {token}"}


def test_no_campaign_below_threshold() -> None:
    redis_client = FakeRedis()
    result = None
    for idx in range(4):
        result = asyncio.run(
            register_signal(
                redis_client=redis_client,
                incident_id=str(idx + 1),
                matched_rules=["otp_request", "urgency"],
                region="Atlantique",
            )
        )
    assert result is not None
    assert result["campaign_detected"] is False
    assert result["count"] == 4


def test_campaign_detected_at_threshold() -> None:
    redis_client = FakeRedis()
    result = None
    for idx in range(5):
        result = asyncio.run(
            register_signal(
                redis_client=redis_client,
                incident_id=str(idx + 1),
                matched_rules=["otp_request", "urgency"],
                region="Atlantique",
            )
        )
    assert result is not None
    assert result["campaign_detected"] is True
    assert result["count"] == 5


def test_empty_rules_returns_false() -> None:
    redis_client = FakeRedis()
    result = asyncio.run(
        register_signal(
            redis_client=redis_client,
            incident_id="100",
            matched_rules=[],
            region=None,
        )
    )
    assert result["campaign_detected"] is False
    assert result["count"] == 0


def test_campaign_type_generated() -> None:
    redis_client = FakeRedis()
    result = asyncio.run(
        register_signal(
            redis_client=redis_client,
            incident_id="200",
            matched_rules=["otp_request", "urgency"],
            region="Littoral",
        )
    )
    assert result["type"] == "OTP_REQUEST_URGENCY"


def test_create_campaign_in_db() -> None:
    db = FakeSession()
    campaign_data = {
        "campaign_detected": True,
        "count": 5,
        "type": "OTP_REQUEST_URGENCY",
        "rules": ["otp_request", "urgency"],
    }
    campaign = asyncio.run(create_or_update_campaign(db, campaign_data, "Atlantique"))
    assert campaign is not None
    assert campaign.campaign_type == "OTP_REQUEST_URGENCY"
    assert campaign.incident_count == 5
    assert len(db.campaigns) == 1


def test_update_existing_campaign() -> None:
    db = FakeSession()
    initial_data = {
        "campaign_detected": True,
        "count": 5,
        "type": "OTP_REQUEST_URGENCY",
        "rules": ["otp_request", "urgency"],
    }
    asyncio.run(create_or_update_campaign(db, initial_data, "Atlantique"))
    update_data = {
        "campaign_detected": True,
        "count": 8,
        "type": "OTP_REQUEST_URGENCY",
        "rules": ["otp_request", "urgency"],
    }
    updated = asyncio.run(create_or_update_campaign(db, update_data, "Littoral"))
    assert updated is not None
    assert updated.incident_count == 8
    assert len(db.campaigns) == 1
    assert updated.dominant_region == "Littoral"


def test_intel_summary_endpoint_ok() -> None:
    fake_session = FakeSession()
    fake_session.campaigns.append(
        CampaignAlert(
            id=uuid.uuid4(),
            campaign_type="OTP_REQUEST_URGENCY",
            matched_rules=["otp_request", "urgency"],
            incident_count=9,
            dominant_region="Atlantique",
            status="ACTIVE",
            first_seen=datetime.now(timezone.utc),
            last_seen=datetime.now(timezone.utc),
        )
    )
    client = build_client(fake_session)
    response = client.get("/api/v1/dashboard/intel/summary", headers=auth_headers("ANALYST"))
    assert response.status_code == 200
    payload = response.json()
    assert payload["active_campaigns"][0]["type"] == "OTP_REQUEST_URGENCY"


def test_intel_summary_requires_auth() -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)
    response = client.get("/api/v1/dashboard/intel/summary")
    assert response.status_code in (401, 403)


def test_redis_failure_doesnt_block(monkeypatch) -> None:
    fake_session = FakeSession()
    client = build_client(fake_session)
    create_called = {"value": False}

    class FailingRedis(FakeRedis):
        async def zadd(self, key: str, mapping: dict[str, float]) -> int:
            raise RuntimeError("Redis zadd failure")

    async def _fake_upsert(*_args, **_kwargs):
        return SimpleNamespace(region="Atlantique")

    async def _fake_create(*_args, **_kwargs):
        create_called["value"] = True
        return None

    monkeypatch.setattr("app.services.incidents.redis.from_url", lambda *_args, **_kwargs: FailingRedis())
    monkeypatch.setattr("app.services.intel_aggregator.upsert_threat_indicator", _fake_upsert)
    monkeypatch.setattr("app.services.campaign_detector.create_or_update_campaign", _fake_create)

    response = client.post(
        "/api/v1/incidents/report",
        json={
            "message": "Urgent confirme ton code OTP dans 10 minutes",
            "channel": "WEB_PORTAL",
            "phone": "+22990000009",
        },
    )

    assert response.status_code == 200
    assert create_called["value"] is False
