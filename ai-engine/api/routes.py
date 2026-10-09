from fastapi import APIRouter, BackgroundTasks
from models.request_models import GrievanceRequest
from models.response_models import AIAnalysisResponse
from pipeline.grievance_pipeline import process_grievance
from services.webhook import send_webhook_callback

router = APIRouter()

async def process_and_notify(request: GrievanceRequest):
    result = await process_grievance(request)
    if request.webhookUrl:
        await send_webhook_callback(request.webhookUrl, result.model_dump())

@router.post("/v1/analyze")
async def analyze_grievance(request: GrievanceRequest, background_tasks: BackgroundTasks):
    # Keep one response contract for every media type. The backend expects a
    # complete AIAnalysisResponse, so video processing must complete before the
    # request returns rather than returning an incompatible 202/job payload.
    result = await process_grievance(request)
    if request.webhookUrl:
        background_tasks.add_task(send_webhook_callback, request.webhookUrl, result.model_dump())
    
    return result
