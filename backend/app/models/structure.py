from datetime import datetime
import enum
from sqlalchemy import Column, String, Float, Integer, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class StructureType(str, enum.Enum):
    POND = "pond"
    CHECK_DAM = "check_dam"
    PERCOLATION_TANK = "percolation_tank"
    AMRIT_SAROVAR = "amrit_sarovar"
    OTHER = "other"

class PriorityLevel(str, enum.Enum):
    HIGH = "HIGH"               # Likely empty / failed during dry season (needs inspection first)
    MEDIUM = "MEDIUM"           # Fluctuating water / drying prematurely
    LOW = "LOW"                 # Healthy / holding water well
    CANNOT_ASSESS = "CANNOT_ASSESS"  # Structure too small for Sentinel 10m resolution (<0.15 ha)

class Structure(Base):
    __tablename__ = "structures"

    id = Column(String(64), primary_key=True, index=True) # Structure ID provided or auto-generated
    name = Column(String(255), nullable=False)
    structure_type = Column(Enum(StructureType), default=StructureType.POND, nullable=False)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    approximate_size_ha = Column(Float, nullable=True) # Size in hectares
    approximate_size_sqm = Column(Float, nullable=True) # Size in square meters
    construction_year = Column(Integer, nullable=True)
    
    # Administrative location
    state = Column(String(100), default="Madhya Pradesh")
    district = Column(String(100), default="Datia", index=True)
    block = Column(String(100), default="Seondha")
    village = Column(String(100), default="Gram Panchayat")
    
    # Priority & Satellite Assessment Summary
    priority = Column(Enum(PriorityLevel), default=PriorityLevel.CANNOT_ASSESS, index=True)
    water_retention_score = Column(Float, default=0.0) # 0 to 100%
    assessment_reason = Column(Text, nullable=True)
    mean_dry_season_ndwi = Column(Float, nullable=True)
    cumulative_rainfall_mm = Column(Float, nullable=True)
    last_assessed_at = Column(DateTime, nullable=True)

    # Assigned Field Worker
    assigned_worker_id = Column(String(64), nullable=True, index=True)
    assigned_worker_name = Column(String(150), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    observations = relationship("SatelliteObservation", back_populates="structure", cascade="all, delete-orphan", order_by="SatelliteObservation.observation_date")
    inspections = relationship("FieldInspection", back_populates="structure", cascade="all, delete-orphan", order_by="FieldInspection.inspection_date.desc()")
