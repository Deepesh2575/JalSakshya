from typing import List, Dict, Any, Tuple
from app.models.structure import PriorityLevel
from app.core.config import settings

def compute_structure_priority_and_reason(
    size_ha: float,
    observations: List[Dict[str, Any]],
    structure_type: str = "pond"
) -> Tuple[PriorityLevel, float, str, float, float]:
    """
    Evaluates satellite observations over dry season and computes:
    (priority, water_retention_score, explainable_reason, mean_dry_season_ndwi, cumulative_rainfall_mm)
    """
    # 1. Check size resolution limitation
    if size_ha is not None and size_ha < settings.MIN_ASSESSABLE_SIZE_HA:
        reason = (
            f"Cannot assess – Structure area ({size_ha:.2f} ha / {size_ha * 10000:.0f} m²) is below the "
            f"Sentinel-2 10m spatial resolution threshold ({settings.MIN_ASSESSABLE_SIZE_HA} ha / {settings.MIN_ASSESSABLE_SIZE_SQM:.0f} m²). "
            f"Sub-pixel mixed reflectance causes false readings. Ground physical verification required."
        )
        return PriorityLevel.CANNOT_ASSESS, 0.0, reason, 0.0, 0.0

    if not observations:
        return PriorityLevel.CANNOT_ASSESS, 0.0, "No satellite observations available for this coordinate.", 0.0, 0.0

    # Extract dry season observations (Nov to May in India)
    dry_season_obs = [
        obs for obs in observations 
        if obs["observation_date"].month in [11, 12, 1, 2, 3, 4, 5]
    ]

    if not dry_season_obs:
        dry_season_obs = observations[-5:]

    # Calculate average NDWI during dry season
    ndwi_values = [obs["ndwi_value"] for obs in dry_season_obs]
    mean_dry_ndwi = sum(ndwi_values) / len(ndwi_values)
    
    # Calculate cumulative recent rainfall across observations
    cumulative_rain = sum(obs.get("recent_rainfall_mm", 0.0) for obs in observations)

    # Count dry months with water presence
    wet_dry_months_count = sum(1 for obs in dry_season_obs if obs["ndwi_value"] > 0.05 and obs["water_coverage_pct"] > 20.0)
    dry_season_length = len(dry_season_obs)
    retention_ratio = wet_dry_months_count / max(1, dry_season_length)
    water_retention_score = round(retention_ratio * 100.0, 1)

    # Late dry season check (March, April, May)
    late_dry_obs = [
        obs for obs in dry_season_obs 
        if obs["observation_date"].month in [3, 4, 5]
    ]
    late_has_water = any(obs["ndwi_value"] > 0.05 for obs in late_dry_obs) if late_dry_obs else False

    # Multi-factor Priority Ranking Logic
    if mean_dry_ndwi < -0.10 and not late_has_water:
        priority = PriorityLevel.HIGH
        reason = (
            f"High Priority (Likely Empty / Failed): Water vanished completely early in the dry season. "
            f"Mean dry-season NDWI was {mean_dry_ndwi:+.2f} (well below 0.0 threshold) despite cumulative precipitation of {cumulative_rain:.0f}mm. "
            f"Indicative of severe siltation, bund breach, or excessive seepage. Immediate physical inspection recommended."
        )
    elif mean_dry_ndwi < 0.12 or retention_ratio < 0.50:
        priority = PriorityLevel.MEDIUM
        reason = (
            f"Medium Priority: Water presence declined prematurely by mid-summer (retention score {water_retention_score}%). "
            f"Mean dry-season NDWI is {mean_dry_ndwi:+.2f}. Structure partially held water but depleted before the peak drought period. "
            f"Schedule field inspection to evaluate desiltation needs and embankments."
        )
    else:
        priority = PriorityLevel.LOW
        reason = (
            f"Low Priority (Functioning Well): Robust water presence maintained throughout peak dry months (March–May). "
            f"Mean dry-season NDWI is {mean_dry_ndwi:+.2f} with {water_retention_score}% dry-season retention. "
            f"Structure is actively retaining water and serving ground recharge purposes."
        )

    return priority, water_retention_score, reason, round(mean_dry_ndwi, 3), round(cumulative_rain, 1)
