"""
Tests for pure helper functions: build_user_content, pixelate_image, build_email_html, call_model.
"""

import base64
import io
import json
import httpx
import pytest
from unittest.mock import MagicMock, patch
from PIL import Image

from server.models import FortuneRequest
from server.ai import build_user_content, call_model, _call_deep_model
from server.pixelate import pixelate_image
from server.email_service import build_email_html
from server.prompts import SYSTEM_PROMPT, DEEP_ANALYSIS_PROMPT
from server import config


# ── build_user_content ───────────────────────────────────────────────────────

class TestBuildUserContent:
    def test_no_image(self):
        req = FortuneRequest()
        content = build_user_content(req)
        assert len(content) == 1
        assert content[0]["type"] == "text"
        assert "随机面相特征" in content[0]["text"]

    def test_none_request(self):
        content = build_user_content(None)
        assert len(content) == 1
        assert content[0]["type"] == "text"

    def test_with_image_no_measurements(self):
        req = FortuneRequest(image="data:image/jpeg;base64,abc123")
        content = build_user_content(req)
        assert len(content) == 2
        assert content[0]["type"] == "image_url"
        assert content[0]["image_url"]["url"] == "data:image/jpeg;base64,abc123"
        assert content[1]["type"] == "text"
        assert "面相学知识" in content[1]["text"]

    def test_with_image_and_measurements(self):
        req = FortuneRequest(
            image="data:image/jpeg;base64,abc",
            measurements="三停比例：33/34/33",
        )
        content = build_user_content(req)
        assert len(content) == 2
        assert "三停比例" in content[1]["text"]


# ── pixelate_image ───────────────────────────────────────────────────────────

class TestPixelateImage:
    def _make_test_image(self, width=200, height=200):
        img = Image.new("RGB", (width, height), color=(128, 64, 32))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    def test_returns_base64_string(self):
        img_bytes = self._make_test_image()
        result = pixelate_image(img_bytes)
        decoded = base64.b64decode(result)
        assert len(decoded) > 0

    def test_output_is_correct_size(self):
        img_bytes = self._make_test_image()
        result_b64 = pixelate_image(img_bytes)
        result_bytes = base64.b64decode(result_b64)
        img = Image.open(io.BytesIO(result_bytes))
        assert img.size == (config.PIXEL_SIZE, config.PIXEL_SIZE)

    def test_handles_non_square_input(self):
        img_bytes = self._make_test_image(width=300, height=100)
        result_b64 = pixelate_image(img_bytes)
        result_bytes = base64.b64decode(result_b64)
        img = Image.open(io.BytesIO(result_bytes))
        assert img.size == (config.PIXEL_SIZE, config.PIXEL_SIZE)


# ── build_email_html ─────────────────────────────────────────────────────────

class TestBuildEmailHtml:
    def test_basic_output(self):
        html = build_email_html("## 五官详解\n这是测试内容。")
        assert "<!DOCTYPE html>" in html
        assert "五官详解" in html
        assert "这是测试内容" in html
        assert "AI相面" in html
        assert "Superlinear Academy" in html

    def test_greeting_with_name(self):
        html = build_email_html("内容", name="张三")
        assert "张三，您好！" in html

    def test_greeting_without_name(self):
        html = build_email_html("内容")
        assert "您好！" in html
        assert "，您好！" not in html

    def test_avatar_included(self):
        html = build_email_html("内容", pixelated_image="data:image/png;base64,abc")
        assert "data:image/png;base64,abc" in html
        assert "像素画像" in html

    def test_avatar_omitted_when_none(self):
        html = build_email_html("内容")
        assert "像素画像" not in html

    def test_section_headers_styled(self):
        html = build_email_html("## 事业与发展\n具体建议。\n## 健康提示\n注意休息。")
        assert "<h3" in html
        assert "事业与发展" in html
        assert "健康提示" in html

    def test_community_section(self):
        html = build_email_html("内容")
        assert "设置登录密码" in html
        assert "login.circle.so" in html

    def test_dark_mode_css(self):
        html = build_email_html("内容")
        assert "prefers-color-scheme: dark" in html
        assert "data-ogsc" in html

    def test_outlook_vml(self):
        html = build_email_html("内容")
        assert "v:roundrect" in html

    def test_markdown_bold_rendered(self):
        html = build_email_html("这位来访者**天庭饱满**，印堂开阔。")
        assert "<strong" in html
        assert "天庭饱满" in html
        assert "**" not in html  # raw markdown syntax should not appear

    def test_markdown_list_rendered(self):
        html = build_email_html("## 特征\n\n- 眉毛浓密\n- 鼻梁挺直\n- 嘴角上翘")
        assert "<ul" in html
        assert "<li" in html
        assert "眉毛浓密" in html

    def test_markdown_emphasis_rendered(self):
        html = build_email_html("鼻梁挺直，*自信果敢*。")
        assert "<em>" in html
        assert "自信果敢" in html

    def test_markdown_ordered_list_rendered(self):
        html = build_email_html("1. 第一点\n2. 第二点")
        assert "<ol" in html
        assert "第一点" in html

    def test_markdown_heading_no_space(self):
        """Gemini sometimes outputs ##标题 without a space after ##."""
        html = build_email_html("##五官详解\n这是正文。\n###小节\n更多内容。")
        assert "<h3" in html
        assert "五官详解" in html
        assert "小节" in html
        # Raw ## should not appear in output
        assert "##" not in html


# ── call_model ───────────────────────────────────────────────────────────────

class TestCallModel:
    @pytest.mark.asyncio
    async def test_success(self):
        ai_response = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "face": "天庭饱满——",
                        "career": "事业有成。",
                        "blessing": "马到成功！",
                    })
                }
            }]
        }

        mock_resp = MagicMock()
        mock_resp.json.return_value = ai_response
        mock_resp.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            result = await call_model("gemini", "gemini-3-flash", [{"type": "text", "text": "test"}])

        assert result is not None
        assert result["face"] == "天庭饱满——"
        assert result["source"] == "ai"
        assert result["model"] == "gemini-3-flash"

    @pytest.mark.asyncio
    async def test_empty_response(self):
        ai_response = {"choices": [{"message": {"content": ""}}]}
        mock_resp = MagicMock()
        mock_resp.json.return_value = ai_response
        mock_resp.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            result = await call_model("grok", "grok-4", [])

        assert result is None

    @pytest.mark.asyncio
    async def test_invalid_json(self):
        ai_response = {"choices": [{"message": {"content": "not json"}}]}
        mock_resp = MagicMock()
        mock_resp.json.return_value = ai_response
        mock_resp.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            result = await call_model("gemini", "gemini-3-flash", [])

        assert result is None

    @pytest.mark.asyncio
    async def test_incomplete_structure(self):
        ai_response = {"choices": [{"message": {"content": json.dumps({"face": "a"})}}]}
        mock_resp = MagicMock()
        mock_resp.json.return_value = ai_response
        mock_resp.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            result = await call_model("grok", "grok-4", [])

        assert result is None

    @pytest.mark.asyncio
    async def test_markdown_wrapped_json(self):
        content = '```json\n{"face": "a——", "career": "b。", "blessing": "c！"}\n```'
        ai_response = {"choices": [{"message": {"content": content}}]}
        mock_resp = MagicMock()
        mock_resp.json.return_value = ai_response
        mock_resp.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            result = await call_model("gemini", "gemini-3-flash", [])

        assert result is not None
        assert result["face"] == "a——"

    @pytest.mark.asyncio
    async def test_network_error(self):
        async def mock_post(*args, **kwargs):
            raise Exception("Network error")

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            result = await call_model("grok", "grok-4", [])

        assert result is None


# ── Prompt content ───────────────────────────────────────────────────────────

class TestPrompts:
    def test_system_prompt_content(self):
        assert "面相学" in SYSTEM_PROMPT
        assert "相面先生" in SYSTEM_PROMPT
        assert "JSON" in SYSTEM_PROMPT
        assert "马年" in SYSTEM_PROMPT

    def test_deep_analysis_prompt_content(self):
        assert "面相" in DEEP_ANALYSIS_PROMPT
        assert "600-900" in DEEP_ANALYSIS_PROMPT
        assert "五官与三停" in DEEP_ANALYSIS_PROMPT
        assert "马年寄语" in DEEP_ANALYSIS_PROMPT


# ── _call_deep_model retry behavior ─────────────────────────────────────────

class TestCallDeepModel:
    @pytest.mark.asyncio
    async def test_retry_then_success(self):
        ok_resp = MagicMock()
        ok_resp.raise_for_status = MagicMock()
        ok_resp.json.return_value = {
            "choices": [{"message": {"content": "deep analysis ok"}}]
        }

        with patch(
            "httpx.AsyncClient.post",
            side_effect=[httpx.TimeoutException("timeout"), ok_resp],
        ) as post_mock:
            with patch("asyncio.sleep", return_value=None):
                name, text = await _call_deep_model("Gemini 3 Flash", "gemini", "u")

        assert name == "Gemini 3 Flash"
        assert text == "deep analysis ok"
        assert post_mock.call_count == 2

    @pytest.mark.asyncio
    async def test_non_retriable_http_error_fails_fast(self):
        req = httpx.Request("POST", "https://test")
        resp = httpx.Response(400, request=req)
        err = httpx.HTTPStatusError("bad request", request=req, response=resp)

        with patch("httpx.AsyncClient.post", side_effect=err) as post_mock:
            with patch("asyncio.sleep", return_value=None) as sleep_mock:
                name, text = await _call_deep_model("DeepSeek", "deepseek", "u")

        assert name == "DeepSeek"
        assert text is None
        assert post_mock.call_count == 1
        assert sleep_mock.call_count == 0

    @pytest.mark.asyncio
    async def test_empty_response_retries_with_capped_backoff(self):
        empty_resp = MagicMock()
        empty_resp.raise_for_status = MagicMock()
        empty_resp.json.return_value = {"choices": [{"message": {"content": ""}}]}

        with patch("httpx.AsyncClient.post", side_effect=[empty_resp] * 6) as post_mock:
            with patch("asyncio.sleep", return_value=None) as sleep_mock:
                name, text = await _call_deep_model("Kimi K2.5", "kimi", "u")

        assert name == "Kimi K2.5"
        assert text is None
        assert post_mock.call_count == 6
        assert sleep_mock.call_count == 5
        delays = [call.args[0] for call in sleep_mock.call_args_list]
        assert delays == [5.0, 10.0, 20.0, 20.0, 20.0]
