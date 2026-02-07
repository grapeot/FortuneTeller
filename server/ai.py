"""
AI model helpers: building prompts, calling models, generating deep analysis.
"""

import json
import httpx

from . import config
from .models import FortuneRequest
from .prompts import SYSTEM_PROMPT, DEEP_ANALYSIS_PROMPT


def build_user_content(req: FortuneRequest | None) -> list:
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


async def call_model(model_name: str, model_id: str, user_content: list) -> dict | None:
    """Call a single AI model and return parsed fortune, or None on failure."""
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                f"{config.AI_API_BASE}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {config.AI_TOKEN}",
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


async def generate_deep_analysis(fortunes: dict) -> str:
    """Call Gemini to generate a deep face reading analysis."""
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
            f"{config.AI_API_BASE}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {config.AI_TOKEN}",
            },
            json={
                "model": config.MODELS["gemini"],
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
