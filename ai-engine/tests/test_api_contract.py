from fastapi.testclient import TestClient
from app import app
from models.enums import Category, Severity

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_analyze_grievance_contract():
    payload = {
        "grievanceId": "GRV-10234",
        "text": "There is a large pothole near NIT gate.",
        "language": None,
        "media": [],
        "location": {
            "latitude": 21.25,
            "longitude": 81.63
        }
    }
    
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["grievanceId"] == "GRV-10234"
    assert data["category"] == Category.ROAD.value
    assert data["severity"] == Severity.HIGH.value
    assert data["impactScore"] == 65
    assert "confidence" in data
    assert data["humanReview"] is True


def test_video_returns_full_analysis_contract(mock_video=None):
    payload = {
        "grievanceId": "VIDEO-100",
        "text": "Road damage shown in video",
        "media": [{"type": "video", "url": "https://example.com/video.mp4"}],
        "location": {"latitude": 21.0, "longitude": 81.0}
    }
    from unittest.mock import AsyncMock, patch
    from models.response_models import AIAnalysisResponse, ConfidenceScores, DuplicateInfo
    from models.enums import Category, Severity

    result = AIAnalysisResponse(
        grievanceId="VIDEO-100", language="English", category=Category.ROAD,
        subCategory="Pothole", severity=Severity.HIGH, departments=[], impactScore=65,
        confidence=ConfidenceScores(category=0.9, severity=0.9, impact=0.9),
        humanReview=False, duplicate=DuplicateInfo(isDuplicate=False, masterIncidentId=None, similarity=0.0)
    )
    with patch("api.routes.process_grievance", new_callable=AsyncMock, return_value=result):
        response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    assert response.json()["grievanceId"] == "VIDEO-100"
    assert response.json()["category"] == "road"


def test_toxic_grievance_is_rejected_without_crashing():
    payload = {
        "grievanceId": "TOXIC-100",
        "text": "This is fucking abusive text",
        "location": {"latitude": 21.0, "longitude": 81.0}
    }
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["isRejected"] is True
    assert data["rejectionReason"] == "TOXICITY_ABUSE_DETECTED"
    assert data["language"]
