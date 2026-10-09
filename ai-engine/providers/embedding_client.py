# pyrefly: ignore [missing-import]
import httpx
import logging
from typing import List
from config import Config

logger = logging.getLogger(__name__)

class EmbeddingClient:
    def __init__(self):
        self.api_key = Config.OPENROUTER_API_KEY
        self.url = "https://api.openai.com/v1/embeddings" # Configurable endpoint
        self.model = "text-embedding-3-small"

    async def get_embedding(self, text: str) -> List[float]:
        """
        Returns a vector embedding for the given text.
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "input": text,
            "model": self.model
        }
        
        try:
            async with httpx.AsyncClient(timeout=Config.AI_REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.post(self.url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                
                return data["data"][0]["embedding"]
                
        except Exception as e:
            logger.error(f"Embedding failed: {e}")
            return []
