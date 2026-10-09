import asyncio
from dotenv import load_dotenv
import json

import os

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from pipeline.grievance_pipeline import process_grievance
from models.request_models import GrievanceRequest, Location

async def main():
    request = GrievanceRequest(
        grievanceId="test-text-2",
        text="mere ghar ke bahar nali pe koi covering nahi hai usme me smell aati hai ise thik karo",
        language="hi",
        media=[],
        location=Location(latitude=28.6139, longitude=77.2090)
    )
    
    print("Running Civix AI Engine pipeline...")
    response = await process_grievance(request)
    
    print("\n--- AI Engine Response ---")
    print(json.dumps(response.model_dump(), indent=2))

if __name__ == "__main__":
    asyncio.run(main())
