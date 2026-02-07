"""
Thin FastAPI backend for AI Fortune Teller.
- POST /api/fortune    → calls Gemini + Grok in parallel, returns both results
- POST /api/pixelate   → generates pixelated cartoon avatar via AI Builder Space
- POST /api/share      → saves fortune to Firestore and returns share URL
- GET  /api/share/{id} → retrieves a shared fortune
- GET  /*              → serves the Vite-built static files (SPA fallback)
"""

import asyncio
import base64
import io
import json
import os
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import httpx

load_dotenv()  # for local dev (.env file)

app = FastAPI(title="AI Fortune Teller Backend")

# ── Config (all from environment) ───────────────────────────────────────────
AI_API_BASE = os.getenv("AI_API_BASE_URL", "https://space.ai-builders.com/backend/v1")
AI_TOKEN = os.getenv("AI_BUILDER_TOKEN") or os.getenv("VITE_AI_API_TOKEN", "")

# Models for parallel generation
MODELS = {
    "gemini": os.getenv("AI_MODEL_GEMINI", "gemini-3-flash-preview"),
    "grok": os.getenv("AI_MODEL_GROK", "grok-4-fast"),
}

PIXEL_SIZE = 64      # downscale target for pixel art
PIXEL_DISPLAY = 384  # upscale back with nearest-neighbor

# ── Firebase / Firestore ────────────────────────────────────────────────────
_firestore_db = None
_firestore_mod = None  # lazy reference to firestore module


def _init_firestore():
    global _firestore_db, _firestore_mod
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore as _fs

        _firestore_mod = _fs

        cred_json = os.getenv("FIREBASE_CREDENTIALS")
        cred_path = os.getenv(
            "FIREBASE_CREDENTIALS_PATH", "config/firebase-credentials.json"
        )

        if cred_json:
            cred_obj = credentials.Certificate(json.loads(cred_json))
        elif os.path.exists(cred_path):
            cred_obj = credentials.Certificate(cred_path)
        else:
            print("⚠ No Firebase credentials found, share feature disabled")
            return

        firebase_admin.initialize_app(cred_obj)
        _firestore_db = _fs.client()
        print("✓ Firestore initialized")
    except ImportError:
        print("⚠ firebase-admin not installed, share feature disabled")
    except Exception as e:
        print(f"⚠ Firebase init error: {e}")


_init_firestore()

# ── System prompt ───────────────────────────────────────────────────────────
SYSTEM_PROMPT = """你是一位精通中国传统面相学的相面先生。此刻正值2026年丙午马年新春，你在庙会上为来客看相。你会收到来访者的面部照片以及面部测量数据。请根据你实际观察到的面部特征，给出专业、具体的面相分析。

## 面相学知识体系

### 五官（五官配合是相面根基）
- 采听官（耳）：轮廓分明、耳垂厚实→福气深厚。耳高与眉齐→聪慧。贴面→内敛稳重。
- 保寿官（眉）：浓密清晰→决断力强、贵人缘旺。眉长过目→重义气。眉侵印堂→思虑深重、易钻牛角尖。眉尾散→做事欠恒心。
- 监察官（眼）：大而有神→情感丰沛。黑白分明→心正。细长→冷静理性。眼神有力→目标明确。眼窝凹陷→缜密但易内耗。卧蚕饱满→人缘极佳。
- 审辨官（鼻）：鼻梁挺直→自信果敢。山根高→意志坚定。准头有肉→正财运旺。鼻翼丰满→善聚财。鼻孔外露→出手大方。
- 出纳官（口）：唇厚→重情义。嘴角上翘→天性乐观。人中深长→元气充沛、主寿。

### 三停
- 上停（发际→眉）：饱满高广→少年得志、智慧高。
- 中停（眉→鼻准头）：丰隆端正→中年事业有成。鼻颧得配→做大事的格局。
- 下停（鼻下→下巴）：圆实丰厚→晚年安乐。下巴后缩→晚运稍弱。

### 十二宫位
- 命宫（印堂）：开阔饱满→心胸宽广。狭窄有纹→多虑执着。
- 财帛宫（准头）：有肉丰隆→正财旺。
- 官禄宫（额头正中）：光洁饱满→事业运佳。
- 夫妻宫（眼尾）：平满→感情和顺。凹陷→情感多波。
- 田宅宫（眉眼之间）：宽广→家运兴旺、心态放得开。

### 关键配合
鼻颧得配→事业运强。眉眼相配→有福。三停均衡→运势平稳。

### 脸型
方形→领导者、执行力强。圆形→社交达人。长形→学者型。菱形→有魄力、独立。

## 分析风格

你的语言风格参考传统相面先生：温和自信，言之有物，每句论断都指向具体的面部特征。不是念吉祥话，而是在看他的脸说他的事。

采用"注意到X→说明Y，再结合Z→判断W"的交叉验证模式。范例：
- "先看这山根，气势不弱，一路到准头都饱满有力，中年财运当旺。鼻翼也厚实，能进也能守。"
- "三停来看，中停最为突出，三十到五十岁间是最好的年华。鼻颧相配，适合挑大梁。"
- "眉毛侵入印堂，思虑偏重，好处是想得周全，但也容易自己跟自己较劲。"

## 输出要求

分为三部分：

1. **face**（面相观察，4-6句话）：
   - 用专业面相术语（天庭、印堂、颧骨、山根、准头、法令、卧蚕、田宅宫等）
   - 基于照片中实际可见的面部特征
   - 交叉验证：至少两个特征互相印证
   - 提及三停比例
   - 语言沉稳、具体、不浮夸
   - 结尾用"——"

2. **career**（事业与人生建议，3-4句话）：
   - 从面相推导性格特质，给出扬长避短的建议
   - 假设此人是知识工作者，给出适合其面相的发展方向
   - 建议具体可行
   - 语气像有阅历的长辈给后辈指路，温和但有分量
   - 新春氛围下以鼓励为主

3. **blessing**（新春祝语，1-2句话）：
   - 和前面的面相呼应
   - 可用马年典故（马到成功、龙马精神、一马当先等）
   - 温暖真诚
   - 结尾用"！"

## 原则
- 以褒为主，但有具体依据
- 每次必须不同
- 让人感觉你真的在看他的脸
- 参考测量数据
- 三段风格一致

严格用JSON格式返回，不要markdown代码块：
{"face": "面相观察——", "career": "事业建议。", "blessing": "新春祝语！"}"""


# ── Request/Response models ─────────────────────────────────────────────────

class FortuneRequest(BaseModel):
    """Request body for /api/fortune — image and measurements are optional."""
    image: str | None = None            # base64 data URI of the raw face
    measurements: str | None = None     # formatted measurement text


class PixelateRequest(BaseModel):
    """Request body for /api/pixelate."""
    image: str  # base64 data URI of the face


class ShareRequest(BaseModel):
    """Request body for /api/share."""
    pixelated_image: str | None = None
    fortunes: dict | None = None  # {gemini: {face, career, blessing}, grok: {...}}
    fortune: dict | None = None   # legacy single-model format


# ── Helpers ──────────────────────────────────────────────────────────────────

def _build_user_content(req: FortuneRequest | None):
    """Build the user message content array for the AI API."""
    user_content = []
    has_image = req and req.image

    if has_image:
        user_content.append({
            "type": "image_url",
            "image_url": {"url": req.image},
        })
        measure_text = f"\n\n{req.measurements}" if req.measurements else ""
        user_content.append({
            "type": "text",
            "text": f"请仔细观察这位贵客的面相。{measure_text}\n\n请根据你的面相学知识和实际观察给出具体的论断。",
        })
    else:
        user_content.append({
            "type": "text",
            "text": "请给这位贵客相个面。（无法获取面部图像，请基于随机面相特征生成具体论断）",
        })
    return user_content


async def _call_model(model_name: str, model_id: str, user_content: list) -> dict | None:
    """Call a single AI model and return parsed fortune, or None on failure."""
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                f"{AI_API_BASE}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {AI_TOKEN}",
                },
                json={
                    "model": model_id,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                    "temperature": 1.0,
                    "max_tokens": 1200,
                },
            )
            resp.raise_for_status()

        data = resp.json()
        text = (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
        if not text:
            print(f"⚠ {model_name}: empty response")
            return None

        json_str = text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(json_str)

        if not all(k in parsed for k in ("face", "career", "blessing")):
            print(f"⚠ {model_name}: incomplete structure")
            return None

        return {
            "face": parsed["face"],
            "career": parsed["career"],
            "blessing": parsed["blessing"],
            "source": "ai",
            "model": model_id,
        }
    except Exception as e:
        print(f"⚠ {model_name} ({model_id}) failed: {e}")
        return None


# ── API endpoints ───────────────────────────────────────────────────────────

@app.post("/api/fortune")
async def generate_fortune(req: FortuneRequest = None):
    """Call Gemini and Grok in parallel, return both results."""
    if not AI_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="AI_BUILDER_TOKEN not configured on the server",
        )

    user_content = _build_user_content(req)

    # Call both models in parallel
    results = await asyncio.gather(
        _call_model("gemini", MODELS["gemini"], user_content),
        _call_model("grok", MODELS["grok"], user_content),
        return_exceptions=True,
    )

    gemini_result = results[0] if not isinstance(results[0], Exception) else None
    grok_result = results[1] if not isinstance(results[1], Exception) else None

    if not gemini_result and not grok_result:
        raise HTTPException(status_code=502, detail="Both AI models failed")

    return {
        "gemini": gemini_result,
        "grok": grok_result,
    }


@app.post("/api/pixelate")
async def pixelate_avatar(req: PixelateRequest):
    """Generate a pixelated cartoon avatar via AI Builder Space image edit API."""
    if not AI_TOKEN:
        raise HTTPException(status_code=503, detail="AI_BUILDER_TOKEN not configured")

    try:
        raw_b64 = req.image.split(",", 1)[-1] if "," in req.image else req.image
        image_bytes = base64.b64decode(raw_b64)

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{AI_API_BASE}/images/edits",
                headers={"Authorization": f"Bearer {AI_TOKEN}"},
                files=[("image", ("face.jpg", io.BytesIO(image_bytes), "image/jpeg"))],
                data={
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

        result_b64 = await asyncio.to_thread(_pixelate_image, img_bytes)
        return {"pixelated_image": f"data:image/png;base64,{result_b64}"}

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"AI image API error: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Pixelation failed: {e}")


def _pixelate_image(img_bytes: bytes) -> str:
    """Sync helper: downscale + nearest-neighbor upscale for pixel art look."""
    from PIL import Image

    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    small = img.resize((PIXEL_SIZE, PIXEL_SIZE), Image.LANCZOS)
    pixelated = small.resize((PIXEL_DISPLAY, PIXEL_DISPLAY), Image.NEAREST)

    buf = io.BytesIO()
    pixelated.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


@app.post("/api/share")
async def create_share(req: ShareRequest):
    """Save fortune to Firestore and return a share URL."""
    if not _firestore_db:
        raise HTTPException(
            status_code=503, detail="Share feature not available (Firestore not configured)"
        )

    share_id = uuid.uuid4().hex[:8]

    # Support both new multi-model format and legacy single-model
    fortunes_data = req.fortunes
    if not fortunes_data and req.fortune:
        fortunes_data = {"gemini": req.fortune, "grok": None}

    doc = {
        "pixelated_image": req.pixelated_image,
        "fortunes": fortunes_data,
        "created_at": _firestore_mod.SERVER_TIMESTAMP,
    }

    await asyncio.to_thread(
        _firestore_db.collection("fortunes").document(share_id).set, doc
    )

    return {"id": share_id, "url": f"/share/{share_id}"}


@app.get("/api/share/{share_id}")
async def get_share(share_id: str):
    """Retrieve a shared fortune from Firestore."""
    if not _firestore_db:
        raise HTTPException(status_code=503, detail="Share feature not available")

    doc = await asyncio.to_thread(
        _firestore_db.collection("fortunes").document(share_id).get
    )
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Share not found")

    data = doc.to_dict()
    # Support both new (fortunes) and old (fortune) formats
    fortunes = data.get("fortunes")
    if not fortunes and data.get("fortune"):
        fortunes = {"gemini": data["fortune"], "grok": None}

    return {
        "pixelated_image": data.get("pixelated_image"),
        "fortunes": fortunes,
    }


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "models": MODELS,
        "token_configured": bool(AI_TOKEN),
        "firestore_configured": _firestore_db is not None,
    }


# ── Serve static files + SPA fallback (must be LAST) ──────────────────────
dist_dir = os.path.join(os.path.dirname(__file__), "dist")


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


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8001"))
    print(f"Starting server on port {port} (models={MODELS})")
    uvicorn.run(app, host="0.0.0.0", port=port)
