from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.legacy_memory_bridge import (
    build_legacy_analysis_payload,
    delete_linked_memory_domain_reports,
    sync_memory_domain_status_from_legacy_alert,
)


class _FakeResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return self

    def all(self):
        return self._items


class _FakeSession:
    def __init__(self, items):
        self.items = items
        self.deleted = []
        self.added = []
        self.flush_count = 0

    async def execute(self, _query):
        return _FakeResult(self.items)

    async def delete(self, obj):
        self.deleted.append(obj)

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        self.flush_count += 1


def test_build_legacy_analysis_payload_preserves_categories_and_entities():
    analysis = SimpleNamespace(
        risk_score=82,
        primary_category="mobile_money_fraud",
        categories_detected=["mobile_money_fraud", "otp_request"],
        matched_rules=["urgent_language", "otp_request"],
        highlighted_spans=[
            {"text": "code OTP", "label": "otp_request", "start": 10, "end": 18},
            {"text": "urgent", "label": "urgent_language", "start": 0, "end": 6},
        ],
    )

    categories, entities = build_legacy_analysis_payload(analysis)

    assert categories[0]["name"] == "mobile_money_fraud"
    assert {item["name"] for item in categories} == {"mobile_money_fraud", "otp_request"}
    assert {"type": "MATCHED_RULE", "value": "urgent_language"} in entities
    assert any(item["type"] == "HIGHLIGHT" and item["value"] == "code OTP" for item in entities)


@pytest.mark.asyncio
async def test_sync_memory_domain_status_from_legacy_alert_updates_related_reports():
    incident = SimpleNamespace(status="NEW")
    report = SimpleNamespace(status="NEW", impersonation_incidents=[incident])
    fake_session = _FakeSession([report])

    synced = await sync_memory_domain_status_from_legacy_alert(
        fake_session,
        alert_uuid=uuid4(),
        alert_status="CONFIRMED",
    )

    assert synced == 1
    assert report.status == "CONFIRMED"
    assert incident.status == "CONFIRMED"
    assert fake_session.flush_count == 1
    assert report in fake_session.added
    assert incident in fake_session.added


@pytest.mark.asyncio
async def test_delete_linked_memory_domain_reports_removes_report_graph_and_updates_counter():
    suspect_number = SimpleNamespace(id=7, report_count=2)
    message = SimpleNamespace(id=11)
    analysis = SimpleNamespace(id=13)
    bundle = SimpleNamespace(
        zip_path="bundles/a.zip",
        pdf_path="bundles/a.pdf",
        json_path="bundles/a.json",
        transmissions=[SimpleNamespace(id=1), SimpleNamespace(id=2)],
    )
    report = SimpleNamespace(
        message=message,
        analysis=analysis,
        suspect_number=suspect_number,
        evidence_items=[SimpleNamespace(id=21)],
        impersonation_incidents=[SimpleNamespace(id=31)],
        forensic_bundles=[bundle],
    )
    fake_session = _FakeSession([report])

    summary = await delete_linked_memory_domain_reports(
        fake_session,
        alert_uuid=uuid4(),
    )

    assert summary.deleted_reports_count == 1
    assert summary.deleted_messages_count == 1
    assert summary.deleted_analyses_count == 1
    assert summary.deleted_evidence_items_count == 1
    assert summary.deleted_impersonation_incidents_count == 1
    assert summary.deleted_forensic_bundles_count == 1
    assert summary.deleted_external_transmissions_count == 2
    assert summary.deleted_suspect_numbers_count == 0
    assert summary.artifact_paths == ["bundles/a.zip", "bundles/a.pdf", "bundles/a.json"]
    assert report in fake_session.deleted
    assert message in fake_session.deleted
    assert analysis in fake_session.deleted
    assert suspect_number.report_count == 1
