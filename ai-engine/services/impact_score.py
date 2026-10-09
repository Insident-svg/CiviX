from models.enums import Severity

def calculate_impact_score(severity: Severity, public_safety_risk: float, affected_people: int) -> int:
    """
    Deterministically calculates a 0-100 impact score.
    Weights:
      - Severity: 40%
      - Public Safety Risk: 40%
      - Affected People: 20%
    """
    severity_weights = {
        Severity.LOW: 20,
        Severity.MEDIUM: 50,
        Severity.HIGH: 80,
        Severity.CRITICAL: 100
    }
    
    sev_score = severity_weights.get(severity, 20)
    
    # public_safety_risk is expected to be 0.0 to 1.0
    safe_risk = min(max(public_safety_risk, 0.0), 1.0)
    safety_score = safe_risk * 100
    
    # affected_people normalized (cap at 1000 for max score)
    people_score = min((affected_people / 1000.0) * 100, 100)
    
    impact = (sev_score * 0.40) + (safety_score * 0.40) + (people_score * 0.20)
    return int(min(max(impact, 0), 100))
