import json
from types import SimpleNamespace
from typing import Any

import pytest

from app.schemas.signal import IncidentReportRequest
from app.services.incidents import report_signal_to_incident


class FakeSession:
    def __init__(self) -> None:
        self.added: list[Any] = []

    def add(self, obj: Any) -> None:
        self.added.append(obj)

    async def flush(self) -> None:
        for index, obj in enumerate(self.added, start=1):
            if getattr(obj, "id", None) is None:
                obj.id = index

    async def commit(self) -> None:
        return None

    async def refresh(self, _obj: Any) -> None:
        return None


class FakeRedis:
    def __init__(self, fail_lpush: bool = False) -> None:
        self.fail_lpush = fail_lpush
        self.lpush_calls: list[tuple[str, str]] = []
        self.rpush_calls: list[tuple[str, str]] = []

    async def lpush(self, queue: str, payload: str) -> None:
        if self.fail_lpush:
            raise RuntimeError("redis down")
        self.lpush_calls.append((queue, payload))

    async def rpush(self, queue: str, payload: str) -> None:
        self.rpush_calls.append((queue, payload))

    async def aclose(self) -> None:
        return None


def install_common_monkeypatches(
    monkeypatch: pytest.MonkeyPatch,
    fake_redis: FakeRedis,
    categories: list[str],
) -> None:
    monkeypatch.setattr(
        "app.services.incidents.score_signal",
        lambda **_kwargs: {"risk_score": 82, "categories_detected": categories},
    )
    monkeypatch.setattr(
        "app.services.intel_aggregator.upsert_threat_indicator",
        lambda **_kwargs: _return_async(SimpleNamespace(region="Atlantique")),
    )
    monkeypatch.setattr(
        "app.services.campaign_detector.register_signal",
        lambda **_kwargs: _return_async({"campaign_detected": False, "count": 0}),
    )
    monkeypatch.setattr(
        "app.services.campaign_detector.create_or_update_campaign",
        lambda *_args, **_kwargs: _return_async(None),
    )
    monkeypatch.setattr("app.services.incidents.redis.from_url", lambda *_args, **_kwargs: fake_redis)


async def _return_async(value: Any) -> Any:
    return value


@pytest.mark.asyncio
async def test_suspicious_url_triggers_redis_push(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = FakeSession()
    fake_redis = FakeRedis()
    install_common_monkeypatches(monkeypatch, fake_redis, ["suspicious_url", "urgency"])

    result = await report_signal_to_incident(
        request=IncidentReportRequest(
            message="Visitez http://fake-mtn.xyz pour confirmer votre compte.",
            channel="WEB_PORTAL",
            phone="+22990000001",
        ),
        db=fake_db,
    )

    assert result is not None
    assert len(fake_redis.lpush_calls) == 1
    queue_name, payload = fake_redis.lpush_calls[0]
    assert queue_name == "osint_to_scan"
    job = json.loads(payload)
    assert job["url"] == "http://fake-mtn.xyz"
    assert job["alert_id"]


@pytest.mark.asyncio
async def test_no_push_without_suspicious_url(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = FakeSession()
    fake_redis = FakeRedis()
    install_common_monkeypatches(monkeypatch, fake_redis, ["urgency"])

    await report_signal_to_incident(
        request=IncidentReportRequest(
            message="Visitez http://fake-mtn.xyz pour confirmer votre compte.",
            channel="WEB_PORTAL",
            phone="+22990000001",
        ),
        db=fake_db,
    )

    assert fake_redis.lpush_calls == []


@pytest.mark.asyncio
async def test_no_push_without_url_in_message(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = FakeSession()
    fake_redis = FakeRedis()
    install_common_monkeypatches(monkeypatch, fake_redis, ["suspicious_url"])

    await report_signal_to_incident(
        request=IncidentReportRequest(
            message="Lien suspect mentionne un faux site mais sans URL explicite.",
            channel="WEB_PORTAL",
            phone="+22990000001",
        ),
        db=fake_db,
    )

    assert fake_redis.lpush_calls == []


@pytest.mark.asyncio
async def test_redis_failure_doesnt_block_signalement(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = FakeSession()
    fake_redis = FakeRedis(fail_lpush=True)
    install_common_monkeypatches(monkeypatch, fake_redis, ["suspicious_url"])

    result = await report_signal_to_incident(
        request=IncidentReportRequest(
            message="Visitez http://fake-mtn.xyz pour confirmer votre compte.",
            channel="WEB_PORTAL",
            phone="+22990000001",
        ),
        db=fake_db,
    )

    assert result is not None
    assert fake_db.added


@pytest.mark.asyncio
async def test_job_contains_alert_id(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = FakeSession()
    fake_redis = FakeRedis()
    install_common_monkeypatches(monkeypatch, fake_redis, ["suspicious_url"])

    await report_signal_to_incident(
        request=IncidentReportRequest(
            message="Visitez http://fake-mtn.xyz pour confirmer votre compte.",
            channel="WEB_PORTAL",
            phone="+22990000001",
        ),
        db=fake_db,
    )

    _, payload = fake_redis.lpush_calls[0]
    job = json.loads(payload)
    assert job["alert_id"]
