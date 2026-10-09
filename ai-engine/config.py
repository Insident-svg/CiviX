import os

class Config:
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    JEV_API_KEY = os.getenv("JEV_API_KEY", "")
    AI_CONFIDENCE_THRESHOLD = float(os.getenv("AI_CONFIDENCE_THRESHOLD", "0.75"))
    AI_REQUEST_TIMEOUT_SECONDS = int(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "30"))
    AI_MAX_RETRIES = int(os.getenv("AI_MAX_RETRIES", "2"))
    GROQ_VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b")
    MEDIA_DOWNLOAD_TIMEOUT_SECONDS = int(os.getenv("MEDIA_DOWNLOAD_TIMEOUT_SECONDS", "30"))
    VIDEO_MAX_FRAMES = int(os.getenv("VIDEO_MAX_FRAMES", "3"))
    VIDEO_FRAME_WIDTH = int(os.getenv("VIDEO_FRAME_WIDTH", "1024"))
    SARVAM_MODEL = os.getenv("SARVAM_MODEL", "saaras:v4")
    SARVAM_MODE = os.getenv("SARVAM_MODE", "transcribe")
    SARVAM_MAX_REST_SECONDS = int(os.getenv("SARVAM_MAX_REST_SECONDS", "30"))
    SARVAM_CHUNK_SECONDS = int(os.getenv("SARVAM_CHUNK_SECONDS", "28"))
