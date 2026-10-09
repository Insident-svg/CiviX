import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app import app
from models.enums import Category, Severity

client = TestClient(app)

@pytest.fixture
def mock_providers():
    with patch("pipeline.grievance_pipeline.classification_provider.classify_text", new_callable=AsyncMock) as mock_class:
        with patch("pipeline.grievance_pipeline.stt_provider.transcribe_audio", new_callable=AsyncMock) as mock_stt:
            with patch("pipeline.grievance_pipeline.vision_provider.analyze_image", new_callable=AsyncMock) as mock_vision:
                yield mock_class, mock_stt, mock_vision

def test_pothole_classification(mock_providers):
    mock_class, mock_stt, mock_vision = mock_providers
    
    mock_class.return_value = {
        "category": Category.ROAD,
        "subCategory": "Pothole",
        "severity": Severity.HIGH,
        "public_safety_risk": 0.8,
        "confidence_category": 0.95,
        "confidence_severity": 0.90
    }
    
    payload = {
        "grievanceId": "TEST-100",
        "text": "There is a huge pothole here.",
        "location": {"latitude": 21.0, "longitude": 81.0}
    }
    
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["category"] == "road"
    assert data["severity"] == "high"
    assert data["humanReview"] is False
    assert data["impactScore"] > 0

def test_low_confidence_triggers_human_review(mock_providers):
    mock_class, mock_stt, mock_vision = mock_providers
    
    mock_class.return_value = {
        "category": Category.OTHER,
        "subCategory": "Unknown",
        "severity": Severity.LOW,
        "public_safety_risk": 0.1,
        "confidence_category": 0.50,
        "confidence_severity": 0.50
    }
    
    payload = {
        "grievanceId": "TEST-101",
        "text": "Something is wrong.",
        "location": {"latitude": 21.0, "longitude": 81.0}
    }
    
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["humanReview"] is True
    assert "LOW_CATEGORY_CONFIDENCE" in data["reviewReasons"]

def test_media_processing_voice(mock_providers):
    mock_class, mock_stt, mock_vision = mock_providers
    
    mock_stt.return_value = "This is a transcribed voice issue."
    mock_class.return_value = {
        "category": Category.WATER,
        "subCategory": "Leak",
        "severity": Severity.MEDIUM,
        "public_safety_risk": 0.5,
        "confidence_category": 0.90,
        "confidence_severity": 0.90
    }
    
    payload = {
        "grievanceId": "TEST-102",
        "text": "",
        "media": [{"type": "voice", "url": "https://example.com/audio.mp3"}],
        "location": {"latitude": 21.0, "longitude": 81.0}
    }
    
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    
    mock_stt.assert_called_once_with("https://example.com/audio.mp3")
    called_text = mock_class.call_args[0][0]
    assert "transcribed voice issue" in called_text

def test_duplicate_incident_candidate(mock_providers):
    mock_class, mock_stt, mock_vision = mock_providers
    
    mock_class.return_value = {
        "category": Category.ROAD,
        "subCategory": "Pothole",
        "severity": Severity.HIGH,
        "public_safety_risk": 0.9,
        "confidence_category": 0.95,
        "confidence_severity": 0.95
    }
    
    payload = {
        "grievanceId": "TEST-103",
        "text": "Huge pothole near NIT gate",
        "location": {"latitude": 21.0, "longitude": 81.0}
    }
    
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["duplicate"]["isDuplicate"] is True
    assert data["duplicate"]["masterIncidentId"] == "MASTER-INC-001"

def test_media_processing_image_calls_vision(mock_providers):
    mock_class, mock_stt, mock_vision = mock_providers
    mock_vision.return_value = "A large pothole is visible."
    mock_class.return_value = {
        "category": Category.ROAD,
        "subCategory": "Pothole",
        "severity": Severity.HIGH,
        "public_safety_risk": 0.8,
        "confidence_category": 0.95,
        "confidence_severity": 0.90,
    }

    payload = {
        "grievanceId": "TEST-104",
        "text": "Road is damaged",
        "media": [{"type": "image", "url": "https://example.com/pothole.jpg"}],
        "location": {"latitude": 21.0, "longitude": 81.0},
    }
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    mock_vision.assert_called_once_with("https://example.com/pothole.jpg")
    assert "pothole" in mock_class.call_args[0][0].lower()


def test_media_processing_video_calls_video_pipeline(mock_providers):
    mock_class, mock_stt, mock_vision = mock_providers
    mock_class.return_value = {
        "category": Category.ROAD,
        "subCategory": "Pothole",
        "severity": Severity.HIGH,
        "public_safety_risk": 0.8,
        "confidence_category": 0.95,
        "confidence_severity": 0.90,
    }

    with patch(
        "pipeline.grievance_pipeline.process_video_smartly",
        new_callable=AsyncMock,
        return_value="[Video Audio Transcript]: road is broken\n[Video Visual Evidence]: pothole visible",
    ) as mock_video:
        payload = {
            "grievanceId": "TEST-105",
            "text": "Please inspect this video",
            "media": [{"type": "video", "url": "https://example.com/issue.mp4"}],
            "location": {"latitude": 21.0, "longitude": 81.0},
        }
        response = client.post("/api/v1/analyze", json=payload)

    assert response.status_code == 200
    mock_video.assert_called_once()
    assert "video audio transcript" in mock_class.call_args[0][0].lower()
    assert "video visual evidence" in mock_class.call_args[0][0].lower()
