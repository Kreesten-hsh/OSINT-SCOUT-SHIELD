from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, UUID4


BusinessValidationStatus = Literal["PENDING_APPROVAL", "ACTIVE", "REJECTED", "DISABLED"]
ReportStatus = Literal["NEW", "IN_REVIEW", "CONFIRMED", "DISMISSED", "BLOCKED_SIMULATED"]
SignalChannel = Literal["MOBILE_APP", "WEB_PORTAL"]


class PmeRegisterRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    official_name: str = Field(min_length=2, max_length=255)
    keywords: list[str] = Field(default_factory=list)
    legit_numbers: list[str] = Field(default_factory=list)
    contact_email: str | None = Field(default=None, max_length=255)
    contact_phone: str | None = Field(default=None, max_length=64)


class PmeRegistrationData(BaseModel):
    business_uuid: UUID4
    email: str
    official_name: str
    validation_status: BusinessValidationStatus
    created_at: datetime


class PmeProfileUpdateRequest(BaseModel):
    official_name: str | None = Field(default=None, min_length=2, max_length=255)
    keywords: list[str] | None = None
    legit_numbers: list[str] | None = None
    contact_email: str | None = Field(default=None, max_length=255)
    contact_phone: str | None = Field(default=None, max_length=64)


class PmeProfileData(BaseModel):
    business_uuid: UUID4
    user_email: str
    official_name: str
    keywords: list[str]
    legit_numbers: list[str]
    contact_email: str | None = None
    contact_phone: str | None = None
    validation_status: BusinessValidationStatus
    validated_at: datetime | None = None
    created_at: datetime


class PmeIncidentListItem(BaseModel):
    incident_uuid: UUID4
    report_uuid: UUID4
    public_reference: str
    report_status: ReportStatus
    incident_status: ReportStatus
    channel: SignalChannel
    message_preview: str
    risk_score: int
    suspect_phone_masked: str
    detection_reason: str | None = None
    created_at: datetime
    bundle_ready: bool


class PmeIncidentListData(BaseModel):
    items: list[PmeIncidentListItem]
    total: int
    skip: int
    limit: int


class PmeSignalementListItem(BaseModel):
    report_uuid: UUID4
    legacy_alert_uuid: UUID4 | None = None
    public_reference: str
    channel: SignalChannel
    message_preview: str
    risk_score: int
    report_status: ReportStatus
    suspect_phone_masked: str
    created_at: datetime
    attachments_count: int
    bundles_count: int


class PmeSignalementListData(BaseModel):
    items: list[PmeSignalementListItem]
    total: int
    skip: int
    limit: int


class PmeBundleListItem(BaseModel):
    bundle_uuid: UUID4 | None = None
    report_uuid: UUID4
    legacy_alert_uuid: UUID4 | None = None
    public_reference: str
    risk_score: int
    message_preview: str
    created_at: datetime | None = None
    bundle_status: str
    pdf_available: bool
    json_available: bool
    zip_available: bool


class PmeBundleListData(BaseModel):
    items: list[PmeBundleListItem]
    total: int
    skip: int
    limit: int


class PmeDashboardData(BaseModel):
    official_name: str
    validation_status: BusinessValidationStatus
    total_incidents: int
    new_incidents: int
    linked_reports: int
    bundles_ready: int
    last_incident_at: datetime | None = None
    recent_incidents: list[PmeIncidentListItem] = Field(default_factory=list)


class AdminBusinessListItem(BaseModel):
    business_uuid: UUID4
    user_id: int
    email: str
    official_name: str
    validation_status: BusinessValidationStatus
    contact_email: str | None = None
    contact_phone: str | None = None
    keywords_count: int
    legit_numbers_count: int
    created_at: datetime
    validated_at: datetime | None = None


class AdminBusinessListData(BaseModel):
    items: list[AdminBusinessListItem]
    total: int
    pending_count: int
    active_count: int
    rejected_count: int
    disabled_count: int

