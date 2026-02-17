"""Standalone deep-model debug runner using test assets.

Purpose:
- Reproduce the email deep-analysis stage with the exact prompt family.
- Run all deep models in parallel and report per-model success/failure details.
- Help diagnose cases where one model (for example DeepSeek) is missing.

Usage:
  python scripts/debug_deep_models_standalone.py --runs 1
  python scripts/debug_deep_models_standalone.py --runs 3 --save-dir tmp/deep_debug
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
from pathlib import Path
import sys
import time
from typing import Any, Dict, List

import httpx
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _load_test_image_data_url() -> str:
    image_path = ROOT / "test-assets" / "test-face-1-visualized-privacy.jpg"
    raw = image_path.read_bytes()
    return f"data:image/jpeg;base64,{base64.b64encode(raw).decode('ascii')}"


def _load_measurement_text() -> str:
    measurement_path = ROOT / "test-assets" / "test-face-1-measurements.json"
    data = json.loads(measurement_path.read_text(encoding="utf-8"))
    return "【面部测量数据】\n" + json.dumps(data, ensure_ascii=False)


def _build_user_content(image_data_url: str, measurements_text: str) -> List[Dict[str, Any]]:
    return [
        {"type": "image_url", "image_url": {"url": image_data_url}},
        {
            "type": "text",
            "text": (
                "请仔细观察这位贵客的面相。\n\n"
                f"{measurements_text}\n\n"
                "请根据你的面相学知识和实际观察给出具体的论断。"
            ),
        },
    ]


def _extract_message_text(payload: Dict[str, Any]) -> str:
    return (
        (payload.get("choices") or [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )


async def _call_quick_model_for_context(config_mod) -> Dict[str, Any]:
    from server.prompts import SYSTEM_PROMPT

    image_data_url = _load_test_image_data_url()
    measurements_text = _load_measurement_text()
    user_content = _build_user_content(image_data_url, measurements_text)

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{config_mod.AI_API_BASE}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {config_mod.AI_TOKEN}",
            },
            json={
                "model": config_mod.MODELS["grok"],
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                "temperature": 0.6,
                "max_tokens": 1200,
            },
        )
        resp.raise_for_status()
        text = _extract_message_text(resp.json())
        cleaned = text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(cleaned)

    return {
        "grok": {
            "face": parsed.get("face", ""),
            "career": parsed.get("career", ""),
            "blessing": parsed.get("blessing", ""),
            "source": "ai",
            "model": config_mod.MODELS["grok"],
        }
    }


async def _call_deep_model_debug(
    config_mod,
    system_prompt: str,
    user_msg: str,
    display_name: str,
    model_id: str,
) -> Dict[str, Any]:
    max_attempts = 4
    base_delay = 1.0

    result: Dict[str, Any] = {
        "name": display_name,
        "model_id": model_id,
        "ok": False,
        "attempts": [],
        "text": None,
    }

    for attempt in range(1, max_attempts + 1):
        t0 = time.perf_counter()
        attempt_info: Dict[str, Any] = {"attempt": attempt}
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                resp = await client.post(
                    f"{config_mod.AI_API_BASE}/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {config_mod.AI_TOKEN}",
                    },
                    json={
                        "model": model_id,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_msg},
                        ],
                        "temperature": 1.0,
                        "max_tokens": 4000,
                    },
                )
                attempt_info["status_code"] = resp.status_code
                resp.raise_for_status()
                payload = resp.json()
                text = _extract_message_text(payload)

            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            attempt_info["elapsed_ms"] = elapsed_ms
            attempt_info["ok"] = bool(text)
            if text:
                result["ok"] = True
                result["text"] = text
                attempt_info["text_len"] = len(text)
                result["attempts"].append(attempt_info)
                return result

            attempt_info["error"] = "empty response"
            result["attempts"].append(attempt_info)
            err: Exception = RuntimeError("empty response")
        except Exception as exc:  # noqa: BLE001
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            attempt_info["elapsed_ms"] = elapsed_ms
            attempt_info["ok"] = False
            attempt_info["error_type"] = type(exc).__name__
            attempt_info["error"] = str(exc)
            if isinstance(exc, httpx.HTTPStatusError) and exc.response is not None:
                attempt_info["status_code"] = exc.response.status_code
                try:
                    attempt_info["response_snippet"] = exc.response.text[:300]
                except Exception:  # noqa: BLE001
                    pass
            result["attempts"].append(attempt_info)
            err = exc

        is_retriable = isinstance(err, (httpx.TimeoutException, httpx.NetworkError))
        if isinstance(err, httpx.HTTPStatusError) and err.response is not None:
            if err.response.status_code in (408, 409, 429, 500, 502, 503, 504):
                is_retriable = True

        if attempt < max_attempts and is_retriable:
            await asyncio.sleep(base_delay * (2 ** (attempt - 1)))
            continue
        return result

    return result


def _build_context_from_fortunes(fortunes: Dict[str, Any]) -> str:
    grok = fortunes.get("grok") or {}
    if not grok:
        return "（无前次分析结果）"
    return (
        "【快速面相分析结果】\n"
        f"面相：{grok.get('face', '')}\n"
        f"事业：{grok.get('career', '')}\n"
        f"祝语：{grok.get('blessing', '')}"
    )


async def main() -> int:
    parser = argparse.ArgumentParser(description="Standalone deep-model debug runner")
    parser.add_argument("--runs", type=int, default=1, help="Number of repeated runs")
    parser.add_argument(
        "--save-dir",
        default="tmp/deep_debug",
        help="Directory to save per-run JSON/text outputs",
    )
    parser.add_argument(
        "--use-fixture-fortunes",
        action="store_true",
        help="Skip quick-model step and use fixed fortunes fixture",
    )
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    from server import config
    from server.prompts import DEEP_ANALYSIS_PROMPT

    if not config.AI_TOKEN:
        print("ERROR: AI token missing. Set AI_BUILDER_TOKEN or VITE_AI_API_TOKEN in .env")
        return 1

    if args.use_fixture_fortunes:
        fortunes = {
            "grok": {
                "face": "天庭饱满，印堂开阔，眉眼神采稳定。",
                "career": "执行力较强，适合长期项目深耕。",
                "blessing": "愿你稳中有进，马到功成。",
            }
        }
    else:
        try:
            fortunes = await _call_quick_model_for_context(config)
            print("Quick context generation: ok")
        except Exception as exc:  # noqa: BLE001
            print(f"Quick context generation failed, fallback to fixture: {exc}")
            fortunes = {
                "grok": {
                    "face": "天庭饱满，印堂开阔，眉眼神采稳定。",
                    "career": "执行力较强，适合长期项目深耕。",
                    "blessing": "愿你稳中有进，马到功成。",
                }
            }

    context = _build_context_from_fortunes(fortunes)
    user_msg = f"以下是此前为这位来访者做的快速面相分析结果，请在此基础上展开深度分析：\n\n{context}"

    save_dir = ROOT / args.save_dir
    save_dir.mkdir(parents=True, exist_ok=True)

    for run_idx in range(1, args.runs + 1):
        print(f"\n===== Run {run_idx}/{args.runs} =====")
        tasks = [
            _call_deep_model_debug(config, DEEP_ANALYSIS_PROMPT, user_msg, name, model_id)
            for name, model_id in config.DEEP_MODELS.items()
        ]
        results = await asyncio.gather(*tasks)

        run_json = {
            "run": run_idx,
            "models": results,
        }
        ts = int(time.time())
        json_path = save_dir / f"run_{run_idx}_{ts}.json"
        json_path.write_text(json.dumps(run_json, ensure_ascii=False, indent=2), encoding="utf-8")

        for item in results:
            name = item["name"]
            ok = item["ok"]
            attempts = item["attempts"]
            print(f"- {name}: {'OK' if ok else 'FAILED'} (attempts={len(attempts)})")
            if attempts:
                last = attempts[-1]
                status = last.get("status_code", "-")
                elapsed = last.get("elapsed_ms", "-")
                err = last.get("error", "")
                print(f"  last_status={status} elapsed_ms={elapsed} err={err[:160]}")

            if item.get("text"):
                text_path = save_dir / f"run_{run_idx}_{name.replace(' ', '_')}_{ts}.md"
                text_path.write_text(item["text"], encoding="utf-8")

        print(f"Saved debug report: {json_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
