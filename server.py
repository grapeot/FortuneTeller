"""
Thin FastAPI backend for AI Fortune Teller.
- POST /api/fortune  → proxies the AI call with optional face image (token stays server-side)
- GET  /*            → serves the Vite-built static files
"""

import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx

load_dotenv()  # for local dev (.env file)

app = FastAPI(title="AI Fortune Teller Backend")

# ── Config (all from environment) ───────────────────────────────────────────
AI_API_BASE = os.getenv("AI_API_BASE_URL", "https://space.ai-builders.com/backend/v1")
AI_TOKEN = os.getenv("AI_BUILDER_TOKEN") or os.getenv("VITE_AI_API_TOKEN", "")
AI_MODEL = os.getenv("AI_MODEL") or os.getenv("VITE_AI_MODEL", "grok-4-fast")

SYSTEM_PROMPT = """你是一位精通中国传统面相学的AI算命大师，在微软2026年春节庙会（马年）上给员工看面相算命。你会收到来访者的面部照片（原始照片+标注了面相关键部位的参考图），以及面部测量数据。请根据你实际观察到的面部特征，给出专业、具体、有趣的面相分析。

## 面相学知识体系

### 五官
- 采听官（耳）：轮廓分明、耳垂厚实→有福气、聪明。耳高与眉齐→聪明。贴面→内敛稳重。
- 保寿官（眉）：浓密清晰→决策果断、贵人缘好。眉长过目→兄弟友情深。眉毛入侵印堂→思虑重。眉尾散→做事缺毅力。
- 监察官（眼）：大而有神→情感充沛、善良。细长→理性冷静。眼神有力度→目标感强。眼窝凹陷→心思缜密但易内耗。卧蚕饱满→桃花旺、人缘好。
- 审辨官（鼻）：鼻梁高挺→自信果断。山根高→意志力强。准头有肉→正财运好。鼻翼饱满→能聚财。鼻孔仰露→花钱大方。
- 出纳官（口）：唇厚→重感情。嘴角上翘→乐观。覆船口→爱抱怨。人中深长→身体健康、长寿。

### 三停
- 上停（发际→眉）：15-30岁运势。饱满高广→早年顺遂。发际线不平整→14-24岁波折。
- 中停（眉→鼻准头）：31-50岁运势。鼻颧得配→适合搞事业。
- 下停（鼻下→下巴）：51岁后运势。圆实丰厚→晚年安乐。

### 十二宫位
- 命宫（印堂）：宽阔饱满→积极乐观。窄→执着放不下心。
- 财帛宫（准头）：有肉丰隆→正财运旺。
- 官禄宫（额头正中）：光洁饱满→事业运佳。
- 夫妻宫（眼尾）：平满→感情和顺。凹陷→亲密关系易争吵。
- 田宅宫（眉眼之间）：宽广→家运兴旺。塌陷→精神内耗。

### 关键配合
鼻颧得配→事业运强。眉眼配合度好→有福气。骨肉均衡→运势平稳。三停均衡→人生平稳。

### 脸型
方形→领导者、执行力强。圆形→社交达人。长形→学者型。菱形→独立有权力欲。

## 分析风格

采用"首先注意到X→说明Y，结合Z来看→判断W"的交叉验证模式。范例：
- "首先注意到山根和鼻梁处有明显的断层，但过了这道坎之后，鼻相气势很强。鼻头有肉，财运旺盛，鼻翼宽厚饱满，善于理财。"
- "三停比例来看，强在中停，中年运势最强。鼻颧得配，适合搞事业。"
- "眉毛入侵印堂，思虑过重，容易想不开。但颧骨腮骨力度足，能抗事儿的类型。"

## 输出要求

1. **face**（面相观察，3-5句话）：以"首先注意到"开头，用专业术语，交叉验证，提及三停比例。结尾用"——"
2. **career**（职业解读，2-3句话）：从面相推导，融入微软黑话（IC: L59-L64 SDE, L65-L67 Principal, L68+ Partner; Manager同理）。自信夸张好笑。
3. **blessing**（马年祝福，1-2句话）：马年成语，和面相呼应。结尾用"！"

原则：只说好话但要具体有依据。Principal是L65-L67。参考测量数据。

严格用JSON格式返回，不要markdown代码块：
{"face": "面相观察段——", "career": "职业解读段。", "blessing": "马年祝福段！"}"""


class FortuneRequest(BaseModel):
    """Request body for /api/fortune — images and measurements are optional."""
    image: str | None = None            # base64 data URI of the raw face
    annotated_image: str | None = None  # base64 data URI of the annotated face
    measurements: str | None = None     # formatted measurement text


@app.post("/api/fortune")
async def generate_fortune(req: FortuneRequest = None):
    """Call the AI API with optional face image and return a parsed fortune."""
    if not AI_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="AI_BUILDER_TOKEN not configured on the server",
        )

    # Build user message — multimodal if images provided
    user_content = []
    has_image = req and req.image

    if has_image:
        user_content.append({
            "type": "image_url",
            "image_url": {"url": req.image},
        })
        if req.annotated_image:
            user_content.append({
                "type": "image_url",
                "image_url": {"url": req.annotated_image},
            })
        measure_text = f"\n\n{req.measurements}" if req.measurements else ""
        user_content.append({
            "type": "text",
            "text": f"请仔细观察这位贵客的面相。第一张是原始照片，第二张是标注了面相学关键部位的参考图。{measure_text}\n\n请根据你的面相学知识和实际观察给出具体的论断。",
        })
    else:
        user_content.append({
            "type": "text",
            "text": "请给这位贵客算一卦。（无法获取面部图像，请基于随机面相特征生成具体论断）",
        })

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            resp = await client.post(
                f"{AI_API_BASE}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {AI_TOKEN}",
                },
                json={
                    "model": AI_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                    "temperature": 1.0,
                    "max_tokens": 1000,
                },
            )
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"AI API error: {e}")

    data = resp.json()
    text = (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
    if not text:
        raise HTTPException(status_code=502, detail="Empty AI response")

    # Parse JSON (handle possible markdown fences)
    json_str = text.replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Failed to parse AI response as JSON")

    if not all(k in parsed for k in ("face", "career", "blessing")):
        raise HTTPException(status_code=502, detail="Incomplete fortune structure")

    return {
        "face": parsed["face"],
        "career": parsed["career"],
        "blessing": parsed["blessing"],
        "source": "ai",
    }


@app.get("/api/health")
async def health():
    return {"status": "ok", "model": AI_MODEL, "token_configured": bool(AI_TOKEN)}


# ── Serve static files (must be LAST) ──────────────────────────────────────
dist_dir = os.path.join(os.path.dirname(__file__), "dist")
if os.path.isdir(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8001"))
    print(f"Starting server on port {port} (model={AI_MODEL})")
    uvicorn.run(app, host="0.0.0.0", port=port)
