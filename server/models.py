"""
Pydantic request/response models.
"""

from pydantic import BaseModel


class FortuneRequest(BaseModel):
    """Request body for /api/fortune — image and measurements are optional."""

    image: str | None = None
    measurements: str | None = None


class PixelateRequest(BaseModel):
    """Request body for /api/pixelate."""

    image: str


class ShareRequest(BaseModel):
    """Request body for /api/share."""

    pixelated_image: str | None = None
    fortunes: dict | None = None
    fortune: dict | None = None  # legacy single-model format


class SubscribeRequest(BaseModel):
    """Request body for /api/subscribe."""

    email: str
    name: str = ""
    share_id: str


class AnalysisRequest(BaseModel):
    """Request body for /api/analysis/l2."""

    share_id: str
