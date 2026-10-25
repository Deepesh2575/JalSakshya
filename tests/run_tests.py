import sys
import os
import unittest
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.services.coordinate_validator import validate_coordinates, haversine_distance_meters
from app.services.satellite_engine import calculate_ndwi, analyze_structure_imagery
from app.services.ranking_service import compute_structure_priority_and_reason
from app.models.structure import PriorityLevel
from app.services.excel_parser import parse_structure_file

class TestJalSakshyaBackend(unittest.TestCase):
    def test_coordinate_validation(self):
        # Valid point in Madhya Pradesh (Datia)
        valid, err = validate_coordinates(26.1425, 78.7842)
        self.assertTrue(valid)
        self.assertIsNone(err)

        # Invalid latitude (out of bounds)
        valid, err = validate_coordinates(95.0, 78.0)
        self.assertFalse(valid)

        # Out of India bounds (e.g. London)
        valid, err = validate_coordinates(51.5074, -0.1278)
        self.assertFalse(valid)
        self.assertIn("outside India", err)

    def test_haversine_distance(self):
        # Two points close to each other
        dist = haversine_distance_meters(26.142500, 78.784200, 26.142510, 78.784210)
        self.assertLess(dist, 20.0)

    def test_ndwi_calculation(self):
        # Pure water
        ndwi_water = calculate_ndwi(0.25, 0.05)
        self.assertGreater(ndwi_water, 0.5)

        # Dry soil / barren land
        ndwi_soil = calculate_ndwi(0.12, 0.28)
        self.assertLess(ndwi_soil, -0.3)

    def test_resolution_limitation(self):
        # Small structure < 0.15 ha must be marked CANNOT_ASSESS
        priority, score, reason, mean_ndwi, cum_rain = compute_structure_priority_and_reason(
            size_ha=0.08,
            observations=[],
            structure_type="pond"
        )
        self.assertEqual(priority, PriorityLevel.CANNOT_ASSESS)
        self.assertIn("below the Sentinel-2 10m spatial resolution", reason)

    def test_csv_parsing(self):
        sample_csv = b"""Structure ID,Name,Latitude,Longitude,Size (ha),Construction Year
STR-TEST-01,Test Talab,26.1425,78.7842,1.2,2022
STR-TEST-02,Invalid Coords,99.99,78.7842,0.8,2021
"""
        valid, errors = parse_structure_file(sample_csv, "test.csv")
        self.assertEqual(len(valid), 1)
        self.assertEqual(valid[0]["id"], "STR-TEST-01")
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["row"], 3)

    def test_satellite_analysis_and_ranking(self):
        obs = analyze_structure_imagery(
            structure_id="STR-TEST-99",
            structure_name="Test Pond",
            lat=26.14,
            lon=78.78,
            size_ha=1.5
        )
        self.assertGreater(len(obs), 5)

        priority, score, reason, mean_ndwi, cum_rain = compute_structure_priority_and_reason(
            size_ha=1.5,
            observations=obs,
            structure_type="pond"
        )
        self.assertIn(priority, [PriorityLevel.HIGH, PriorityLevel.MEDIUM, PriorityLevel.LOW])
        self.assertGreater(len(reason), 20)

if __name__ == "__main__":
    unittest.main()
