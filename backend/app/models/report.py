from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    
    alert_id = Column(Integer, ForeignKey("alerts.id"))
    
    # CŒUR DU SYSTÈME : La copie figée intégrale
    # Structure versionnée obligatoire : { "snapshot_version": "1.0", "data": ... }
    snapshot_json = Column(JSONB, nullable=False)
    
    # Preuve d'intégrité : SHA-256 du snapshot_json canonisé
    report_hash = Column(String, index=True, nullable=False)
    
    # Lot 7: Certification Fields
    snapshot_version = Column(String, default="1.0")
    snapshot_hash_sha256 = Column(String) # Alias ou colonne explicite (souvent == report_hash)
    generated_by = Column(String, nullable=True)
    
    # Chemin vers le fichier PDF généré (Artefact physique)
    pdf_path = Column(String, nullable=False)
    
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    # generated_by = Column(Integer, ForeignKey("users.id"), nullable=True) # Pour plus tard
    
    # Relations
    alert = relationship("Alert", backref="reports")
