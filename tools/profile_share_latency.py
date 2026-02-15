#!/usr/bin/env python3
import argparse
import json
import re
import subprocess
import time
from urllib.parse import urljoin


ASSET_RE = re.compile(r"(?:src|href)=\"([^\"]+)\"")


def run_curl_timing(url: str, method: str = "GET", body: str | None = None) -> dict:
    format_str = json.dumps(
        {
            "http_code": "%{http_code}",
            "time_namelookup": "%{time_namelookup}",
            "time_connect": "%{time_connect}",
            "time_appconnect": "%{time_appconnect}",
            "time_starttransfer": "%{time_starttransfer}",
            "time_total": "%{time_total}",
            "size_download": "%{size_download}",
            "url_effective": "%{url_effective}",
        }
    )

    cmd = [
        "curl",
        "-sS",
        "-o",
        "/tmp/profile_share_body.tmp",
        "-w",
        format_str,
        "--max-time",
        "60",
        "-X",
        method,
    ]
    if body is not None:
        cmd.extend(["-H", "Content-Type: application/json", "--data", body])
    cmd.append(url)

    t0 = time.perf_counter()
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    elapsed = time.perf_counter() - t0

    parsed = {}
    if proc.stdout:
        try:
            parsed = json.loads(proc.stdout)
        except json.JSONDecodeError:
            parsed = {"raw": proc.stdout.strip()}

    return {
        "ok": proc.returncode == 0,
        "curl_code": proc.returncode,
        "elapsed_wall": round(elapsed, 4),
        "metrics": parsed,
    }


def fetch_text(url: str) -> str:
    proc = subprocess.run(
        ["curl", "-sS", "--max-time", "60", url],
        capture_output=True,
        text=True,
        check=False,
    )
    return proc.stdout if proc.returncode == 0 else ""


def parse_assets(html: str, base_url: str) -> list[str]:
    assets = []
    for m in ASSET_RE.findall(html):
        if m.startswith("data:"):
            continue
        full = urljoin(base_url, m)
        if any(full.endswith(ext) for ext in (".js", ".css", ".woff2", ".woff")):
            assets.append(full)
    seen = set()
    out = []
    for a in assets:
        if a in seen:
            continue
        seen.add(a)
        out.append(a)
    return out


def f(v: str | float | int) -> float:
    try:
        return float(v)
    except Exception:
        return 0.0


def main() -> None:
    parser = argparse.ArgumentParser(description="Profile share page/API latency")
    parser.add_argument("--base-url", default="https://space.ai-builders.com")
    parser.add_argument("--share-id", required=True)
    parser.add_argument("--runs", type=int, default=2)
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    share_page = f"{base}/share/{args.share_id}"
    share_api = f"{base}/api/share/{args.share_id}"
    l2_api = f"{base}/api/analysis/l2"

    print(f"Share page: {share_page}")
    print(f"Share API : {share_api}")
    print(f"L2 API    : {l2_api}")
    print("")

    page_samples = [run_curl_timing(share_page) for _ in range(args.runs)]
    api_samples = [run_curl_timing(share_api) for _ in range(args.runs)]
    l2_samples = [
        run_curl_timing(
            l2_api, method="POST", body=json.dumps({"share_id": args.share_id})
        )
        for _ in range(args.runs)
    ]

    html = fetch_text(share_page)
    assets = parse_assets(html, base)

    asset_results = []
    for asset in assets:
        r = run_curl_timing(asset)
        asset_results.append(
            {
                "url": asset,
                "http": r["metrics"].get("http_code", ""),
                "ttfb": f(r["metrics"].get("time_starttransfer", 0)),
                "total": f(r["metrics"].get("time_total", 0)),
                "size": int(f(r["metrics"].get("size_download", 0))),
            }
        )

    def avg(samples: list[dict], key: str) -> float:
        vals = [f(s["metrics"].get(key, 0)) for s in samples]
        return round(sum(vals) / len(vals), 4) if vals else 0.0

    summary = {
        "share_page_avg_total": avg(page_samples, "time_total"),
        "share_page_avg_ttfb": avg(page_samples, "time_starttransfer"),
        "share_api_avg_total": avg(api_samples, "time_total"),
        "share_api_avg_ttfb": avg(api_samples, "time_starttransfer"),
        "l2_api_avg_total": avg(l2_samples, "time_total"),
        "l2_api_avg_ttfb": avg(l2_samples, "time_starttransfer"),
        "assets_count": len(asset_results),
        "assets_total_download_bytes": sum(a["size"] for a in asset_results),
        "assets_slowest_top5": sorted(
            asset_results, key=lambda x: x["total"], reverse=True
        )[:5],
        "assets_largest_top5": sorted(
            asset_results, key=lambda x: x["size"], reverse=True
        )[:5],
    }

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
