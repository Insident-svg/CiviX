import asyncio
import logging
import os
import subprocess
import tempfile
from pathlib import Path

import cv2
import httpx

from providers.sarvam_client import SarvamClient
from providers.groq_client import GroqVisionClient
from config import Config

logger = logging.getLogger(__name__)


async def _download_video(video_url: str) -> str | None:
    if not video_url:
        return None
    suffix = Path(video_url.split("?", 1)[0]).suffix.lower() or ".mp4"
    fd, path = tempfile.mkstemp(prefix="civix-video-", suffix=suffix)
    os.close(fd)
    try:
        timeout = httpx.Timeout(Config.MEDIA_DOWNLOAD_TIMEOUT_SECONDS, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            async with client.stream("GET", video_url) as response:
                response.raise_for_status()
                with open(path, "wb") as output:
                    async for chunk in response.aiter_bytes(1024 * 1024):
                        output.write(chunk)
        return path
    except Exception as exc:
        logger.warning("Video download failed: %s", exc)
        try:
            os.unlink(path)
        except OSError:
            pass
        return None


def _extract_smart_keyframes(video_path: str, max_frames: int = 3) -> list[bytes]:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return []
    try:
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
        duration = frame_count / fps if fps > 0 else 0
        if duration <= 0:
            duration = 1.0
        ratios = (0.15, 0.50, 0.85)
        sample_times = [max(0.0, duration * ratio) for ratio in ratios[:max_frames]]
        frames: list[bytes] = []
        for timestamp in sample_times:
            cap.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
            ok, frame = cap.read()
            if not ok or frame is None:
                continue
            height, width = frame.shape[:2]
            target_width = min(width, Config.VIDEO_FRAME_WIDTH)
            if width > target_width:
                target_height = max(1, int(height * target_width / width))
                frame = cv2.resize(frame, (target_width, target_height), interpolation=cv2.INTER_AREA)
            ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
            if ok:
                frames.append(encoded.tobytes())
        return frames
    finally:
        cap.release()


def _extract_video_audio(video_path: str) -> tuple[bytes, str] | None:
    """Extract mono 16 kHz WAV audio for Sarvam STT, if the video has audio."""
    fd, output_path = tempfile.mkstemp(prefix="civix-video-audio-", suffix=".wav")
    os.close(fd)
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error", "-i", video_path,
                "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", output_path,
            ],
            capture_output=True,
            text=True,
            timeout=90,
            check=True,
        )
        data = Path(output_path).read_bytes()
        return (data, "audio/wav") if data else None
    except (OSError, subprocess.SubprocessError) as exc:
        logger.info("Video has no extractable audio or ffmpeg failed: %s", exc)
        return None
    finally:
        try:
            os.unlink(output_path)
        except OSError:
            pass


async def _transcribe_video_audio(audio: tuple[bytes, str] | None, stt_provider: SarvamClient) -> str:
    if not audio:
        return ""
    data, mime_type = audio
    if not stt_provider.api_key:
        return ""
    # Reuse Sarvam's byte/chunk implementation so the same 30s handling applies.
    suffix = ".wav"
    chunks = stt_provider._split_for_rest(data, suffix)
    transcripts = []
    for index, chunk in enumerate(chunks):
        transcript = await stt_provider._transcribe_bytes(
            chunk,
            filename=f"civix-video-audio-{index:03d}.wav",
            content_type=mime_type,
        )
        if transcript:
            transcripts.append(transcript)
    return " ".join(transcripts).strip()


async def process_video_smartly(video_url: str, stt_provider: SarvamClient, vision_provider: GroqVisionClient) -> str:
    """Download a video, process audio with STT and representative frames with vision."""
    path = await _download_video(video_url)
    if not path:
        return "[Video Evidence]: Video could not be downloaded for AI inspection; continue using the report text."

    try:
        frames = await asyncio.to_thread(_extract_smart_keyframes, path, Config.VIDEO_MAX_FRAMES)
        audio = await asyncio.to_thread(_extract_video_audio, path)
        transcript = await _transcribe_video_audio(audio, stt_provider)

        evidence_parts: list[str] = []
        if transcript:
            evidence_parts.append(f"[Video Audio Transcript]: {transcript}")

        if not frames:
            evidence_parts.append("[Video Evidence]: Video was received but no readable frames could be extracted.")
            return "\n".join(evidence_parts)

        try:
            summary = await vision_provider.analyze_images(
                [(frame, "image/jpeg") for frame in frames],
                "Analyze these representative frames from one civic-issue video. "
                "Combine only the visible evidence across frames. Identify the civic issue, "
                "hazards, changes between frames, and approximate severity. Do not invent details.",
            )
            if summary:
                evidence_parts.append("[Video Visual Evidence]: " + summary)
            else:
                evidence_parts.append(
                    f"[Video Evidence]: {len(frames)} representative frame(s) extracted, but visual AI was unavailable."
                )
        except Exception as exc:
            logger.warning("Video vision analysis failed: %s", exc)
            evidence_parts.append("[Video Evidence]: Visual AI analysis was unavailable; extracted frames successfully.")

        return "\n".join(evidence_parts)
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def extract_smart_keyframes(video_path: str, max_frames: int = 3) -> list[bytes]:
    """Compatibility wrapper for tests/other callers."""
    return _extract_smart_keyframes(video_path, max_frames)
