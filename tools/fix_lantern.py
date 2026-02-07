#!/usr/bin/env python3
"""
Regenerate the lantern image with a pure white background,
then remove the white background to create a transparent PNG.
"""

import os
import sys
import mimetypes
from pathlib import Path

from google import genai
from google.genai import types


def get_client():
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY or GOOGLE_API_KEY not set", file=sys.stderr)
        sys.exit(1)
    return genai.Client(api_key=api_key)


def generate_lantern(client, output_path):
    """Generate a lantern on pure white background."""
    print("Step 1: Generating lantern with white background...")

    prompt = (
        "A single traditional Chinese red paper lantern, glowing warmly with golden "
        "tassels at the bottom. Painted in a clean digital illustration style. "
        "The lantern is centered on a PURE WHITE (#FFFFFF) background with NO patterns, "
        "NO grid, NO texture — just solid flat white. The lantern should be the only "
        "element in the image."
    )

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        )
    ]

    config = types.GenerateContentConfig(
        response_modalities=["IMAGE", "TEXT"],
        image_config=types.ImageConfig(aspect_ratio="1:1"),
    )

    for chunk in client.models.generate_content_stream(
        model="gemini-3-pro-image-preview",
        contents=contents,
        config=config,
    ):
        if not chunk.candidates or not chunk.candidates[0].content:
            continue
        for part in chunk.candidates[0].content.parts:
            if getattr(part, "inline_data", None) and part.inline_data.data:
                ext = mimetypes.guess_extension(part.inline_data.mime_type) or ".png"
                temp_path = output_path.with_suffix(ext)
                temp_path.write_bytes(part.inline_data.data)
                print(f"  ✓ Generated: {temp_path} ({len(part.inline_data.data)} bytes)")
                return str(temp_path)

    raise RuntimeError("Failed to generate lantern image")


def remove_white_background(input_path, output_path, threshold=230):
    """Remove white background by converting white pixels to transparent."""
    try:
        from PIL import Image
    except ImportError:
        print("Installing Pillow...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow", "-q"])
        from PIL import Image

    print(f"Step 2: Removing white background (threshold={threshold})...")

    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()

    new_data = []
    transparent_count = 0
    for r, g, b, a in data:
        if r > threshold and g > threshold and b > threshold:
            # White-ish pixel → transparent
            new_data.append((255, 255, 255, 0))
            transparent_count += 1
        else:
            # Keep the pixel, but apply soft edge blending for near-white pixels
            # This creates smoother edges
            brightness = (r + g + b) / 3
            if brightness > threshold - 30:
                # Partial transparency for edge pixels
                alpha = int(255 * (1 - (brightness - (threshold - 30)) / 30))
                alpha = max(0, min(255, alpha))
                new_data.append((r, g, b, alpha))
            else:
                new_data.append((r, g, b, 255))

    img.putdata(new_data)
    img.save(output_path, "PNG")

    total = len(data)
    pct = transparent_count / total * 100
    print(f"  ✓ Saved: {output_path}")
    print(f"  ✓ Made {transparent_count}/{total} pixels transparent ({pct:.1f}%)")


def main():
    project_root = Path(__file__).parent.parent
    assets_dir = project_root / "public" / "assets"

    client = get_client()

    # Generate new lantern with white background
    temp_path = generate_lantern(client, assets_dir / "lantern-raw")

    # Remove white background
    output_path = assets_dir / "lantern.png"
    remove_white_background(temp_path, output_path)

    # Clean up temp file
    Path(temp_path).unlink(missing_ok=True)

    # Remove old JPG
    old_jpg = assets_dir / "lantern.jpg"
    if old_jpg.exists():
        old_jpg.unlink()
        print(f"  ✓ Removed old: {old_jpg}")

    print("\nDone! Lantern PNG with transparent background saved.")


if __name__ == "__main__":
    main()
