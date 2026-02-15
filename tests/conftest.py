"""
Shared fixtures for Python tests.
We import the server package and patch server.config for safe defaults.
"""

import pytest
import os
from unittest.mock import MagicMock
from httpx import AsyncClient, ASGITransport

from server import app
from server import config
from server import firebase


def _is_live_integration_enabled(request) -> bool:
    return bool(
        request.node.get_closest_marker("integration_live")
        and os.getenv("RUN_INTEGRATION_TESTS") == "1"
    )


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "integration_live: run live e2e integration test (requires RUN_INTEGRATION_TESTS=1)",
    )


def pytest_collection_modifyitems(config, items):
    if os.getenv("RUN_INTEGRATION_TESTS") == "1":
        return
    skip_marker = pytest.mark.skip(
        reason="integration_live skipped by default; set RUN_INTEGRATION_TESTS=1 to run",
    )
    for item in items:
        if item.get_closest_marker("integration_live"):
            item.add_marker(skip_marker)


@pytest.fixture(autouse=True)
def _patch_env(monkeypatch, request):
    """Ensure safe defaults for all tests — no real external calls."""
    if _is_live_integration_enabled(request):
        return

    monkeypatch.setattr(config, "AI_TOKEN", "test-token")
    monkeypatch.setattr(config, "AI_API_BASE", "https://test.api.com/v1")
    monkeypatch.setattr(config, "RESEND_API_KEY", "test-resend-key")
    monkeypatch.setattr(config, "CIRCLE_V2_TOKEN", "test-circle-token")
    monkeypatch.setattr(config, "CIRCLE_SPACE_IDS", [111, 222])
    # Firestore disabled by default; individual tests opt in
    monkeypatch.setattr(firebase, "_firestore_db", None)
    monkeypatch.setattr(firebase, "_firestore_mod", None)


@pytest.fixture
def client():
    """httpx AsyncClient wired to the FastAPI app (no network)."""
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture
def mock_firestore(monkeypatch):
    """Provide a fake Firestore DB and module for tests that need it."""
    mock_db = MagicMock()
    mock_mod = MagicMock()
    mock_mod.SERVER_TIMESTAMP = "MOCK_TIMESTAMP"
    monkeypatch.setattr(firebase, "_firestore_db", mock_db)
    monkeypatch.setattr(firebase, "_firestore_mod", mock_mod)
    return mock_db
