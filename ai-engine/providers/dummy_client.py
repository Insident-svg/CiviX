from models.enums import Category, Severity
import random

class DummyAIProvider:
    def classify_text(self, text: str):
        """
        Simulates an AI classification response.
        """
        # In a real app, this would call Jev or Groq/OpenRouter.
        # For now, we deterministically mock based on keywords.
        text_lower = text.lower()
        
        category = Category.OTHER
        sub_category = "General"
        severity = Severity.LOW
        
        if "pothole" in text_lower or "road" in text_lower:
            category = Category.ROAD
            sub_category = "Pothole"
            severity = Severity.HIGH if "large" in text_lower else Severity.MEDIUM
            
        elif "water" in text_lower or "leak" in text_lower:
            category = Category.WATER
            sub_category = "Leakage"
            severity = Severity.HIGH
            
        elif "light" in text_lower or "electric" in text_lower:
            category = Category.ELECTRICAL
            sub_category = "Streetlight"
            severity = Severity.MEDIUM
            
        return {
            "category": category,
            "subCategory": sub_category,
            "severity": severity,
            "public_safety_risk": 0.8 if severity in [Severity.HIGH, Severity.CRITICAL] else 0.3,
            "confidence_category": random.uniform(0.70, 0.99),
            "confidence_severity": random.uniform(0.70, 0.99)
        }
