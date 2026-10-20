"""
Email subscription pipeline: Resend email and deep analysis.
"""

import asyncio
import re
from html import escape
from urllib.parse import urlencode
import mistune

from . import config
from .storage import get_share_storage
from .ai import generate_deep_analysis, generate_multi_model_analysis


# ── Email-compatible Markdown renderer ───────────────────────────────────────

class _EmailRenderer(mistune.HTMLRenderer):
    """Custom Markdown renderer that outputs email-compatible HTML with inline styles."""

    # Inline style constants for consistency
    _BODY = 'font-size:16px;color:#4a3c2e;line-height:1.9;margin:0 0 14px;'
    _HEADING = 'font-size:19px;color:#5c4a32;margin:28px 0 10px;padding-bottom:8px;border-bottom:1px solid #e0d5c3;'
    _STRONG = 'color:#3d2e1c;'
    _LIST = 'font-size:16px;color:#4a3c2e;line-height:1.9;margin:0 0 14px;padding-left:24px;'
    _LI = 'margin:0 0 6px;'
    _BLOCKQUOTE = 'border-left:3px solid #c9b99a;padding:8px 16px;margin:16px 0;color:#6b5d4d;font-style:italic;'
    _CODE = 'background-color:#f0ebe3;padding:1px 5px;border-radius:3px;font-size:14px;color:#5c4a32;'
    _HR = 'border:none;border-top:1px solid #e0d5c3;margin:24px 0;'

    def heading(self, text: str, level: int, **attrs) -> str:
        # Map all heading levels to h3 for email consistency
        return f'\n          <h3 class="email-heading" style="{self._HEADING}">{text}</h3>'

    def paragraph(self, text: str) -> str:
        return f'\n          <p class="email-body" style="{self._BODY}">{text}</p>'

    def strong(self, text: str) -> str:
        return f'<strong style="{self._STRONG}">{text}</strong>'

    def emphasis(self, text: str) -> str:
        return f'<em>{text}</em>'

    def list(self, text: str, ordered: bool, **attrs) -> str:
        tag = 'ol' if ordered else 'ul'
        return f'\n          <{tag} style="{self._LIST}">{text}\n          </{tag}>'

    def list_item(self, text: str) -> str:
        return f'\n            <li style="{self._LI}">{text}</li>'

    def block_quote(self, text: str) -> str:
        return f'\n          <blockquote style="{self._BLOCKQUOTE}">{text}</blockquote>'

    def codespan(self, text: str) -> str:
        return f'<code style="{self._CODE}">{text}</code>'

    def thematic_break(self) -> str:
        return f'\n          <hr style="{self._HR}" />'


_email_md = mistune.create_markdown(renderer=_EmailRenderer())


_RE_HEADING_NO_SPACE = re.compile(r'^(#{1,6})([^\s#])', re.MULTILINE)


def _fix_markdown(text: str) -> str:
    """Preprocess Markdown to handle common LLM quirks.

    - Adds missing space after heading '#' markers (e.g. '##标题' → '## 标题')
    """
    return _RE_HEADING_NO_SPACE.sub(r'\1 \2', text)


def markdown_to_email_html(text: str) -> str:
    """Convert Markdown text to email-compatible HTML with inline styles."""
    return _email_md(_fix_markdown(text))


# ── Email builder ────────────────────────────────────────────────────────────

def build_email_html(
    deep_analysis: str | None = None,
    name: str = "",
    pixelated_image: str | None = None,
    multi_model_results: dict[str, str] | None = None,
    email: str = "",
) -> str:
    """Build Outlook-compatible HTML email with harmonious palette.

    Accepts either a single deep_analysis string (legacy) or a dict of
    multi_model_results mapping display_name → analysis_text.
    """
    greeting = f"{name}，您好！" if name else "您好！"
    login_params = {"ui_locales": "zh-CN"}
    if email:
        login_params["email"] = email
    community_url = escape(f"{config.COMMUNITY_URL}?{urlencode(login_params)}", quote=True)

    avatar_html = ""
    if pixelated_image:
        avatar_html = f"""
        <tr><td align="center" style="padding:20px 0 10px;">
          <img src="{pixelated_image}" alt="像素画像" width="96" height="96"
               style="width:96px;height:96px;border-radius:8px;image-rendering:pixelated;border:2px solid #c9b99a;" />
        </td></tr>"""

    if multi_model_results:
        # Multi-model: render each model's analysis as a labeled section
        parts = []
        for model_name, analysis in multi_model_results.items():
            header = f'<h2 style="font-size:20px;color:#3d2e1c;margin:32px 0 12px;padding:10px 0 8px;border-bottom:2px solid #c9b99a;letter-spacing:2px;">🤖 {model_name} 的解读</h2>'
            parts.append(header + markdown_to_email_html(analysis))
        sections_html = "\n".join(parts)
    elif deep_analysis:
        sections_html = markdown_to_email_html(deep_analysis)
    else:
        sections_html = "<p>深度分析生成失败，请稍后重试。</p>"

    return f"""<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    :root {{ color-scheme: light dark; supported-color-schemes: light dark; }}
    /* ── Mobile-first responsive ── */
    @media only screen and (max-width: 620px) {{
      .email-outer-pad {{ padding: 12px 6px !important; }}
      .email-card {{ border-radius: 0 !important; border-left: none !important; border-right: none !important; }}
      .email-header {{ padding: 24px 20px 20px !important; }}
      .email-title {{ font-size: 26px !important; letter-spacing: 4px !important; }}
      .email-subtitle {{ font-size: 13px !important; }}
      .email-body-cell {{ padding: 20px 18px 24px !important; }}
      .email-body {{ font-size: 17px !important; line-height: 1.85 !important; }}
      .email-heading {{ font-size: 20px !important; margin: 28px 0 10px !important; }}
      .email-community-cell {{ padding: 18px 18px !important; }}
      .email-divider-cell {{ padding: 0 18px !important; }}
      .email-footer {{ padding: 16px 18px !important; }}
      .email-footer-text {{ font-size: 12px !important; }}
      .email-cta {{ padding: 14px 28px !important; font-size: 15px !important; }}
    }}
    @media (prefers-color-scheme: dark) {{
      .email-bg {{ background-color: #1c1914 !important; }}
      .email-card {{ background-color: #2a2520 !important; border-color: #4a4035 !important; }}
      .email-header {{ background-color: #2e2318 !important; }}
      .email-title {{ color: #e8d5b0 !important; }}
      .email-subtitle {{ color: #a89878 !important; }}
      .email-body {{ color: #d4c8b0 !important; }}
      .email-heading {{ color: #d4b896 !important; border-color: #4a4035 !important; }}
      .email-accent {{ background-color: #8a7a5a !important; }}
      .email-cta {{ background-color: #5c4a32 !important; color: #f0e6d2 !important; }}
      .email-footer {{ background-color: #221e18 !important; border-color: #3a3428 !important; }}
      .email-footer-text {{ color: #7a7060 !important; }}
      .email-link {{ color: #d4a868 !important; }}
    }}
    [data-ogsc] .email-bg {{ background-color: #1c1914 !important; }}
    [data-ogsc] .email-card {{ background-color: #2a2520 !important; border-color: #4a4035 !important; }}
    [data-ogsc] .email-header {{ background-color: #2e2318 !important; }}
    [data-ogsc] .email-title {{ color: #e8d5b0 !important; }}
    [data-ogsc] .email-subtitle {{ color: #a89878 !important; }}
    [data-ogsc] .email-body {{ color: #d4c8b0 !important; }}
    [data-ogsc] .email-heading {{ color: #d4b896 !important; border-color: #4a4035 !important; }}
    [data-ogsc] .email-accent {{ background-color: #8a7a5a !important; }}
    [data-ogsc] .email-cta {{ background-color: #5c4a32 !important; color: #f0e6d2 !important; }}
    [data-ogsc] .email-footer {{ background-color: #221e18 !important; border-color: #3a3428 !important; }}
    [data-ogsc] .email-footer-text {{ color: #7a7060 !important; }}
    [data-ogsc] .email-link {{ color: #d4a868 !important; }}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0ebe3;font-family:Georgia,'Songti SC','STSongti-SC','Noto Serif SC',serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table class="email-bg" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f0ebe3;">
    <tr><td class="email-outer-pad" align="center" style="padding:32px 16px;">

      <!--[if mso]><table width="600" cellpadding="0" cellspacing="0" role="presentation"><tr><td><![endif]-->
      <table class="email-card" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#faf6ef;border:1px solid #d8ccb8;border-radius:8px;overflow:hidden;width:100%;max-width:600px;">

        <!-- Header: warm brown tone -->
        <tr><td class="email-header" style="background-color:#3d3028;padding:28px 30px 24px;text-align:center;">
          <h1 class="email-title" style="font-size:28px;color:#e8d5b0;margin:0 0 4px;letter-spacing:6px;font-weight:bold;">AI相面</h1>
          <p class="email-subtitle" style="font-size:13px;color:#a89878;margin:0;letter-spacing:2px;">Superlinear Academy · 丙午马年新春</p>
        </td></tr>

        <!-- Warm accent line -->
        <tr><td class="email-accent" style="height:2px;background-color:#c9b99a;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Avatar -->
        {avatar_html}

        <!-- Body -->
        <tr><td class="email-body-cell" style="padding:24px 32px 28px;">
          <p class="email-body" style="font-size:16px;color:#4a3c2e;line-height:1.9;margin:0 0 16px;">{greeting}</p>
          <p class="email-body" style="font-size:16px;color:#4a3c2e;line-height:1.9;margin:0 0 20px;">{"我们咨询了多个 AI 模型，为您生成了这份多维度深度面相报告。即使是同样的提示词，每个模型也有自己鲜明的解读风格和性格——希望不同视角的碰撞能带给您更多启发。" if multi_model_results else "以下是为您准备的 AI 面相深度分析报告。这份报告综合了多维度的面相学知识，从五官、三停、十二宫位等多个角度为您进行了全面解读。"}</p>

          {sections_html}

        </td></tr>

        <!-- Divider -->
        <tr><td class="email-divider-cell" style="padding:0 32px;"><div style="height:1px;background-color:#d8ccb8;"></div></td></tr>

        <!-- Community section -->
        <tr><td class="email-community-cell" style="padding:20px 32px;">
          <p class="email-body" style="font-size:15px;color:#6b5d4d;line-height:1.85;margin:0 0 8px;">
            欢迎访问 <strong style="color:#5c4a32;">Superlinear Academy</strong> 社区，浏览公开内容与学员分享的实践项目。
          </p>
          <p class="email-body" style="font-size:15px;color:#6b5d4d;line-height:1.85;margin:0 0 16px;">
            点击下方按钮即可前往社区。
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr><td align="center" style="padding:4px 0 8px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{community_url}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="18%" stroke="f" fillcolor="#5c4a32">
                <w:anchorlock/><center>
              <![endif]-->
              <a class="email-cta" href="{community_url}" style="display:inline-block;padding:14px 36px;background-color:#5c4a32;color:#f0e6d2;font-size:15px;font-weight:bold;text-decoration:none;border-radius:8px;letter-spacing:1px;">
                访问 Superlinear Academy
              </a>
              <!--[if mso]></center></v:roundrect><![endif]-->
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td class="email-footer" style="background-color:#f0ebe3;padding:18px 32px;border-top:1px solid #d8ccb8;">
          <p class="email-footer-text" style="font-size:12px;color:#a09888;text-align:center;margin:0;line-height:1.7;">
            此邮件由 Superlinear Academy 发送 · 社区动态可随时在 Circle 设置中退订<br>&copy; 2026 Superlinear Academy
          </p>
        </td></tr>

      </table>
      <!--[if mso]></td></tr></table><![endif]-->

    </td></tr>
  </table>
</body>
</html>"""


def send_resend_email(email: str, html: str) -> str | None:
    """Send HTML email via Resend. Returns email ID or None."""
    import resend

    resend.api_key = config.RESEND_API_KEY
    try:
        result = resend.Emails.send({
            "from": "Superlinear Academy <no-reply@ai-builders.com>",
            "to": [email],
            "subject": "您的AI面相深度分析 - Superlinear Academy",
            "html": html,
        })
        config.logger.info(f"Resend: email sent to {email}, id={result.get('id', 'unknown')}")
        return result.get("id")
    except Exception as e:
        config.logger.error(f"Resend: failed to send to {email}: {e}")
        return None


async def subscribe_background(email: str, name: str, share_id: str):
    """Generate and email the report; account creation happens through SSO."""
    try:
        # Step 1: Fetch share data from storage
        fortunes = {}
        pixelated_image = None
        storage = get_share_storage()
        if storage.is_available():
            share_data = await asyncio.to_thread(storage.get_share, share_id)
            if share_data:
                fortunes = share_data.get("fortunes") or {}
                pixelated_image = share_data.get("pixelated_image")

        # Step 2: Generate deep analysis via multiple models in parallel
        multi_results = await generate_multi_model_analysis(fortunes)

        # Step 3: Build and send email
        if multi_results:
            html = build_email_html(
                name=name,
                pixelated_image=pixelated_image,
                multi_model_results=multi_results,
                email=email,
            )
        else:
            # Fallback: if all models failed, try single-model
            deep_analysis = await generate_deep_analysis(fortunes)
            html = build_email_html(deep_analysis, name, pixelated_image, email=email)
        email_id = await asyncio.to_thread(send_resend_email, email, html)

        # Step 4: Update storage with subscription info
        if storage.is_available() and email_id:
            update_data = {"subscribed_email": email}
            server_ts = storage.server_timestamp()
            if server_ts is not None:
                update_data["email_sent_at"] = server_ts
            if name:
                update_data["subscribed_name"] = name
            await asyncio.to_thread(storage.update_share, share_id, update_data)

        config.logger.info(f"Subscribe pipeline complete for {email} (share={share_id})")

    except Exception as e:
        config.logger.error(f"Subscribe pipeline failed for {email}: {e}")
