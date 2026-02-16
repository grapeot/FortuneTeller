"""
FastAPI route handlers.
"""

import asyncio
import base64
import io
import json
import math
import os
import time
import uuid
from typing import Optional, Tuple

import httpx
from fastapi import HTTPException, BackgroundTasks
from fastapi.responses import FileResponse

from .app import app
from . import config
from .models import (
    FortuneRequest,
    PixelateRequest,
    ShareRequest,
    SubscribeRequest,
    AnalysisRequest,
)
from .storage import get_share_storage
from . import ai
from .pixelate import pixelate_image
from . import email_service


def _sanitize_firestore_key(key: str) -> str:
    cleaned = key
    for ch in (".", "/", "*", "[", "]", "~"):
        cleaned = cleaned.replace(ch, "_")
    return cleaned or "field"


def _sanitize_for_firestore(value):
    """Normalize nested payload into Firestore-safe JSON values."""
    if isinstance(value, dict):
        return {
            _sanitize_firestore_key(str(k)): _sanitize_for_firestore(v)
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [_sanitize_for_firestore(v) for v in value]
    if isinstance(value, tuple):
        return [_sanitize_for_firestore(v) for v in value]
    if isinstance(value, float):
        if not math.isfinite(value):
            return None
        return round(value, 5)
    if isinstance(value, (int, bool, str)) or value is None:
        return value
    return str(value)


def _encode_visualization_for_firestore(value):
    """Convert visualization payload into Firestore-compatible structure."""
    sanitized = _sanitize_for_firestore(value)
    if not isinstance(sanitized, dict):
        return sanitized

    landmarks = sanitized.get("landmarks")
    if isinstance(landmarks, list):
        converted = []
        for point in landmarks:
            if isinstance(point, (list, tuple)) and len(point) >= 2:
                converted.append({"x": point[0], "y": point[1]})
            elif isinstance(point, dict) and "x" in point and "y" in point:
                converted.append({"x": point["x"], "y": point["y"]})
        sanitized["landmarks"] = converted

    return sanitized


def _decode_visualization_from_firestore(value):
    """Convert Firestore-safe visualization back to frontend shape."""
    if not isinstance(value, dict):
        return value

    landmarks = value.get("landmarks")
    if isinstance(landmarks, list):
        value["landmarks"] = [
            [point.get("x"), point.get("y")]
            for point in landmarks
            if isinstance(point, dict) and "x" in point and "y" in point
        ]
    return value


def _normalize_fortunes_payload(data: dict) -> dict:
    fortunes = data.get("fortunes")
    if not fortunes and data.get("fortune"):
        fortunes = {"gemini": data["fortune"], "grok": None}
    return fortunes or {}


async def _compute_and_cache_l2_analysis(share_id: str) -> Tuple[Optional[str], bool]:
    """Return (analysis, cached) for a share id, caching when needed."""
    storage = get_share_storage()
    if not storage.is_available() or not config.AI_TOKEN:
        return None, False

    data = await asyncio.to_thread(storage.get_share, share_id)
    if not data:
        return None, False

    cached = data.get("analysis_l2")
    if cached:
        return cached, True

    fortunes = _normalize_fortunes_payload(data)
    if not fortunes:
        return None, False

    analysis = await ai.generate_deep_analysis(fortunes)

    await asyncio.to_thread(storage.update_share, share_id, {"analysis_l2": analysis})

    return analysis, False


async def _backfill_l2_analysis(share_id: str):
    """Fire-and-forget L2 generation after share creation."""
    try:
        await _compute_and_cache_l2_analysis(share_id)
    except Exception as exc:
        config.logger.warning(
            "L2 backfill failed for share %s: %s", share_id, exc
        )


# ── POST /api/fortune ────────────────────────────────────────────────────────


@app.post("/api/fortune")
async def generate_fortune(req: Optional[FortuneRequest] = None):
    """Call Grok only, return result in multi-model format for compatibility."""
    if not config.AI_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="AI_BUILDER_TOKEN not configured on the server",
        )

    user_content = ai.build_user_content(req)

    grok_result = await ai.call_model("grok", config.MODELS["grok"], user_content)

    if not grok_result:
        raise HTTPException(status_code=502, detail="Grok model failed")

    return {"gemini": None, "grok": grok_result}


# ── POST /api/pixelate ──────────────────────────────────────────────────────


@app.post("/api/pixelate")
async def pixelate_avatar(req: PixelateRequest):
    """Generate a pixelated cartoon avatar via AI Builder Space image edit API."""
    if not config.AI_TOKEN:
        raise HTTPException(status_code=503, detail="AI_BUILDER_TOKEN not configured")

    try:
        raw_b64 = req.image.split(",", 1)[-1] if "," in req.image else req.image
        image_bytes = base64.b64decode(raw_b64)

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{config.AI_API_BASE}/images/edits",
                headers={"Authorization": f"Bearer {config.AI_TOKEN}"},
                files=[("image", ("face.jpg", io.BytesIO(image_bytes), "image/jpeg"))],
                data={
                    "model": "gemini-2.5-flash-image",
                    "prompt": (
                        "Based on this face photo, generate a pixel art style cartoon portrait. "
                        "Capture key facial features (face shape, hairstyle, skin tone, glasses if any, "
                        "facial hair if any) so people who know them can recognize them instantly. "
                        "Use a clean, colorful pixel art aesthetic with a simple solid-color background. "
                        "Cute but recognizable — like a retro game character portrait. No text or labels."
                    ),
                    "size": "1024x1024",
                },
            )
            resp.raise_for_status()

        data = resp.json()
        img_item = (data.get("data") or [{}])[0]

        if img_item.get("b64_json"):
            img_bytes = base64.b64decode(img_item["b64_json"])
        elif img_item.get("url"):
            url = img_item["url"]
            if url.startswith("data:"):
                img_bytes = base64.b64decode(url.split(",", 1)[-1])
            else:
                async with httpx.AsyncClient(timeout=30.0) as dl:
                    dl_resp = await dl.get(url)
                    dl_resp.raise_for_status()
                    img_bytes = dl_resp.content
        else:
            raise RuntimeError("No image data in AI response")

        result_b64 = await asyncio.to_thread(pixelate_image, img_bytes)
        return {"pixelated_image": f"data:image/png;base64,{result_b64}"}

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"AI image API error: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Pixelation failed: {e}")


# ── POST /api/share ──────────────────────────────────────────────────────────


@app.post("/api/share")
async def create_share(req: ShareRequest):
    """Save fortune to Firestore and return a share URL."""
    storage = get_share_storage()
    if not storage.is_available():
        raise HTTPException(
            status_code=503,
            detail="Share feature not available (Firestore not configured)",
        )

    total_start = time.perf_counter()

    share_id = uuid.uuid4().hex[:8]

    fortunes_data = req.fortunes
    if not fortunes_data and req.fortune:
        fortunes_data = {"gemini": req.fortune, "grok": None}

    encode_start = time.perf_counter()
    encoded_viz = _encode_visualization_for_firestore(req.visualization_data)
    encode_ms = (time.perf_counter() - encode_start) * 1000.0

    doc = {
        "pixelated_image": req.pixelated_image,
        "visualization_data": encoded_viz,
        "fortunes": fortunes_data,
    }

    serialize_start = time.perf_counter()
    doc_bytes = len(json.dumps(doc, ensure_ascii=False).encode("utf-8"))
    serialize_ms = (time.perf_counter() - serialize_start) * 1000.0

    try:
        firestore_start = time.perf_counter()
        await asyncio.to_thread(storage.create_share, share_id, doc)
        firestore_ms = (time.perf_counter() - firestore_start) * 1000.0
    except Exception as e:
        elapsed_ms = (time.perf_counter() - total_start) * 1000.0
        config.logger.error(
            "/api/share failed id=%s elapsed_ms=%.1f encode_ms=%.1f serialize_ms=%.1f pixelated_chars=%d doc_bytes=%d error=%s",
            share_id,
            elapsed_ms,
            encode_ms,
            serialize_ms,
            len(req.pixelated_image or ""),
            doc_bytes,
            e,
        )
        raise HTTPException(status_code=502, detail="Failed to persist share data")

    if config.AI_TOKEN:
        asyncio.create_task(_backfill_l2_analysis(share_id))

    total_ms = (time.perf_counter() - total_start) * 1000.0
    viz_landmarks = 0
    if isinstance(req.visualization_data, dict):
        landmarks = req.visualization_data.get("landmarks")
        if isinstance(landmarks, list):
            viz_landmarks = len(landmarks)

    config.logger.info(
        "/api/share ok id=%s total_ms=%.1f encode_ms=%.1f serialize_ms=%.1f firestore_ms=%.1f pixelated_chars=%d viz_landmarks=%d doc_bytes=%d",
        share_id,
        total_ms,
        encode_ms,
        serialize_ms,
        firestore_ms,
        len(req.pixelated_image or ""),
        viz_landmarks,
        doc_bytes,
    )

    return {"id": share_id, "url": f"/share/{share_id}"}


# ── GET /api/share/{id} ─────────────────────────────────────────────────────


@app.get("/api/share/{share_id}")
async def get_share(share_id: str):
    """Retrieve a shared fortune from Firestore."""
    storage = get_share_storage()
    if not storage.is_available():
        raise HTTPException(status_code=503, detail="Share feature not available")

    data = await asyncio.to_thread(storage.get_share, share_id)
    if not data:
        raise HTTPException(status_code=404, detail="Share not found")

    fortunes = _normalize_fortunes_payload(data)

    return {
        "pixelated_image": data.get("pixelated_image"),
        "visualization_data": _decode_visualization_from_firestore(
            data.get("visualization_data")
        ),
        "fortunes": fortunes,
        "analysis_l2": data.get("analysis_l2"),
    }


# ── POST /api/subscribe ─────────────────────────────────────────────────────


@app.post("/api/subscribe")
async def subscribe(req: SubscribeRequest, background_tasks: BackgroundTasks):
    """Accept email subscription and process in background."""
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    if not config.RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="Email service not configured")

    background_tasks.add_task(
        email_service.subscribe_background, req.email, req.name, req.share_id
    )

    return {
        "status": "accepted",
        "message": "Analysis will be sent to your email",
    }


# ── POST /api/analysis/l2 ───────────────────────────────────────────────────


@app.post("/api/analysis/l2")
async def generate_l2_analysis(req: AnalysisRequest):
    """Generate or return cached L2 detailed analysis (Gemini)."""
    if not config.AI_TOKEN:
        raise HTTPException(status_code=503, detail="AI token not configured")

    storage = get_share_storage()
    if not storage.is_available():
        raise HTTPException(status_code=503, detail="Share feature not available")

    analysis, cached = await _compute_and_cache_l2_analysis(req.share_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Share not found")

    return {"analysis": analysis, "cached": cached}


# ── GET /api/health ──────────────────────────────────────────────────────────


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "models": config.MODELS,
        "token_configured": bool(config.AI_TOKEN),
        "firestore_configured": get_share_storage().is_available(),
        "email_configured": bool(config.RESEND_API_KEY),
        "circle_configured": bool(config.CIRCLE_V2_TOKEN),
    }


# ── Serve static files + SPA fallback (must be LAST) ────────────────────────
dist_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist")

if os.path.isdir(dist_dir):

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str = ""):
        """Serve static files from dist/, fall back to index.html for SPA routing."""
        if full_path:
            file_path = os.path.join(dist_dir, full_path)
            if os.path.isfile(file_path):
                return FileResponse(file_path)
        index_path = os.path.join(dist_dir, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404)
