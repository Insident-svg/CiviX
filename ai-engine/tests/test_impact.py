from services.impact_score import calculate_impact_score
from models.enums import Severity

def test_calculate_impact_score_critical():
    score = calculate_impact_score(Severity.CRITICAL, 1.0, 1000)
    assert score == 100 # 40 + 40 + 20

def test_calculate_impact_score_low():
    score = calculate_impact_score(Severity.LOW, 0.0, 0)
    assert score == 8 # 20*0.4 + 0 + 0

def test_calculate_impact_score_medium_partial():
    score = calculate_impact_score(Severity.MEDIUM, 0.5, 500)
    # 50*0.4 = 20
    # 0.5*100*0.4 = 20
    # 0.5*100*0.2 = 10
    assert score == 50
