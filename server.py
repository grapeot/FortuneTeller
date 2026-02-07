"""
Thin FastAPI backend for AI Fortune Teller.
- POST /api/fortune  → proxies the AI call (token stays server-side)
- GET  /*            → serves the Vite-built static files
"""

import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
import httpx

load_dotenv()  # for local dev (.env file)

app = FastAPI(title="AI Fortune Teller Backend")

# ── Config (all from environment) ───────────────────────────────────────────
AI_API_BASE = os.getenv("AI_API_BASE_URL", "https://space.ai-builders.com/backend/v1")
AI_TOKEN = os.getenv("AI_BUILDER_TOKEN") or os.getenv("VITE_AI_API_TOKEN", "")
AI_MODEL = os.getenv("AI_MODEL") or os.getenv("VITE_AI_MODEL", "grok-4-fast")

SYSTEM_PROMPT = """你是一个AI算命师，在微软春节庙会（2026马年）上给员工看面相算命。每次生成一段独特、幽默、让人开心的算命结果。

要求：
- 算命结果严格分为三部分：
  1. face（面相观察）：用传统面相术语（天庭、印堂、颧骨、眉骨、鼻梁、耳垂、唇形等）描述，结尾用"——"
  2. career（职业解读）：必须融入微软文化黑话，语气自信、夸张、好笑。注意职级范围：
     - IC路线：L59-L64 (SDE I/II), L65-L67 (Principal), L68-L70 (Partner/Partner+)
     - Manager路线：L59-L64 (Manager), L65-L67 (Principal Manager), L68+ (Director+)
     - 其他黑话：Connect评分、Design Doc、Story Points、On-call、Code Review、Strong Hire、Exceed Expectations、Sprint Planning、1:1、CVP、SDE、PM、SDET等
  3. blessing（马年祝福）：包含马年成语或谐音梗（马到成功、一马当先、万马奔腾、龙马精神、马上有钱等），结尾用"！"
- 三部分各一句话，不要太长
- 每次内容必须完全不同，要有创意和惊喜
- 只说好话，让人高兴
- 职级描述必须准确：Principal是L65-L67，不要写成L70

严格用JSON格式返回，不要markdown代码块：
{"face": "面相观察句——", "career": "职业解读句。", "blessing": "马年祝福句！"}"""


@app.post("/api/fortune")
async def generate_fortune():
    """Call the AI API and return a parsed fortune."""
    if not AI_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="AI_BUILDER_TOKEN not configured on the server",
        )

    async with httpx.AsyncClient(timeout=10.0) as client:
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
                        {"role": "user", "content": "请给这位贵客算一卦。"},
                    ],
                    "temperature": 1.2,
                    "max_tokens": 300,
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
