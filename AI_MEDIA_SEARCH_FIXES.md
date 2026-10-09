# CiviX fixes applied — 8 October 2026

## 1. Time-aware greeting
The citizen home page no longer hard-codes `Good morning`.
- 00:00–11:59 → Good morning
- 12:00–16:59 → Good afternoon
- 17:00–20:59 → Good evening
- 21:00–23:59 → Good night

The browser's local clock is used.

## 2. Global grievance search
The top search is now a real controlled search state and the feed reloads whenever the query changes.
The backend search is hardened and searches:
- grievance text
- grievance ID
- category
- sub-category
- routed department code

Regex input is escaped so special characters cannot break the query.

## 3. Image AI processing
The previous Groq vision model was deprecated. The AI engine now defaults to the active multimodal `qwen/qwen3.8-27b` model and allows overriding it with `GROQ_VISION_MODEL`.
Vision failures are handled as a media-processing degradation instead of crashing the complete grievance analysis request.

## 4. Real video AI processing
The old video processor used `mock_video.mp4`, mocked frame names, and `http://mock-url.com`.
It now:
1. Downloads the actual uploaded/public video URL.
2. Extracts representative frames with OpenCV.
3. Encodes the frames as JPEG data URLs.
4. Sends up to three real frames to the Groq multimodal model.
5. Adds the visual findings to the grievance text before classification.
6. Cleans temporary files after processing.

If a video or provider is temporarily unavailable, the pipeline continues with a clear evidence note instead of returning HTTP 500.

## 5. Better AI preview errors
The preview endpoint now returns HTTP 502 with a clear `AI_SERVICE_UNAVAILABLE` error if the AI service itself is unavailable, rather than showing an unexplained generic internal server error.

## Validation
- Frontend TypeScript check: passed
- Backend TypeScript check: passed
- AI engine pytest: 14 passed
- Video keyframe extraction test: passed (3 real frames extracted)

The frontend Vite production build could not be executed in this Linux inspection environment because the supplied `node_modules` contains a platform-missing Rolldown native optional dependency. This is an environment/dependency-installation issue, not a TypeScript error in the changes.

## Environment
The fixed source archive intentionally excludes `.env` files and installed dependency folders. Keep your existing local/deployed secrets in your own `.env` files.

For the AI engine, add/verify these values in your own `ai-engine/.env`:

```env
GROQ_VISION_MODEL=qwen/qwen3.8-27b
MEDIA_DOWNLOAD_TIMEOUT_SECONDS=30
VIDEO_MAX_FRAMES=3
VIDEO_FRAME_WIDTH=1024
```

## Media AI hardening (2026-10-08)

- Sarvam STT now uses the current multipart `/speech-to-text` REST contract with `saaras:v4` instead of sending an unsupported `audio_url` JSON body.
- Voice/audio is downloaded from its Cloudinary/public URL before STT. Audio longer than the 30-second REST limit is split with ffmpeg into 28-second WAV chunks and transcribed in order.
- Video processing now extracts both representative OpenCV frames and the video's audio track. Video audio is sent through the same Sarvam STT path and visual frames through Groq Vision.
- Added provider and media pipeline tests for image, voice, video, audio extraction, long-audio splitting, confidence, moderation, duplicate detection, geospatial parsing, webhook safety, and embeddings.
- External live provider calls are intentionally not performed in the test suite unless valid provider API keys are supplied; provider request contracts are mocked and validated instead.
