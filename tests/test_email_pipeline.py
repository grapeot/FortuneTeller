"""
Tests for the email subscription background pipeline:
generate_deep_analysis, send_resend_email, subscribe_background.
"""

import json
import re
from html import unescape
from urllib.parse import parse_qs, urlparse
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from server import config
from server.email_service import (
    send_resend_email,
    subscribe_background,
    build_email_html,
)
from server.ai import generate_deep_analysis


class TestEmailLoginLink:
    def test_sso_link_prefills_exact_recipient_in_both_email_buttons(self):
        email = 'reader+tag&special@example.com'
        html = build_email_html("Analysis", email=email)
        links = re.findall(r'href="([^"]+)"', html)
        login_links = [unescape(link) for link in links if "signup.superlinear.academy" in link]
        assert len(login_links) == 2  # HTML CTA and Outlook VML CTA
        for link in login_links:
            parsed = urlparse(link)
            assert parsed.scheme == "https"
            assert parsed.netloc == "signup.superlinear.academy"
            assert parse_qs(parsed.query) == {
                "ui_locales": ["zh-CN"], "email": [email]
            }
        assert "password/new" not in html
        assert "设置登录密码" not in html
        assert "已为您开通" not in html
        assert "注册" not in html
        assert "创建账号" not in html

    def test_missing_email_does_not_insert_an_empty_login_hint(self):
        html = build_email_html("Analysis")
        assert "email=" not in html

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

        async def mock_post(*args, **kwargs):
            body = kwargs.get("json", {})
            user_msg = body.get("messages", [{}])[-1].get("content", "")
            assert "无前次分析结果" in user_msg
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            result = await generate_deep_analysis({})

        assert result == "分析内容"

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
    async def test_single_model_fallback_preserves_recipient_login_hint(self):
        with patch("server.email_service.generate_multi_model_analysis", new=AsyncMock(return_value={})), \
             patch("server.email_service.generate_deep_analysis", new=AsyncMock(return_value="Analysis")), \
             patch("server.email_service.send_resend_email", return_value="email-test") as send:
            await subscribe_background("reader+tag@example.com", "", "missing-share")
        assert "email=reader%2Btag%40example.com" in send.call_args.args[1]

    @pytest.mark.asyncio
    async def test_full_pipeline(self, mock_firestore):
        """Runs storage read → AI → Resend → storage update."""
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "fortunes": {"grok": {"face": "a", "career": "b", "blessing": "c"}},
            "pixelated_image": "data:image/png;base64,px",
        }
        mock_firestore.collection.return_value.document.return_value.get.return_value = mock_doc
        mock_firestore.collection.return_value.document.return_value.update = MagicMock()

        ai_resp = MagicMock()
        ai_resp.json.return_value = {
            "choices": [{"message": {"content": "## 五官详解\n深度分析内容。"}}]
        }
        ai_resp.raise_for_status = MagicMock()

        async def mock_ai_post(*args, **kwargs):
            return ai_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_ai_post), \
             patch("resend.Emails.send", return_value={"id": "email-456"}) as mock_send:
            await subscribe_background("user@test.com", "张三", "share123")

        assert "email=user%40test.com" in mock_send.call_args[0][0]["html"]

        update_call = mock_firestore.collection.return_value.document.return_value.update
        update_call.assert_called_once()
        update_data = update_call.call_args[0][0]
        assert update_data["subscribed_email"] == "user@test.com"
        assert update_data["subscribed_name"] == "张三"

    @pytest.mark.asyncio
    async def test_pipeline_does_not_provision_accounts_or_access(self, mock_firestore):
        """Subscription sends a report without provisioning Circle/Logto accounts."""

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

        with patch("httpx.AsyncClient.post", side_effect=mock_ai_post), \
             patch("resend.Emails.send", side_effect=Exception("Resend down")):
            await subscribe_background("fail@test.com", "", "bad_id")
