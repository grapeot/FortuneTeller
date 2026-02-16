"""Share storage abstraction and Firebase-backed implementation."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from .firebase import get_db, get_mod, firestore_retry


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


_share_storage: ShareStorage = FirebaseShareStorage()


def get_share_storage() -> ShareStorage:
    return _share_storage


def set_share_storage_for_testing(storage: ShareStorage) -> None:
    global _share_storage
    _share_storage = storage
