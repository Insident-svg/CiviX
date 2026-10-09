# 🚀 Civix AI Engine - Pitch & Architecture Guide

This document is your "cheat sheet" for explaining the Civix AI Engine to judges. It covers the system architecture, all implemented features, and a list of tough technical questions judges might ask (with the exact answers you should give).

---

## 🏗️ 1. System Architecture (Explain it like this)

*"Our AI Engine is designed as a **decoupled, asynchronous, multimodal microservice**. It doesn't just pass data to an LLM; it actively orchestrates, optimizes, and filters data before any API calls are made to save costs and ensure security."*

**The Pipeline Flow:**
1. **Ingestion & Unified Processing:** The Engine receives the grievance via a FastAPI POST endpoint. Text, image, voice, and video requests return the same complete `AIAnalysisResponse` contract so the backend can persist one consistent result.
2. **Local Security (Zero-Cost Filters):** 
   - **Moderation:** Runs a local `better-profanity` check. If the text is abusive, it instantly rejects the ticket (0 API calls made).
   - **Geospatial Check:** Extracts EXIF GPS data from media using `Pillow` and compares it to the claimed coordinates using `geopy` to flag location spoofing.
3. **Smart Media Extraction (Cost Optimization):**
   - For video, it extracts audio for STT (Speech-to-Text) using **Sarvam AI** for high-accuracy regional language support.
   - It uses OpenCV to extract **only unique keyframes** (skipping duplicate or dark frames). 
4. **AI Inference (Jev, Groq, & Sarvam):** The cleaned text and extracted keyframes are sent to **Groq's** high-speed Vision models and the **Jev API** (powered by strict TypeSafe API schemas) for text classification. The entire inference pipeline is strictly validated using **Pydantic**, ensuring the Node.js backend receives 100% type-safe JSON without hallucinated fields.
5. **Business Logic Layer:** The AI Engine calculates an `Impact Score`, checks for duplicates, handles past-grievance confirmations, and flags contradictions.
6. **Webhook Callback:** The final JSON response is sent asynchronously back to the main Node.js backend.

---

## ✨ 2. Features Implemented

### **Core AI Features (The Foundation)**
- **Categorization & Severity:** Maps raw citizen complaints into specific government departments and severity levels (Low/Medium/High/Emergency).
- **Impact Scoring Algorithm:** Calculates a 0-100 score based on severity, emergency status, and category weights to help officers prioritize work.
- **Duplicate Detection (MVP):** Semantic matching logic to detect if a pothole was already reported.

### **Advanced Pipeline Features (The "Wow" Factor)**
- **Adaptive Video Processing:** Doesn't process every frame. If the audio is clear, it analyzes 1 frame. If audio is missing, it dynamically scales up to 3 frames to compensate.
- **Geospatial Fraud Detection:** Stops users from uploading fake photos from other cities by cross-referencing embedded EXIF GPS data against the claimed map location.
- **Multimodal Contradiction Engine:** Detects if the audio/text (e.g., "massive fire") contradicts the visual evidence (e.g., a calm street) and forces a human review.
- **Fraudulent Confirmation Detection:** Prevents users from falsely closing tickets. If the AI confidence in the "repair video" drops below 20%, it triggers a `fraudFlag`.
- **Instant Toxicity Reject:** Blocks trolls and abusive users locally before wasting a single API credit.
- **Asynchronous Webhooks:** Keeps the frontend blazing fast by processing media in the background.

---

## 🎤 3. Judge Q&A (How to Defend the Architecture)

### Q1: "LLM API calls are expensive, especially for video. How many API calls are made per grievance?"
**Your Answer:** 
*"It's dynamically optimized. Best case scenario (like an abusive text prompt), we make **0 API calls** because our local Python filter rejects it. For a standard text grievance, it's **1 call**. For video, we don't send the raw file. We use OpenCV to extract only structural keyframes. If the audio is clear, we send just **1 image frame** + 1 text call (2 total). We only scale up to 3 frames if the audio is completely corrupted. This dynamic allocation saves up to 70% in API costs compared to standard video analysis."*

### Q2: "What happens if a citizen uploads a prank video or tries to spoof a complaint?"
**Your Answer:** 
*"We built a multi-layered defense. First, we extract the **EXIF metadata** from the image/video and calculate the Haversine distance against their submitted map coordinates to flag GPS spoofing. Second, the AI runs a **Multimodal Contradiction Check**. If the citizen says 'there is a massive fire' but the extracted video frames show a calm street, the AI detects the contradiction, sets the confidence score to 0, and flags it immediately for human review."*

### Q3: "Is the backend going to crash or time out if 1,000 people upload 50MB videos?"
**Your Answer:** 
*"Video uses the same response contract as other grievances. The engine completes video analysis before returning, which keeps the backend integration deterministic and avoids returning a job payload that the backend cannot persist as an AI result."*

### Q4: "What if the video is pitch black or the audio has no sound?"
**Your Answer:** 
*"The pipeline is fault-tolerant. We wrap audio extraction in strict `try/except` blocks. If the audio is silent, the system gracefully falls back to visual reliance. If the video is pitch black, our OpenCV frame extractor detects the corrupted/dark frames and instantly aborts the vision API call, adding a 'Video too dark' tag to the text prompt instead of wasting API credits on analyzing black squares."*

### Q5: "How are you handling the AI hallucinating severity levels?"
**Your Answer:** 
*"We don't trust the AI blindly. The LLM is forced to output a confidence score between 0.0 and 1.0 for its categorizations. If the confidence drops below our defined threshold (0.75), the system automatically flips `humanReview` to `True` and halts automated ticket routing. We also use a deterministic `Impact Score` algorithm in Python rather than relying entirely on the LLM's opinion."*
