"""Live integration test for Postgres-backed share storage.

This test is skipped by default and runs only when:
1) RUN_INTEGRATION_TESTS=1
2) test has @pytest.mark.integration_live (already set)
3) SHARE_DATABASE_URL is configured in .env / environment
"""

import os
import uuid

import pytest
from dotenv import load_dotenv
import psycopg

from server.storage import PostgresShareStorage


@pytest.mark.integration_live
def test_postgres_storage_live_crud_roundtrip():
    load_dotenv(".env")
    database_url = os.getenv("SHARE_DATABASE_URL", "").strip()
    if not database_url:
        pytest.skip("SHARE_DATABASE_URL is not configured")

    storage = PostgresShareStorage(database_url)
    share_id = f"it_{uuid.uuid4().hex[:16]}"

    initial_payload = {
        "pixelated_image": "data:image/png;base64,it",
        "visualization_data": {
            "landmarks": [{"x": 0.11, "y": 0.22}],
            "measurements": {"three_parts": [0.33, 0.34, 0.33]},
        },
        "fortunes": {
            "grok": {"face": "a", "career": "b", "blessing": "c"},
            "gemini": None,
        },
    }

    storage.create_share(share_id, initial_payload)

    try:
        created = storage.get_share(share_id)
        assert created is not None
        assert created["fortunes"]["grok"]["career"] == "b"
        assert created["visualization_data"]["landmarks"][0]["x"] == 0.11

        storage.update_share(
            share_id,
            {
                "analysis_l2": "integration-ok",
                "subscribed_email": "integration@example.com",
            },
        )

        updated = storage.get_share(share_id)
        assert updated is not None
        assert updated["analysis_l2"] == "integration-ok"
        assert updated["subscribed_email"] == "integration@example.com"
        assert updated["fortunes"]["grok"]["face"] == "a"

        with pytest.raises(KeyError):
            storage.update_share(f"missing_{share_id}", {"x": 1})
    finally:
        with psycopg.connect(storage._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM shares WHERE share_id = %s", (share_id,))
            conn.commit()
