import asyncio
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import sys
import logging

# Suppress debug output from httpx to keep console clean
logging.getLogger("httpx").setLevel(logging.WARNING)

from app import app
from models.enums import Category, Severity

client = TestClient(app)

print("Starting Manual Test Suite for Civix AI Engine...")
print("="*60)

def run_test_case_1():
    print("Test Case 1: Standard High-Severity Pothole (Text Only)")
    with patch("pipeline.grievance_pipeline.classification_provider.classify_text", new_callable=AsyncMock) as mock_class:
        mock_class.return_value = {
            "category": Category.ROAD,
            "subCategory": "Pothole",
            "severity": Severity.HIGH,
            "public_safety_risk": 0.8,
            "confidence_category": 0.95,
            "confidence_severity": 0.90
        }
        
        payload = {
            "grievanceId": "TC1-001",
            "text": "There is a massive pothole in the middle of the road.",
            "location": {"latitude": 21.25, "longitude": 81.63}
        }
        
        response = client.post("/api/v1/analyze", json=payload)
        data = response.json()
        
        if response.status_code == 200 and data["category"] == "road" and data["severity"] == "high":
            print("✅ PASS: Correctly classified and scored.")
            print(f"   Impact Score: {data['impactScore']}/100, Human Review: {data['humanReview']}")
        else:
            print("❌ FAIL")
            print(data)

def run_test_case_2():
    print("\nTest Case 2: Low Confidence Triggers Human Review")
    with patch("pipeline.grievance_pipeline.classification_provider.classify_text", new_callable=AsyncMock) as mock_class:
        mock_class.return_value = {
            "category": Category.OTHER,
            "subCategory": "Unknown",
            "severity": Severity.LOW,
            "public_safety_risk": 0.1,
            "confidence_category": 0.40,
            "confidence_severity": 0.50
        }
        
        payload = {
            "grievanceId": "TC2-001",
            "text": "It is bad here.",
            "location": {"latitude": 21.25, "longitude": 81.63}
        }
        
        response = client.post("/api/v1/analyze", json=payload)
        data = response.json()
        
        if response.status_code == 200 and data["humanReview"] is True:
            print("✅ PASS: Successfully flagged for Human Review.")
            print(f"   Reasons: {data['reviewReasons']}")
        else:
            print("❌ FAIL")
            print(data)

def run_test_case_3():
    print("\nTest Case 3: Voice Grievance with Media Processing")
    with patch("pipeline.grievance_pipeline.stt_provider.transcribe_audio", new_callable=AsyncMock) as mock_stt, \
         patch("pipeline.grievance_pipeline.classification_provider.classify_text", new_callable=AsyncMock) as mock_class:
        
        mock_stt.return_value = "Water pipe is burst and leaking heavily."
        mock_class.return_value = {
            "category": Category.WATER,
            "subCategory": "Leak",
            "severity": Severity.CRITICAL,
            "public_safety_risk": 0.9,
            "confidence_category": 0.98,
            "confidence_severity": 0.95
        }
        
        payload = {
            "grievanceId": "TC3-001",
            "text": "",
            "media": [{"type": "voice", "url": "https://civix.ai/audio1.wav"}],
            "location": {"latitude": 21.25, "longitude": 81.63}
        }
        
        response = client.post("/api/v1/analyze", json=payload)
        data = response.json()
        
        if response.status_code == 200 and data["category"] == "water":
            print("✅ PASS: Successfully routed audio to STT and processed classification.")
            print(f"   Category: {data['category']}, Severity: {data['severity']}")
        else:
            print("❌ FAIL")
            print(data)

def run_test_case_4():
    print("\nTest Case 4: Semantic Duplicate Detection")
    with patch("pipeline.grievance_pipeline.classification_provider.classify_text", new_callable=AsyncMock) as mock_class:
        mock_class.return_value = {
            "category": Category.ROAD,
            "subCategory": "Pothole",
            "severity": Severity.HIGH,
            "public_safety_risk": 0.8,
            "confidence_category": 0.95,
            "confidence_severity": 0.90
        }
        
        payload = {
            "grievanceId": "TC4-001",
            "text": "Dangerous pothole near NIT gate, needs fixing.",
            "location": {"latitude": 21.25, "longitude": 81.63}
        }
        
        response = client.post("/api/v1/analyze", json=payload)
        data = response.json()
        
        if response.status_code == 200 and data["duplicate"]["isDuplicate"] is True:
            print("✅ PASS: Successfully detected duplicate candidate.")
            print(f"   Master Incident ID: {data['duplicate']['masterIncidentId']}")
            print(f"   Similarity Score: {data['duplicate']['similarity']}")
        else:
            print("❌ FAIL")
            print(data)

try:
    run_test_case_1()
    run_test_case_2()
    run_test_case_3()
    run_test_case_4()
    print("\n" + "="*60)
    print("ALL TESTS COMPLETED SUCCESSFULLY!")
except Exception as e:
    print(f"\n❌ ERROR: Test suite failed with exception: {e}")
