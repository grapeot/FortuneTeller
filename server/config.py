"""
Configuration: all environment variables and constants.
"""

import os
import logging

from dotenv import load_dotenv

load_dotenv()

# ── AI API ──────────────────────────────────────────────────────────────────
AI_API_BASE = os.getenv("AI_API_BASE_URL", "https://space.ai-builders.com/backend/v1")
AI_TOKEN = os.getenv("AI_BUILDER_TOKEN") or os.getenv("VITE_AI_API_TOKEN", "")

MODELS = {
    "gemini": os.getenv("AI_MODEL_GEMINI", "gemini-3-flash-preview"),
    "grok": os.getenv("AI_MODEL_GROK", "grok-4-fast"),
}

# ── Pixelation ──────────────────────────────────────────────────────────────
PIXEL_SIZE = 64      # downscale target for pixel art (frontend upscales via CSS)

# ── Email / Circle / Resend ────────────────────────────────────────────────
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
CIRCLE_V2_TOKEN = os.getenv("CIRCLE_V2_TOKEN", "")
CIRCLE_SPACE_IDS = [
    int(s.strip()) for s in os.getenv("CIRCLE_SPACE_IDS", "").split(",") if s.strip()
]
COMMUNITY_URL = "https://www.superlinear.academy"

# ── Logging ────────────────────────────────────────────────────────────────
logger = logging.getLogger("fortune-teller")
