from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.structure import StructureType, PriorityLevel

class StructureBase(BaseModel):
    name: str
    structure_type: StructureType = StructureType.POND
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    approximate_size_ha: Optional[float] = None
    construction_year: Optional[int] = None
    state: Optional[str] = "Madhya Pradesh"
    district: Optional[str] = "Datia"
    block: Optional[str] = "Seondha"
    village: Optional[str] = None

class StructureCreate(StructureBase):
    id: Optional[str] = None

class StructureResponse(StructureBase):
    id: str
    approximate_size_sqm: Optional[float] = None
    priority: PriorityLevel
    water_retention_score: Optional[float] = 0.0
    assessment_reason: Optional[str] = None
    mean_dry_season_ndwi: Optional[float] = None
    cumulative_rainfall_mm: Optional[float] = None
    last_assessed_at: Optional[datetime] = None
    assigned_worker_id: Optional[str] = None
    assigned_worker_name: Optional[str] = None
    created_at: datetime
    latest_inspection_status: Optional[str] = None

    class Config:
        from_attributes = True

class StructureUploadSummary(BaseModel):
    total_rows: int
    valid_count: int
    failed_count: int
    below_resolution_limit_count: int
    high_priority_count: int
    medium_priority_count: int
    low_priority_count: int
    cannot_assess_count: int
    errors: List[dict]
