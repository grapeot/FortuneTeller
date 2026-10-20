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
    "gemini": os.getenv("AI_MODEL_GEMINI", "gemini-3.8-flash"),
    "grok": os.getenv("AI_MODEL_GROK", "grok-4-fast"),
}

# Models used for deep analysis email (parallel multi-model)
DEEP_MODELS = {
    "Gemini": os.getenv("AI_MODEL_GEMINI", "gemini-3.8-flash"),
    "DeepSeek": os.getenv("AI_MODEL_DEEPSEEK", "deepseek"),
    "Kimi": os.getenv("AI_MODEL_KIMI", "kimi-k3"),
}

# ── Pixelation ──────────────────────────────────────────────────────────────
PIXEL_SIZE = 64      # downscale target for pixel art (frontend upscales via CSS)

# ── Email / Resend ────────────────────────────────────────────────────────
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
COMMUNITY_URL = "https://signup.superlinear.academy/"

# ── Logging ────────────────────────────────────────────────────────────────
logger = logging.getLogger("fortune-teller")
