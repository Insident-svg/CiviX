import logging
import os
import subprocess
import tempfile
from pathlib import Path

import httpx

from config import Config

logger = logging.getLogger(__name__)


class SarvamClient:
    """Sarvam Saaras v4 REST client.

    Sarvam's current REST endpoint accepts multipart/form-data with the audio
    file itself; it does not accept an audio_url JSON body. We therefore fetch
    the public Cloudinary URL first and upload the bytes to Sarvam.
    """

    def __init__(self):
        self.api_key = os.getenv("SARVAM_API_KEY", "").strip()
        self.url = "https://api.sarvam.ai/speech-to-text"
        self.model = Config.SARVAM_MODEL.strip() or "saaras:v4"
        self.mode = Config.SARVAM_MODE.strip() or "transcribe"
        self.max_rest_seconds = Config.SARVAM_MAX_REST_SECONDS
        self.chunk_seconds = max(5, min(Config.SARVAM_CHUNK_SECONDS, 30))

    async def _download_audio(self, audio_url: str) -> tuple[bytes, str, str] | None:
        suffix = Path(audio_url.split("?", 1)[0]).suffix.lower() or ".webm"
        try:
            timeout = httpx.Timeout(Config.MEDIA_DOWNLOAD_TIMEOUT_SECONDS, connect=10.0)
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                response = await client.get(audio_url)
                response.raise_for_status()
                data = response.content
                if not data:
                    return None
                content_type = response.headers.get("content-type", "").split(";", 1)[0].strip()
                if not content_type:
                    content_type = self._mime_from_suffix(suffix)
                return data, content_type, suffix
        except Exception as exc:
            logger.warning("Sarvam audio download failed: %s", exc)
            return None

    @staticmethod
    def _mime_from_suffix(suffix: str) -> str:
        return {
            ".wav": "audio/wav",
            ".mp3": "audio/mpeg",
            ".ogg": "audio/ogg",
            ".opus": "audio/ogg",
            ".webm": "audio/webm",
            ".m4a": "audio/mp4",
            ".mp4": "audio/mp4",
            ".aac": "audio/aac",
            ".flac": "audio/flac",
        }.get(suffix.lower(), "application/octet-stream")

    @staticmethod
    def _probe_duration(path: str) -> float | None:
        """Return media duration using ffprobe when available."""
        try:
            result = subprocess.run(
                [
                    "ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1", path,
                ],
                capture_output=True,
                text=True,
                timeout=10,
                check=True,
            )
            return float(result.stdout.strip())
        except (OSError, ValueError, subprocess.SubprocessError):
            return None

    def _split_for_rest(self, data: bytes, suffix: str) -> list[bytes]:
        """Split audio into <=30s WAV chunks when ffmpeg is available.

        Sarvam REST has a 30-second limit. Using 28-second chunks leaves a
        small safety margin for metadata/codec duration rounding.
        """
        with tempfile.TemporaryDirectory(prefix="civix-stt-") as tmp:
            source = os.path.join(tmp, f"input{suffix}")
            with open(source, "wb") as handle:
                handle.write(data)

            duration = self._probe_duration(source)
            if duration is None or duration <= self.max_rest_seconds:
                return [data]

            pattern = os.path.join(tmp, "chunk-%03d.wav")
            try:
                subprocess.run(
                    [
                        "ffmpeg", "-y", "-v", "error", "-i", source,
                        "-f", "segment", "-segment_time", str(self.chunk_seconds),
                        "-reset_timestamps", "1", "-ac", "1", "-ar", "16000",
                        pattern,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=max(60, int(duration) + 30),
                    check=True,
                )
                chunks = []
                for chunk_path in sorted(Path(tmp).glob("chunk-*.wav")):
                    chunk = chunk_path.read_bytes()
                    if chunk:
                        chunks.append(chunk)
                return chunks or [data]
            except (OSError, subprocess.SubprocessError) as exc:
                logger.warning("Could not split long audio; Sarvam may reject it: %s", exc)
                return [data]

    async def _transcribe_bytes(self, data: bytes, filename: str, content_type: str) -> str:
        if not self.api_key:
            logger.warning("SARVAM_API_KEY is not configured; skipping speech-to-text")
            return ""

        headers = {"api-subscription-key": self.api_key}
        form = {
            "model": self.model,
            "mode": self.mode,
            "language_code": "unknown",
        }
        files = {
            "file": (filename, data, content_type),
        }

        try:
            timeout = httpx.Timeout(Config.AI_REQUEST_TIMEOUT_SECONDS, connect=10.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(self.url, headers=headers, data=form, files=files)
                response.raise_for_status()
                payload = response.json()
                return str(payload.get("transcript", "") or "").strip()
        except httpx.HTTPStatusError as exc:
            logger.error("Sarvam STT HTTP %s: %s", exc.response.status_code, exc.response.text[:500])
            return ""
        except (httpx.RequestError, ValueError) as exc:
            logger.error("Sarvam STT failed: %s", exc)
            return ""

    async def transcribe_audio(self, audio_url: str) -> str:
        """Download a public/Cloudinary audio URL and transcribe it with Saaras v4.

        Short audio is sent directly. Audio longer than Sarvam REST's 30-second
        limit is split into short WAV chunks with ffmpeg and each chunk is
        transcribed in order.
        """
        if not audio_url:
            return ""

        downloaded = await self._download_audio(audio_url)
        if not downloaded:
            return ""

        data, content_type, suffix = downloaded
        chunks = self._split_for_rest(data, suffix)

        transcripts: list[str] = []
        for index, chunk in enumerate(chunks):
            transcript = await self._transcribe_bytes(
                chunk,
                filename=f"civix-audio-{index:03d}.wav" if len(chunks) > 1 else f"civix-audio{suffix}",
                content_type="audio/wav" if len(chunks) > 1 else content_type,
            )
            if transcript:
                transcripts.append(transcript)

        return " ".join(transcripts).strip()
