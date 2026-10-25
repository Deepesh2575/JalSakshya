import io
import re
from typing import List, Dict, Any, Tuple
import pandas as pd
from app.services.coordinate_validator import validate_coordinates
from app.models.structure import StructureType, PriorityLevel
from app.core.config import settings

COLUMN_SYNONYMS = {
    "id": ["structure id", "structure_id", "id", "str_id", "code", "pond_id", "dam_id"],
    "name": ["structure name", "structure_name", "name", "pond name", "dam name", "asset name", "title"],
    "structure_type": ["type", "structure type", "structure_type", "asset type", "category"],
    "latitude": ["latitude", "lat", "y", "latitude_deg", "latitude_dd"],
    "longitude": ["longitude", "long", "lon", "lng", "x", "longitude_deg", "longitude_dd"],
    "approximate_size_ha": ["approximate size", "approximate_size", "size", "size (ha)", "size_ha", "area", "area (ha)", "area_ha", "hectares"],
    "approximate_size_sqm": ["size (sqm)", "size_sqm", "area (sqm)", "area_sqm", "square meters", "sqm"],
    "construction_year": ["construction year", "construction_year", "year", "built year", "year of construction", "completion year"],
    "district": ["district", "dist", "zilla"],
    "block": ["block", "tehsil", "taluk", "taluka"],
    "village": ["village", "gram panchayat", "gp", "location"]
}

def normalize_column_name(col: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9]', ' ', str(col)).strip().lower()
    for standard_col, synonyms in COLUMN_SYNONYMS.items():
        if cleaned in synonyms:
            return standard_col
    return cleaned

def parse_structure_file(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Parses CSV or Excel file containing structure listings.
    Returns:
        (valid_structures_list, validation_errors_list)
    """
    filename_lower = filename.lower()
    try:
        if filename_lower.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(file_bytes))
        elif filename_lower.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            raise ValueError(f"Unsupported file format: {filename}. Please upload an .xlsx, .xls, or .csv file.")
    except Exception as e:
        raise ValueError(f"Failed to read file: {str(e)}")

    # Rename columns using synonym matching
    col_mapping = {col: normalize_column_name(col) for col in df.columns}
    df.rename(columns=col_mapping, inplace=True)

    valid_structures = []
    errors = []

    for index, row in df.iterrows():
        row_num = index + 2  # Excel row numbers usually start at 2 (1-based + 1 for header)
        
        # Check required fields
        lat_raw = row.get("latitude")
        lon_raw = row.get("longitude")
        
        if pd.isna(lat_raw) or pd.isna(lon_raw):
            errors.append({
                "row": row_num,
                "error": "Missing latitude or longitude coordinates."
            })
            continue

        try:
            lat = float(lat_raw)
            lon = float(lon_raw)
        except (ValueError, TypeError):
            errors.append({
                "row": row_num,
                "error": f"Invalid coordinate numbers: lat='{lat_raw}', lon='{lon_raw}'"
            })
            continue

        # Coordinate geo-validation
        is_valid_coords, coord_err = validate_coordinates(lat, lon)
        if not is_valid_coords:
            errors.append({
                "row": row_num,
                "error": coord_err
            })
            continue

        # Structure ID
        str_id = str(row.get("id", "")).strip() if not pd.isna(row.get("id")) else ""
        if not str_id or str_id.lower() == "nan":
            str_id = f"STR-{int(lat*1000)}-{int(lon*1000)}"

        # Name
        str_name = str(row.get("name", "")).strip() if not pd.isna(row.get("name")) else ""
        if not str_name or str_name.lower() == "nan":
            str_name = f"Water Structure {str_id}"

        # Structure Type mapping
        raw_type = str(row.get("structure_type", "")).strip().lower()
        if "check" in raw_type or "dam" in raw_type or "anicut" in raw_type:
            stype = StructureType.CHECK_DAM
        elif "percolat" in raw_type:
            stype = StructureType.PERCOLATION_TANK
        elif "amrit" in raw_type or "sarovar" in raw_type:
            stype = StructureType.AMRIT_SAROVAR
        else:
            stype = StructureType.POND

        # Size in hectares or sqm
        size_ha = None
        if not pd.isna(row.get("approximate_size_ha")):
            try:
                size_ha = float(row.get("approximate_size_ha"))
            except (ValueError, TypeError):
                pass
        elif not pd.isna(row.get("approximate_size_sqm")):
            try:
                size_ha = float(row.get("approximate_size_sqm")) / 10000.0
            except (ValueError, TypeError):
                pass

        if size_ha is not None and size_ha <= 0:
            size_ha = None

        # Construction Year
        year = None
        if not pd.isna(row.get("construction_year")):
            try:
                year_val = int(float(row.get("construction_year")))
                if 1950 <= year_val <= 2030:
                    year = year_val
            except (ValueError, TypeError):
                pass

        # Administrative details
        district = str(row.get("district", "Datia")).strip() if not pd.isna(row.get("district")) else "Datia"
        block = str(row.get("block", "Seondha")).strip() if not pd.isna(row.get("block")) else "Seondha"
        village = str(row.get("village", "Village Ward")).strip() if not pd.isna(row.get("village")) else "Village Ward"

        # Resolution flag
        is_small = size_ha is not None and size_ha < settings.MIN_ASSESSABLE_SIZE_HA

        valid_structures.append({
            "id": str_id,
            "name": str_name,
            "structure_type": stype,
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "approximate_size_ha": round(size_ha, 3) if size_ha else None,
            "approximate_size_sqm": round(size_ha * 10000.0, 1) if size_ha else None,
            "construction_year": year,
            "district": district,
            "block": block,
            "village": village,
            "is_below_resolution_limit": is_small
        })

    return valid_structures, errors
