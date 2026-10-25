import math
from typing import Tuple, Optional
from app.core.config import settings

def validate_coordinates(lat: float, lon: float) -> Tuple[bool, Optional[str]]:
    """
    Validates whether latitude and longitude are valid numbers and lie within India's bounds.
    """
    if lat is None or lon is None:
        return False, "Coordinates cannot be null"
    
    try:
        lat = float(lat)
        lon = float(lon)
    except (ValueError, TypeError):
        return False, f"Invalid numeric format: lat={lat}, lon={lon}"
    
    if math.isnan(lat) or math.isnan(lon):
        return False, "Coordinates cannot be NaN"

    if not (-90.0 <= lat <= 90.0):
        return False, f"Latitude {lat} is out of valid range [-90, 90]"

    if not (-180.0 <= lon <= 180.0):
        return False, f"Longitude {lon} is out of valid range [-180, 180]"

    # Check India bounding box
    if not (settings.INDIA_LAT_MIN <= lat <= settings.INDIA_LAT_MAX and 
            settings.INDIA_LON_MIN <= lon <= settings.INDIA_LON_MAX):
        return False, (
            f"Coordinates ({lat:.4f}, {lon:.4f}) lie outside India's territory "
            f"[{settings.INDIA_LAT_MIN}°N - {settings.INDIA_LAT_MAX}°N, {settings.INDIA_LON_MIN}°E - {settings.INDIA_LON_MAX}°E]"
        )

    return True, None

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on the earth in meters.
    Useful for field worker GPS proximity check.
    """
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return round(R * c, 2)
