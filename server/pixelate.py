"""
Image pixelation: downscale + nearest-neighbor upscale for pixel art look.
"""

import base64
import io

from . import config


def pixelate_image(img_bytes: bytes) -> str:
    """Sync helper: downscale + nearest-neighbor upscale. Returns base64 PNG string."""
    from PIL import Image

    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    small = img.resize((config.PIXEL_SIZE, config.PIXEL_SIZE), Image.LANCZOS)
    pixelated = small.resize((config.PIXEL_DISPLAY, config.PIXEL_DISPLAY), Image.NEAREST)

    buf = io.BytesIO()
    pixelated.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()
