#!/usr/bin/env python3
"""
Standalone test script: Circle invite (skip email) + add to spaces + Resend email.

Usage:
    python scripts/test_circle_flow.py user@example.com

Reads RESEND_API_KEY, CIRCLE_V2_TOKEN, CIRCLE_SPACE_IDS from .env (via dotenv).
"""

import os
import sys
import json
import requests
import resend
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

CIRCLE_V2_TOKEN = os.getenv("CIRCLE_V2_TOKEN", "")
CIRCLE_SPACE_IDS = [int(s.strip()) for s in os.getenv("CIRCLE_SPACE_IDS", "").split(",") if s.strip()]
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
COMMUNITY_URL = "https://www.superlinear.academy"

resend.api_key = RESEND_API_KEY


def step1_create_member(email: str) -> dict:
    """Create a Circle community member with skip_invitation=True."""
    print(f"\n── Step 1: Create Circle member (skip invitation) ──")
    url = "https://app.circle.so/api/admin/v2/community_members"
    headers = {
        "Authorization": f"Token {CIRCLE_V2_TOKEN}",
        "Content-Type": "application/json",
    }
    data = {
        "email": email,
        "skip_invitation": True,
        "space_ids": CIRCLE_SPACE_IDS,
        "email_notifications_enabled": True,
    }
    resp = requests.post(url, headers=headers, json=data, timeout=30)
    print(f"   Status: {resp.status_code}")

    if resp.status_code in (200, 201):
        result = resp.json()
        # 201 with "already a member" message means existing member
        msg = result.get("message", "")
        if "already a member" in msg.lower():
            member_data = result.get("community_member", {})
            print(f"   ⚠ Already a member: name={member_data.get('first_name', '')} {member_data.get('last_name', '')}")
            return {"success": True, "status": resp.status_code, "already_existed": True, "data": result}
        print(f"   ✓ Member created: id={result.get('id')}, name={result.get('name')}")
        return {"success": True, "status": resp.status_code, "already_existed": False, "data": result}
    elif resp.status_code == 422:
        # Already exists
        print(f"   ⚠ 422 — member likely already exists")
        print(f"   Response: {resp.text[:300]}")
        return {"success": False, "status": 422, "data": resp.json() if resp.text else {}}
    else:
        print(f"   ✗ Unexpected: {resp.text[:300]}")
        return {"success": False, "status": resp.status_code, "data": {}}


def step2_add_to_spaces(email: str) -> list:
    """Add an existing member to each space in CIRCLE_SPACE_IDS."""
    print(f"\n── Step 2: Add member to spaces ──")
    url = "https://app.circle.so/api/admin/v2/space_members"
    headers = {
        "Authorization": f"Token {CIRCLE_V2_TOKEN}",
        "Content-Type": "application/json",
    }
    results = []
    for space_id in CIRCLE_SPACE_IDS:
        data = {"email": email, "space_id": space_id}
        resp = requests.post(url, headers=headers, json=data, timeout=30)
        status = "✓" if resp.status_code in (200, 422) else "✗"
        print(f"   {status} Space {space_id}: {resp.status_code}")
        results.append({"space_id": space_id, "status": resp.status_code})
    return results


def step3_fetch_invitation_link() -> str:
    """Try to get an active invitation link from Circle."""
    print(f"\n── Step 3: Fetch invitation link ──")
    url = "https://app.circle.so/api/admin/v2/invitation_links?status=active&per_page=1"
    headers = {"Authorization": f"Token {CIRCLE_V2_TOKEN}"}
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            records = data.get("records", [])
            if records:
                link_id = records[0].get("id")
                # Circle invitation links follow the pattern: https://community-url/join?invitation_token=<name>
                link_name = records[0].get("name", "")
                print(f"   ✓ Found invitation link: id={link_id}, name={link_name}")
                return f"{COMMUNITY_URL}/join?invitation_token={link_name}"
        print(f"   ⚠ No active invitation links found, using community URL")
    except Exception as e:
        print(f"   ⚠ Failed to fetch invitation links: {e}")
    return COMMUNITY_URL


def step4_send_email(email: str, invitation_link: str):
    """Send a test HTML email via Resend."""
    print(f"\n── Step 4: Send test email via Resend ──")

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#0f0f23; font-family:'Noto Serif SC','Songti SC',Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f23; padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#1a0a0a,#0f0f23); border:1px solid rgba(250,204,21,0.15); border-radius:16px; overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:40px 30px 20px; text-align:center;">
          <h1 style="font-size:28px; color:#facc15; margin:0 0 8px; letter-spacing:4px;">
            相面先生
          </h1>
          <p style="font-size:14px; color:rgba(250,204,21,0.5); margin:0;">
            Superlinear Academy · 马年大吉
          </p>
          <hr style="border:none; height:1px; background:linear-gradient(90deg,transparent,rgba(250,204,21,0.4),transparent); margin:20px 0;">
        </td></tr>

        <!-- Test Content -->
        <tr><td style="padding:0 30px 30px;">
          <h2 style="font-size:20px; color:#facc15; margin:0 0 16px;">您的AI面相深度分析</h2>
          <p style="font-size:15px; color:rgba(255,255,255,0.85); line-height:1.8; margin:0 0 20px;">
            这是一封测试邮件，用于验证 Circle + Resend 的完整流程。<br><br>
            在正式版本中，此处将包含由 Gemini 生成的详细面相分析报告，包括五官分析、三停比例、十二宫位解读、事业运势建议和新春祝语。
          </p>
          <hr style="border:none; height:1px; background:rgba(250,204,21,0.15); margin:20px 0;">

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:10px 0 20px;">
              <a href="{invitation_link}" style="display:inline-block; padding:14px 32px; background:linear-gradient(90deg,#b91c1c,#dc2626); color:#fff; font-size:16px; font-weight:bold; text-decoration:none; border-radius:12px; letter-spacing:2px;">
                加入 AI Builder 社区
              </a>
            </td></tr>
          </table>

          <p style="font-size:12px; color:rgba(255,255,255,0.4); text-align:center; margin:0;">
            此邮件由 Superlinear Academy 发送。社区动态邮件可随时在设置中退订。
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    try:
        result = resend.Emails.send({
            "from": "Superlinear Academy <no-reply@ai-builders.com>",
            "to": [email],
            "subject": "【测试】您的AI面相深度分析 - Superlinear Academy",
            "html": html,
        })
        print(f"   ✓ Email sent: {result}")
        return result
    except Exception as e:
        print(f"   ✗ Email failed: {e}")
        return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_circle_flow.py <email>")
        sys.exit(1)

    email = sys.argv[1]
    print(f"Testing full flow for: {email}")
    print(f"Circle spaces: {CIRCLE_SPACE_IDS}")
    print(f"Resend key configured: {'yes' if RESEND_API_KEY else 'NO'}")
    print(f"Circle token configured: {'yes' if CIRCLE_V2_TOKEN else 'NO'}")

    if not CIRCLE_V2_TOKEN or not RESEND_API_KEY:
        print("\n✗ Missing env vars. Check .env file.")
        sys.exit(1)

    # Step 1: Create member
    member_result = step1_create_member(email)

    # Step 2: If member already existed, explicitly add to spaces
    if member_result["status"] == 422 or member_result.get("already_existed"):
        step2_add_to_spaces(email)
    else:
        print("   (Spaces were included in creation request, skipping step 2)")

    # Step 3: Get invitation link
    invitation_link = step3_fetch_invitation_link()

    # Step 4: Send email
    step4_send_email(email, invitation_link)

    print(f"\n── Done ──")
    print(f"   Invitation link: {invitation_link}")
    print(f"   Check {email} for the test email.")


if __name__ == "__main__":
    main()
