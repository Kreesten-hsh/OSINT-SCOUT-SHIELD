from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, UUID4


ReportStatus = Literal["NEW", "IN_REVIEW", "CONFIRMED", "DISMISSED", "BLOCKED_SIMULATED"]
TransmissionStatus = Literal["PENDING", "QUEUED", "SENT", "RETRYING", "FAILED", "DELIVERED"]
TransmissionTargetType = Literal["ANSSI_OCRC", "OPERATORS"]


class AdminDailyCount(BaseModel):
    date: str
    count: int


class AdminCategoryCount(BaseModel):
    category: str
    count: int


class AdminDashboardRecentReportItem(BaseModel):
    report_uuid: UUID4
    legacy_alert_uuid: UUID4 | None = None
    public_reference: str
    status: ReportStatus
    risk_score: int
    message_preview: str
    suspect_phone_masked: str
    created_at: datetime


class AdminDashboardBusinessTargetItem(BaseModel):
    business_uuid: UUID4
    official_name: str
    incidents_count: int
    last_incident_at: datetime | None = None


class AdminDashboardTopNumberItem(BaseModel):
    suspect_number_uuid: UUID4
    masked_phone: str
    reports_count: int
    last_seen: datetime | None = None


class AdminDashboardRecentTransmissionItem(BaseModel):
    transmission_uuid: UUID4
    public_reference: str
    target_type: TransmissionTargetType
    status: TransmissionStatus
    created_at: datetime
    delivered_at: datetime | None = None


class AdminDashboardData(BaseModel):
    total_reports: int
    daily_reports: int
    open_reports: int
    confirmed_reports: int
    bundles_ready: int
    active_businesses: int
    pending_businesses: int
    transmissions_pending: int
    transmissions_failed: int
    transmission_success_rate: float
    active_campaigns: int
    reports_by_day: list[AdminDailyCount] = Field(default_factory=list)
    reports_by_category: list[AdminCategoryCount] = Field(default_factory=list)
    reports_by_status: dict[str, int] = Field(default_factory=dict)
    transmissions_by_status: dict[str, int] = Field(default_factory=dict)
    recent_reports: list[AdminDashboardRecentReportItem] = Field(default_factory=list)
    top_targeted_businesses: list[AdminDashboardBusinessTargetItem] = Field(default_factory=list)
    top_suspect_numbers: list[AdminDashboardTopNumberItem] = Field(default_factory=list)
    recent_transmissions: list[AdminDashboardRecentTransmissionItem] = Field(default_factory=list)


class AdminTransmissionListItem(BaseModel):
    transmission_uuid: UUID4
    bundle_uuid: UUID4
    report_uuid: UUID4
    public_reference: str
    target_type: TransmissionTargetType
    target_endpoint: str | None = None
    bundle_status: str
    status: TransmissionStatus
    attempts: int
    ack_reference: str | None = None
    next_retry_at: datetime | None = None
    last_error: str | None = None
    created_at: datetime
    delivered_at: datetime | None = None
    risk_score: int
    primary_category: str | None = None
    suspect_phone_masked: str


class AdminTransmissionListData(BaseModel):
    items: list[AdminTransmissionListItem]
    total: int
    pending_count: int
    queued_count: int
    sent_count: int
    retrying_count: int
    failed_count: int
    delivered_count: int
