from datetime import datetime
from typing import Literal

from pydantic import BaseModel, UUID4


AlertStatus = Literal["NEW", "IN_REVIEW", "CONFIRMED", "DISMISSED", "BLOCKED_SIMULATED"]
SignalChannel = Literal["MOBILE_APP", "WEB_PORTAL"]


class CitizenIncidentListItem(BaseModel):
    alert_uuid: UUID4
    phone_number: str
    channel: SignalChannel
    message_preview: str
    risk_score: int
    status: AlertStatus
    created_at: datetime
    attachments_count: int
    reports_for_phone: int


class CitizenIncidentListData(BaseModel):
    items: list[CitizenIncidentListItem]
    total: int
    skip: int
    limit: int


class CitizenIncidentAttachment(BaseModel):
    evidence_id: int
    file_path: str
    file_hash: str
    captured_at: datetime | None = None
    type: str
    preview_endpoint: str


class CitizenIncidentStats(BaseModel):
    reports_for_phone: int
    open_reports_for_phone: int
    confirmed_reports_for_phone: int
    blocked_reports_for_phone: int


class RelatedCitizenIncident(BaseModel):
    alert_uuid: UUID4
    status: AlertStatus
    risk_score: int
    created_at: datetime


class CitizenIncidentDetailData(BaseModel):
    alert_uuid: UUID4
    phone_number: str
    channel: SignalChannel
    message: str
    url: str
    risk_score: int
    status: AlertStatus
    analysis_note: str | None = None
    created_at: datetime
    attachments: list[CitizenIncidentAttachment]
    stats: CitizenIncidentStats
    related_incidents: list[RelatedCitizenIncident]
