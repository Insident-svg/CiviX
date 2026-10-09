import logging
logger = logging.getLogger(__name__)
from models.request_models import GrievanceRequest
from models.enums import Category, Department
from models.response_models import AIAnalysisResponse, ConfidenceScores, DuplicateInfo
from services.impact_score import calculate_impact_score
from services.confidence import evaluate_confidence
from services.duplicate_detection import check_for_duplicates
from services.video_processor import process_video_smartly
from services.confirmation import process_confirmation
from services.moderation import check_toxicity
from services.geospatial import check_location_spoofing
from services.language_detection import detect_language
from providers.jev_client import JevClient
from providers.sarvam_client import SarvamClient
from providers.groq_client import GroqVisionClient
from config import Config

classification_provider = JevClient()
stt_provider = SarvamClient()
vision_provider = GroqVisionClient()

async def process_grievance(request: GrievanceRequest) -> AIAnalysisResponse:
    original_text = (request.text or "").strip()
    final_text = original_text
    voice_transcripts: list[str] = []
    
    # Detect language before any early-return path so rejected grievances
    # still have a valid language value.
    detected_language = detect_language(final_text)

    # 0a. Toxicity / Abuse Check (Fast Reject)
    if check_toxicity(final_text):
        from models.enums import Severity
        return AIAnalysisResponse(
            grievanceId=request.grievanceId,
            language=request.language or detected_language,
            title="Report rejected",
            summary="The report could not be processed because it violated the platform's content rules.",
            transcript=None,
            category=Category.OTHER,
            severity=Severity.LOW,
            impactScore=0,
            confidence=ConfidenceScores(category=0.0, severity=0.0, impact=0.0),
            humanReview=False,
            duplicate=DuplicateInfo(isDuplicate=False, masterIncidentId=None, similarity=0.0),
            isRejected=True,
            rejectionReason="TOXICITY_ABUSE_DETECTED"
        )
        
    location_spoofed = False
    
    # 0. Media Processing (Voice / Images / Video)
    if request.media:
        for media_item in request.media:
            media_type = media_item.get("type")
            media_url = media_item.get("url")
            
            if media_type == "voice" and media_url:
                transcript = await stt_provider.transcribe_audio(media_url)
                if transcript:
                    voice_transcripts.append(transcript)
                    final_text += f"\n[Voice Transcript]: {transcript}"
                
            elif media_type == "image" and media_url:
                # Geospatial Fraud Check
                if not location_spoofed:
                    location_spoofed = await check_location_spoofing(
                        media_url, 
                        request.location.latitude, 
                        request.location.longitude
                    )
                
                try:
                    image_analysis = await vision_provider.analyze_image(media_url)
                except Exception as exc:
                    logger.warning(f"Image AI processing failed: {exc}")
                    image_analysis = ""
                if image_analysis:
                    final_text += f"\n[Visual Evidence]: {image_analysis}"
                else:
                    final_text += "\n[Visual Evidence]: Image received; visual AI analysis unavailable."
                
            elif media_type == "video" and media_url:
                try:
                    video_analysis = await process_video_smartly(media_url, stt_provider, vision_provider)
                except Exception as exc:
                    logger.warning(f"Video AI processing failed: {exc}")
                    video_analysis = "[Video Evidence]: Video processing was unavailable; continue using the report text."
                final_text += f"\n{video_analysis}"

    # 1. AI Classification (using Jev / OpenRouter)
    classification = await classification_provider.classify_text(final_text)
    
    # Enforce the CiviX routing contract at the AI boundary: exactly one of
    # the nine configured departments, with category-based safety fallback.
    category_to_department = {
        Category.ROAD: Department.PWD,
        Category.WATER: Department.WATER_BOARD,
        Category.SANITATION: Department.SANITATION,
        Category.ELECTRICAL: Department.ELECTRICITY_BOARD,
        Category.SEWERAGE: Department.SEWERAGE,
        Category.TRAFFIC: Department.TRAFFIC_POLICE,
        Category.PUBLIC_SAFETY: Department.POLICE,
        Category.EMERGENCY: Department.POLICE,
        Category.HEALTHCARE: Department.HEALTH,
        Category.OTHER: Department.OTHER,
    }
    allowed_departments = {d.value for d in Department}
    selected_department = next(
        (d for d in classification.get("departments", []) if getattr(d, "value", d) in allowed_departments),
        None,
    )
    if selected_department is None:
        selected_department = category_to_department.get(
            classification["category"], Department.OTHER
        )
    if not isinstance(selected_department, Department):
        selected_department = Department(selected_department)
    classification["departments"] = [selected_department]

    # 2. Confirmation Logic (If original data provided)
    confirmation_info = None
    if request.originalGrievanceData:
        confirmation_info = await process_confirmation(
            video_summary=final_text,
            current_classification=classification,
            original_data=request.originalGrievanceData
        )
    
    # 3. Deterministic Impact Scoring
    impact = calculate_impact_score(
        severity=classification["severity"],
        public_safety_risk=classification["public_safety_risk"],
        affected_people=50 # Hardcoded for now
    )
    
    # 4. Confidence & Human Review Logic
    conf_scores = ConfidenceScores(
        category=classification["confidence_category"],
        severity=classification["confidence_severity"],
        impact=0.90 # Math is deterministic
    )
    
    needs_review, review_reasons = evaluate_confidence(conf_scores, threshold=Config.AI_CONFIDENCE_THRESHOLD)
    
    multimodal_contradiction = classification.get("multimodal_contradiction", False)
    if multimodal_contradiction:
        needs_review = True
        review_reasons.append("MULTIMODAL_CONTRADICTION")
    
    # 5. Duplicate Detection (Semantic Search MVP)
    duplicate_info = await check_for_duplicates(
        text=final_text,
        category=classification["category"].value,
        location=request.location.model_dump()
    )
    
    # Overrides for emergency
    is_emergency = classification.get("is_emergency", False)
    if is_emergency:
        impact = 100
        classification["severity"] = "critical"
    
    # 6. Generate public-facing copy. Typed reports keep the user's input as
    # their heading; voice-only reports receive an AI-generated heading from the
    # transcript. Both modes receive a short AI-generated summary.
    transcript = " ".join(voice_transcripts).strip() or None
    copy_source = "\n".join(part for part in [original_text, transcript] if part).strip()
    voice_only = bool(voice_transcripts) and not original_text
    if voice_only:
        title, summary = await vision_provider.generate_grievance_copy(copy_source, voice_only=True)
    else:
        title = original_text[:500] if original_text else "Civic issue reported"
        _, summary = await vision_provider.generate_grievance_copy(copy_source, voice_only=False)

    # 7. Construct final response
    return AIAnalysisResponse(
        grievanceId=request.grievanceId,
        language=request.language or detected_language,
        title=title,
        summary=summary,
        transcript=transcript,
        category=classification["category"],
        subCategory=classification["subCategory"],
        secondaryCategories=classification.get("secondaryCategories", []),
        severity=classification["severity"],
        departments=classification.get("departments", []),
        isEmergency=is_emergency,
        impactScore=impact,
        confidence=conf_scores,
        humanReview=needs_review,
        multimodalContradiction=multimodal_contradiction,
        reviewReasons=review_reasons,
        duplicate=duplicate_info,
        confirmation=confirmation_info,
        locationSpoofingRisk=location_spoofed
    )
