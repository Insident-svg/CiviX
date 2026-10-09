import httpx
import json
import logging
from typing import Dict, Any, List
from models.enums import Category, Severity, Department
from pydantic import BaseModel, Field, ValidationError
from config import Config

logger = logging.getLogger(__name__)

class JevClassificationResponse(BaseModel):
    category: Category = Field(description="The primary category of the grievance.")
    subCategory: str = Field(description="A specific subcategory.")
    secondaryCategories: List[Category] = Field(description="Other secondary issues found in the grievance.", default_factory=list)
    severity: Severity = Field(description="The severity of the issue.")
    departments: List[Department] = Field(description="List of departments required to resolve the issue.", default_factory=list)
    is_emergency: bool = Field(description="True if this is a time-critical emergency like an accident, robbery, violence, fire, etc.", default=False)
    public_safety_risk: float = Field(ge=0.0, le=1.0, description="0.0 to 1.0 score of public safety risk.")
    confidence_category: float = Field(ge=0.0, le=1.0, description="Confidence in category classification.")
    confidence_severity: float = Field(ge=0.0, le=1.0, description="Confidence in severity classification.")
    multimodal_contradiction: bool = Field(description="True if the video/image heavily contradicts the audio/text.", default=False)

import os

class JevClient:
    def __init__(self):
        self.api_key = os.getenv("JEV_API_KEY", "")
        self.url = "https://api.typesafe.ai/v1/systemone" # Correct TypeSafe API Endpoint
        self.model = "jev-latest"

    async def classify_text(self, text: str) -> Dict[str, Any]:
        # Formulate TypeSafe primitives: Choice, Noul, Score
        department_options = {
            Department.PWD.value: "Road Department",
            Department.WATER_BOARD.value: "Water Department",
            Department.SANITATION.value: "Sanitation Department",
            Department.ELECTRICITY_BOARD.value: "Electrical Department",
            Department.SEWERAGE.value: "Sewerage Department",
            Department.TRAFFIC_POLICE.value: "Traffic Department",
            Department.POLICE.value: "Public Safety",
            Department.HEALTH.value: "Healthcare Department",
            Department.OTHER.value: "Other",
        }

        questions = {
            "category": {
                "type": "choice",
                "instructions": "Identify the single primary category of this civic grievance.",
                "criteria": {**{c.value: c.value for c in Category}, "healthcare": "healthcare"}
            },
            "department": {
                "type": "choice",
                "instructions": "Choose exactly ONE department that should receive and resolve this grievance. You MUST choose only from the nine listed departments; never invent or return ambulance, fire, hospital, municipal corporation, or any other department. Use Public Safety for emergencies/fire/accidents/violence that require emergency public-safety action. Use Healthcare Department for medical, hospital, clinic, health-worker, disease, sanitation-health, or public-health issues.",
                "criteria": department_options,
            },
            "severity": {
                "type": "choice",
                "instructions": "Determine the severity of the issue.",
                "criteria": {s.value: s.value for s in Severity}
            },
            "is_emergency": {
                "type": "noul",
                "instructions": "Does this grievance describe an immediate, time-critical emergency (e.g., accident, fire, violence) requiring urgent public-safety action?"
            },
            "multimodal_contradiction": {
                "type": "noul",
                "instructions": "Does the text/audio severely contradict the visual evidence described?"
            },
            "public_safety_risk": {
                "type": "score",
                "instructions": "Score the risk to public safety.",
                "criteria": ["None", "Low", "Medium", "High", "Extreme hazard"]
            }
        }
        
        payload = {
            "model": self.model,
            "state": text,
            "questions": questions
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json"
        }

        
        for attempt in range(Config.AI_MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=Config.AI_REQUEST_TIMEOUT_SECONDS) as client:
                    response = await client.post(self.url, headers=headers, json=payload)
                    response.raise_for_status()
                    
                    data = response.json()
                    answers = data.get("answers", {})
                    
                    # Extract typed answers directly from TypeSafe primitives without parsing text
                    category_choice = answers.get("category", {})
                    severity_choice = answers.get("severity", {})
                    
                    category_str = category_choice.get("choice", Category.OTHER.value)
                    
                    # Exactly one routing target is selected from the fixed nine-department allowlist.
                    department_choice = answers.get("department", {})
                    selected_department = department_choice.get("choice", Department.OTHER.value)
                    allowed_departments = {d.value for d in Department}
                    if selected_department not in allowed_departments:
                        selected_department = Department.OTHER.value
                    detected_departments = [selected_department]
                    
                    subcat_mapping = {
                        Category.ROAD.value: "Pothole/Damage",
                        Category.HEALTHCARE.value: "Medical/Health Issue",
                        Category.WATER.value: "Leak/Shortage",
                        Category.SANITATION.value: "Uncollected Waste",
                        Category.ELECTRICAL.value: "Outage/Spark",
                        Category.SEWERAGE.value: "Open Drain/Smell",
                        Category.OTHER.value: "Unclassified"
                    }
                    
                    # Parse and strictly validate with Pydantic
                    json_dict = {
                        "category": category_str,
                        "subCategory": subcat_mapping.get(category_str, "Unclassified"),
                        "secondaryCategories": [], 
                        "severity": severity_choice.get("choice", Severity.LOW.value),
                        "departments": detected_departments,
                        "is_emergency": answers.get("is_emergency", {}).get("noul", 0.0) > 0.8,
                        "public_safety_risk": min(1.0, max(0.0, answers.get("public_safety_risk", {}).get("score", 0.0) / 4.0)),
                        "confidence_category": category_choice.get("confidence", 0.0),
                        "confidence_severity": severity_choice.get("confidence", 0.0),
                        "multimodal_contradiction": answers.get("multimodal_contradiction", {}).get("noul", 0.0) > 0.7
                    }
                    
                    validated = JevClassificationResponse(**json_dict)
                    return validated.model_dump()
                    
            except (httpx.RequestError, httpx.HTTPStatusError) as e:
                logger.warning(f"Provider API error on attempt {attempt + 1}: {e}")
            except (ValidationError, KeyError) as e:
                logger.warning(f"Type validation error on attempt {attempt + 1}: {e}")
                
        logger.error("All retries failed. Using deterministic local fallback classification.")
        return self._local_fallback(text)

    @staticmethod
    def _local_fallback(text: str) -> Dict[str, Any]:
        """Safe offline classifier for provider outages.

        This is intentionally conservative: it handles only high-signal civic
        keywords and assigns deliberately low confidence so the main pipeline sends the
        result to human review instead of pretending it is an LLM result.
        """
        normalized = text.lower()

        if any(k in normalized for k in ("fire", "accident", "robbery", "violence", "ambulance")):
            return {
                "category": Category.EMERGENCY,
                "subCategory": "Emergency",
                "secondaryCategories": [],
                "severity": Severity.CRITICAL,
                "departments": [Department.POLICE],
                "is_emergency": True,
                "public_safety_risk": 1.0,
                "confidence_category": 0.60,
                "confidence_severity": 0.60,
                "multimodal_contradiction": False,
            }

        keyword_map = [
            (("pothole", "road", "street", "highway"), Category.ROAD, "Pothole/Damage", Severity.HIGH, Department.PWD, 0.8),
            (("water leak", "water leakage", "water supply", "no water"), Category.WATER, "Leak/Shortage", Severity.MEDIUM, Department.WATER_BOARD, 0.5),
            (("garbage", "waste", "sanitation"), Category.SANITATION, "Uncollected Waste", Severity.MEDIUM, Department.SANITATION, 0.5),
            (("electricity", "power cut", "transformer", "electric pole"), Category.ELECTRICAL, "Outage/Spark", Severity.HIGH, Department.ELECTRICITY_BOARD, 0.7),
            (("sewer", "sewage", "drain"), Category.SEWERAGE, "Open Drain/Smell", Severity.HIGH, Department.SEWERAGE, 0.7),
            (("traffic", "signal", "congestion"), Category.TRAFFIC, "Traffic Issue", Severity.MEDIUM, Department.TRAFFIC_POLICE, 0.6),
            (("hospital", "clinic", "doctor", "medical", "health", "medicine", "ambulance", "disease"), Category.HEALTHCARE, "Medical/Health Issue", Severity.HIGH, Department.HEALTH, 0.7),
        ]

        for keywords, category, subcategory, severity, department, risk in keyword_map:
            if any(k in normalized for k in keywords):
                return {
                    "category": category,
                    "subCategory": subcategory,
                    "secondaryCategories": [],
                    "severity": severity,
                    "departments": [department],
                    "is_emergency": False,
                    "public_safety_risk": risk,
                    "confidence_category": 0.55,
                    "confidence_severity": 0.55,
                    "multimodal_contradiction": False,
                }

        return {
            "category": Category.OTHER,
            "subCategory": "Unclassified",
            "secondaryCategories": [],
            "severity": Severity.LOW,
            "departments": [Department.OTHER],
            "is_emergency": False,
            "public_safety_risk": 0.1,
            "confidence_category": 0.0,
            "confidence_severity": 0.0,
            "multimodal_contradiction": False,
        }
