from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSON, UUID

from app.database import Base


class CampaignAlert(Base):
    __tablename__ = "campaign_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_type = Column(String(100), nullable=False, index=True)
    matched_rules = Column(JSON, nullable=True)
    incident_count = Column(Integer, nullable=False, default=1)
    dominant_region = Column(String(50), nullable=True)
    status = Column(String(20), nullable=False, default="ACTIVE", index=True)
    first_seen = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    last_seen = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
