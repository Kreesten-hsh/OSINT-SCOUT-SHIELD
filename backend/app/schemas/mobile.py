from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class MobileBootstrapData(BaseModel):
    departments: list[str] = Field(default_factory=list)
    minimum_supported_version: str


class MobileHistoryItem(BaseModel):
    type: Literal["VERIFY", "REPORT"]
    created_at: datetime
    risk_score: int
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    primary_category: str | None = None
    masked_phone: str
    public_reference: str | None = None
    status: str | None = None


class MobileHistoryData(BaseModel):
    items: list[MobileHistoryItem] = Field(default_factory=list)
