import base64
import json
import os
from pathlib import Path

import pytest

from server import config as server_config
from server.firebase import get_db


def _load_test_image_data_url() -> str:
    root = Path(__file__).resolve().parents[1]
    image_path = root / "test-assets" / "test-face-1-visualized-privacy.jpg"
    raw = image_path.read_bytes()
    return f"data:image/jpeg;base64,{base64.b64encode(raw).decode('ascii')}"


def _load_measurement_text() -> str:
    root = Path(__file__).resolve().parents[1]
    measurement_path = root / "test-assets" / "test-face-1-measurements.json"
    data = json.loads(measurement_path.read_text(encoding="utf-8"))
    return "【面部测量数据】\n" + json.dumps(data, ensure_ascii=False)


@pytest.mark.integration_live
@pytest.mark.asyncio
async def test_live_e2e_fortune_share_qr_flow(client):
    if not server_config.AI_TOKEN:
        pytest.skip("AI token missing (AI_BUILDER_TOKEN/VITE_AI_API_TOKEN)")
    if get_db() is None:
        pytest.skip(
            "Firestore not configured (FIREBASE_CREDENTIALS or credential path missing)"
        )

    image_data_url = _load_test_image_data_url()
    measurements_text = _load_measurement_text()

    fortune_resp = await client.post(
        "/api/fortune",
        json={
            "image": image_data_url,
            "measurements": measurements_text,
        },
    )
    assert fortune_resp.status_code == 200
    fortunes = fortune_resp.json()
    assert fortunes.get("grok")
    assert all(k in fortunes["grok"] for k in ("face", "career", "blessing"))

    share_payload = {
        "pixelated_image": image_data_url,
        "visualization_data": {
            "landmarks": [[0.41235, 0.28117], [0.62541, 0.28493], [0.51774, 0.64418]],
            "contour_indices": {"face_oval": [0, 1, 2]},
            "measurements": {"three_parts": [0.33, 0.34, 0.33]},
            "version": "integration-live",
        },
        "fortunes": fortunes,
    }

    share_resp = await client.post("/api/share", json=share_payload)
    assert share_resp.status_code == 200
    share_data = share_resp.json()
    assert "id" in share_data
    assert share_data["url"].startswith("/share/")

    share_page_resp = await client.get(share_data["url"])
    assert share_page_resp.status_code == 200

    api_share_resp = await client.get(f"/api/share/{share_data['id']}")
    assert api_share_resp.status_code == 200
    fetched = api_share_resp.json()
    assert fetched.get("fortunes", {}).get("grok", {}).get("face")
    assert fetched.get("visualization_data", {}).get("landmarks")

    # Optional cleanup for repeated live runs
    if os.getenv("RUN_INTEGRATION_TESTS_CLEANUP") == "1":
        db = get_db()
        if db is not None:
            db.collection("fortunes").document(share_data["id"]).delete()
