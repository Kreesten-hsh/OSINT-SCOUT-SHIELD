from collections.abc import AsyncGenerator
from datetime import datetime
import asyncio
import uuid

from fastapi.testclient import TestClient

from app.core.config import settings
from app.database import get_db
from app.main import app
from app.models import ThreatIndicator
from app.services.intel_aggregator import derive_region_from_phone, mask_phone, upsert_threat_indicator


class FakeScalarResult:
    def __init__(self, items: list[object] | None = None) -> None:
        self._items = items or []

    def all(self) -> list[object]:
        return self._items

    def first(self) -> object | None:
        return self._items[0] if self._items else None


class FakeResult:
    def __init__(
        self,
        items: list[object] | None = None,
        rows: list[tuple] | None = None,
        scalar_value: int = 0,
    ) -> None:
        self._items = items or []
        self._rows = rows or []
        self._scalar_value = scalar_value

    def scalars(self) -> FakeScalarResult:
        return FakeScalarResult(self._items)

    def all(self) -> list[tuple]:
        return self._rows

    def scalar(self) -> int:
        return self._scalar_value

    def scalar_one(self) -> int:
        return self._scalar_value


class FakeSession:
    def __init__(self) -> None:
        self.indicators: list[ThreatIndicator] = []

    def add(self, obj: object) -> None:
        if isinstance(obj, ThreatIndicator):
            if obj.id is None:
                obj.id = uuid.uuid4()
            if obj.first_seen is None:
                obj.first_seen = datetime.utcnow()
            if obj.last_seen is None:
                obj.last_seen = datetime.utcnow()
            if obj not in self.indicators:
                self.indicators.append(obj)

    async def commit(self) -> None:
        return None

    async def flush(self) -> None:
        return None

    async def refresh(self, _obj: object) -> None:
        return None

    async def close(self) -> None:
        return None

    async def execute(self, query: object) -> FakeResult:
        query_text = str(query)
        compile_params = getattr(query, "compile", None)
        params = compile_params().params if callable(compile_params) else {}

        if "WHERE threat_indicators.phone_hash =" in query_text:
            hash_key = next(iter(params.values()), None)
            matches = [item for item in self.indicators if item.phone_hash == hash_key]
            return FakeResult(items=matches)

        if "WHERE threat_indicators.url_hash =" in query_text:
            hash_key = next(iter(params.values()), None)
            matches = [item for item in self.indicators if item.url_hash == hash_key]
            return FakeResult(items=matches)

        if (
            "FROM threat_indicators" in query_text
            and "WHERE threat_indicators.indicator_type =" in query_text
            and "ORDER BY threat_indicators.occurrence_count DESC" in query_text
        ):
            indicator_type = next(iter(params.values()), None)
            items = [item for item in self.indicators if item.indicator_type == indicator_type]
            items.sort(key=lambda item: int(item.occurrence_count or 0), reverse=True)
            return FakeResult(items=items[:10])

        if "GROUP BY threat_indicators.dominant_category" in query_text:
            counts: dict[str | None, int] = {}
            for item in self.indicators:
                counts[item.dominant_category] = counts.get(item.dominant_category, 0) + 1
            rows = sorted(counts.items(), key=lambda item: item[1], reverse=True)
            return FakeResult(rows=rows)

        if "count(threat_indicators.id)" in query_text and "threat_indicators.alert_triggered IS true" in query_text:
            active_count = sum(1 for item in self.indicators if item.alert_triggered)
            return FakeResult(scalar_value=active_count)

        if "WHERE threat_indicators.region IS NOT NULL" in query_text and "GROUP BY threat_indicators.region" in query_text:
            grouped: dict[tuple[str, str | None], int] = {}
            for item in self.indicators:
                if not item.region:
                    continue
                key = (item.region, item.dominant_category)
                grouped[key] = grouped.get(key, 0) + 1
            rows = [(region, category, count) for (region, category), count in grouped.items()]
            return FakeResult(rows=rows)

        if "WHERE threat_indicators.alert_triggered IS true" in query_text:
            items = [item for item in self.indicators if item.alert_triggered]
            items.sort(key=lambda item: int(item.occurrence_count or 0), reverse=True)
            return FakeResult(items=items)

        return FakeResult(items=[], rows=[], scalar_value=0)


def build_client(fake_session: FakeSession) -> TestClient:
    settings.ENABLE_RESULT_CONSUMER = False

    async def _override_get_db() -> AsyncGenerator[FakeSession, None]:
        yield fake_session

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


def test_mask_phone_standard() -> None:
    assert mask_phone("0169647090") == "016****090"


def test_mask_phone_short() -> None:
    assert mask_phone("012") == "***"


def test_derive_region_atlantique() -> None:
    assert derive_region_from_phone("0169647090") == "Atlantique"


def test_derive_region_borgou() -> None:
    assert derive_region_from_phone("0297441122") == "Borgou"


def test_derive_region_unknown() -> None:
    assert derive_region_from_phone("0999999999") is None


def test_upsert_creates_new() -> None:
    db = FakeSession()
    indicator = asyncio.run(
        upsert_threat_indicator(
            db=db,
            phone="0169647090",
            danger_score=88.0,
            dominant_category="MM_FRAUD",
        )
    )
    assert indicator.occurrence_count == 1
    assert indicator.alert_triggered is False


def test_upsert_increments() -> None:
    db = FakeSession()
    asyncio.run(upsert_threat_indicator(db=db, phone="0169647090", danger_score=72.0, dominant_category="OTP"))
    indicator = asyncio.run(upsert_threat_indicator(db=db, phone="0169647090", danger_score=76.0, dominant_category="OTP"))
    assert indicator.occurrence_count == 2
    assert indicator.alert_triggered is False


def test_upsert_triggers_alert() -> None:
    db = FakeSession()
    asyncio.run(upsert_threat_indicator(db=db, phone="0169647090", danger_score=70.0))
    asyncio.run(upsert_threat_indicator(db=db, phone="0169647090", danger_score=75.0))
    indicator = asyncio.run(upsert_threat_indicator(db=db, phone="0169647090", danger_score=80.0))
    assert indicator.occurrence_count == 3
    assert indicator.alert_triggered is True


def test_heatmap_endpoint_public() -> None:
    db = FakeSession()
    client = build_client(db)
    response = client.get("/api/v1/map/heatmap")
    assert response.status_code == 200


def test_dashboard_requires_auth() -> None:
    db = FakeSession()
    client = build_client(db)
    response = client.get("/api/v1/threat-intel/dashboard")
    assert response.status_code in (401, 403)
