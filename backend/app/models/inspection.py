from datetime import datetime
import enum
from sqlalchemy import Column, String, Float, Integer, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.db.session import Base

class GroundStatus(str, enum.Enum):
    HOLDING_WATER = "HOLDING_WATER"         # Water present (satisfactory depth)
    PARTIALLY_FILLED = "PARTIALLY_FILLED"   # Shallow / receding water
    DRY = "DRY"                             # Completely dry basin
    DAMAGED = "DAMAGED"                     # Bund breached, spillway broken, heavy siltation
    NOT_FOUND = "NOT_FOUND"                 # Structure does not exist at GPS point or encroached

class BundCondition(str, enum.Enum):
    INTACT = "INTACT"
    PARTIAL_EROSION = "PARTIAL_EROSION"
    BREACHED = "BREACHED"
    UNKNOWN = "UNKNOWN"

class SiltationLevel(str, enum.Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"

class FieldInspection(Base):
    __tablename__ = "field_inspections"

    id = Column(String(64), primary_key=True, index=True) # UUID or client offline UUID
    structure_id = Column(String(64), ForeignKey("structures.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Inspector details
    inspector_id = Column(String(64), nullable=False)
    inspector_name = Column(String(150), nullable=False)
    inspection_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Ground truth observations
    actual_status = Column(Enum(GroundStatus), nullable=False)
    water_depth_meters = Column(Float, nullable=True) # Estimated water depth in meters
    bund_condition = Column(Enum(BundCondition), default=BundCondition.INTACT)
    siltation_level = Column(Enum(SiltationLevel), default=SiltationLevel.LOW)
    
    # Photos and GPS proof
    photo_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    worker_latitude = Column(Float, nullable=False)
    worker_longitude = Column(Float, nullable=False)
    gps_distance_to_structure_m = Column(Float, nullable=True) # Distance in meters between worker & structure
    
    # Offline sync metadata
    recorded_at_client = Column(DateTime, nullable=True) # Timestamp recorded on offline mobile device
    synced_at = Column(DateTime, default=datetime.utcnow)
    is_offline_synced = Column(Boolean, default=False)

    # Verification comparison
    # Compares against the satellite priority at inspection time:
    # Match: (Satellite HIGH & Ground DRY/DAMAGED) or (Satellite LOW & Ground HOLDING_WATER)
    agrees_with_satellite = Column(Boolean, nullable=True)

    # Relationship
    structure = relationship("Structure", back_populates="inspections")
