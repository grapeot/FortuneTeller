"""
AI model helpers: building prompts, calling models, generating deep analysis.
"""

import asyncio
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
        user_content.append(
            {
                "type": "image_url",
                "image_url": {"url": req.image},
            }
        )
        measure_text = f"\n\n{req.measurements}" if req.measurements else ""
        user_content.append(
            {
                "type": "text",
                "text": f"请仔细观察这位贵客的面相。{measure_text}\n\n请根据你的面相学知识和实际观察给出具体的论断。",
            }
        )
    else:
        user_content.append(
            {
                "type": "text",
                "text": "请给这位贵客相个面。（无法获取面部图像，请基于随机面相特征生成具体论断）",
            }
        )
    return user_content


async def call_model(model_name: str, model_id: str, user_content: list) -> dict | None:
    """Call a single AI model and return parsed fortune, or None on failure."""
    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
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
                    "temperature": 0.6,
                    "max_tokens": 1200,
                },
            )
            resp.raise_for_status()

        data = resp.json()
        text = (
            (data.get("choices") or [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
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


def _build_deep_context(fortunes: dict) -> str:
    """Build context string from previous quick analysis results (Grok only)."""
    f = fortunes.get("grok")
    if f:
        return (
            f"【快速面相分析结果】\n"
            f"面相：{f.get('face', '')}\n"
            f"事业：{f.get('career', '')}\n"
            f"祝语：{f.get('blessing', '')}"
        )
    return "（无前次分析结果）"


async def _call_deep_model(
    display_name: str, model_id: str, user_msg: str
) -> tuple[str, str | None]:
    """Call one model for deep analysis. Returns (display_name, text_or_None)."""
    max_attempts = 4
    base_delay = 1.0

    for attempt in range(1, max_attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                resp = await client.post(
                    f"{config.AI_API_BASE}/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {config.AI_TOKEN}",
                    },
                    json={
                        "model": model_id,
                        "messages": [
                            {"role": "system", "content": DEEP_ANALYSIS_PROMPT},
                            {"role": "user", "content": user_msg},
                        ],
                        "temperature": 1.0,
                        "max_tokens": 4000,
                    },
                )
                resp.raise_for_status()

            data = resp.json()
            text = (
                (data.get("choices") or [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )
            if text:
                return (display_name, text)

            err = RuntimeError("empty response")
        except Exception as e:
            err = e

        is_retriable = isinstance(err, (httpx.TimeoutException, httpx.NetworkError))
        if isinstance(err, httpx.HTTPStatusError) and err.response is not None:
            if err.response.status_code in (408, 409, 429, 500, 502, 503, 504):
                is_retriable = True

        if attempt < max_attempts and is_retriable:
            delay = base_delay * (2 ** (attempt - 1))
            print(
                f"⚠ Deep analysis {display_name} ({model_id}) attempt {attempt}/{max_attempts} failed: {err}; retry in {delay:.1f}s"
            )
            await asyncio.sleep(delay)
            continue

        print(f"⚠ Deep analysis {display_name} ({model_id}) failed: {err}")
        return (display_name, None)

    return (display_name, None)


async def generate_deep_analysis(fortunes: dict) -> str:
    """Call Gemini to generate a deep face reading analysis (legacy single-model)."""
    context = _build_deep_context(fortunes)
    user_msg = f"以下是此前为这位来访者做的快速面相分析结果，请在此基础上展开深度分析：\n\n{context}"
    _, text = await _call_deep_model("Gemini", config.MODELS["gemini"], user_msg)
    return text or "深度分析生成失败，请稍后重试。"


async def generate_multi_model_analysis(fortunes: dict) -> dict[str, str]:
    """Call multiple AI models in parallel for deep analysis.

    Returns an ordered dict of {display_name: analysis_text} for models that succeeded.
    """
    context = _build_deep_context(fortunes)
    user_msg = f"以下是此前为这位来访者做的快速面相分析结果，请在此基础上展开深度分析：\n\n{context}"

    tasks = [
        _call_deep_model(name, model_id, user_msg)
        for name, model_id in config.DEEP_MODELS.items()
    ]
    results = await asyncio.gather(*tasks)

    # Preserve order, skip failures
    return {name: text for name, text in results if text}
