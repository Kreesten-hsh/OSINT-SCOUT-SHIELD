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


def test_pme_register_public_contract(monkeypatch) -> None:
    client = build_client()
    business_uuid = uuid.uuid4()

    async def _fake_register_business(*_args, **_kwargs):
        return {
            "business_uuid": business_uuid,
            "email": "pme@example.com",
            "official_name": "Acme Benin",
            "validation_status": "PENDING_APPROVAL",
            "created_at": "2026-04-25T10:00:00Z",
        }

    monkeypatch.setattr("app.api.v1.endpoints.pme.register_business", _fake_register_business)

    response = client.post(
        "/api/v1/pme/register",
        json={
            "email": "pme@example.com",
            "password": "secret-secret",
            "official_name": "Acme Benin",
            "keywords": ["acme"],
            "legit_numbers": ["+22990000000"],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["business_uuid"] == str(business_uuid)
    assert payload["data"]["validation_status"] == "PENDING_APPROVAL"


def test_pme_dashboard_requires_authentication() -> None:
    client = build_client()

    response = client.get("/api/v1/pme/dashboard")

    assert response.status_code == 401


def test_pme_dashboard_authenticated_contract(monkeypatch) -> None:
    client = build_client()

    async def _fake_get_business_dashboard(*_args, **_kwargs):
        return {
            "official_name": "Acme Benin",
            "validation_status": "ACTIVE",
            "total_incidents": 5,
            "new_incidents": 2,
            "linked_reports": 4,
            "bundles_ready": 1,
            "last_incident_at": "2026-04-25T11:00:00Z",
            "recent_incidents": [],
        }

    monkeypatch.setattr("app.api.v1.endpoints.pme.get_business_dashboard", _fake_get_business_dashboard)
    app.dependency_overrides[get_current_active_principal] = lambda: type(
        "Principal",
        (),
        {"id": 9, "email": "sme@local.test", "role": "SME", "status": "ACTIVE"},
    )()
    try:
        response = client.get("/api/v1/pme/dashboard", headers=auth_headers("SME", uid=9))
    finally:
        app.dependency_overrides.pop(get_current_active_principal, None)

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["official_name"] == "Acme Benin"
    assert payload["data"]["bundles_ready"] == 1


def test_admin_pme_list_authenticated_contract(monkeypatch) -> None:
    client = build_client()

    async def _fake_list_admin_businesses(*_args, **_kwargs):
        return {
            "items": [
                {
                    "business_uuid": uuid.uuid4(),
                    "user_id": 7,
                    "email": "pme@example.com",
                    "official_name": "Acme Benin",
                    "validation_status": "PENDING_APPROVAL",
                    "contact_email": None,
                    "contact_phone": None,
                    "keywords_count": 2,
                    "legit_numbers_count": 1,
                    "created_at": "2026-04-25T10:00:00Z",
                    "validated_at": None,
                }
            ],
            "total": 1,
            "pending_count": 1,
            "active_count": 0,
            "rejected_count": 0,
            "disabled_count": 0,
        }

    monkeypatch.setattr("app.api.v1.endpoints.admin_pme.list_admin_businesses", _fake_list_admin_businesses)
    app.dependency_overrides[get_current_active_principal] = lambda: type(
        "Principal",
        (),
        {"id": 1, "email": "admin@local.test", "role": "ADMIN", "status": "ACTIVE"},
    )()
    try:
        response = client.get("/api/v1/admin/pme", headers=auth_headers("ADMIN"))
    finally:
        app.dependency_overrides.pop(get_current_active_principal, None)

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["total"] == 1
    assert payload["data"]["pending_count"] == 1


def test_admin_pme_create_authenticated_contract(monkeypatch) -> None:
    client = build_client()
    business_uuid = uuid.uuid4()

    async def _fake_create_business_as_admin(*_args, **_kwargs):
        return {
            "business_uuid": business_uuid,
            "user_id": 12,
            "email": "new-pme@example.com",
            "official_name": "New PME Benin",
            "validation_status": "ACTIVE",
            "contact_email": "contact@newpme.bj",
            "contact_phone": "+22991000000",
            "keywords_count": 2,
            "legit_numbers_count": 1,
            "created_at": "2026-04-25T10:00:00Z",
            "validated_at": "2026-04-25T10:05:00Z",
        }

    monkeypatch.setattr("app.api.v1.endpoints.admin_pme.create_business_as_admin", _fake_create_business_as_admin)
    app.dependency_overrides[get_current_active_principal] = lambda: type(
        "Principal",
        (),
        {"id": 1, "uid": 1, "email": "admin@local.test", "role": "ADMIN", "status": "ACTIVE"},
    )()
    try:
        response = client.post(
            "/api/v1/admin/pme",
            headers=auth_headers("ADMIN"),
            json={
                "email": "new-pme@example.com",
                "password": "secret-secret",
                "official_name": "New PME Benin",
                "keywords": ["new", "pme"],
                "legit_numbers": ["+22991000000"],
                "contact_email": "contact@newpme.bj",
                "contact_phone": "+22991000000",
                "activate_immediately": True,
            },
        )
    finally:
        app.dependency_overrides.pop(get_current_active_principal, None)

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["business_uuid"] == str(business_uuid)
    assert payload["data"]["validation_status"] == "ACTIVE"
    assert payload["data"]["official_name"] == "New PME Benin"


def test_admin_pme_approve_authenticated_contract(monkeypatch) -> None:
    client = build_client()
    business_uuid = uuid.uuid4()

    async def _fake_update_status(*_args, **_kwargs):
        return {
            "business_uuid": business_uuid,
            "user_id": 7,
            "email": "pme@example.com",
            "official_name": "Acme Benin",
            "validation_status": "ACTIVE",
            "contact_email": None,
            "contact_phone": None,
            "keywords_count": 2,
            "legit_numbers_count": 1,
            "created_at": "2026-04-25T10:00:00Z",
            "validated_at": "2026-04-25T11:00:00Z",
        }

    monkeypatch.setattr("app.api.v1.endpoints.admin_pme.update_business_validation_status", _fake_update_status)
    app.dependency_overrides[get_current_active_principal] = lambda: type(
        "Principal",
        (),
        {"id": 1, "email": "admin@local.test", "role": "ADMIN", "status": "ACTIVE"},
    )()
    try:
        response = client.patch(f"/api/v1/admin/pme/{business_uuid}/approve", headers=auth_headers("ADMIN"))
    finally:
        app.dependency_overrides.pop(get_current_active_principal, None)

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["validation_status"] == "ACTIVE"


def test_admin_pme_detail_authenticated_contract(monkeypatch) -> None:
    client = build_client()
    business_uuid = uuid.uuid4()
    incident_uuid = uuid.uuid4()
    report_uuid = uuid.uuid4()

    async def _fake_get_admin_business_detail(*_args, **_kwargs):
        return {
            "business_uuid": business_uuid,
            "email": "pme@example.com",
            "official_name": "Acme Benin",
            "validation_status": "ACTIVE",
            "contact_email": "contact@acme.bj",
            "contact_phone": "+22990000000",
            "keywords": ["acme", "momo"],
            "legit_numbers": ["+22990000000"],
            "created_at": "2026-04-25T10:00:00Z",
            "validated_at": "2026-04-25T11:00:00Z",
            "total_incidents": 3,
            "linked_reports": 2,
            "bundles_ready": 1,
            "last_incident_at": "2026-04-25T12:00:00Z",
            "recent_incidents": [
                {
                    "incident_uuid": incident_uuid,
                    "report_uuid": report_uuid,
                    "public_reference": "BCS-2026-0001",
                    "report_status": "CONFIRMED",
                    "incident_status": "NEW",
                    "channel": "WEB_PORTAL",
                    "message_preview": "Agent MTN : renvoyez le code",
                    "risk_score": 88,
                    "suspect_phone_masked": "+229******11",
                    "detection_reason": "Correspondance mot-cle",
                    "created_at": "2026-04-25T12:00:00Z",
                    "bundle_ready": True,
                }
            ],
            "recent_reports": [
                {
                    "report_uuid": report_uuid,
                    "legacy_alert_uuid": None,
                    "public_reference": "BCS-2026-0001",
                    "channel": "WEB_PORTAL",
                    "message_preview": "Agent MTN : renvoyez le code",
                    "risk_score": 88,
                    "report_status": "CONFIRMED",
                    "suspect_phone_masked": "+229******11",
                    "created_at": "2026-04-25T12:00:00Z",
                    "attachments_count": 1,
                    "bundles_count": 1,
                }
            ],
        }

    monkeypatch.setattr("app.api.v1.endpoints.admin_pme.get_admin_business_detail", _fake_get_admin_business_detail)
    app.dependency_overrides[get_current_active_principal] = lambda: type(
        "Principal",
        (),
        {"id": 1, "email": "admin@local.test", "role": "ADMIN", "status": "ACTIVE"},
    )()
    try:
        response = client.get(f"/api/v1/admin/pme/{business_uuid}", headers=auth_headers("ADMIN"))
    finally:
        app.dependency_overrides.pop(get_current_active_principal, None)

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["official_name"] == "Acme Benin"
    assert payload["data"]["recent_incidents"][0]["public_reference"] == "BCS-2026-0001"
