import os
import base64
import httpx
import logging
from config import Config

logger = logging.getLogger(__name__)

class GroqVisionClient:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "").strip()
        self.url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = Config.GROQ_VISION_MODEL

    async def _complete(self, content):
        if not self.api_key:
            logger.warning("GROQ_API_KEY is not configured; skipping vision analysis")
            return ""
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": content}],
            "temperature": 0.1,
            "max_tokens": 700,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=Config.AI_REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.post(self.url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                return str(data.get("choices", [{}])[0].get("message", {}).get("content", "") or "").strip()
        except Exception as exc:
            logger.warning("Groq vision analysis failed: %s", exc)
            return ""

    async def analyze_image(self, image_url: str) -> str:
        prompt = (
            "Analyze this civic-issue image. Describe only observable evidence relevant to "
            "the grievance: issue type, visible hazards, approximate severity, and useful details. "
            "Do not invent facts. If the image is unclear, say UNCLEAR."
        )
        return await self._complete([
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": image_url}},
        ])

    async def analyze_image_bytes(self, image_bytes: bytes, mime_type: str = "image/jpeg", prompt: str | None = None) -> str:
        encoded = base64.b64encode(image_bytes).decode("ascii")
        data_url = f"data:{mime_type};base64,{encoded}"
        return await self._complete([
            {"type": "text", "text": prompt or "Describe the visible civic issue and safety hazards in this frame. Be factual and concise."},
            {"type": "image_url", "image_url": {"url": data_url}},
        ])

    async def analyze_images(self, images: list[tuple[bytes, str]], prompt: str) -> str:
        content = [{"type": "text", "text": prompt}]
        for image_bytes, mime_type in images[:3]:
            encoded = base64.b64encode(image_bytes).decode("ascii")
            content.append({"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded}"}})
        return await self._complete(content)

    async def generate_grievance_copy(self, report_text: str, voice_only: bool = False) -> tuple[str, str]:
        """Generate a public-facing heading and one short factual description."""
        if not report_text.strip():
            return ("Civic issue reported", "A civic issue was reported and sent for AI analysis.")

        prompt = (
            "Create concise public-feed copy for a civic grievance. "
            "Return exactly two lines and nothing else:\n"
            "TITLE: <heading, maximum 90 characters>\n"
            "SUMMARY: <one factual sentence, maximum 220 characters>\n\n"
            "Rules: do not invent facts, names, locations, numbers, or causes; "
            "focus on the actual civic problem and observable impact. "
            "The SUMMARY must be a genuinely shorter rewritten description, not a copy of the report or TITLE. "
            "Do not repeat the same sentence in TITLE and SUMMARY. "
            "Use a natural public-service description that adds concise context about the reported problem or impact. "
            + ("This report came from a voice transcript, so rewrite it naturally and do not mention that it was transcribed. " if voice_only else "")
            + "\nReport:\n" + report_text[:12000]
        )
        raw = await self._complete([{"type": "text", "text": prompt}])
        title = ""
        summary = ""
        for line in raw.splitlines():
            stripped = line.strip()
            if stripped.upper().startswith("TITLE:"):
                title = stripped.split(":", 1)[1].strip().strip('"')
            elif stripped.upper().startswith("SUMMARY:"):
                summary = stripped.split(":", 1)[1].strip().strip('"')

        if not title or not summary:
            sentences = [part.strip() for part in report_text.replace("\n", " ").split(".") if part.strip()]
            fallback = sentences[0] if sentences else report_text.strip()
            title = title or fallback[:90].rstrip()
            summary = summary or fallback[:220].rstrip()

        # Never expose the raw report twice in the public feed. If the model
        # accidentally returns the same wording for title and summary, ask it
        # for a shorter rewrite once before falling back to a safe template.
        def normalize(value: str) -> str:
            return " ".join(value.lower().split()).strip(" .!?\"")

        if normalize(summary) in {normalize(title), normalize(report_text)}:
            rewrite_prompt = (
                "Rewrite this civic grievance as ONE short public-facing description. "
                "Do not repeat the original sentence or title. Mention the civic problem and its practical impact only. "
                "Maximum 180 characters. Return only the description.\n\n"
                + report_text[:12000]
            )
            try:
                rewritten = (await self._complete([{"type": "text", "text": rewrite_prompt}])).strip().strip('"')
                if rewritten and normalize(rewritten) not in {normalize(title), normalize(report_text)}:
                    summary = rewritten
            except Exception:
                pass

        if normalize(summary) in {normalize(title), normalize(report_text)}:
            summary = "The reported civic issue may affect local safety, access or daily movement and requires attention from the responsible department."

        return title[:500], summary[:1000]
