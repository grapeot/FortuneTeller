"""
Tests for the email subscription background pipeline:
circle_create_member, generate_deep_analysis, send_resend_email, subscribe_background.
"""

import json
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from server import config
from server.email_service import (
    circle_create_member,
    send_resend_email,
    subscribe_background,
)
from server.ai import generate_deep_analysis


# ── circle_create_member ─────────────────────────────────────────────────────

class TestCircleCreateMember:
    def test_new_member_created(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"id": 123, "name": "Test"}

        with patch("requests.post", return_value=mock_resp) as mock_post:
            circle_create_member("test@example.com", "Test")

        mock_post.assert_called_once()
        call_body = mock_post.call_args[1]["json"]
        assert call_body["email"] == "test@example.com"
        assert call_body["name"] == "Test"
        assert call_body["skip_invitation"] is True

    def test_existing_member_adds_to_spaces(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_resp.json.return_value = {
            "message": "This user is already a member",
            "community_member": {"first_name": "Existing"},
        }

        space_resp = MagicMock()
        space_resp.status_code = 200

        with patch("requests.post", side_effect=[mock_resp, space_resp, space_resp]) as mock_post:
            circle_create_member("existing@example.com")

        # 1 member creation + 2 space additions (CIRCLE_SPACE_IDS has 2 entries)
        assert mock_post.call_count == 3

    def test_422_adds_to_spaces(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 422
        mock_resp.json.return_value = {}

        space_resp = MagicMock()
        space_resp.status_code = 200

        with patch("requests.post", side_effect=[mock_resp, space_resp, space_resp]):
            circle_create_member("dup@example.com")

    def test_no_name_omitted_from_body(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {}

        with patch("requests.post", return_value=mock_resp) as mock_post:
            circle_create_member("no-name@example.com")

        call_body = mock_post.call_args[1]["json"]
        assert "name" not in call_body


# ── generate_deep_analysis ───────────────────────────────────────────────────

class TestGenerateDeepAnalysis:
    @pytest.mark.asyncio
    async def test_returns_analysis_text(self):
        ai_response = {
            "choices": [{
                "message": {
                    "content": "## 五官详解\n详细分析内容。\n## 三停分析\n三停内容。"
                }
            }]
        }

        mock_resp = MagicMock()
        mock_resp.json.return_value = ai_response
        mock_resp.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            result = await generate_deep_analysis({
                "grok": {"face": "天庭饱满", "career": "事业好", "blessing": "祝福"},
            })

        assert "五官详解" in result
        assert "三停分析" in result

    @pytest.mark.asyncio
    async def test_empty_fortunes(self):
        ai_response = {
            "choices": [{"message": {"content": "分析内容"}}]
        }

        mock_resp = MagicMock()
        mock_resp.json.return_value = ai_response
        mock_resp.raise_for_status = MagicMock()

        call_count = 0
        async def mock_post(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            body = kwargs.get("json", {})
            user_msg = body.get("messages", [{}])[-1].get("content", "")
            if call_count == 1:  # First call
                assert "无前次分析结果" in user_msg
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            result = await generate_deep_analysis({})

        # Now returns multi-model format
        assert "我们咨询了多个AI模型" in result
        assert "Gemini 3 Flash的解读" in result
        assert "DeepSeek R1的解读" in result
        assert "Kimi K2.5的解读" in result
        assert "分析内容" in result
        assert call_count == 3  # Should call 3 models

    @pytest.mark.asyncio
    async def test_empty_response_fallback(self):
        ai_response = {"choices": [{"message": {"content": ""}}]}

        mock_resp = MagicMock()
        mock_resp.json.return_value = ai_response
        mock_resp.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            result = await generate_deep_analysis({})

        assert "失败" in result or "重试" in result


# ── send_resend_email ────────────────────────────────────────────────────────

class TestSendResendEmail:
    def test_success(self):
        with patch("resend.Emails.send", return_value={"id": "email-123"}) as mock_send:
            result = send_resend_email("test@example.com", "<html>hi</html>")

        assert result == "email-123"
        mock_send.assert_called_once()
        call_args = mock_send.call_args[0][0]
        assert call_args["to"] == ["test@example.com"]
        assert "面相深度分析" in call_args["subject"]

    def test_failure_returns_none(self):
        with patch("resend.Emails.send", side_effect=Exception("API error")):
            result = send_resend_email("test@example.com", "<html>hi</html>")

        assert result is None


# ── subscribe_background ─────────────────────────────────────────────────────

class TestSubscribeBackground:
    @pytest.mark.asyncio
    async def test_full_pipeline(self, mock_firestore):
        """Runs the full pipeline: Circle → Firestore read → Gemini → Resend → Firestore update."""
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "fortunes": {"grok": {"face": "a", "career": "b", "blessing": "c"}},
            "pixelated_image": "data:image/png;base64,px",
        }
        mock_firestore.collection.return_value.document.return_value.get.return_value = mock_doc
        mock_firestore.collection.return_value.document.return_value.update = MagicMock()

        circle_resp = MagicMock()
        circle_resp.status_code = 200
        circle_resp.json.return_value = {"id": 1}

        ai_resp = MagicMock()
        ai_resp.json.return_value = {
            "choices": [{"message": {"content": "## 五官详解\n深度分析内容。"}}]
        }
        ai_resp.raise_for_status = MagicMock()

        async def mock_ai_post(*args, **kwargs):
            return ai_resp

        with patch("requests.post", return_value=circle_resp), \
             patch("httpx.AsyncClient.post", side_effect=mock_ai_post), \
             patch("resend.Emails.send", return_value={"id": "email-456"}):
            await subscribe_background("user@test.com", "张三", "share123")

        update_call = mock_firestore.collection.return_value.document.return_value.update
        update_call.assert_called_once()
        update_data = update_call.call_args[0][0]
        assert update_data["subscribed_email"] == "user@test.com"
        assert update_data["subscribed_name"] == "张三"

    @pytest.mark.asyncio
    async def test_pipeline_without_circle_token(self, monkeypatch, mock_firestore):
        """Pipeline skips Circle when no token configured."""
        monkeypatch.setattr(config, "CIRCLE_V2_TOKEN", "")

        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {"fortunes": {}, "pixelated_image": None}
        mock_firestore.collection.return_value.document.return_value.get.return_value = mock_doc
        mock_firestore.collection.return_value.document.return_value.update = MagicMock()

        ai_resp = MagicMock()
        ai_resp.json.return_value = {"choices": [{"message": {"content": "分析"}}]}
        ai_resp.raise_for_status = MagicMock()

        async def mock_ai_post(*args, **kwargs):
            return ai_resp

        with patch("requests.post") as mock_circle, \
             patch("httpx.AsyncClient.post", side_effect=mock_ai_post), \
             patch("resend.Emails.send", return_value={"id": "e1"}):
            await subscribe_background("user@test.com", "", "share1")

        mock_circle.assert_not_called()

    @pytest.mark.asyncio
    async def test_pipeline_handles_errors_gracefully(self, monkeypatch):
        """Pipeline doesn't raise even if everything fails."""
        async def mock_ai_post(*args, **kwargs):
            raise Exception("AI down")

        with patch("requests.post", side_effect=Exception("Circle down")), \
             patch("httpx.AsyncClient.post", side_effect=mock_ai_post), \
             patch("resend.Emails.send", side_effect=Exception("Resend down")):
            await subscribe_background("fail@test.com", "", "bad_id")
