from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
from sqlalchemy.dialects.postgresql import UUID

class MonitoringSource(Base):
    __tablename__ = "monitoring_sources"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    
    name = Column(String, index=True)
    url = Column(String) # The target URL or Search Query
    source_type = Column(String, default="WEB") # SEARCH_ENGINE, MARKETPLACE, SOCIAL, WEB
    owner_user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    
    frequency_minutes = Column(Integer, default=1440) # Default daily (24h)
    is_active = Column(Boolean, default=True)
    
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    last_status = Column(String, default="NEVER_RUN") # NEVER_RUN, CLEAN, ALERT, ERROR
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    runs = relationship("ScrapingRun", back_populates="source", cascade="all, delete-orphan")

class ScrapingRun(Base):
    __tablename__ = "scraping_runs"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    
    source_id = Column(Integer, ForeignKey("monitoring_sources.id"))
    
    status = Column(String, default="PENDING") # PENDING, RUNNING, COMPLETED, FAILED
    alerts_generated_count = Column(Integer, default=0)
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    log_message = Column(Text, nullable=True) # "5 signaux trouvés", "Erreur timeout"
    
    source = relationship("MonitoringSource", back_populates="runs")
