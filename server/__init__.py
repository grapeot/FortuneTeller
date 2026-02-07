"""
Server package: initializes Firebase and exports the FastAPI app with all routes.
"""

from .firebase import init_firestore
from .app import app

# Initialize Firestore at startup
init_firestore()

# Import routes to register them on the app
from . import routes  # noqa: E402, F401

__all__ = ["app"]
