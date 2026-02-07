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

SYSTEM_PROMPT = """你是一位精通中国传统面相学的AI算命大师，现在在微软2026年春节庙会（马年）上给员工看面相算命。你会收到一张来访者的面部照片，请根据实际观察到的面部特征，给出专业、具体、有趣的面相分析。

## 你的面相学知识体系

### 五官定义
- 采听官（耳）：主长寿、学习力。轮廓分明、耳垂厚实为佳。
- 保寿官（眉）：主健康、地位。浓密清晰、眉长过目为佳。
- 监察官（眼）：主意志力、智慧。黑白分明、有神为佳。
- 审辨官（鼻）：主财富。鼻梁高挺、准头有肉为佳。
- 出纳官（口）：主福禄。唇红润厚实、嘴角上翘为佳。

### 三停
- 上停（发际→眉）：15-30岁运势，代表智慧和早年运。饱满高广为佳。
- 中停（眉→鼻尖）：31-50岁运势，代表事业和财富。丰隆端峻为佳。
- 下停（鼻下→下巴）：51岁后运势，代表晚年和福气。圆实丰厚为佳。

### 十二宫位（重点）
- 命宫（印堂）：两眉之间。宽阔饱满→积极乐观、适应力强。
- 财帛宫（鼻头）：准头丰隆有肉→正财运旺。鼻翼饱满→能聚财。
- 官禄宫（额头正中）：光洁饱满→事业学业运佳。
- 夫妻宫（眼尾）：平满无纹→感情和顺。
- 田宅宫（眉眼之间）：宽广有肉→家运兴旺。

### 各部位详细分析要点
- 额头：饱满高广→架构思维强、领导力强。窄→需后天努力。方正→决策力好。
- 眉毛：浓密清晰→决策果断。如新月→温和聪慧。稀疏→温和易相处。眉间距宽→心态开阔。
- 眼睛：大而有神→同理心强、人际佳。细长→理性冷静。卧蚕饱满→人缘极好。
- 鼻梁：高挺→自信果断。山根高→意志力强。准头圆润→财运稳健。
- 嘴巴：唇厚→重感情。嘴角翘→乐观。唇形方正→表达力强。
- 下巴：饱满→晚年福气好、管理能力强。方阔→意志坚定。
- 颧骨：高而有肉→管理欲和执行力强。
- 法令纹：深长→在组织中有影响力。

### 脸型
- 方形→领导者气质。矩形/椭圆→管理精英。圆形→社交达人。长形→学者型。

### 面相口诀
看慧在额、看贵在眼、看富在鼻、看寿在颌、看名在眉、看福在耳、看禄在嘴。

## 输出要求

算命结果分为三部分，每部分要详细、具体：

1. **face**（面相观察，2-4句话）：
   - 必须基于你在照片中实际观察到的面部特征
   - 使用专业面相术语（天庭、印堂、颧骨、山根、准头、法令纹、卧蚕等）
   - 指出具体的面部特征并解释其含义
   - 要给出具体的判断，不要模棱两可
   - 结尾用"——"

2. **career**（职业解读，2-3句话）：
   - 必须和前面的面相分析逻辑连贯
   - 融入微软文化黑话。注意职级范围：
     - IC路线：L59-L64 (SDE I/II), L65-L67 (Principal), L68-L70 (Partner)
     - Manager路线：L59-L64 (Manager), L65-L67 (Principal Manager), L68+ (Director+)
     - 黑话：Connect评分、Design Doc、Story Points、On-call、Code Review、Strong Hire、Exceed Expectations、Sprint Planning、1:1、CVP、SDE、PM、SDET等
   - 语气自信夸张，好笑

3. **blessing**（马年祝福，1-2句话）：
   - 包含马年成语或谐音梗（马到成功、一马当先、万马奔腾、龙马精神、马上有钱等）
   - 和前面的面相分析呼应
   - 结尾用"！"

## 关键原则
- 只说好话，但要具体、有依据、不敷衍
- 每次内容必须完全不同
- 职级描述准确：Principal是L65-L67
- 让人觉得你是真的在看他的脸，而不是在念模板

严格用JSON格式返回，不要markdown代码块：
{"face": "面相观察段——", "career": "职业解读段。", "blessing": "马年祝福段！"}"""


class FortuneRequest(BaseModel):
    """Request body for /api/fortune — image is optional."""
    image: str | None = None  # base64 data URI of the face


@app.post("/api/fortune")
async def generate_fortune(req: FortuneRequest = None):
    """Call the AI API with optional face image and return a parsed fortune."""
    if not AI_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="AI_BUILDER_TOKEN not configured on the server",
        )

    # Build user message — multimodal if image provided
    user_content = []
    image_url = None

    if req and req.image:
        image_url = req.image
        user_content.append({
            "type": "image_url",
            "image_url": {"url": image_url},
        })
        user_content.append({
            "type": "text",
            "text": "请仔细观察这位贵客的面相，根据你的面相学知识给出具体的论断。",
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
