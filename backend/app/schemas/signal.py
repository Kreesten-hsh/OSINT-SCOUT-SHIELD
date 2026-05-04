from typing import Literal

from pydantic import BaseModel, Field, UUID4, field_validator

from app.core.risk_levels import normalize_risk_level


SignalChannel = Literal["MOBILE_APP", "WEB_PORTAL"]
RiskLevel = Literal["FAIBLE", "MOYEN", "FORT"]
DepartmentSource = Literal["USER_SELECTED", "PHONE_DERIVED", "UNKNOWN"]


class VerifySignalRequest(BaseModel):
    message: str = Field(min_length=5, max_length=3000)
    channel: SignalChannel = "WEB_PORTAL"
    url: str | None = Field(default=None, max_length=2048)
    phone: str = Field(min_length=8, max_length=32)
    department: str | None = Field(default=None, max_length=32)
    device_install_id: str | None = Field(default=None, max_length=128)
    # Backward-compatibility field kept for Sprint 1A transition.
    create_incident: bool | None = None


class HighlightedSpan(BaseModel):
    start: int
    end: int
    rule: str
    label: str
    color: str


class VerifySignalData(BaseModel):
    risk_score: int
    risk_level: RiskLevel
    explanation: list[str]
    should_report: bool
    matched_rules: list[str]
    categories_detected: list[str] = Field(default_factory=list)
    recurrence_count: int = Field(default=0, ge=0)
    highlighted_spans: list[HighlightedSpan] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    citizen_advice: list[str] = Field(default_factory=list)
    fon_alert: str | None = None
    resolved_department: str | None = None
    department_source: DepartmentSource = "UNKNOWN"
    verification_message_uuid: UUID4 | None = None
    verification_analysis_uuid: UUID4 | None = None

    @field_validator("risk_level", mode="before")
    @classmethod
    def _normalize_risk_level(cls, value: str) -> str:
        return normalize_risk_level(value)


class VerificationSnapshot(BaseModel):
    risk_score: int = Field(ge=0, le=100)
    risk_level: RiskLevel
    should_report: bool
    matched_rules: list[str] = Field(default_factory=list)
    categories_detected: list[str] = Field(default_factory=list)

    @field_validator("risk_level", mode="before")
    @classmethod
    def _normalize_risk_level(cls, value: str) -> str:
        return normalize_risk_level(value)


class IncidentReportRequest(BaseModel):
    message: str = Field(min_length=5, max_length=3000)
    channel: SignalChannel = "WEB_PORTAL"
    url: str | None = Field(default=None, max_length=2048)
    phone: str = Field(min_length=8, max_length=32)
    department: str | None = Field(default=None, max_length=32)
    device_install_id: str | None = Field(default=None, max_length=128)
    verification_message_uuid: UUID4 | None = None
    verification_analysis_uuid: UUID4 | None = None
    verification: VerificationSnapshot | None = None


class IncidentReportData(BaseModel):
    alert_uuid: UUID4
    status: Literal["NEW"]
    risk_score_initial: int
    queued_for_osint: bool
    report_uuid: UUID4 | None = None
    public_reference: str | None = None
