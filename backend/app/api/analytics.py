from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.models.structure import Structure, PriorityLevel
from app.models.inspection import FieldInspection, GroundStatus

router = APIRouter(prefix="/analytics", tags=["Analytics & Comparison"])

@router.get("/comparison")
def get_prediction_vs_reality_metrics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Computes satellite triage prediction vs actual ground reality metrics:
    - Confusion Matrix (TP, TN, FP, FN)
    - Accuracy, Precision, Recall
    - Field verification coverage
    - Honesty & Scientific Limitations Disclaimer
    """
    total_structures = db.query(Structure).count()
    cannot_assess_count = db.query(Structure).filter(Structure.priority == PriorityLevel.CANNOT_ASSESS).count()
    high_count = db.query(Structure).filter(Structure.priority == PriorityLevel.HIGH).count()
    med_count = db.query(Structure).filter(Structure.priority == PriorityLevel.MEDIUM).count()
    low_count = db.query(Structure).filter(Structure.priority == PriorityLevel.LOW).count()

    # Get structures that have at least one field verification
    inspections = db.query(FieldInspection).order_by(desc(FieldInspection.inspection_date)).all()
    
    # Map latest inspection per structure
    latest_inspections: Dict[str, FieldInspection] = {}
    for insp in inspections:
        if insp.structure_id not in latest_inspections:
            latest_inspections[insp.structure_id] = insp

    total_verified = len(latest_inspections)

    # Calculate Confusion Matrix
    tp = 0  # Satellite HIGH & Field DRY/DAMAGED (Correctly caught failure)
    tn = 0  # Satellite LOW & Field HOLDING_WATER (Correctly identified functioning pond)
    fp = 0  # Satellite HIGH & Field HOLDING_WATER (False alarm / structure actually holding water)
    fn = 0  # Satellite LOW & Field DRY/DAMAGED (Missed failure)
    partial_agreement = 0

    comparison_records: List[Dict[str, Any]] = []

    for str_id, insp in latest_inspections.items():
        struct = db.query(Structure).filter(Structure.id == str_id).first()
        if not struct:
            continue

        pred = struct.priority
        actual = insp.actual_status

        # Evaluate categorization
        outcome = "UNKNOWN"
        if pred == PriorityLevel.HIGH:
            if actual in [GroundStatus.DRY, GroundStatus.DAMAGED, GroundStatus.NOT_FOUND]:
                tp += 1
                outcome = "TRUE_POSITIVE"
            elif actual == GroundStatus.HOLDING_WATER:
                fp += 1
                outcome = "FALSE_POSITIVE"
            else:
                tp += 1
                outcome = "TRUE_POSITIVE"
        elif pred == PriorityLevel.LOW:
            if actual == GroundStatus.HOLDING_WATER:
                tn += 1
                outcome = "TRUE_NEGATIVE"
            elif actual in [GroundStatus.DRY, GroundStatus.DAMAGED]:
                fn += 1
                outcome = "FALSE_NEGATIVE"
            else:
                partial_agreement += 1
                outcome = "PARTIAL_MATCH"
        elif pred == PriorityLevel.MEDIUM:
            partial_agreement += 1
            outcome = "MODERATE_MATCH"
        else: # CANNOT_ASSESS
            outcome = "UNASSESSED_RESOLUTION_LIMIT"

        comparison_records.append({
            "structure_id": struct.id,
            "structure_name": struct.name,
            "district": struct.district,
            "structure_type": struct.structure_type.value,
            "satellite_priority": pred.value,
            "water_retention_score": struct.water_retention_score,
            "ground_status": actual.value,
            "inspector_name": insp.inspector_name,
            "inspection_date": insp.inspection_date.strftime("%d %b %Y"),
            "bund_condition": insp.bund_condition.value,
            "agrees": insp.agrees_with_satellite,
            "outcome": outcome,
            "notes": insp.notes
        })

    # Accuracy calculation with statistical honesty
    evaluable = tp + tn + fp + fn
    accuracy_pct = round(((tp + tn) / max(1, evaluable)) * 100.0, 1) if evaluable > 0 else 0.0
    precision_pct = round((tp / max(1, tp + fp)) * 100.0, 1) if (tp + fp) > 0 else 0.0
    recall_pct = round((tp / max(1, tp + fn)) * 100.0, 1) if (tp + fn) > 0 else 0.0

    return {
        "summary": {
            "total_structures": total_structures,
            "total_verified": total_verified,
            "verification_rate_pct": round((total_verified / max(1, total_structures)) * 100.0, 1),
            "cannot_assess_count": cannot_assess_count,
            "high_priority_count": high_count,
            "medium_priority_count": med_count,
            "low_priority_count": low_count
        },
        "metrics": {
            "accuracy_pct": accuracy_pct,
            "precision_pct": precision_pct,
            "recall_pct": recall_pct,
            "evaluable_sample_size": evaluable
        },
        "confusion_matrix": {
            "true_positives": tp,
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn,
            "partial_matches": partial_agreement
        },
        "comparison_table": comparison_records,
        "disclaimer": {
            "notice": "Triage Decision-Support Only",
            "message": (
                "Satellite optical observation (Sentinel-2, 10m resolution) acts as a rapid screening tool. "
                "Structures < 0.15 ha cannot be reliably assessed by 10m pixels. High accuracy metrics are provisional "
                "and strictly require statistically significant ground-truth sample sizes before administrative reliance. "
                "Final repair, de-siltation, and budgetary decisions remain exclusively with the designated block/district engineer."
            )
        }
    }
