from collections.abc import AsyncGenerator
import uuid

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token, get_current_active_principal
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


def auth_headers(role: str = "ADMIN", uid: int = 1) -> dict[str, str]:
    token = create_access_token(
        subject=f"{role.lower()}@local.test",
        uid=uid,
        role=role,
    )
    return {"Authorization": f"Bearer {token}"}


def test_admin_dashboard_requires_authentication() -> None:
    client = build_client()

    response = client.get("/api/v1/admin/dashboard")

    assert response.status_code == 401


def test_admin_dashboard_authenticated_contract(monkeypatch) -> None:
    client = build_client()
    report_uuid = uuid.uuid4()
    business_uuid = uuid.uuid4()
    suspect_uuid = uuid.uuid4()
    transmission_uuid = uuid.uuid4()

    async def _fake_get_dashboard(*_args, **_kwargs):
        return {
            "total_reports": 12,
            "daily_reports": 3,
            "open_reports": 4,
            "confirmed_reports": 3,
            "bundles_ready": 5,
            "active_businesses": 2,
            "pending_businesses": 1,
            "transmissions_pending": 2,
            "transmissions_failed": 1,
            "transmission_success_rate": 66.7,
            "active_campaigns": 2,
            "reports_by_day": [{"date": "2026-04-25", "count": 3}],
            "reports_by_category": [
                {"category": "mobile_money", "count": 7},
                {"category": "identity_spoofing", "count": 5},
            ],
            "reports_by_status": {
                "NEW": 2,
                "IN_REVIEW": 2,
                "CONFIRMED": 3,
                "DISMISSED": 4,
                "BLOCKED_SIMULATED": 1,
            },
            "transmissions_by_status": {
                "PENDING": 1,
                "QUEUED": 0,
                "SENT": 1,
                "RETRYING": 0,
                "FAILED": 1,
                "DELIVERED": 2,
            },
            "recent_reports": [
                {
                    "report_uuid": report_uuid,
                    "legacy_alert_uuid": None,
                    "public_reference": "BCS-2026-0001",
                    "status": "CONFIRMED",
                    "risk_score": 88,
                    "message_preview": "Agent MTN : renvoyez le code",
                    "suspect_phone_masked": "+229******11",
                    "created_at": "2026-04-25T10:00:00Z",
                }
            ],
            "top_targeted_businesses": [
                {
                    "business_uuid": business_uuid,
                    "official_name": "Acme Benin",
                    "incidents_count": 3,
                    "last_incident_at": "2026-04-25T11:00:00Z",
                }
            ],
            "top_suspect_numbers": [
                {
                    "suspect_number_uuid": suspect_uuid,
                    "masked_phone": "+229******11",
                    "reports_count": 4,
                    "last_seen": "2026-04-25T11:30:00Z",
                }
            ],
            "recent_transmissions": [
                {
                    "transmission_uuid": transmission_uuid,
                    "public_reference": "BCS-2026-0003",
                    "target_type": "ANSSI_OCRC",
                    "status": "DELIVERED",
                    "created_at": "2026-04-25T10:15:00Z",
                    "delivered_at": "2026-04-25T10:17:00Z",
                }
            ],
        }

    monkeypatch.setattr("app.api.v1.endpoints.admin_console.get_admin_dashboard", _fake_get_dashboard)
    app.dependency_overrides[get_current_active_principal] = lambda: type(
        "Principal",
        (),
        {"id": 1, "email": "admin@local.test", "role": "ADMIN", "status": "ACTIVE"},
    )()
    try:
        response = client.get("/api/v1/admin/dashboard", headers=auth_headers("ADMIN"))
    finally:
        app.dependency_overrides.pop(get_current_active_principal, None)

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["total_reports"] == 12
    assert payload["data"]["daily_reports"] == 3
    assert payload["data"]["active_campaigns"] == 2
    assert payload["data"]["reports_by_category"][0]["category"] == "mobile_money"
    assert payload["data"]["recent_transmissions"][0]["status"] == "DELIVERED"
    assert payload["data"]["recent_reports"][0]["public_reference"] == "BCS-2026-0001"


def test_admin_transmissions_authenticated_contract(monkeypatch) -> None:
    client = build_client()
    transmission_uuid = uuid.uuid4()
    bundle_uuid = uuid.uuid4()
    report_uuid = uuid.uuid4()

    async def _fake_list_transmissions(*_args, **_kwargs):
        return {
            "items": [
                {
                    "transmission_uuid": transmission_uuid,
                    "bundle_uuid": bundle_uuid,
                    "report_uuid": report_uuid,
                    "public_reference": "BCS-2026-0002",
                    "target_type": "ANSSI_OCRC",
                    "target_endpoint": "https://anssi.example.test/intake",
                    "bundle_status": "READY",
                    "status": "DELIVERED",
                    "attempts": 1,
                    "ack_reference": "ACK-2026-01",
                    "next_retry_at": None,
                    "last_error": None,
                    "created_at": "2026-04-25T09:00:00Z",
                    "delivered_at": "2026-04-25T09:01:00Z",
                    "risk_score": 91,
                    "primary_category": "mobile_money",
                    "suspect_phone_masked": "+229******44",
                }
            ],
            "total": 1,
            "pending_count": 0,
            "queued_count": 0,
            "sent_count": 0,
            "retrying_count": 0,
            "failed_count": 0,
            "delivered_count": 1,
        }

    monkeypatch.setattr("app.api.v1.endpoints.admin_console.list_admin_transmissions", _fake_list_transmissions)
    app.dependency_overrides[get_current_active_principal] = lambda: type(
        "Principal",
        (),
        {"id": 1, "email": "admin@local.test", "role": "ADMIN", "status": "ACTIVE"},
    )()
    try:
        response = client.get("/api/v1/admin/transmissions", headers=auth_headers("ADMIN"))
    finally:
        app.dependency_overrides.pop(get_current_active_principal, None)

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["delivered_count"] == 1
    assert payload["data"]["items"][0]["target_type"] == "ANSSI_OCRC"


def test_admin_csv_export_authenticated_contract(monkeypatch) -> None:
    client = build_client()

    async def _fake_build_csv_export(*_args, **_kwargs):
        return ("benin_cyber_shield_admin_export.csv", b"public_reference,status\r\nBCS-2026-0001,CONFIRMED\r\n")

    monkeypatch.setattr("app.api.v1.endpoints.admin_console.build_admin_csv_export", _fake_build_csv_export)
    app.dependency_overrides[get_current_active_principal] = lambda: type(
        "Principal",
        (),
        {"id": 1, "email": "admin@local.test", "role": "ADMIN", "status": "ACTIVE"},
    )()
    try:
        response = client.post("/api/v1/admin/exports/csv", headers=auth_headers("ADMIN"))
    finally:
        app.dependency_overrides.pop(get_current_active_principal, None)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=benin_cyber_shield_admin_export.csv" in response.headers["content-disposition"]
    assert "BCS-2026-0001" in response.text


def test_admin_stix_export_authenticated_contract(monkeypatch) -> None:
    client = build_client()

    async def _fake_build_stix_export(*_args, **_kwargs):
        return (
            "benin_cyber_shield_admin_stix_lite.json",
            b'{"type":"bundle","objects":[{"id":"incident--1"}]}',
        )

    monkeypatch.setattr("app.api.v1.endpoints.admin_console.build_admin_stix_lite_export", _fake_build_stix_export)
    app.dependency_overrides[get_current_active_principal] = lambda: type(
        "Principal",
        (),
        {"id": 1, "email": "admin@local.test", "role": "ADMIN", "status": "ACTIVE"},
    )()
    try:
        response = client.post("/api/v1/admin/exports/stix-lite", headers=auth_headers("ADMIN"))
    finally:
        app.dependency_overrides.pop(get_current_active_principal, None)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert "attachment; filename=benin_cyber_shield_admin_stix_lite.json" in response.headers["content-disposition"]
    assert response.json()["type"] == "bundle"
