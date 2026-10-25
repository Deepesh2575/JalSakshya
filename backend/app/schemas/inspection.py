from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.inspection import GroundStatus, BundCondition, SiltationLevel

class InspectionCreate(BaseModel):
    id: Optional[str] = None
    structure_id: str
    inspector_id: str
    inspector_name: str
    actual_status: GroundStatus
    water_depth_meters: Optional[float] = None
    bund_condition: Optional[BundCondition] = BundCondition.INTACT
    siltation_level: Optional[SiltationLevel] = SiltationLevel.LOW
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    worker_latitude: float
    worker_longitude: float
    recorded_at_client: Optional[datetime] = None
    is_offline_synced: Optional[bool] = False

class InspectionResponse(BaseModel):
    id: str
    structure_id: str
    inspector_id: str
    inspector_name: str
    inspection_date: datetime
    actual_status: GroundStatus
    water_depth_meters: Optional[float]
    bund_condition: BundCondition
    siltation_level: SiltationLevel
    photo_url: Optional[str]
    notes: Optional[str]
    worker_latitude: float
    worker_longitude: float
    gps_distance_to_structure_m: Optional[float]
    agrees_with_satellite: Optional[bool]
    is_offline_synced: bool
    synced_at: datetime

    class Config:
        from_attributes = True

class SyncBatchRequest(BaseModel):
    inspections: List[InspectionCreate]

class SyncBatchResponse(BaseModel):
    synced_count: int
    failed_count: int
    synced_ids: List[str]
    errors: List[dict]
