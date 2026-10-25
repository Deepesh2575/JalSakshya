from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from app.models.structure import Structure, StructureType, PriorityLevel
from app.models.satellite import SatelliteObservation
from app.models.inspection import FieldInspection, GroundStatus, BundCondition, SiltationLevel
from app.models.user import User, UserRole
from app.services.satellite_engine import analyze_structure_imagery
from app.services.ranking_service import compute_structure_priority_and_reason

DEMO_STRUCTURES = [
    {
        "id": "STR-MP-DAT-001",
        "name": "Chandokhar Gram Talab",
        "structure_type": StructureType.POND,
        "latitude": 26.142500,
        "longitude": 78.784200,
        "approximate_size_ha": 1.25,
        "construction_year": 2021,
        "state": "Madhya Pradesh",
        "district": "Datia",
        "block": "Seondha",
        "village": "Chandokhar"
    },
    {
        "id": "STR-MP-DAT-002",
        "name": "Seondha Pahari Check Dam",
        "structure_type": StructureType.CHECK_DAM,
        "latitude": 26.160100,
        "longitude": 78.771200,
        "approximate_size_ha": 0.65,
        "construction_year": 2020,
        "state": "Madhya Pradesh",
        "district": "Datia",
        "block": "Seondha",
        "village": "Pahari"
    },
    {
        "id": "STR-MP-DAT-003",
        "name": "Badera Percolation Tank",
        "structure_type": StructureType.PERCOLATION_TANK,
        "latitude": 26.118900,
        "longitude": 78.815000,
        "approximate_size_ha": 0.85,
        "construction_year": 2022,
        "state": "Madhya Pradesh",
        "district": "Datia",
        "block": "Seondha",
        "village": "Badera"
    },
    {
        "id": "STR-MP-DAT-004",
        "name": "Mataji Ka Pokhar (Micro Pond)",
        "structure_type": StructureType.POND,
        "latitude": 26.134000,
        "longitude": 78.799000,
        "approximate_size_ha": 0.08,  # Below Sentinel-2 0.15 ha threshold!
        "construction_year": 2023,
        "state": "Madhya Pradesh",
        "district": "Datia",
        "block": "Seondha",
        "village": "Kakraua"
    },
    {
        "id": "STR-MH-AHM-005",
        "name": "Nighoj Masonry Check Dam",
        "structure_type": StructureType.CHECK_DAM,
        "latitude": 18.981200,
        "longitude": 74.321000,
        "approximate_size_ha": 1.40,
        "construction_year": 2019,
        "state": "Maharashtra",
        "district": "Ahmednagar",
        "block": "Parner",
        "village": "Nighoj"
    },
    {
        "id": "STR-MH-AHM-006",
        "name": "Ralegan Siddhi Water Harvesting Lake",
        "structure_type": StructureType.POND,
        "latitude": 19.018000,
        "longitude": 74.451000,
        "approximate_size_ha": 2.80,
        "construction_year": 2018,
        "state": "Maharashtra",
        "district": "Ahmednagar",
        "block": "Parner",
        "village": "Ralegan Siddhi"
    },
    {
        "id": "STR-MP-DAT-007",
        "name": "Bhander Gaon Amrit Sarovar",
        "structure_type": StructureType.AMRIT_SAROVAR,
        "latitude": 25.864000,
        "longitude": 78.961000,
        "approximate_size_ha": 1.10,
        "construction_year": 2022,
        "state": "Madhya Pradesh",
        "district": "Datia",
        "block": "Bhander",
        "village": "Bhander"
    },
    {
        "id": "STR-MP-DAT-008",
        "name": "Khiriya Nala Micro Bandhara",
        "structure_type": StructureType.CHECK_DAM,
        "latitude": 26.195000,
        "longitude": 78.720000,
        "approximate_size_ha": 0.06,  # Below threshold
        "construction_year": 2021,
        "state": "Madhya Pradesh",
        "district": "Datia",
        "block": "Seondha",
        "village": "Khiriya"
    }
]

def seed_database_if_empty(db: Session):
    """
    Seeds initial realistic structures, satellite observations, demo users, and ground-truth inspections.
    """
    # Check if structures already exist
    existing_count = db.query(Structure).count()
    if existing_count > 0:
        return

    # 1. Create Default Users
    users = [
        User(
            id="usr-admin-01",
            username="admin",
            email="admin@jalsakshya.gov.in",
            full_name="Collector / Chief Engineer",
            hashed_password="demo_password_hash",
            role=UserRole.ADMIN,
            district="Datia"
        ),
        User(
            id="usr-officer-01",
            username="officer",
            email="sharma.officer@jalsakshya.gov.in",
            full_name="Rajesh Sharma (Block Dev Officer)",
            hashed_password="demo_password_hash",
            role=UserRole.OFFICER,
            district="Datia"
        ),
        User(
            id="usr-worker-01",
            username="worker",
            email="ramesh.field@jalsakshya.gov.in",
            full_name="Ramesh Kushwaha (Gram Rozgar Sahayak)",
            hashed_password="demo_password_hash",
            role=UserRole.FIELD_WORKER,
            district="Datia"
        )
    ]
    db.add_all(users)
    db.commit()

    # 2. Add Structures and Run Satellite Analysis Engine
    for item in DEMO_STRUCTURES:
        # Create structure model
        structure = Structure(
            id=item["id"],
            name=item["name"],
            structure_type=item["structure_type"],
            latitude=item["latitude"],
            longitude=item["longitude"],
            approximate_size_ha=item["approximate_size_ha"],
            approximate_size_sqm=item["approximate_size_ha"] * 10000.0 if item["approximate_size_ha"] else None,
            construction_year=item["construction_year"],
            state=item["state"],
            district=item["district"],
            block=item["block"],
            village=item["village"],
            assigned_worker_id="usr-worker-01",
            assigned_worker_name="Ramesh Kushwaha"
        )

        # Run satellite imagery analysis
        obs_data = analyze_structure_imagery(
            structure_id=item["id"],
            structure_name=item["name"],
            lat=item["latitude"],
            lon=item["longitude"],
            size_ha=item["approximate_size_ha"]
        )

        # Compute priority and explainable reason
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

        db.add(structure)
        db.flush()

        # Add satellite observations
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

    # 3. Add a few Ground Truth Field Inspections to demonstrate Comparison View & Accuracy Metrics!
    inspections = [
        # Check Dam #2 (Satellite flagged HIGH priority / failed) -> Field worker verifies DRY / BREACHED bund
        FieldInspection(
            id="insp-001",
            structure_id="STR-MP-DAT-002",
            inspector_id="usr-worker-01",
            inspector_name="Ramesh Kushwaha",
            inspection_date=datetime.utcnow() - timedelta(days=5),
            actual_status=GroundStatus.DAMAGED,
            water_depth_meters=0.0,
            bund_condition=BundCondition.BREACHED,
            siltation_level=SiltationLevel.SEVERE,
            notes="Right flank masonry embankment washed out during July flash floods. Pond bed completely desiccated and cracked. Needs NREGA desiltation and revetment repair.",
            worker_latitude=26.160120,
            worker_longitude=78.771180,
            gps_distance_to_structure_m=4.2,
            agrees_with_satellite=True,
            is_offline_synced=True
        ),
        # Pond #1 (Satellite predicted LOW priority / holding water) -> Field worker verifies HOLDING WATER
        FieldInspection(
            id="insp-002",
            structure_id="STR-MP-DAT-001",
            inspector_id="usr-worker-01",
            inspector_name="Ramesh Kushwaha",
            inspection_date=datetime.utcnow() - timedelta(days=3),
            actual_status=GroundStatus.HOLDING_WATER,
            water_depth_meters=1.8,
            bund_condition=BundCondition.INTACT,
            siltation_level=SiltationLevel.LOW,
            notes="Water level is 1.8m deep. Livestock drinking and local irrigation actively in use. Pitching intact.",
            worker_latitude=26.142490,
            worker_longitude=78.784210,
            gps_distance_to_structure_m=2.1,
            agrees_with_satellite=True,
            is_offline_synced=True
        ),
        # Structure #5 (Satellite flagged HIGH priority / failed) -> Field worker verifies DRY
        FieldInspection(
            id="insp-003",
            structure_id="STR-MH-AHM-005",
            inspector_id="usr-worker-01",
            inspector_name="Ramesh Kushwaha",
            inspection_date=datetime.utcnow() - timedelta(days=2),
            actual_status=GroundStatus.DRY,
            water_depth_meters=0.0,
            bund_condition=BundCondition.PARTIAL_EROSION,
            siltation_level=SiltationLevel.MODERATE,
            notes="Water basin completely dry. Spillway has minor leakage. No water retained.",
            worker_latitude=18.981250,
            worker_longitude=74.321040,
            gps_distance_to_structure_m=7.5,
            agrees_with_satellite=True,
            is_offline_synced=True
        )
    ]
    db.add_all(inspections)
    db.commit()
