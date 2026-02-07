"""
Thin FastAPI backend for AI Fortune Teller.
- POST /api/fortune    → calls Gemini + Grok in parallel, returns both results
- POST /api/pixelate   → generates pixelated cartoon avatar via AI Builder Space
- POST /api/share      → saves fortune to Firestore and returns share URL
- GET  /api/share/{id} → retrieves a shared fortune
- POST /api/subscribe  → email subscription: Circle invite + deep analysis + Resend email
- GET  /*              → serves the Vite-built static files (SPA fallback)
"""

import asyncio
import base64
import io
import json
import logging
import os
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks
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

# ── Email / Circle / Resend config ─────────────────────────────────────────
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
CIRCLE_V2_TOKEN = os.getenv("CIRCLE_V2_TOKEN", "")
CIRCLE_SPACE_IDS = [
    int(s.strip()) for s in os.getenv("CIRCLE_SPACE_IDS", "").split(",") if s.strip()
]
COMMUNITY_URL = "https://www.superlinear.academy"

logger = logging.getLogger("fortune-teller")

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


class SubscribeRequest(BaseModel):
    """Request body for /api/subscribe."""
    email: str
    name: str = ""
    share_id: str


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


# ── Email subscription pipeline ──────────────────────────────────────────────

DEEP_ANALYSIS_PROMPT = """你是一位精通中国传统面相学的资深相面先生，学贯古今，尤其擅长将面相学与现代职场发展融会贯通。

现在，一位来访者此前已经做过一次简要的面相分析。你将收到那次分析的结果作为参考。请你在此基础上，进行一次详细而深入的全面分析报告。

## 面相学知识体系

### 五官
- 采听官（耳）：轮廓分明、耳垂厚实→福气深厚。耳高与眉齐→聪慧。贴面→内敛稳重。
- 保寿官（眉）：浓密清晰→决断力强、贵人缘旺。眉长过目→重义气。眉侵印堂→思虑深重。
- 监察官（眼）：大而有神→情感丰沛。黑白分明→心正。细长→冷静理性。卧蚕饱满→人缘极佳。
- 审辨官（鼻）：鼻梁挺直→自信果敢。山根高→意志坚定。准头有肉→正财运旺。鼻翼丰满→善聚财。
- 出纳官（口）：唇厚→重情义。嘴角上翘→天性乐观。人中深长→元气充沛。

### 三停
- 上停（发际→眉）：饱满高广→少年得志、智慧高。
- 中停（眉→鼻准头）：丰隆端正→中年事业有成。
- 下停（鼻下→下巴）：圆实丰厚→晚年安乐。

### 十二宫位
- 命宫（印堂）、财帛宫（准头）、官禄宫（额头正中）、夫妻宫（眼尾）、田宅宫（眉眼之间）等。

## 输出要求

请以分析报告的形式输出纯中文文本（不要JSON），包含以下章节，每个章节用「## 章节名」标记：

## 五官详解
详细分析五官各个部位的特征及其面相学含义（300-400字）

## 三停分析
分析上中下三停的比例与特征（200-300字）

## 十二宫位解读
重点解读命宫、财帛宫、官禄宫等关键宫位（200-300字）

## 事业与发展
基于面相特质给出具体的职场发展建议，包括适合的方向、需要注意的短板、如何扬长避短（300-400字）

## 人际与感情
从面相分析社交风格和感情运势（150-200字）

## 健康提示
基于面相提示需要关注的健康方面（100-150字）

## 马年运势综述
结合丙午马年的运势总结和新春祝语（150-200字）

## 原则
- 全文1500-2000字
- 语气沉稳专业，如同一份详细的面相分析报告
- 以褒为主，建议要具体可行
- 每个章节之间自然衔接
- 新春氛围下以鼓励和祝福为主"""


def _build_email_html(deep_analysis: str, name: str = "", pixelated_image: str | None = None) -> str:
    """Build Outlook-compatible HTML email with harmonious palette."""
    greeting = f"{name}，您好！" if name else "您好！"

    # Optionally embed the pixelated avatar
    avatar_html = ""
    if pixelated_image:
        avatar_html = f"""
        <tr><td align="center" style="padding:20px 0 10px;">
          <img src="{pixelated_image}" alt="像素画像" width="96" height="96"
               style="width:96px;height:96px;border-radius:8px;image-rendering:pixelated;border:2px solid #c9b99a;" />
        </td></tr>"""

    # Convert section headers in the analysis to styled HTML
    sections_html = ""
    for line in deep_analysis.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.startswith("## "):
            heading = line[3:].strip()
            sections_html += f"""
          <h3 style="font-size:17px;color:#5c4a32;margin:24px 0 8px;padding-bottom:6px;border-bottom:1px solid #e0d5c3;">{heading}</h3>"""
        else:
            sections_html += f"""
          <p style="font-size:14px;color:#4a3c2e;line-height:1.9;margin:0 0 12px;">{line}</p>"""

    return f"""<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    :root {{ color-scheme: light dark; supported-color-schemes: light dark; }}
    @media (prefers-color-scheme: dark) {{
      .email-bg {{ background-color: #1c1914 !important; }}
      .email-card {{ background-color: #2a2520 !important; border-color: #4a4035 !important; }}
      .email-header {{ background-color: #2e2318 !important; }}
      .email-title {{ color: #e8d5b0 !important; }}
      .email-subtitle {{ color: #a89878 !important; }}
      .email-body {{ color: #d4c8b0 !important; }}
      .email-heading {{ color: #d4b896 !important; border-color: #4a4035 !important; }}
      .email-accent {{ background-color: #8a7a5a !important; }}
      .email-cta {{ background-color: #5c4a32 !important; color: #f0e6d2 !important; }}
      .email-footer {{ background-color: #221e18 !important; border-color: #3a3428 !important; }}
      .email-footer-text {{ color: #7a7060 !important; }}
      .email-link {{ color: #d4a868 !important; }}
    }}
    [data-ogsc] .email-bg {{ background-color: #1c1914 !important; }}
    [data-ogsc] .email-card {{ background-color: #2a2520 !important; border-color: #4a4035 !important; }}
    [data-ogsc] .email-header {{ background-color: #2e2318 !important; }}
    [data-ogsc] .email-title {{ color: #e8d5b0 !important; }}
    [data-ogsc] .email-subtitle {{ color: #a89878 !important; }}
    [data-ogsc] .email-body {{ color: #d4c8b0 !important; }}
    [data-ogsc] .email-heading {{ color: #d4b896 !important; border-color: #4a4035 !important; }}
    [data-ogsc] .email-accent {{ background-color: #8a7a5a !important; }}
    [data-ogsc] .email-cta {{ background-color: #5c4a32 !important; color: #f0e6d2 !important; }}
    [data-ogsc] .email-footer {{ background-color: #221e18 !important; border-color: #3a3428 !important; }}
    [data-ogsc] .email-footer-text {{ color: #7a7060 !important; }}
    [data-ogsc] .email-link {{ color: #d4a868 !important; }}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0ebe3;font-family:Georgia,'Songti SC','STSongti-SC','Noto Serif SC',serif;">
  <table class="email-bg" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f0ebe3;padding:32px 16px;">
    <tr><td align="center">
      <table class="email-card" width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#faf6ef;border:1px solid #d8ccb8;border-radius:8px;overflow:hidden;">

        <!-- Header: warm brown tone -->
        <tr><td class="email-header" style="background-color:#3d3028;padding:28px 30px 24px;text-align:center;">
          <h1 class="email-title" style="font-size:28px;color:#e8d5b0;margin:0 0 4px;letter-spacing:6px;font-weight:bold;">相面先生</h1>
          <p class="email-subtitle" style="font-size:12px;color:#a89878;margin:0;letter-spacing:2px;">Superlinear Academy · 丙午马年新春</p>
        </td></tr>

        <!-- Warm accent line -->
        <tr><td class="email-accent" style="height:2px;background-color:#c9b99a;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Avatar -->
        {avatar_html}

        <!-- Body -->
        <tr><td style="padding:24px 32px 28px;">
          <p class="email-body" style="font-size:15px;color:#4a3c2e;line-height:1.9;margin:0 0 16px;">{greeting}</p>
          <p class="email-body" style="font-size:15px;color:#4a3c2e;line-height:1.9;margin:0 0 20px;">以下是为您准备的 AI 面相深度分析报告。这份报告综合了多维度的面相学知识，从五官、三停、十二宫位等多个角度为您进行了全面解读。</p>

          {sections_html}

        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background-color:#d8ccb8;"></div></td></tr>

        <!-- Community section -->
        <tr><td style="padding:20px 32px;">
          <p class="email-body" style="font-size:14px;color:#6b5d4d;line-height:1.8;margin:0 0 8px;">
            我们已为您开通 <strong style="color:#5c4a32;">Superlinear Academy</strong> AI 社区的访问权限。您将收到社区学员分享的实战项目更新。
          </p>
          <p class="email-body" style="font-size:14px;color:#6b5d4d;line-height:1.8;margin:0 0 16px;">
            首次访问社区请前往 <a class="email-link" href="{COMMUNITY_URL}" style="color:#7a5c3a;text-decoration:underline;">{COMMUNITY_URL}</a>，点击「找回密码」设置您的登录密码。
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr><td align="center" style="padding:4px 0 8px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{COMMUNITY_URL}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="#5c4a32">
                <w:anchorlock/><center>
              <![endif]-->
              <a class="email-cta" href="{COMMUNITY_URL}" style="display:inline-block;padding:12px 32px;background-color:#5c4a32;color:#f0e6d2;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;letter-spacing:1px;">
                访问 Superlinear Academy
              </a>
              <!--[if mso]></center></v:roundrect><![endif]-->
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td class="email-footer" style="background-color:#f0ebe3;padding:18px 32px;border-top:1px solid #d8ccb8;">
          <p class="email-footer-text" style="font-size:11px;color:#a09888;text-align:center;margin:0;line-height:1.7;">
            此邮件由 Superlinear Academy 发送 · 社区动态可随时在 Circle 设置中退订<br>&copy; 2026 Superlinear Academy
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _circle_create_member(email: str, name: str = "") -> None:
    """Create Circle community member (sync, for background task)."""
    import requests as req

    headers = {
        "Authorization": f"Token {CIRCLE_V2_TOKEN}",
        "Content-Type": "application/json",
    }
    data = {
        "email": email,
        "skip_invitation": True,
        "space_ids": CIRCLE_SPACE_IDS,
        "email_notifications_enabled": True,
    }
    if name:
        data["name"] = name

    resp = req.post(
        "https://app.circle.so/api/admin/v2/community_members",
        headers=headers, json=data, timeout=30,
    )

    # 200/201 = success, 201 "already a member" = also fine
    if resp.status_code in (200, 201):
        result = resp.json()
        msg = result.get("message", "")
        if "already a member" in msg.lower():
            # Explicitly add to spaces
            for space_id in CIRCLE_SPACE_IDS:
                req.post(
                    "https://app.circle.so/api/admin/v2/space_members",
                    headers=headers,
                    json={"email": email, "space_id": space_id},
                    timeout=30,
                )
            logger.info(f"Circle: existing member {email} added to spaces")
        else:
            logger.info(f"Circle: new member created for {email}")
    elif resp.status_code == 422:
        # Already exists — add to spaces
        for space_id in CIRCLE_SPACE_IDS:
            req.post(
                "https://app.circle.so/api/admin/v2/space_members",
                headers=headers,
                json={"email": email, "space_id": space_id},
                timeout=30,
            )
        logger.info(f"Circle: 422 existing member {email}, added to spaces")
    else:
        logger.warning(f"Circle: unexpected status {resp.status_code}: {resp.text[:200]}")


async def _generate_deep_analysis(fortunes: dict) -> str:
    """Call Gemini to generate a deep face reading analysis."""
    # Build context from the quick fortunes
    context_parts = []
    for model_name in ("grok", "gemini"):
        f = fortunes.get(model_name)
        if f:
            context_parts.append(
                f"【{model_name}模型的快速分析】\n"
                f"面相：{f.get('face', '')}\n"
                f"事业：{f.get('career', '')}\n"
                f"祝语：{f.get('blessing', '')}"
            )

    context = "\n\n".join(context_parts) if context_parts else "（无前次分析结果）"

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{AI_API_BASE}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {AI_TOKEN}",
            },
            json={
                "model": MODELS["gemini"],
                "messages": [
                    {"role": "system", "content": DEEP_ANALYSIS_PROMPT},
                    {
                        "role": "user",
                        "content": f"以下是此前为这位来访者做的快速面相分析结果，请在此基础上展开深度分析：\n\n{context}",
                    },
                ],
                "temperature": 0.9,
                "max_tokens": 4000,
            },
        )
        resp.raise_for_status()

    data = resp.json()
    text = (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
    return text or "深度分析生成失败，请稍后重试。"


def _send_resend_email(email: str, html: str) -> str | None:
    """Send HTML email via Resend. Returns email ID or None."""
    import resend

    resend.api_key = RESEND_API_KEY
    try:
        result = resend.Emails.send({
            "from": "Superlinear Academy <no-reply@ai-builders.com>",
            "to": [email],
            "subject": "您的AI面相深度分析 - Superlinear Academy",
            "html": html,
        })
        logger.info(f"Resend: email sent to {email}, id={result.get('id', 'unknown')}")
        return result.get("id")
    except Exception as e:
        logger.error(f"Resend: failed to send to {email}: {e}")
        return None


async def _subscribe_background(email: str, name: str, share_id: str):
    """Background task: Circle invite → Gemini deep analysis → Resend email."""
    try:
        # Step 1: Circle membership (sync, run in thread)
        if CIRCLE_V2_TOKEN:
            await asyncio.to_thread(_circle_create_member, email, name)
        else:
            logger.warning("Circle: CIRCLE_V2_TOKEN not set, skipping")

        # Step 2: Fetch share data from Firestore
        fortunes = {}
        pixelated_image = None
        if _firestore_db:
            doc = await asyncio.to_thread(
                _firestore_db.collection("fortunes").document(share_id).get
            )
            if doc.exists:
                share_data = doc.to_dict()
                fortunes = share_data.get("fortunes") or {}
                pixelated_image = share_data.get("pixelated_image")

        # Step 3: Generate deep analysis via Gemini
        deep_analysis = await _generate_deep_analysis(fortunes)

        # Step 4: Build and send email
        html = _build_email_html(deep_analysis, name, pixelated_image)
        email_id = await asyncio.to_thread(_send_resend_email, email, html)

        # Step 5: Update Firestore with subscription info
        if _firestore_db and email_id:
            update_data = {
                "subscribed_email": email,
                "email_sent_at": _firestore_mod.SERVER_TIMESTAMP,
            }
            if name:
                update_data["subscribed_name"] = name
            await asyncio.to_thread(
                _firestore_db.collection("fortunes").document(share_id).update,
                update_data,
            )

        logger.info(f"Subscribe pipeline complete for {email} (share={share_id})")

    except Exception as e:
        logger.error(f"Subscribe pipeline failed for {email}: {e}")


@app.post("/api/subscribe")
async def subscribe(req: SubscribeRequest, background_tasks: BackgroundTasks):
    """Accept email subscription and process in background."""
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    if not RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="Email service not configured")

    background_tasks.add_task(_subscribe_background, req.email, req.name, req.share_id)

    return {
        "status": "accepted",
        "message": "Analysis will be sent to your email",
    }


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "models": MODELS,
        "token_configured": bool(AI_TOKEN),
        "firestore_configured": _firestore_db is not None,
        "email_configured": bool(RESEND_API_KEY),
        "circle_configured": bool(CIRCLE_V2_TOKEN),
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
