import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.structure import Structure
from app.models.satellite import SatelliteObservation
from app.schemas.satellite import StructureSatelliteDetail, SatelliteObservationResponse
from app.core.config import settings

router = APIRouter(prefix="/satellite", tags=["Satellite"])

@router.get("/structure/{structure_id}", response_model=StructureSatelliteDetail)
def get_structure_satellite_details(structure_id: str, db: Session = Depends(get_db)):
    structure = db.query(Structure).filter(Structure.id == structure_id).first()
    if not structure:
        raise HTTPException(status_code=404, detail="Structure not found")

    observations = (
        db.query(SatelliteObservation)
        .filter(SatelliteObservation.structure_id == structure_id)
        .order_by(SatelliteObservation.observation_date.asc())
        .all()
    )

    key_snaps = [obs for obs in observations if obs.is_key_snapshot]
    # If no explicitly marked key snapshots, pick 4 distributed across the observation timeline
    if not key_snaps and observations:
        step = max(1, len(observations) // 4)
        key_snaps = [observations[i] for i in range(0, len(observations), step)][:4]

    return StructureSatelliteDetail(
        structure_id=structure.id,
        structure_name=structure.name,
        structure_type=structure.structure_type.value,
        latitude=structure.latitude,
        longitude=structure.longitude,
        approximate_size_ha=structure.approximate_size_ha,
        priority=structure.priority.value,
        assessment_reason=structure.assessment_reason,
        water_retention_score=structure.water_retention_score,
        mean_dry_season_ndwi=structure.mean_dry_season_ndwi,
        cumulative_rainfall_mm=structure.cumulative_rainfall_mm,
        observations=[SatelliteObservationResponse.from_orm(o) for o in observations],
        key_snapshots=[SatelliteObservationResponse.from_orm(s) for s in key_snaps]
    )

@router.get("/snapshots/{filename}")
def serve_snapshot(filename: str):
    file_path = settings.STATIC_SNAPSHOTS_DIR / filename
    if not file_path.is_file():
        # Fallback to simple SVG placeholder if specific snapshot file does not exist
        placeholder_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="320" height="220">
          <rect width="320" height="220" fill="#1e293b"/>
          <text x="160" y="110" fill="#94a3b8" text-anchor="middle" font-family="sans-serif" font-size="12">Sentinel-2 Snapshot ({filename})</text>
        </svg>"""
        return Response(content=placeholder_svg, media_type="image/svg+xml")
    
    return FileResponse(file_path, media_type="image/svg+xml")
