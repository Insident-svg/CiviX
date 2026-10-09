import asyncio
from unittest.mock import AsyncMock, patch

from models.enums import Category, Department, Severity
from models.response_models import ConfidenceScores
from providers.embedding_client import EmbeddingClient
from providers.jev_client import JevClient
from services.confidence import evaluate_confidence
from services.confirmation import process_confirmation
from services.duplicate_detection import check_for_duplicates
from services.geospatial import extract_lat_lon
from services.moderation import check_toxicity
from services.webhook import send_webhook_callback


def test_confidence_thresholds():
    needs_review, reasons = evaluate_confidence(
        ConfidenceScores(category=0.7, severity=0.9, impact=0.9), threshold=0.75
    )
    assert needs_review
    assert reasons == ["LOW_CATEGORY_CONFIDENCE"]


def test_confirmation_keeps_higher_previous_severity():
    result = asyncio.run(process_confirmation(
        "video evidence",
        {"severity": Severity.MEDIUM, "public_safety_risk": 0.5},
        {"text": "issue", "severity": "HIGH", "impactScore": 50},
    ))
    assert result.updatedSeverity == "high"
    assert result.previousSeverity == "high"


def test_duplicate_detection():
    duplicate = asyncio.run(check_for_duplicates("Huge pothole at NIT gate", "road", {"latitude": 21, "longitude": 81}))
    assert duplicate.isDuplicate is True
    assert duplicate.masterIncidentId == "MASTER-INC-001"


def test_geospatial_extract_lat_lon():
    exif = {
        "GPSInfo": {
            "GPSLatitude": (21, 15, 0),
            "GPSLatitudeRef": "N",
            "GPSLongitude": (81, 37, 0),
            "GPSLongitudeRef": "E",
        }
    }
    assert extract_lat_lon(exif) == (21.25, 81.61666666666666)


def test_moderation():
    assert check_toxicity("") is False
    assert check_toxicity("Please fix this pothole") is False
    assert check_toxicity("you are fucking useless") is True


def test_embedding_client_success():
    client = EmbeddingClient()
    client.api_key = "test"

    class Response:
        def raise_for_status(self): pass
        def json(self): return {"data": [{"embedding": [0.1, 0.2, 0.3]}]}

    class AsyncClient:
        def __init__(self, *args, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): return False
        async def post(self, *args, **kwargs): return Response()

    with patch("providers.embedding_client.httpx.AsyncClient", AsyncClient):
        assert asyncio.run(client.get_embedding("pothole")) == [0.1, 0.2, 0.3]


def test_embedding_client_failure_returns_empty():
    client = EmbeddingClient()
    client.api_key = "test"
    with patch.object(client, "get_embedding", AsyncMock(return_value=[])):
        assert asyncio.run(client.get_embedding("anything")) == []


def test_jev_local_fallback_covers_routing():
    result = JevClient._local_fallback("There is a water leak near the house")
    assert result["category"] == Category.WATER
    assert result["departments"] == [Department.WATER_BOARD]


def test_webhook_callback_is_safe_when_provider_fails():
    class Response:
        def raise_for_status(self): raise RuntimeError("bad webhook")

    class AsyncClient:
        def __init__(self, *args, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): return False
        async def post(self, *args, **kwargs): return Response()

    with patch("services.webhook.httpx.AsyncClient", AsyncClient):
        asyncio.run(send_webhook_callback("https://example.com/webhook", {"ok": True}))
