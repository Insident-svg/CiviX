import logging
import re

logger = logging.getLogger(__name__)

try:
    from better_profanity import profanity as _profanity
except ImportError:  # pragma: no cover - exercised in minimal deployments
    _profanity = None

# Minimal safety fallback so the service can boot even if the optional
# better-profanity package is unavailable. The full detector remains preferred
# whenever the dependency is installed.
_FALLBACK_WORDS = {
    "fuck",
    "fucking",
    "shit",
    "bitch",
    "asshole",
    "bastard",
}


def _fallback_contains_profanity(text: str) -> bool:
    normalized = re.sub(r"[^a-z0-9]+", " ", text.lower())
    return any(f" {word} " in f" {normalized} " for word in _FALLBACK_WORDS)


def check_toxicity(text: str) -> bool:
    """Return True when the grievance contains severe profanity/abuse."""
    if not text:
        return False

    if _profanity is not None:
        is_toxic = _profanity.contains_profanity(text)
    else:
        is_toxic = _fallback_contains_profanity(text)
        logger.warning(
            "better_profanity is unavailable; using the built-in moderation fallback."
        )

    if is_toxic:
        logger.warning("Toxic content detected in grievance text. Rejecting.")
    return is_toxic
