from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from api.routes import router as api_router

app = FastAPI(title="Civix AI Engine")

app.include_router(api_router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "ok"}
