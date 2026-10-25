import os
import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.structure import Structure, PriorityLevel
from app.models.inspection import FieldInspection, GroundStatus
from app.schemas.inspection import InspectionCreate, InspectionResponse, SyncBatchRequest, SyncBatchResponse
from app.services.coordinate_validator import haversine_distance_meters
from app.core.config import settings

router = APIRouter(prefix="/inspections", tags=["Field Inspections"])

def evaluate_satellite_ground_agreement(satellite_priority: PriorityLevel, ground_status: GroundStatus) -> bool:
    """
    Evaluates whether ground physical inspection validates satellite prediction:
    - HIGH Priority (satellite says failed/empty) is validated by DRY or DAMAGED ground status.
    - LOW Priority (satellite says holding water) is validated by HOLDING_WATER ground status.
    - MEDIUM Priority is validated by PARTIALLY_FILLED or DRY.
    """
    if satellite_priority == PriorityLevel.HIGH:
        return ground_status in [GroundStatus.DRY, GroundStatus.DAMAGED, GroundStatus.NOT_FOUND]
    elif satellite_priority == PriorityLevel.LOW:
        return ground_status == GroundStatus.HOLDING_WATER
    elif satellite_priority == PriorityLevel.MEDIUM:
        return ground_status in [GroundStatus.PARTIALLY_FILLED, GroundStatus.DRY]
    return True

@router.post("", response_model=InspectionResponse)
def submit_inspection(data: InspectionCreate, db: Session = Depends(get_db)):
    structure = db.query(Structure).filter(Structure.id == data.structure_id).first()
    if not structure:
        raise HTTPException(status_code=404, detail="Structure not found")

    # Calculate distance to structure
    dist_m = haversine_distance_meters(
        data.worker_latitude, data.worker_longitude,
        structure.latitude, structure.longitude
    )

    agrees = evaluate_satellite_ground_agreement(structure.priority, data.actual_status)

    insp_id = data.id or f"insp-{uuid.uuid4().hex[:8]}"
    existing = db.query(FieldInspection).filter(FieldInspection.id == insp_id).first()
    if existing:
        insp = existing
        insp.actual_status = data.actual_status
        insp.water_depth_meters = data.water_depth_meters
        insp.bund_condition = data.bund_condition
        insp.siltation_level = data.siltation_level
        insp.photo_url = data.photo_url
        insp.notes = data.notes
        insp.worker_latitude = data.worker_latitude
        insp.worker_longitude = data.worker_longitude
        insp.gps_distance_to_structure_m = dist_m
        insp.agrees_with_satellite = agrees
        insp.is_offline_synced = data.is_offline_synced or False
        insp.synced_at = datetime.utcnow()
    else:
        insp = FieldInspection(
            id=insp_id,
            structure_id=structure.id,
            inspector_id=data.inspector_id,
            inspector_name=data.inspector_name,
            inspection_date=data.recorded_at_client or datetime.utcnow(),
            actual_status=data.actual_status,
            water_depth_meters=data.water_depth_meters,
            bund_condition=data.bund_condition,
            siltation_level=data.siltation_level,
            photo_url=data.photo_url,
            notes=data.notes,
            worker_latitude=data.worker_latitude,
            worker_longitude=data.worker_longitude,
            gps_distance_to_structure_m=dist_m,
            agrees_with_satellite=agrees,
            recorded_at_client=data.recorded_at_client,
            synced_at=datetime.utcnow(),
            is_offline_synced=data.is_offline_synced or False
        )
        db.add(insp)

    db.commit()
    db.refresh(insp)
    return insp

@router.post("/sync-batch", response_model=SyncBatchResponse)
def sync_offline_inspections(batch: SyncBatchRequest, db: Session = Depends(get_db)):
    """
    Offline-First Mobile Sync Endpoint:
    Receives batch of locally stored inspections recorded while offline on the field worker mobile app.
    Validates GPS coordinates, stores ground truth, and computes satellite vs ground agreement.
    """
    synced_ids = []
    errors = []

    for item in batch.inspections:
        try:
            structure = db.query(Structure).filter(Structure.id == item.structure_id).first()
            if not structure:
                errors.append({"id": item.id, "error": f"Structure {item.structure_id} not found."})
                continue

            dist_m = haversine_distance_meters(
                item.worker_latitude, item.worker_longitude,
                structure.latitude, structure.longitude
            )

            agrees = evaluate_satellite_ground_agreement(structure.priority, item.actual_status)

            insp_id = item.id or f"insp-{uuid.uuid4().hex[:8]}"
            existing = db.query(FieldInspection).filter(FieldInspection.id == insp_id).first()
            if existing:
                insp = existing
                insp.actual_status = item.actual_status
                insp.water_depth_meters = item.water_depth_meters
                insp.bund_condition = item.bund_condition
                insp.siltation_level = item.siltation_level
                insp.photo_url = item.photo_url
                insp.notes = item.notes
                insp.worker_latitude = item.worker_latitude
                insp.worker_longitude = item.worker_longitude
                insp.gps_distance_to_structure_m = dist_m
                insp.agrees_with_satellite = agrees
                insp.is_offline_synced = True
                insp.synced_at = datetime.utcnow()
            else:
                insp = FieldInspection(
                    id=insp_id,
                    structure_id=structure.id,
                    inspector_id=item.inspector_id,
                    inspector_name=item.inspector_name,
                    inspection_date=item.recorded_at_client or datetime.utcnow(),
                    actual_status=item.actual_status,
                    water_depth_meters=item.water_depth_meters,
                    bund_condition=item.bund_condition,
                    siltation_level=item.siltation_level,
                    photo_url=item.photo_url,
                    notes=item.notes,
                    worker_latitude=item.worker_latitude,
                    worker_longitude=item.worker_longitude,
                    gps_distance_to_structure_m=dist_m,
                    agrees_with_satellite=agrees,
                    recorded_at_client=item.recorded_at_client,
                    synced_at=datetime.utcnow(),
                    is_offline_synced=True
                )
                db.add(insp)

            db.commit()
            synced_ids.append(insp_id)
        except Exception as e:
            db.rollback()
            errors.append({"id": item.id, "error": str(e)})

    return SyncBatchResponse(
        synced_count=len(synced_ids),
        failed_count=len(errors),
        synced_ids=synced_ids,
        errors=errors
    )

@router.post("/upload-photo")
async def upload_inspection_photo(file: UploadFile = File(...)):
    """
    Accepts field worker ground-truth photo uploads.
    """
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"field_{uuid.uuid4().hex[:12]}{ext}"
    dest_path = settings.FIELD_PHOTOS_DIR / filename
    
    with open(dest_path, "wb") as f:
        content = await file.read()
        f.write(content)

    return {
        "filename": filename,
        "photo_url": f"/api/v1/inspections/photos/{filename}"
    }

@router.get("/photos/{filename}")
def serve_field_photo(filename: str):
    path = settings.FIELD_PHOTOS_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(path)

@router.get("/structure/{structure_id}", response_model=List[InspectionResponse])
def get_structure_inspections(structure_id: str, db: Session = Depends(get_db)):
    return (
        db.query(FieldInspection)
        .filter(FieldInspection.structure_id == structure_id)
        .order_by(FieldInspection.inspection_date.desc())
        .all()
    )
