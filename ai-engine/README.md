# Civix AI Engine

Standalone FastAPI service for Civix grievance intelligence.

## Features
- Strict Pydantic Contracts
- LLaMA-3 (OpenRouter) Classification
- Groq Vision (Image Processing)
- Sarvam STT (Voice Processing)
- Deterministic Impact Scoring
- Human-in-the-Loop Confidence Engine
- Semantic Duplicate Detection

## Run locally
```bash
python -m venv venv
source venv/Scripts/activate # On Windows
pip install -r requirements.txt
uvicorn app:app --reload
```

## Testing
```bash
pytest
```

## Run with Docker
```bash
docker build -t civix-ai-engine .
docker run -p 8000:8000 --env-file .env civix-ai-engine
```


## CiviX department routing

AI routing is constrained to exactly these 9 department codes: `pwd`, `water_board`, `sanitation`, `electricity_board`, `sewerage`, `traffic_police`, `police`, `health`, `other`. Each grievance is assigned to exactly one department.
