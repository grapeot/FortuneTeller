"""
Integration tests for API endpoints using httpx AsyncClient + FastAPI TestClient.
All external services (AI API, Firestore, Circle, Resend) are mocked.
"""

import json
import pytest
from unittest.mock import patch, MagicMock

from server import config
from server import ai as server_ai
from server import routes as server_routes


# ── GET /api/health ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["token_configured"] is True
    assert data["email_configured"] is True
    assert data["circle_configured"] is True


# ── POST /api/fortune ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fortune_no_token(client, monkeypatch):
    monkeypatch.setattr(config, "AI_TOKEN", "")
    resp = await client.post("/api/fortune", json={})
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_fortune_success(client):
    """Grok model returns valid result."""
    grok_result = {"face": "山根高——", "career": "适合深耕。", "blessing": "龙马精神！", "source": "ai", "model": "grok"}

    async def mock_call(name, model_id, content):
        return grok_result

    with patch.object(server_ai, "call_model", side_effect=mock_call):
        resp = await client.post("/api/fortune", json={})

    assert resp.status_code == 200
    data = resp.json()
    assert data["gemini"] is None
    assert data["grok"]["face"] == "山根高——"


@pytest.mark.asyncio
async def test_fortune_both_fail(client):
    """Both models fail → 502."""
    async def mock_call(name, model_id, content):
        return None

    with patch.object(server_ai, "call_model", side_effect=mock_call):
        resp = await client.post("/api/fortune", json={})

    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_fortune_one_model_fails(client):
    """Grok model succeeds → 200."""
    grok_result = {"face": "山根高——", "career": "适合深耕。", "blessing": "龙马精神！", "source": "ai", "model": "grok"}

    async def mock_call(name, model_id, content):
        return grok_result

    with patch.object(server_ai, "call_model", side_effect=mock_call):
        resp = await client.post("/api/fortune", json={})

    assert resp.status_code == 200
    data = resp.json()
    assert data["gemini"] is None
    assert data["grok"] is not None


@pytest.mark.asyncio
async def test_fortune_with_image(client):
    """Image and measurements are forwarded to call_model (Grok only)."""
    captured_content = []

    async def mock_call(name, model_id, content):
        captured_content.append(content)
        return {"face": "面相——", "career": "建议。", "blessing": "祝福！", "source": "ai", "model": model_id}

    with patch.object(server_ai, "call_model", side_effect=mock_call):
        resp = await client.post("/api/fortune", json={
            "image": "data:image/jpeg;base64,abc",
            "measurements": "三停：33/34/33",
        })

    assert resp.status_code == 200
    assert len(captured_content) == 1
    assert captured_content[0][0]["type"] == "image_url"
    assert captured_content[0][0]["image_url"]["url"] == "data:image/jpeg;base64,abc"


# ── POST /api/share ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_share_no_firestore(client):
    resp = await client.post("/api/share", json={"fortunes": {"grok": {"face": "a"}}})
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_share_success(client, mock_firestore):
    mock_firestore.collection.return_value.document.return_value.set = MagicMock()

    resp = await client.post("/api/share", json={
        "pixelated_image": "data:image/png;base64,px",
        "fortunes": {"grok": {"face": "a", "career": "b", "blessing": "c"}},
    })

    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert data["url"].startswith("/share/")
    mock_firestore.collection.assert_called_with("fortunes")


@pytest.mark.asyncio
async def test_share_legacy_format(client, mock_firestore):
    """Legacy single-model format (fortune instead of fortunes)."""
    mock_firestore.collection.return_value.document.return_value.set = MagicMock()

    resp = await client.post("/api/share", json={
        "fortune": {"face": "a", "career": "b", "blessing": "c"},
    })

    assert resp.status_code == 200


# ── GET /api/share/{id} ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_share_no_firestore(client):
    resp = await client.get("/api/share/abc123")
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_get_share_not_found(client, mock_firestore):
    mock_doc = MagicMock()
    mock_doc.exists = False
    mock_firestore.collection.return_value.document.return_value.get.return_value = mock_doc

    resp = await client.get("/api/share/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_share_success(client, mock_firestore):
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        "pixelated_image": "data:image/png;base64,px",
        "fortunes": {"grok": {"face": "a", "career": "b", "blessing": "c"}},
    }
    mock_firestore.collection.return_value.document.return_value.get.return_value = mock_doc

    resp = await client.get("/api/share/abc123")
    assert resp.status_code == 200
    data = resp.json()
    assert data["pixelated_image"] == "data:image/png;base64,px"
    assert data["fortunes"]["grok"]["face"] == "a"


@pytest.mark.asyncio
async def test_get_share_legacy_format(client, mock_firestore):
    """Legacy documents with 'fortune' instead of 'fortunes'."""
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        "fortune": {"face": "x", "career": "y", "blessing": "z"},
    }
    mock_firestore.collection.return_value.document.return_value.get.return_value = mock_doc

    resp = await client.get("/api/share/legacy1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["fortunes"]["gemini"]["face"] == "x"


# ── POST /api/subscribe ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_subscribe_invalid_email(client):
    resp = await client.post("/api/subscribe", json={
        "email": "not-an-email",
        "share_id": "abc",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_subscribe_no_resend(client, monkeypatch):
    monkeypatch.setattr(config, "RESEND_API_KEY", "")
    resp = await client.post("/api/subscribe", json={
        "email": "test@example.com",
        "share_id": "abc",
    })
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_subscribe_success(client):
    """Subscribe endpoint returns 200 immediately (background task is queued)."""
    resp = await client.post("/api/subscribe", json={
        "email": "test@example.com",
        "name": "张三",
        "share_id": "abc123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "accepted"
