import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class CitizenMessage(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    content = Column(Text, nullable=False)
    channel = Column(String(32), nullable=False, default="WEB_PORTAL", index=True)
    submitted_url = Column(String, nullable=True)
    ip_hash_submitter = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    analysis = relationship("MessageAnalysis", back_populates="message", uselist=False, cascade="all, delete-orphan")
    reports = relationship("FormalReport", back_populates="message", cascade="all, delete-orphan")


class MessageAnalysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False, unique=True, index=True)
    risk_score = Column(Integer, nullable=False, index=True)
    risk_level = Column(String(16), nullable=False, index=True)
    primary_category = Column(String(128), nullable=True)
    matched_rules = Column(JSON, nullable=False, default=list)
    categories_detected = Column(JSON, nullable=False, default=list)
    explanation = Column(JSON, nullable=False, default=list)
    recommendations = Column(JSON, nullable=False, default=list)
    highlighted_spans = Column(JSON, nullable=False, default=list)
    fon_alert = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    message = relationship("CitizenMessage", back_populates="analysis")
    reports = relationship("FormalReport", back_populates="analysis")


class SuspectNumber(Base):
    __tablename__ = "suspect_numbers"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    phone_hash = Column(String(64), nullable=False, unique=True, index=True)
    phone_ciphertext = Column(Text, nullable=False)
    report_count = Column(Integer, nullable=False, default=0)
    first_seen = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    reports = relationship("FormalReport", back_populates="suspect_number")


class FormalReport(Base):
    __tablename__ = "formal_reports"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    public_reference = Column(String(32), nullable=False, unique=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False, index=True)
    suspect_number_id = Column(Integer, ForeignKey("suspect_numbers.id"), nullable=False, index=True)
    reporter_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String(24), nullable=False, default="NEW", index=True)
    custody_hash = Column(String(64), nullable=False, index=True)
    legacy_alert_uuid = Column(UUID(as_uuid=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    message = relationship("CitizenMessage", back_populates="reports")
    analysis = relationship("MessageAnalysis", back_populates="reports")
    suspect_number = relationship("SuspectNumber", back_populates="reports")
    evidence_items = relationship("EvidenceItem", back_populates="report", cascade="all, delete-orphan")
    impersonation_incidents = relationship(
        "ImpersonationIncident",
        back_populates="formal_report",
        cascade="all, delete-orphan",
    )
    forensic_bundles = relationship("ForensicBundle", back_populates="report", cascade="all, delete-orphan")


class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    report_id = Column(Integer, ForeignKey("formal_reports.id"), nullable=False, index=True)
    type = Column(String(64), nullable=False, default="SCREENSHOT", index=True)
    file_path = Column(String, nullable=False)
    file_hash = Column(String(64), nullable=False, unique=True, index=True)
    content_text_preview = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    report = relationship("FormalReport", back_populates="evidence_items")


class BusinessProfile(Base):
    __tablename__ = "business_profiles"
    __table_args__ = (UniqueConstraint("user_id", name="uq_business_profiles_user_id"),)

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    official_name = Column(String(255), nullable=False, index=True)
    keywords_json = Column(JSON, nullable=False, default=list)
    legit_numbers_json = Column(JSON, nullable=False, default=list)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(64), nullable=True)
    validation_status = Column(String(24), nullable=False, default="PENDING_APPROVAL", index=True)
    validated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    impersonation_incidents = relationship("ImpersonationIncident", back_populates="business_profile")


class ImpersonationIncident(Base):
    __tablename__ = "impersonation_incidents"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    business_profile_id = Column(Integer, ForeignKey("business_profiles.id"), nullable=False, index=True)
    formal_report_id = Column(Integer, ForeignKey("formal_reports.id"), nullable=False, index=True)
    status = Column(String(24), nullable=False, default="NEW", index=True)
    detection_reason = Column(Text, nullable=True)
    custody_hash = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    business_profile = relationship("BusinessProfile", back_populates="impersonation_incidents")
    formal_report = relationship("FormalReport", back_populates="impersonation_incidents")


class ForensicBundle(Base):
    __tablename__ = "forensic_bundles"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    report_id = Column(Integer, ForeignKey("formal_reports.id"), nullable=False, index=True)
    global_hash = Column(String(64), nullable=False, index=True)
    manifest_json = Column(JSON, nullable=False, default=dict)
    zip_path = Column(String, nullable=True)
    pdf_path = Column(String, nullable=True)
    json_path = Column(String, nullable=True)
    status = Column(String(24), nullable=False, default="PENDING", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    transmitted_at = Column(DateTime(timezone=True), nullable=True)

    report = relationship("FormalReport", back_populates="forensic_bundles")
    transmissions = relationship("ExternalTransmission", back_populates="bundle", cascade="all, delete-orphan")


class ExternalTransmission(Base):
    __tablename__ = "external_transmissions"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    bundle_id = Column(Integer, ForeignKey("forensic_bundles.id"), nullable=False, index=True)
    target_type = Column(String(32), nullable=False, index=True)
    target_endpoint = Column(String, nullable=True)
    payload_json = Column(JSON, nullable=False, default=dict)
    status = Column(String(24), nullable=False, default="PENDING", index=True)
    attempts = Column(Integer, nullable=False, default=0)
    ack_reference = Column(String(128), nullable=True)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    delivered_at = Column(DateTime(timezone=True), nullable=True)

    bundle = relationship("ForensicBundle", back_populates="transmissions")
