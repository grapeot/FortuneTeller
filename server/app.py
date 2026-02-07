"""
FastAPI application instance.
Separated from routes to avoid circular imports.
"""

from fastapi import FastAPI

app = FastAPI(title="AI Fortune Teller Backend")
