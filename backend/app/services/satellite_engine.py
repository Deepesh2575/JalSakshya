import os
import math
from datetime import date, timedelta, datetime
from typing import List, Dict, Any, Tuple
from app.core.config import settings

def calculate_ndwi(green_b03: float, nir_b08: float) -> float:
    """
    Computes Normalized Difference Water Index (NDWI) using Sentinel-2 bands:
    NDWI = (B03 - B08) / (B03 + B08)
    Values range from -1.0 to +1.0.
    Water bodies: > 0.0 (clean deep water often > 0.2)
    Vegetation / Moist soil: -0.2 to 0.0
    Dry barren land / Concrete / Rock: -0.5 to -0.2
    """
    denominator = green_b03 + nir_b08
    if denominator == 0:
        return 0.0
    return round((green_b03 - nir_b08) / denominator, 3)

def generate_satellite_snapshot_svg(
    structure_id: str,
    structure_name: str,
    obs_date: date,
    ndwi: float,
    water_pct: float,
    rainfall_mm: float,
    is_dry_season: bool
) -> str:
    """
    Generates an authentic Sentinel-2 False Color (NIR-Red-Green Band 8-4-3) style satellite card SVG.
    In False Color NIR:
      - Deep/Clean Water appears deep navy blue / black
      - Shallow / turbid water appears cyan-blue
      - Dense vegetation appears bright crimson / red
      - Dry soil / cracked bed appears golden brown / tan
    """
    has_water = ndwi > 0.05 and water_pct > 15.0
    
    # SVG color schemes based on water presence
    if has_water:
        pond_fill = "#0284c7"  # Vibrant water blue
        pond_inner = "#0369a1" # Deep water
        status_label = f"Water Detected ({water_pct:.0f}% area)"
        status_color = "#38bdf8"
        ripple_opacity = "0.7"
    elif ndwi > -0.1 and water_pct > 5.0:
        pond_fill = "#78716c"  # Damp muddy soil / puddles
        pond_inner = "#a8a29e"
        status_label = f"Receding / Muddy ({water_pct:.0f}% area)"
        status_color = "#fbbf24"
        ripple_opacity = "0.3"
    else:
        pond_fill = "#d97706"  # Completely dry barren basin / cracked earth
        pond_inner = "#b45309"
        status_label = "Dry Basin / No Water"
        status_color = "#f87171"
        ripple_opacity = "0.0"

    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="100%" height="100%" style="border-radius: 8px; background: #0f172a; font-family: system-ui, sans-serif;">
  <defs>
    <radialGradient id="grad_{structure_id}_{obs_date.month}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="{pond_inner}" />
      <stop offset="85%" stop-color="{pond_fill}" />
      <stop offset="100%" stop-color="#334155" />
    </radialGradient>
    <pattern id="cracks_{structure_id}_{obs_date.month}" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 0,10 L 10,0 M 10,20 L 20,10 M 0,0 L 20,20" stroke="#78350f" stroke-width="0.8" opacity="{'0.6' if not has_water else '0'}" />
    </pattern>
  </defs>

  <!-- Sentinel-2 False Color Terrain Background -->
  <rect width="320" height="220" fill="#1e293b" />
  
  <!-- Surrounding agricultural fields / terrain -->
  <path d="M 10,15 L 140,25 L 120,95 L 15,85 Z" fill="#3f3f46" stroke="#52525b" stroke-width="1" opacity="0.6" />
  <path d="M 160,20 L 305,30 L 290,110 L 155,90 Z" fill="#27272a" stroke="#52525b" stroke-width="1" opacity="0.6" />
  <path d="M 20,120 L 130,130 L 115,200 L 10,195 Z" fill="#2d3748" stroke="#4a5568" stroke-width="1" opacity="0.6" />
  <path d="M 170,125 L 305,120 L 295,205 L 160,200 Z" fill="#334155" stroke="#4a5568" stroke-width="1" opacity="0.6" />

  <!-- Structure Pond Bounding Basin -->
  <ellipse cx="160" cy="115" rx="72" ry="48" fill="url(#grad_{structure_id}_{obs_date.month})" stroke="#64748b" stroke-width="2" />
  <ellipse cx="160" cy="115" rx="72" ry="48" fill="url(#cracks_{structure_id}_{obs_date.month})" />

  <!-- Water Ripple Indicator -->
  <ellipse cx="160" cy="115" rx="45" ry="28" fill="none" stroke="#bae6fd" stroke-width="1.5" opacity="{ripple_opacity}" />
  <ellipse cx="160" cy="115" rx="24" ry="14" fill="none" stroke="#e0f2fe" stroke-width="1.2" opacity="{ripple_opacity}" />

  <!-- HUD Sentinel-2 Metadata Overlay -->
  <rect x="8" y="8" width="304" height="32" rx="6" fill="#0f172a" fill-opacity="0.85" stroke="#334155" stroke-width="1" />
  <text x="18" y="24" font-size="11" font-weight="bold" fill="#f8fafc">SENTINEL-2 MSI (10m)</text>
  <text x="18" y="35" font-size="9" fill="#94a3b8">Acquired: {obs_date.strftime('%d %b %Y')} | Cloud: &lt;2%</text>
  
  <rect x="220" y="14" width="84" height="20" rx="4" fill="{status_color}" fill-opacity="0.2" stroke="{status_color}" stroke-width="0.8" />
  <text x="262" y="27" font-size="9" font-weight="bold" fill="{status_color}" text-anchor="middle">NDWI: {ndwi:+.2f}</text>

  <!-- Bottom Telemetry Banner -->
  <rect x="8" y="180" width="304" height="32" rx="6" fill="#0f172a" fill-opacity="0.85" stroke="#334155" stroke-width="1" />
  <circle cx="20" cy="196" r="4" fill="{status_color}" />
  <text x="32" y="199" font-size="10" font-weight="600" fill="#f1f5f9">{status_label}</text>
  <text x="302" y="199" font-size="9" fill="#94a3b8" text-anchor="end">Rain: {rainfall_mm:.1f} mm</text>
</svg>"""
    return svg_content

def analyze_structure_imagery(
    structure_id: str,
    structure_name: str,
    lat: float,
    lon: float,
    size_ha: float,
    months_history: int = 12
) -> List[Dict[str, Any]]:
    """
    Simulates multi-temporal Sentinel-2 spectral queries (with MS Planetary Computer / Copernicus STAC fidelity).
    Produces 10-14 bi-weekly dry-season & monsoon observation points with NDWI, water coverage, and rainfall overlay.
    """
    today = date.today()
    start_date = today - timedelta(days=30 * months_history)

    # Resolution Check: Small structures cannot be resolved with Sentinel-2 10m pixels
    size_is_too_small = size_ha is not None and size_ha < settings.MIN_ASSESSABLE_SIZE_HA

    # Generate pseudo-deterministic water profile based on structure coordinates and ID hash
    # Some structures hold water throughout dry season, some dry out in Jan/Feb, some fail immediately
    id_hash = sum(ord(c) for c in str(structure_id))
    profile_type = id_hash % 3  # 0: Healthy, 1: Premature dry / moderate, 2: Failed / dry throughout

    observations = []
    current_date = start_date
    obs_index = 0

    while current_date <= today:
        month = current_date.month
        
        # Rainfall for this date window
        # Indian monsoon: July-Sept heavy; Nov-April dry
        if month in [7, 8, 9]:
            rainfall_mm = 65.0 + 30.0 * math.sin(current_date.day)
            is_dry_season = False
        elif month in [10, 6]:
            rainfall_mm = 15.0 + 10.0 * math.cos(current_date.day)
            is_dry_season = False
        else: # Dry season: Nov, Dec, Jan, Feb, Mar, Apr, May
            rainfall_mm = max(0.0, 3.0 * math.sin(current_date.day * 0.5))
            is_dry_season = True

        # Synthesize spectral bands B03 (Green) and B08 (NIR)
        if size_is_too_small:
            # Random noisy values due to sub-pixel land contamination
            b03 = 0.14 + 0.02 * math.sin(obs_index)
            b08 = 0.16 + 0.02 * math.cos(obs_index)
            ndwi = calculate_ndwi(b03, b08)
            water_pct = 0.0
            water_area_sqm = 0.0
        else:
            if profile_type == 0:  # Low priority / Healthy: holds water through dry season
                if month in [7, 8, 9, 10]: # Peak monsoon
                    ndwi = 0.42 + 0.05 * math.sin(obs_index)
                    water_pct = 95.0
                elif month in [11, 12, 1]: # Early dry season
                    ndwi = 0.32 + 0.04 * math.sin(obs_index)
                    water_pct = 82.0
                elif month in [2, 3, 4]: # Mid dry season
                    ndwi = 0.22 + 0.03 * math.sin(obs_index)
                    water_pct = 65.0
                else: # Peak summer May
                    ndwi = 0.15 + 0.03 * math.sin(obs_index)
                    water_pct = 48.0

            elif profile_type == 1:  # Medium priority: dries rapidly by Feb/March
                if month in [7, 8, 9]:
                    ndwi = 0.35 + 0.04 * math.sin(obs_index)
                    water_pct = 85.0
                elif month in [10, 11]:
                    ndwi = 0.15 + 0.03 * math.sin(obs_index)
                    water_pct = 50.0
                elif month in [12, 1]:
                    ndwi = 0.02 + 0.02 * math.sin(obs_index)
                    water_pct = 25.0
                else: # Feb onwards: dries up
                    ndwi = -0.18 + 0.03 * math.sin(obs_index)
                    water_pct = 0.0

            else:  # High priority / Failed: fails to retain water despite monsoon rain
                if month in [7, 8]: # Temporary flash accumulation
                    ndwi = 0.18 + 0.04 * math.sin(obs_index)
                    water_pct = 40.0
                elif month in [9, 10]:
                    ndwi = -0.05 + 0.02 * math.sin(obs_index)
                    water_pct = 10.0
                else: # Completely dry throughout dry season (Nov - May)
                    ndwi = -0.32 + 0.03 * math.sin(obs_index)
                    water_pct = 0.0

            # Compute estimated water area
            base_sqm = (size_ha or 1.0) * 10000.0
            water_area_sqm = round(base_sqm * (water_pct / 100.0), 1)

        # Mark 3-4 key snapshots across the dry season
        # Key dry season checkpoints: Post-Monsoon (Nov), Early Dry (Jan), Mid Dry (March), Peak Dry (May)
        is_key_snapshot = month in [11, 1, 3, 5] and (current_date.day <= 15)

        # Save snapshot SVG image into static snapshots directory
        svg_filename = f"snapshot_{structure_id}_{current_date.strftime('%Y%m%d')}.svg"
        svg_path = settings.STATIC_SNAPSHOTS_DIR / svg_filename
        svg_markup = generate_satellite_snapshot_svg(
            structure_id=structure_id,
            structure_name=structure_name,
            obs_date=current_date,
            ndwi=ndwi,
            water_pct=water_pct,
            rainfall_mm=rainfall_mm,
            is_dry_season=is_dry_season
        )
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(svg_markup)

        snapshot_url = f"/api/v1/satellite/snapshots/{svg_filename}"

        observations.append({
            "observation_date": current_date,
            "ndwi_value": ndwi,
            "mndwi_value": round(ndwi * 0.95, 3),
            "water_detected": ndwi > 0.05 and water_pct > 10.0,
            "water_coverage_pct": round(water_pct, 1),
            "estimated_water_area_sqm": water_area_sqm,
            "cloud_cover_pct": round(1.2 + 0.8 * math.sin(obs_index), 1),
            "recent_rainfall_mm": round(rainfall_mm, 1),
            "snapshot_url": snapshot_url,
            "snapshot_caption": f"Sentinel-2 MSI {current_date.strftime('%b %Y')} | NDWI: {ndwi:+.2f}",
            "is_key_snapshot": is_key_snapshot
        })

        obs_index += 1
        current_date += timedelta(days=21)  # Every 3 weeks observation

    return observations
