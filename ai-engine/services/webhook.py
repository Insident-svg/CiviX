import httpx
import logging
from config import Config

logger = logging.getLogger(__name__)

async def send_webhook_callback(url: str, payload: dict):
    """
    Sends the final AI analysis response to the provided webhook URL.
    """
    if not url:
        return

    try:
        async with httpx.AsyncClient(timeout=Config.AI_REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            logger.info(f"Successfully sent webhook callback to {url}")
    except Exception as e:
        logger.error(f"Failed to send webhook callback to {url}: {e}")
