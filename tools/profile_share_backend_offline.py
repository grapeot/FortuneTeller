#!/usr/bin/env python3
"""
Offline profiler for /api/share backend path.

It simulates the core create_share() steps without starting FastAPI:
1) request model validation
2) visualization payload normalization
3) share document assembly + JSON serialization
4) optional simulated Firestore write latency

Usage:
  source .venv/bin/activate
  python tools/profile_share_backend_offline.py --runs 30 --payload real --with-viz
  python tools/profile_share_backend_offline.py --runs 30 --payload real --with-viz --simulate-firestore-ms 500
"""

from __future__ import annotations

import argparse
import base64
import json
import math
import statistics
import time
import uuid
from pathlib import Path

from pydantic import BaseModel


class ShareRequest(BaseModel):
    pixelated_image: str | None = None
    visualization_data: dict | None = None
    fortunes: dict | None = None
    fortune: dict | None = None


ROOT = Path(__file__).resolve().parents[1]


def _sanitize_firestore_key(key: str) -> str:
    cleaned = key
    for ch in (".", "/", "*", "[", "]", "~"):
        cleaned = cleaned.replace(ch, "_")
    return cleaned or "field"


def _sanitize_for_firestore(value):
    if isinstance(value, dict):
        return {
            _sanitize_firestore_key(str(k)): _sanitize_for_firestore(v)
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [_sanitize_for_firestore(v) for v in value]
    if isinstance(value, tuple):
        return [_sanitize_for_firestore(v) for v in value]
    if isinstance(value, float):
        if not math.isfinite(value):
            return None
        return round(value, 5)
    if isinstance(value, (int, bool, str)) or value is None:
        return value
    return str(value)


def _encode_visualization_for_firestore(value):
    sanitized = _sanitize_for_firestore(value)
    if not isinstance(sanitized, dict):
        return sanitized

    landmarks = sanitized.get("landmarks")
    if isinstance(landmarks, list):
        converted = []
        for point in landmarks:
            if isinstance(point, (list, tuple)) and len(point) >= 2:
                converted.append({"x": point[0], "y": point[1]})
            elif isinstance(point, dict) and "x" in point and "y" in point:
                converted.append({"x": point["x"], "y": point["y"]})
        sanitized["landmarks"] = converted

    return sanitized


def _fake_visualization() -> dict:
    landmarks = []
    for i in range(478):
        x = 0.33 + (i % 23) * 0.012
        y = 0.17 + (i % 17) * 0.018
        landmarks.append([round(x, 4), round(y, 4)])

    return {
        "landmarks": landmarks,
        "contour_indices": {
            "face_oval": [
                10,
                338,
                297,
                332,
                284,
                251,
                389,
                356,
                454,
                323,
                361,
                288,
                397,
                365,
                379,
                378,
                400,
                377,
                152,
            ]
        },
        "measurements": {
            "three_parts": [0.33, 0.34, 0.33],
            "yintang_width": 0.72,
            "tian_zhai_gong_height_face_ratio": 0.12,
        },
    }


def _load_payload(payload_kind: str, with_viz: bool) -> dict:
    if payload_kind == "real":
        face_img = ROOT / "test-assets" / "test-face-1.jpg"
        data = base64.b64encode(face_img.read_bytes()).decode("ascii")
        pixelated = f"data:image/jpeg;base64,{data}"
    else:
        pixelated = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8x"

    return {
        "pixelated_image": pixelated,
        "visualization_data": _fake_visualization() if with_viz else None,
        "fortunes": {
            "gemini": None,
            "grok": {
                "face": "山根高耸，鼻梁挺直——",
                "career": "颧骨有力，适合带队攻坚。",
                "blessing": "一马当先！",
            },
        },
    }


def _percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    arr = sorted(values)
    idx = min(len(arr) - 1, max(0, int((len(arr) - 1) * p)))
    return arr[idx]


def _ms(start: float, end: float) -> float:
    return (end - start) * 1000


def profile_once(payload: dict, simulate_firestore_ms: float) -> dict:
    total_start = time.perf_counter()

    t0 = time.perf_counter()
    req = ShareRequest.model_validate(payload)
    t1 = time.perf_counter()

    t2 = time.perf_counter()
    viz = _encode_visualization_for_firestore(req.visualization_data)
    t3 = time.perf_counter()

    t4 = time.perf_counter()
    share_id = uuid.uuid4().hex[:8]
    fortunes_data = req.fortunes if req.fortunes else ({"gemini": req.fortune, "grok": None} if req.fortune else None)
    doc = {
        "pixelated_image": req.pixelated_image,
        "visualization_data": viz,
        "fortunes": fortunes_data,
    }
    t5 = time.perf_counter()

    t6 = time.perf_counter()
    serialized = json.dumps(doc, ensure_ascii=False)
    _ = len(serialized)
    t7 = time.perf_counter()

    t8 = time.perf_counter()
    if simulate_firestore_ms > 0:
        time.sleep(simulate_firestore_ms / 1000.0)
    t9 = time.perf_counter()

    total_end = time.perf_counter()

    return {
        "share_id": share_id,
        "validate_ms": _ms(t0, t1),
        "encode_viz_ms": _ms(t2, t3),
        "assemble_doc_ms": _ms(t4, t5),
        "serialize_json_ms": _ms(t6, t7),
        "firestore_sim_ms": _ms(t8, t9),
        "total_ms": _ms(total_start, total_end),
        "doc_bytes": len(serialized.encode("utf-8")),
    }


def summarize(samples: list[dict], key: str) -> dict:
    vals = [s[key] for s in samples]
    return {
        "min": round(min(vals), 3),
        "p50": round(_percentile(vals, 0.5), 3),
        "p95": round(_percentile(vals, 0.95), 3),
        "max": round(max(vals), 3),
        "avg": round(statistics.fmean(vals), 3),
    }


def main():
    parser = argparse.ArgumentParser(description="Offline profiler for /api/share internals")
    parser.add_argument("--runs", type=int, default=20)
    parser.add_argument("--warmup", type=int, default=3)
    parser.add_argument("--payload", choices=["tiny", "real"], default="real")
    parser.add_argument("--with-viz", action="store_true", default=False)
    parser.add_argument("--simulate-firestore-ms", type=float, default=0.0)
    args = parser.parse_args()

    payload = _load_payload(args.payload, args.with_viz)
    payload_bytes = len(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
    print(
        f"payload={args.payload} with_viz={args.with_viz} payload_bytes={payload_bytes} runs={args.runs} warmup={args.warmup} firestore_sim_ms={args.simulate_firestore_ms}"
    )

    for _ in range(args.warmup):
        profile_once(payload, args.simulate_firestore_ms)

    samples = [profile_once(payload, args.simulate_firestore_ms) for _ in range(args.runs)]

    summary = {
        "doc_bytes": samples[0]["doc_bytes"],
        "validate_ms": summarize(samples, "validate_ms"),
        "encode_viz_ms": summarize(samples, "encode_viz_ms"),
        "assemble_doc_ms": summarize(samples, "assemble_doc_ms"),
        "serialize_json_ms": summarize(samples, "serialize_json_ms"),
        "firestore_sim_ms": summarize(samples, "firestore_sim_ms"),
        "total_ms": summarize(samples, "total_ms"),
    }

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
