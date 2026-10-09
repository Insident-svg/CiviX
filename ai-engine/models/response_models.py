from pydantic import BaseModel
from typing import List, Optional
from .enums import Category, Severity, Department

class ConfidenceScores(BaseModel):
    category: float
    severity: float
    impact: float

class DuplicateInfo(BaseModel):
    isDuplicate: bool
    masterIncidentId: Optional[str]
    similarity: float

class ConfirmationInfo(BaseModel):
    isConfirmed: bool
    matchConfidence: float
    previousSeverity: Optional[str]
    updatedSeverity: Optional[str]
    impactScoreDelta: int
    fraudFlag: bool = False

class AIAnalysisResponse(BaseModel):
    grievanceId: str
    language: str
    title: str = "Civic issue reported"
    summary: str = "Civic issue submitted for AI analysis."
    transcript: Optional[str] = None
    category: Category
    subCategory: Optional[str] = None
    secondaryCategories: List[Category] = []
    severity: Severity
    departments: List[Department] = []
    isEmergency: bool = False
    impactScore: int
    confidence: ConfidenceScores
    humanReview: bool
    multimodalContradiction: bool = False
    reviewReasons: List[str] = []
    duplicate: DuplicateInfo
    confirmation: Optional[ConfirmationInfo] = None
    isRejected: bool = False
    rejectionReason: Optional[str] = None
    locationSpoofingRisk: bool = False
