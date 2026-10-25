from datetime import datetime, date
from sqlalchemy import Column, String, Float, Integer, Date, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class SatelliteObservation(Base):
    __tablename__ = "satellite_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    structure_id = Column(String(64), ForeignKey("structures.id", ondelete="CASCADE"), nullable=False, index=True)
    
    observation_date = Column(Date, nullable=False, index=True)
    
    # Satellite Spectral Indices
    # NDWI = (Band 3 Green - Band 8 NIR) / (Band 3 Green + Band 8 NIR)
    # Values > 0 typically indicate water; < 0 indicate bare soil, rock, vegetation.
    ndwi_value = Column(Float, nullable=False)
    mndwi_value = Column(Float, nullable=True) # Modified NDWI using SWIR (Band 11)
    
    # Derived Water Metrics
    water_detected = Column(Boolean, default=False)
    water_coverage_pct = Column(Float, default=0.0) # 0 to 100% of structure bounding polygon
    estimated_water_area_sqm = Column(Float, default=0.0)
    cloud_cover_pct = Column(Float, default=0.0)
    
    # Rainfall Overlay (CHIRPS / IMD precipitation in mm for the preceding 14-30 days)
    recent_rainfall_mm = Column(Float, default=0.0)
    
    # Visual Snapshot Metadata (Sentinel-2 True Color RGB or False Color NIR)
    snapshot_url = Column(String(500), nullable=True)
    snapshot_type = Column(String(50), default="FALSE_COLOR_WATER") # FALSE_COLOR_WATER, TRUE_COLOR, NDWI_MASK
    snapshot_caption = Column(String(255), nullable=True)
    is_key_snapshot = Column(Boolean, default=False) # Marked for gallery display (3-4 key dry season dates)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    structure = relationship("Structure", back_populates="observations")
