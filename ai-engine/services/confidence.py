from typing import List, Tuple
from models.response_models import ConfidenceScores

def evaluate_confidence(scores: ConfidenceScores, threshold: float = 0.75) -> Tuple[bool, List[str]]:
    """
    Evaluates confidence scores and determines if human review is needed.
    Returns (needs_review, list_of_reasons).
    """
    needs_review = False
    reasons = []
    
    if scores.category < threshold:
        needs_review = True
        reasons.append("LOW_CATEGORY_CONFIDENCE")
        
    if scores.severity < threshold:
        needs_review = True
        reasons.append("LOW_SEVERITY_CONFIDENCE")
        
    if scores.impact < threshold:
        needs_review = True
        reasons.append("LOW_IMPACT_CONFIDENCE")
        
    return needs_review, reasons
