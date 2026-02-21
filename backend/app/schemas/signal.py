from typing import Literal
from pydantic import BaseModel, Field, UUID4


SignalChannel = Literal["MOBILE_APP", "WEB_PORTAL"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]


class VerifySignalRequest(BaseModel):
    message: str = Field(min_length=5, max_length=3000)
    channel: SignalChannel = "WEB_PORTAL"
    url: str | None = Field(default=None, max_length=2048)
    phone: str = Field(min_length=8, max_length=32)
    # Backward-compatibility field kept for Sprint 1A transition.
    create_incident: bool | None = None


class VerifySignalData(BaseModel):
    risk_score: int
    risk_level: RiskLevel
    explanation: list[str]
    should_report: bool
    matched_rules: list[str]
    categories_detected: list[str] = Field(default_factory=list)
    recurrence_count: int = Field(default=0, ge=0)


class VerificationSnapshot(BaseModel):
    risk_score: int = Field(ge=0, le=100)
    risk_level: RiskLevel
    should_report: bool
    matched_rules: list[str] = Field(default_factory=list)


class IncidentReportRequest(BaseModel):
    message: str = Field(min_length=5, max_length=3000)
    channel: SignalChannel = "WEB_PORTAL"
    url: str | None = Field(default=None, max_length=2048)
    phone: str = Field(min_length=8, max_length=32)
    verification: VerificationSnapshot | None = None


class IncidentReportData(BaseModel):
    alert_uuid: UUID4
    status: Literal["NEW"]
    risk_score_initial: int
    queued_for_osint: bool
