"""
Image pixelation: downscale to small pixel art.
The frontend displays it at a larger size via CSS image-rendering: pixelated.
"""

import base64
import io

from . import config


def pixelate_image(img_bytes: bytes) -> str:
    """Sync helper: downscale to PIXEL_SIZE. Returns base64 PNG string (~3-5 KB)."""
    from PIL import Image

    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    small = img.resize((config.PIXEL_SIZE, config.PIXEL_SIZE), Image.LANCZOS)

    buf = io.BytesIO()
    small.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()
