import asyncio
import io
from pathlib import Path
from unittest.mock import AsyncMock, patch

import numpy as np
from PIL import Image

from providers.groq_client import GroqVisionClient
from providers.sarvam_client import SarvamClient
from services.video_processor import _extract_smart_keyframes


def test_groq_image_bytes_builds_data_url_and_returns_content():
    client = GroqVisionClient()
    client.api_key = "test-key"
    captured = {}

    async def fake_complete(content):
        captured["content"] = content
        return "Visible pothole and broken road edge."

    client._complete = fake_complete

    image = Image.new("RGB", (32, 32), "white")
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")

    result = asyncio.run(client.analyze_image_bytes(buffer.getvalue(), "image/jpeg"))
    assert "pothole" in result.lower()
    assert captured["content"][1]["type"] == "image_url"
    assert captured["content"][1]["image_url"]["url"].startswith("data:image/jpeg;base64,")


def test_sarvam_uses_multipart_file_not_audio_url_json():
    client = SarvamClient()
    client.api_key = "test-key"

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"transcript": "पानी की पाइपलाइन लीक है"}

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, url, **kwargs):
            assert url.endswith("/speech-to-text")
            assert kwargs["data"]["model"] == "saaras:v4"
            assert kwargs["data"]["mode"] == "transcribe"
            assert kwargs["data"]["language_code"] == "unknown"
            assert "file" in kwargs["files"]
            assert kwargs["files"]["file"][1] == b"audio-bytes"
            assert "audio_url" not in kwargs
            return FakeResponse()

    async def fake_download(_url):
        return b"audio-bytes", "audio/wav", ".wav"

    client._download_audio = fake_download
    with patch("providers.sarvam_client.httpx.AsyncClient", FakeAsyncClient):
        result = asyncio.run(client.transcribe_audio("https://cdn.example/audio.wav"))

    assert result == "पानी की पाइपलाइन लीक है"


def test_sarvam_empty_without_api_key():
    client = SarvamClient()
    client.api_key = ""
    with patch.object(client, "_download_audio", AsyncMock(return_value=(b"x", "audio/wav", ".wav"))):
        assert asyncio.run(client.transcribe_audio("https://cdn.example/audio.wav")) == ""


def test_video_keyframe_extraction(tmp_path):
    import cv2

    path = tmp_path / "test.mp4"
    writer = cv2.VideoWriter(
        str(path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        10,
        (320, 240),
    )
    assert writer.isOpened()
    for i in range(30):
        frame = np.zeros((240, 320, 3), dtype=np.uint8)
        frame[:, :, 0] = i * 5
        writer.write(frame)
    writer.release()

    frames = _extract_smart_keyframes(str(path), 3)
    assert len(frames) == 3
    assert all(frame.startswith(b"\xff\xd8") for frame in frames)
