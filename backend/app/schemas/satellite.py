from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel

class SatelliteObservationResponse(BaseModel):
    id: int
    structure_id: str
    observation_date: date
    ndwi_value: float
    mndwi_value: Optional[float] = None
    water_detected: bool
    water_coverage_pct: float
    estimated_water_area_sqm: float
    cloud_cover_pct: float
    recent_rainfall_mm: float
    snapshot_url: Optional[str] = None
    snapshot_caption: Optional[str] = None
    is_key_snapshot: bool

    class Config:
        from_attributes = True

class StructureSatelliteDetail(BaseModel):
    structure_id: str
    structure_name: str
    structure_type: str
    latitude: float
    longitude: float
    approximate_size_ha: Optional[float]
    priority: str
    assessment_reason: Optional[str]
    water_retention_score: Optional[float]
    mean_dry_season_ndwi: Optional[float]
    cumulative_rainfall_mm: Optional[float]
    observations: List[SatelliteObservationResponse]
    key_snapshots: List[SatelliteObservationResponse]
