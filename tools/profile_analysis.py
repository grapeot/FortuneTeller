#!/usr/bin/env python3
"""
Standalone profiling script for the face-reading analysis pipeline.

Reproduces the full flow: load test image → base64 encode → call Grok fortune API
→ call pixelate API → local pixelation, and measures latency at each step.

Usage:
    python tools/profile_analysis.py
"""

import asyncio
import base64
import io
import json
import os
import sys
import time

# Allow importing server modules from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from dotenv import load_dotenv

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────

AI_API_BASE = os.getenv("AI_API_BASE_URL", "https://space.ai-builders.com/backend/v1")
AI_TOKEN = os.getenv("AI_BUILDER_TOKEN") or os.getenv("VITE_AI_API_TOKEN", "")
GROK_MODEL = os.getenv("AI_MODEL_GROK", "grok-4-fast")
GEMINI_MODEL = os.getenv("AI_MODEL_GEMINI", "gemini-3-flash-preview")

# Use a test image from test-assets/
TEST_IMAGE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "test-assets", "test-face-1.jpg",
)

# Reuse the same system prompt from the server
from server.prompts import SYSTEM_PROMPT


class Timer:
    """Simple context-manager timer."""

    def __init__(self, label: str):
        self.label = label
        self.elapsed_ms = 0.0

    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, *_):
        self.elapsed_ms = (time.perf_counter() - self._start) * 1000
        print(f"  [{self.label}] {self.elapsed_ms:.0f} ms")


def load_test_image() -> tuple[str, bytes]:
    """Load test image, return (data_url, raw_bytes)."""
    with open(TEST_IMAGE_PATH, "rb") as f:
        raw = f.read()
    b64 = base64.b64encode(raw).decode()
    data_url = f"data:image/jpeg;base64,{b64}"
    return data_url, raw


async def profile_fortune_call(data_url: str) -> dict:
    """Profile the /chat/completions call for fortune generation (Grok)."""
    user_content = [
        {"type": "image_url", "image_url": {"url": data_url}},
        {"type": "text", "text": "请仔细观察这位贵客的面相。\n\n请根据你的面相学知识和实际观察给出具体的论断。"},
    ]

    timings = {}

    with Timer("Grok 模型调用总耗时") as t:
        async with httpx.AsyncClient(timeout=30.0) as client:
            with Timer("  HTTP POST 发送 + 等待响应") as t_http:
                resp = await client.post(
                    f"{AI_API_BASE}/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {AI_TOKEN}",
                    },
                    json={
                        "model": GROK_MODEL,
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_content},
                        ],
                        "temperature": 1.0,
                        "max_tokens": 1200,
                    },
                )
                resp.raise_for_status()
            timings["http_post_ms"] = t_http.elapsed_ms

            with Timer("  JSON 解析") as t_parse:
                data = resp.json()
                text = (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
                json_str = text.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(json_str)
            timings["json_parse_ms"] = t_parse.elapsed_ms

    timings["total_ms"] = t.elapsed_ms
    timings["response_tokens"] = data.get("usage", {}).get("completion_tokens", "N/A")
    timings["model"] = GROK_MODEL
    return timings


async def profile_pixelate_call(data_url: str, raw_bytes: bytes) -> dict:
    """Profile the image edit + local pixelation pipeline."""
    timings = {}

    with Timer("像素化总耗时") as t_total:
        # Step 1: AI image edit API
        with Timer("  AI 图片编辑 API 调用") as t_ai:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{AI_API_BASE}/images/edits",
                    headers={"Authorization": f"Bearer {AI_TOKEN}"},
                    files=[("image", ("face.jpg", io.BytesIO(raw_bytes), "image/jpeg"))],
                    data={
                        "prompt": (
                            "Based on this face photo, generate a pixel art style cartoon portrait. "
                            "Capture key facial features. Cute but recognizable. No text."
                        ),
                        "size": "1024x1024",
                    },
                )
                resp.raise_for_status()
        timings["ai_image_edit_ms"] = t_ai.elapsed_ms

        # Step 2: Extract image from response
        with Timer("  提取图片数据") as t_extract:
            ai_data = resp.json()
            img_item = (ai_data.get("data") or [{}])[0]
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
        timings["extract_image_ms"] = t_extract.elapsed_ms

        # Step 3: Local pixelation (downscale)
        with Timer("  本地像素化（PIL 缩放）") as t_pix:
            from PIL import Image
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            small = img.resize((64, 64), Image.LANCZOS)
            buf = io.BytesIO()
            small.save(buf, format="PNG")
            result_b64 = base64.b64encode(buf.getvalue()).decode()
        timings["local_pixelate_ms"] = t_pix.elapsed_ms

    timings["total_ms"] = t_total.elapsed_ms
    return timings


async def profile_parallel(data_url: str, raw_bytes: bytes) -> dict:
    """Profile the fortune + pixelate running in parallel (as the frontend does)."""
    print("\n=== 并行执行 (模拟前端 Promise.all) ===")
    with Timer("并行总耗时") as t:
        fortune_task = asyncio.create_task(profile_fortune_call(data_url))
        pixelate_task = asyncio.create_task(profile_pixelate_call(data_url, raw_bytes))
        fortune_timings, pixelate_timings = await asyncio.gather(fortune_task, pixelate_task)
    return {
        "parallel_total_ms": t.elapsed_ms,
        "fortune": fortune_timings,
        "pixelate": pixelate_timings,
    }


async def main():
    if not AI_TOKEN:
        print("错误: 未设置 AI_BUILDER_TOKEN 或 VITE_AI_API_TOKEN 环境变量")
        sys.exit(1)

    if not os.path.exists(TEST_IMAGE_PATH):
        print(f"错误: 测试图片不存在: {TEST_IMAGE_PATH}")
        sys.exit(1)

    print(f"配置:")
    print(f"  API: {AI_API_BASE}")
    print(f"  模型: {GROK_MODEL}")
    print(f"  测试图: {os.path.basename(TEST_IMAGE_PATH)}")
    print()

    # Step 1: Load image
    print("=== 步骤 1: 加载和编码测试图片 ===")
    with Timer("图片加载 + Base64 编码") as t_load:
        data_url, raw_bytes = load_test_image()
    img_size_kb = len(raw_bytes) / 1024
    b64_size_kb = len(data_url) / 1024
    print(f"  原始大小: {img_size_kb:.1f} KB, Base64: {b64_size_kb:.1f} KB")

    # Step 2: Fortune call (sequential for clear profiling)
    print("\n=== 步骤 2: Grok 面相分析 API 调用 ===")
    fortune_timings = await profile_fortune_call(data_url)

    # Step 3: Pixelate call (sequential for clear profiling)
    print("\n=== 步骤 3: 像素化头像生成 ===")
    pixelate_timings = await profile_pixelate_call(data_url, raw_bytes)

    # Step 4: Parallel execution
    parallel_timings = await profile_parallel(data_url, raw_bytes)

    # Summary
    print("\n" + "=" * 60)
    print("性能分析报告摘要")
    print("=" * 60)
    print(f"  图片加载:           {t_load.elapsed_ms:>8.0f} ms")
    print(f"  Grok 模型调用:      {fortune_timings['total_ms']:>8.0f} ms")
    print(f"    - HTTP 请求:      {fortune_timings['http_post_ms']:>8.0f} ms")
    print(f"    - JSON 解析:      {fortune_timings['json_parse_ms']:>8.0f} ms")
    print(f"  像素化总计:         {pixelate_timings['total_ms']:>8.0f} ms")
    print(f"    - AI 图片编辑:    {pixelate_timings['ai_image_edit_ms']:>8.0f} ms")
    print(f"    - 提取图片:       {pixelate_timings['extract_image_ms']:>8.0f} ms")
    print(f"    - 本地 PIL 缩放:  {pixelate_timings['local_pixelate_ms']:>8.0f} ms")
    print(f"  并行执行总耗时:     {parallel_timings['parallel_total_ms']:>8.0f} ms")
    print(f"  前端最小动画时长:   {15000:>8d} ms")
    print()

    bottleneck = max(fortune_timings["total_ms"], pixelate_timings["total_ms"], 15000)
    if bottleneck == 15000:
        print("  瓶颈: 前端 15 秒最小动画时长 (两个 API 调用都在 15 秒内完成)")
    elif bottleneck == fortune_timings["total_ms"]:
        print(f"  瓶颈: Grok 模型调用 ({fortune_timings['total_ms']:.0f} ms)")
    else:
        print(f"  瓶颈: AI 像素化 ({pixelate_timings['total_ms']:.0f} ms)")

    return {
        "image_load_ms": t_load.elapsed_ms,
        "fortune": fortune_timings,
        "pixelate": pixelate_timings,
        "parallel": parallel_timings,
    }


if __name__ == "__main__":
    results = asyncio.run(main())
