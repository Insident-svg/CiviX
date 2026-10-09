from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class Location(BaseModel):
    latitude: float
    longitude: float

class GrievanceRequest(BaseModel):
    grievanceId: str
    text: Optional[str] = None
    language: Optional[str] = None
    media: List[Dict[str, Any]] = []
    location: Location
    webhookUrl: Optional[str] = None
    originalGrievanceData: Optional[Dict[str, Any]] = None
