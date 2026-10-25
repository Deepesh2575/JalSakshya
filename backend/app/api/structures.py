from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
import io
import pandas as pd

from app.db.session import get_db
from app.models.structure import Structure, StructureType, PriorityLevel
from app.models.satellite import SatelliteObservation
from app.models.inspection import FieldInspection
from app.schemas.structure import StructureResponse, StructureCreate, StructureUploadSummary
from app.services.excel_parser import parse_structure_file
from app.services.satellite_engine import analyze_structure_imagery
from app.services.ranking_service import compute_structure_priority_and_reason
from app.services.coordinate_validator import validate_coordinates
from app.core.config import settings

router = APIRouter(prefix="/structures", tags=["Structures"])

@router.get("", response_model=List[StructureResponse])
def list_structures(
    priority: Optional[PriorityLevel] = Query(None, description="Filter by priority category"),
    structure_type: Optional[StructureType] = Query(None, description="Filter by type (pond, check dam, etc.)"),
    district: Optional[str] = Query(None, description="Filter by district"),
    search: Optional[str] = Query(None, description="Search by name, ID or village"),
    assigned_worker_id: Optional[str] = Query(None, description="Filter by assigned field worker"),
    db: Session = Depends(get_db)
):
    query = db.query(Structure)

    if priority:
        query = query.filter(Structure.priority == priority)
    if structure_type:
        query = query.filter(Structure.structure_type == structure_type)
    if district:
        query = query.filter(Structure.district.ilike(f"%{district}%"))
    if assigned_worker_id:
        query = query.filter(Structure.assigned_worker_id == assigned_worker_id)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Structure.name.ilike(search_fmt)) |
            (Structure.id.ilike(search_fmt)) |
            (Structure.village.ilike(search_fmt)) |
            (Structure.block.ilike(search_fmt))
        )

    # Order priority: HIGH first, then MEDIUM, then LOW, then CANNOT_ASSESS
    structures = query.order_by(Structure.created_at.desc()).all()

    # Priority custom sort
    priority_order = {
        PriorityLevel.HIGH: 1,
        PriorityLevel.MEDIUM: 2,
        PriorityLevel.LOW: 3,
        PriorityLevel.CANNOT_ASSESS: 4
    }
    structures.sort(key=lambda s: priority_order.get(s.priority, 5))

    # Enrich with latest inspection status
    result = []
    for s in structures:
        item = StructureResponse.from_orm(s)
        latest_insp = (
            db.query(FieldInspection)
            .filter(FieldInspection.structure_id == s.id)
            .order_by(desc(FieldInspection.inspection_date))
            .first()
        )
        if latest_insp:
            item.latest_inspection_status = latest_insp.actual_status.value
        result.append(item)

    return result

@router.get("/template")
def download_sample_template(file_format: str = Query("xlsx", regex="^(xlsx|csv)$")):
    """
    Generates and returns an official Excel or CSV template for structure uploads.
    """
    sample_data = [
        {
            "Structure ID": "STR-MP-DAT-010",
            "Name": "Kalyanpur Check Dam",
            "Type": "check_dam",
            "Latitude": 26.1550,
            "Longitude": 78.7650,
            "Size (ha)": 0.85,
            "Construction Year": 2021,
            "District": "Datia",
            "Block": "Seondha",
            "Village": "Kalyanpur"
        },
        {
            "Structure ID": "STR-MP-DAT-011",
            "Name": "Rampur Gaon Talab",
            "Type": "pond",
            "Latitude": 26.1280,
            "Longitude": 78.8100,
            "Size (ha)": 1.40,
            "Construction Year": 2022,
            "District": "Datia",
            "Block": "Seondha",
            "Village": "Rampur"
        },
        {
            "Structure ID": "STR-MP-DAT-012",
            "Name": "Chhoti Baori (Micro Pond)",
            "Type": "pond",
            "Latitude": 26.1410,
            "Longitude": 78.7900,
            "Size (ha)": 0.08,  # Under resolution limit example
            "Construction Year": 2023,
            "District": "Datia",
            "Block": "Seondha",
            "Village": "Kakarua"
        }
    ]
    df = pd.DataFrame(sample_data)

    if file_format == "csv":
        output = io.StringIO()
        df.to_csv(output, index=False)
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=jalsakshya_structures_template.csv"}
        )
    else:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Structures")
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=jalsakshya_structures_template.xlsx"}
        )

@router.post("/upload", response_model=StructureUploadSummary)
async def upload_structures_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Core Structure Upload Flow:
    1. Reads Excel (.xlsx/.xls) or CSV
    2. Validates coordinates (bounds + India check)
    3. Handles resolution limits (<0.15 ha marked CANNOT_ASSESS)
    4. Triggers Satellite Analysis Engine for every valid structure
    5. Computes multi-factor priority ranking & textual reason
    6. Stores in database
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        valid_items, parse_errors = parse_structure_file(contents, file.filename)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    high_count = 0
    med_count = 0
    low_count = 0
    cannot_assess_count = 0
    below_res_count = 0

    for item in valid_items:
        # Check if structure already exists
        existing = db.query(Structure).filter(Structure.id == item["id"]).first()
        if existing:
            structure = existing
            structure.name = item["name"]
            structure.structure_type = item["structure_type"]
            structure.latitude = item["latitude"]
            structure.longitude = item["longitude"]
            structure.approximate_size_ha = item["approximate_size_ha"]
            structure.approximate_size_sqm = item["approximate_size_sqm"]
            structure.construction_year = item["construction_year"]
            structure.district = item["district"]
            structure.block = item["block"]
            structure.village = item["village"]
        else:
            structure = Structure(
                id=item["id"],
                name=item["name"],
                structure_type=item["structure_type"],
                latitude=item["latitude"],
                longitude=item["longitude"],
                approximate_size_ha=item["approximate_size_ha"],
                approximate_size_sqm=item["approximate_size_sqm"],
                construction_year=item["construction_year"],
                district=item["district"],
                block=item["block"],
                village=item["village"],
                assigned_worker_id="usr-worker-01",
                assigned_worker_name="Ramesh Kushwaha"
            )
            db.add(structure)

        if item.get("is_below_resolution_limit"):
            below_res_count += 1

        # Run Satellite Analysis Engine
        obs_data = analyze_structure_imagery(
            structure_id=item["id"],
            structure_name=item["name"],
            lat=item["latitude"],
            lon=item["longitude"],
            size_ha=item["approximate_size_ha"]
        )

        # Compute multi-factor priority ranking
        priority, retention_score, reason, mean_ndwi, cum_rain = compute_structure_priority_and_reason(
            size_ha=item["approximate_size_ha"],
            observations=obs_data,
            structure_type=item["structure_type"].value
        )

        structure.priority = priority
        structure.water_retention_score = retention_score
        structure.assessment_reason = reason
        structure.mean_dry_season_ndwi = mean_ndwi
        structure.cumulative_rainfall_mm = cum_rain
        structure.last_assessed_at = datetime.utcnow()

        if priority == PriorityLevel.HIGH:
            high_count += 1
        elif priority == PriorityLevel.MEDIUM:
            med_count += 1
        elif priority == PriorityLevel.LOW:
            low_count += 1
        else:
            cannot_assess_count += 1

        # Save observations
        # Delete prior observations if re-uploading
        db.query(SatelliteObservation).filter(SatelliteObservation.structure_id == structure.id).delete()

        for obs in obs_data:
            sat_record = SatelliteObservation(
                structure_id=structure.id,
                observation_date=obs["observation_date"],
                ndwi_value=obs["ndwi_value"],
                mndwi_value=obs["mndwi_value"],
                water_detected=obs["water_detected"],
                water_coverage_pct=obs["water_coverage_pct"],
                estimated_water_area_sqm=obs["estimated_water_area_sqm"],
                cloud_cover_pct=obs["cloud_cover_pct"],
                recent_rainfall_mm=obs["recent_rainfall_mm"],
                snapshot_url=obs["snapshot_url"],
                snapshot_caption=obs["snapshot_caption"],
                is_key_snapshot=obs["is_key_snapshot"]
            )
            db.add(sat_record)

    db.commit()

    total_rows = len(valid_items) + len(parse_errors)
    return StructureUploadSummary(
        total_rows=total_rows,
        valid_count=len(valid_items),
        failed_count=len(parse_errors),
        below_resolution_limit_count=below_res_count,
        high_priority_count=high_count,
        medium_priority_count=med_count,
        low_priority_count=low_count,
        cannot_assess_count=cannot_assess_count,
        errors=parse_errors
    )

@router.get("/{structure_id}", response_model=StructureResponse)
def get_structure(structure_id: str, db: Session = Depends(get_db)):
    structure = db.query(Structure).filter(Structure.id == structure_id).first()
    if not structure:
        raise HTTPException(status_code=404, detail="Structure not found")
    
    resp = StructureResponse.from_orm(structure)
    latest_insp = (
        db.query(FieldInspection)
        .filter(FieldInspection.structure_id == structure.id)
        .order_by(desc(FieldInspection.inspection_date))
        .first()
    )
    if latest_insp:
        resp.latest_inspection_status = latest_insp.actual_status.value
    return resp

@router.post("/{structure_id}/reanalyze", response_model=StructureResponse)
def reanalyze_structure(structure_id: str, db: Session = Depends(get_db)):
    structure = db.query(Structure).filter(Structure.id == structure_id).first()
    if not structure:
        raise HTTPException(status_code=404, detail="Structure not found")

    obs_data = analyze_structure_imagery(
        structure_id=structure.id,
        structure_name=structure.name,
        lat=structure.latitude,
        lon=structure.longitude,
        size_ha=structure.approximate_size_ha
    )

    priority, retention_score, reason, mean_ndwi, cum_rain = compute_structure_priority_and_reason(
        size_ha=structure.approximate_size_ha,
        observations=obs_data,
        structure_type=structure.structure_type.value
    )

    structure.priority = priority
    structure.water_retention_score = retention_score
    structure.assessment_reason = reason
    structure.mean_dry_season_ndwi = mean_ndwi
    structure.cumulative_rainfall_mm = cum_rain
    structure.last_assessed_at = datetime.utcnow()

    db.query(SatelliteObservation).filter(SatelliteObservation.structure_id == structure.id).delete()
    for obs in obs_data:
        db.add(SatelliteObservation(
            structure_id=structure.id,
            observation_date=obs["observation_date"],
            ndwi_value=obs["ndwi_value"],
            mndwi_value=obs["mndwi_value"],
            water_detected=obs["water_detected"],
            water_coverage_pct=obs["water_coverage_pct"],
            estimated_water_area_sqm=obs["estimated_water_area_sqm"],
            cloud_cover_pct=obs["cloud_cover_pct"],
            recent_rainfall_mm=obs["recent_rainfall_mm"],
            snapshot_url=obs["snapshot_url"],
            snapshot_caption=obs["snapshot_caption"],
            is_key_snapshot=obs["is_key_snapshot"]
        ))

    db.commit()
    db.refresh(structure)
    return structure
