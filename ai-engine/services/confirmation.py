from models.enums import Severity
from models.response_models import ConfirmationInfo
from services.impact_score import calculate_impact_score
import logging

logger = logging.getLogger(__name__)

async def process_confirmation(video_summary: str, current_classification: dict, original_data: dict) -> ConfirmationInfo:
    """
    Compares the new video analysis against the original grievance data to confirm it.
    If the video shows a worse condition, it updates the severity and impact.
    """
    # 1. Semantic Comparison (Mocked for MVP - JevClient could be used here)
    # In a real scenario, ask JevClient: "Does this summary match this original text?"
    original_text = original_data.get("text", "")
    match_confidence = 0.85 # Mocked
    is_confirmed = match_confidence > 0.7
    
    # 2. Severity Recalculation
    previous_severity_str = original_data.get("severity", "LOW").upper()
    try:
        previous_severity = Severity[previous_severity_str]
    except KeyError:
        previous_severity = Severity.LOW

    # Assume classification already evaluated the new severity based on video evidence
    updated_severity_str = current_classification.get("severity", "LOW").upper()
    try:
        updated_severity = Severity[updated_severity_str]
    except KeyError:
        updated_severity = Severity.LOW
        
    severity_weights = {
        Severity.LOW: 1,
        Severity.MEDIUM: 2,
        Severity.HIGH: 3,
        Severity.CRITICAL: 4
    }
    
    # Only upgrade severity, never downgrade (video is new evidence)
    final_severity = updated_severity
    if severity_weights[previous_severity] > severity_weights[updated_severity]:
        final_severity = previous_severity

    # 3. Impact Score Update
    previous_impact = original_data.get("impactScore", 0)
    public_safety_risk = current_classification.get("public_safety_risk", 0.5)
    
    new_impact = calculate_impact_score(
        severity=final_severity,
        public_safety_risk=public_safety_risk,
        affected_people=50 # Hardcoded as in pipeline
    )
    
    impact_delta = new_impact - previous_impact

    # Update classification dictionary with final severity so the pipeline uses it
    current_classification["severity"] = final_severity

    return ConfirmationInfo(
        isConfirmed=is_confirmed,
        matchConfidence=match_confidence,
        previousSeverity=previous_severity.value,
        updatedSeverity=final_severity.value,
        impactScoreDelta=impact_delta,
        fraudFlag=(match_confidence < 0.2)
    )
