from collections.abc import AsyncGenerator

from fastapi.testclient import TestClient

from app.core.config import settings
from app.database import get_db
from app.main import app
from app.services.external_transmissions import compute_transmission_reasons


class FakeSession:
    async def close(self) -> None:
        return None


def build_client(fake_session: FakeSession | None = None) -> TestClient:
    settings.ENABLE_RESULT_CONSUMER = False
    settings.ENABLE_EXTERNAL_TRANSMISSION_CONSUMER = False

    async def _override_get_db() -> AsyncGenerator[FakeSession, None]:
        yield fake_session or FakeSession()

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


def test_compute_transmission_reasons_none() -> None:
    reasons = compute_transmission_reasons(report_count=1, campaign_detected=False)
    assert reasons == []


def test_compute_transmission_reasons_number_threshold() -> None:
    reasons = compute_transmission_reasons(report_count=3, campaign_detected=False)
    assert "NUMBER_THRESHOLD_REACHED" in reasons


def test_compute_transmission_reasons_campaign_threshold() -> None:
    reasons = compute_transmission_reasons(report_count=1, campaign_detected=True)
    assert "CAMPAIGN_THRESHOLD_REACHED" in reasons


def test_external_anssi_receiver_requires_secret() -> None:
    client = build_client()

    response = client.post("/api/v1/external/anssi-ocrc/receive", json={"public_reference": "BCS-2026-0001"})

    assert response.status_code == 401


def test_external_anssi_receiver_valid_contract() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/external/anssi-ocrc/receive",
        headers={"X-Transmission-Secret": settings.EXTERNAL_TRANSMISSION_SHARED_SECRET},
        json={"public_reference": "BCS-2026-0001", "bundle_uuid": "bundle-1"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["target_type"] == "ANSSI_OCRC"
    assert payload["data"]["received"] is True
    assert payload["data"]["ack_reference"].startswith("ANSSI_OCRC-")


def test_external_operator_receiver_valid_contract() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/external/operators/receive",
        headers={"X-Transmission-Secret": settings.EXTERNAL_TRANSMISSION_SHARED_SECRET},
        json={"public_reference": "BCS-2026-0002", "bundle_uuid": "bundle-2"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["target_type"] == "OPERATORS"
    assert payload["data"]["received"] is True
    assert payload["data"]["ack_reference"].startswith("OPERATORS-")
