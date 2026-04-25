from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, UUID4


WindowFilter = Literal["7d", "30d"]
RiskFilter = Literal["all", "high", "medium", "low"]
TransmissionStatus = Literal["PENDING", "QUEUED", "SENT", "RETRYING", "FAILED", "DELIVERED"]
TransmissionTargetType = Literal["ANSSI_OCRC", "OPERATORS"]


class DepartmentMapPoint(BaseModel):
    department: str
    latitude: float
    longitude: float
    count: int
    high_risk_count: int
    dominant_category: str | None = None
    latest_report_at: datetime | None = None


class MapOverviewTransmissionItem(BaseModel):
    transmission_uuid: UUID4
    public_reference: str
    department: str | None = None
    target_type: TransmissionTargetType
    status: TransmissionStatus
    created_at: datetime


class MapOverviewData(BaseModel):
    window: WindowFilter
    risk: RiskFilter
    category: str | None = None
    total_reports: int
    high_risk_reports: int
    active_departments: int
    dominant_category: str | None = None
    departments: list[DepartmentMapPoint] = Field(default_factory=list)
    top_departments: list[DepartmentMapPoint] = Field(default_factory=list)
    recent_transmissions: list[MapOverviewTransmissionItem] = Field(default_factory=list)
