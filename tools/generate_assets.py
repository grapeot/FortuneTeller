#!/usr/bin/env python3
"""
Generate visual assets for the AI Fortune Teller app using Gemini image generation.
Generates test face images (for MediaPipe testing) and decorative assets.
"""

import os
import sys
import mimetypes
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from google import genai
from google.genai import types


def get_client():
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY or GOOGLE_API_KEY not set", file=sys.stderr)
        sys.exit(1)
    return genai.Client(api_key=api_key)


def generate_image(client, prompt, output_path, aspect_ratio="1:1"):
    """Generate a single image with Gemini."""
    print(f"  Generating: {output_path.name} ...")

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        )
    ]

    config = types.GenerateContentConfig(
        response_modalities=["IMAGE", "TEXT"],
        image_config=types.ImageConfig(aspect_ratio=aspect_ratio),
    )

    try:
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
                    final_path = output_path.with_suffix(ext)
                    final_path.write_bytes(part.inline_data.data)
                    print(f"  ✓ Saved: {final_path} ({len(part.inline_data.data)} bytes)")
                    return str(final_path)
    except Exception as e:
        print(f"  ✗ Failed: {output_path.name} - {e}", file=sys.stderr)
        return None


def main():
    project_root = Path(__file__).parent.parent
    test_assets_dir = project_root / "test-assets"
    public_assets_dir = project_root / "public" / "assets"

    test_assets_dir.mkdir(parents=True, exist_ok=True)
    public_assets_dir.mkdir(parents=True, exist_ok=True)

    client = get_client()

    # Define all assets to generate
    jobs = [
        # Test face images (for MediaPipe face detection testing)
        {
            "prompt": "A photorealistic portrait photo of a young East Asian man in his late 20s, facing directly at the camera, neutral expression, well-lit even studio lighting, clean white background, sharp focus on face, professional headshot style. The face should be clearly visible with no obstructions.",
            "output": test_assets_dir / "test-face-1",
            "aspect_ratio": "1:1",
        },
        {
            "prompt": "A photorealistic portrait photo of a young East Asian woman in her early 30s, facing the camera, gentle smile, professional studio lighting, plain light gray background, sharp focus, professional headshot. Clear unobstructed view of the full face.",
            "output": test_assets_dir / "test-face-2",
            "aspect_ratio": "1:1",
        },
        {
            "prompt": "A photorealistic portrait photo of a middle-aged East Asian man around 40 years old wearing thin-rimmed glasses, facing the camera, confident expression, professional studio lighting, plain background, sharp focus on face. Clear front-facing headshot.",
            "output": test_assets_dir / "test-face-3",
            "aspect_ratio": "1:1",
        },
        # App decorative assets
        {
            "prompt": "A dark, elegant background image for a Chinese New Year themed web app. Deep navy blue to black gradient with subtle red and gold decorative elements: small floating lanterns, wispy golden clouds, and faint horse silhouettes (Year of the Horse 2026). The design should be minimal and not too busy, suitable as a background overlay. Digital art style.",
            "output": public_assets_dir / "bg-cny",
            "aspect_ratio": "16:9",
        },
        {
            "prompt": "A mystical AI fortune teller character icon. A friendly-looking robotic figure dressed in traditional Chinese fortune teller robes (red and gold), holding a glowing crystal ball. Cartoon/chibi style, dark background, warm lighting. Suitable as an app mascot. The character should look approachable and fun.",
            "output": public_assets_dir / "fortune-teller",
            "aspect_ratio": "1:1",
        },
        {
            "prompt": "A decorative Chinese red paper lantern, glowing warmly, isolated on a transparent-like dark background. Digital art, clean lines, suitable for web overlay decoration. High quality illustration style.",
            "output": public_assets_dir / "lantern",
            "aspect_ratio": "1:1",
        },
        {
            "prompt": "Golden Chinese auspicious clouds (祥云) pattern, elegant and flowing, on a dark transparent-like background. Traditional Chinese decorative style, suitable as a web app decorative element. Gold metallic color, clean illustration.",
            "output": public_assets_dir / "clouds",
            "aspect_ratio": "16:9",
        },
        {
            "prompt": "A stylized galloping horse silhouette in gold metallic color, Chinese artistic style, dynamic pose suggesting speed and success (马到成功). Dark background. Clean vector-like illustration suitable for web use.",
            "output": public_assets_dir / "horse",
            "aspect_ratio": "1:1",
        },
    ]

    print(f"Generating {len(jobs)} assets with Gemini...")
    print()

    # Generate in parallel (max 4 concurrent to avoid rate limits)
    results = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(
                generate_image,
                client,
                job["prompt"],
                job["output"],
                job["aspect_ratio"],
            ): job["output"].name
            for job in jobs
        }

        for future in as_completed(futures):
            name = futures[future]
            result = future.result()
            results[name] = result

    print()
    print("=== Summary ===")
    success = sum(1 for v in results.values() if v)
    print(f"Generated: {success}/{len(jobs)} assets")
    if success < len(jobs):
        failed = [k for k, v in results.items() if not v]
        print(f"Failed: {', '.join(failed)}")


if __name__ == "__main__":
    main()
