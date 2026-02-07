"""
FastAPI route handlers.
"""

import asyncio
import base64
import io
import os
import uuid

import httpx
from fastapi import HTTPException, BackgroundTasks
from fastapi.responses import FileResponse

from .app import app
from . import config
from .models import FortuneRequest, PixelateRequest, ShareRequest, SubscribeRequest
from .firebase import get_db, get_mod
from . import ai
from .pixelate import pixelate_image
from . import email_service


# ── POST /api/fortune ────────────────────────────────────────────────────────

@app.post("/api/fortune")
async def generate_fortune(req: FortuneRequest = None):
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
async def create_share(req: ShareRequest, background_tasks: BackgroundTasks):
    """Save fortune to Firestore (async) and return a share URL immediately."""
    db = get_db()
    mod = get_mod()
    if not db:
        raise HTTPException(
            status_code=503, detail="Share feature not available (Firestore not configured)"
        )

    share_id = uuid.uuid4().hex[:8]

    fortunes_data = req.fortunes
    if not fortunes_data and req.fortune:
        fortunes_data = {"gemini": req.fortune, "grok": None}

    doc = {
        "pixelated_image": req.pixelated_image,
        "fortunes": fortunes_data,
        "created_at": mod.SERVER_TIMESTAMP,
    }

    # Write to Firestore in background so the QR code appears instantly
    def _write_to_firestore():
        try:
            db.collection("fortunes").document(share_id).set(doc)
        except Exception as e:
            config.logger.error(f"Firestore background write failed for {share_id}: {e}")

    background_tasks.add_task(asyncio.to_thread, _write_to_firestore)

    return {"id": share_id, "url": f"/share/{share_id}"}


# ── GET /api/share/{id} ─────────────────────────────────────────────────────

@app.get("/api/share/{share_id}")
async def get_share(share_id: str):
    """Retrieve a shared fortune from Firestore."""
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Share feature not available")

    doc = await asyncio.to_thread(
        db.collection("fortunes").document(share_id).get
    )
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Share not found")

    data = doc.to_dict()
    fortunes = data.get("fortunes")
    if not fortunes and data.get("fortune"):
        fortunes = {"gemini": data["fortune"], "grok": None}

    return {
        "pixelated_image": data.get("pixelated_image"),
        "fortunes": fortunes,
    }


# ── POST /api/subscribe ─────────────────────────────────────────────────────

@app.post("/api/subscribe")
async def subscribe(req: SubscribeRequest, background_tasks: BackgroundTasks):
    """Accept email subscription and process in background."""
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    if not config.RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="Email service not configured")

    background_tasks.add_task(email_service.subscribe_background, req.email, req.name, req.share_id)

    return {
        "status": "accepted",
        "message": "Analysis will be sent to your email",
    }


# ── GET /api/health ──────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "models": config.MODELS,
        "token_configured": bool(config.AI_TOKEN),
        "firestore_configured": get_db() is not None,
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
