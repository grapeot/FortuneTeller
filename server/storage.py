"""Share storage abstraction with Firebase and PostgreSQL implementations."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
import importlib
import json
import os
from typing import Any, Dict, Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from .firebase import get_db, get_mod, firestore_retry


def _load_psycopg_module():
    try:
        return importlib.import_module("psycopg")
    except Exception as exc:
        raise RuntimeError("psycopg is required for PostgreSQL share storage") from exc


class ShareStorage(ABC):
    @abstractmethod
    def is_available(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def create_share(self, share_id: str, data: Dict[str, Any]) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_share(self, share_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def update_share(self, share_id: str, updates: Dict[str, Any]) -> None:
        raise NotImplementedError

    @abstractmethod
    def server_timestamp(self) -> Any:
        raise NotImplementedError


class FirebaseShareStorage(ShareStorage):
    """ShareStorage implementation backed by Firestore."""

    def is_available(self) -> bool:
        return get_db() is not None

    def create_share(self, share_id: str, data: Dict[str, Any]) -> None:
        db = get_db()
        if not db:
            raise RuntimeError("Firestore not configured")
        firestore_retry(db.collection("fortunes").document(share_id).set, data)

    def get_share(self, share_id: str) -> Optional[Dict[str, Any]]:
        db = get_db()
        if not db:
            return None
        doc = firestore_retry(db.collection("fortunes").document(share_id).get)
        if not doc.exists:
            return None
        return doc.to_dict() or {}

    def update_share(self, share_id: str, updates: Dict[str, Any]) -> None:
        db = get_db()
        if not db:
            raise RuntimeError("Firestore not configured")
        firestore_retry(db.collection("fortunes").document(share_id).update, updates)

    def server_timestamp(self) -> Any:
        mod = get_mod()
        if not mod:
            return None
        return mod.SERVER_TIMESTAMP


def _json_default(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value)!r} is not JSON serializable")


class PostgresShareStorage(ShareStorage):
    """ShareStorage implementation backed by PostgreSQL."""

    def __init__(self, database_url: str, table_name: str = "shares"):
        if not database_url:
            raise RuntimeError("SHARE_DATABASE_URL not configured")

        self._psycopg = _load_psycopg_module()
        self._database_url = self._normalize_database_url(database_url)
        self._table_name = table_name
        self._ensure_table()

    @staticmethod
    def _normalize_database_url(database_url: str) -> str:
        parts = urlsplit(database_url)
        query = dict(parse_qsl(parts.query, keep_blank_values=True))

        if "sslmode" not in query:
            query["sslmode"] = "require"

        host = (parts.hostname or "").lower()
        endpoint_id = host.split(".")[0] if host.startswith("ep-") else ""
        options_value = query.get("options", "")
        if endpoint_id and "endpoint=" not in options_value:
            query["options"] = f"endpoint={endpoint_id}"

        normalized_query = urlencode(query, doseq=True)
        return urlunsplit((parts.scheme, parts.netloc, parts.path, normalized_query, parts.fragment))

    def _connect(self):
        return self._psycopg.connect(self._database_url)

    def _ensure_table(self) -> None:
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"""
                        CREATE TABLE IF NOT EXISTS {self._table_name} (
                            share_id TEXT PRIMARY KEY,
                            data JSONB NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )
                conn.commit()
        except Exception as exc:
            # Support least-privileged DB roles that can read/write existing tables
            # but cannot CREATE in schema public.
            if "permission denied for schema" not in str(exc).lower():
                raise
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT to_regclass(%s)", (self._table_name,))
                    row = cur.fetchone()
                    if not row or row[0] is None:
                        raise

    def is_available(self) -> bool:
        return True

    def create_share(self, share_id: str, data: Dict[str, Any]) -> None:
        payload = json.dumps(data, ensure_ascii=False, default=_json_default)
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {self._table_name} (share_id, data) VALUES (%s, %s::jsonb)",
                    (share_id, payload),
                )
            conn.commit()

    def get_share(self, share_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT data::text FROM {self._table_name} WHERE share_id = %s",
                    (share_id,),
                )
                row = cur.fetchone()
        if not row:
            return None
        return json.loads(row[0])

    def update_share(self, share_id: str, updates: Dict[str, Any]) -> None:
        payload = json.dumps(updates, ensure_ascii=False, default=_json_default)
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    UPDATE {self._table_name}
                    SET data = COALESCE(data, '{{}}'::jsonb) || %s::jsonb,
                        updated_at = NOW()
                    WHERE share_id = %s
                    """,
                    (payload, share_id),
                )
                if cur.rowcount == 0:
                    raise KeyError(share_id)
            conn.commit()

    def server_timestamp(self) -> Any:
        return datetime.now(timezone.utc).isoformat()


def _build_share_storage_from_env() -> ShareStorage:
    backend = os.getenv("SHARE_STORAGE_BACKEND", "auto").strip().lower()
    database_url = os.getenv("SHARE_DATABASE_URL", "").strip()

    if backend == "postgres":
        return PostgresShareStorage(database_url)

    if backend in ("auto", "") and database_url:
        try:
            return PostgresShareStorage(database_url)
        except Exception:
            return FirebaseShareStorage()

    if backend in ("firebase", "auto", ""):
        return FirebaseShareStorage()

    raise ValueError(
        "Unsupported SHARE_STORAGE_BACKEND. Use one of: auto, firebase, postgres"
    )


_share_storage: Optional[ShareStorage] = None


def get_share_storage() -> ShareStorage:
    global _share_storage
    if _share_storage is None:
        _share_storage = _build_share_storage_from_env()
    return _share_storage


def set_share_storage_for_testing(storage: ShareStorage) -> None:
    global _share_storage
    _share_storage = storage


def reset_share_storage_from_env() -> None:
    global _share_storage
    _share_storage = _build_share_storage_from_env()
