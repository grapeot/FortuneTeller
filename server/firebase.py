"""
Firebase / Firestore initialization.
"""

import json
import os

_firestore_db = None
_firestore_mod = None


def init_firestore():
    global _firestore_db, _firestore_mod
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore as _fs

        _firestore_mod = _fs

        cred_json = os.getenv("FIREBASE_CREDENTIALS")
        cred_path = os.getenv(
            "FIREBASE_CREDENTIALS_PATH", "config/firebase-credentials.json"
        )

        if cred_json:
            cred_obj = credentials.Certificate(json.loads(cred_json))
        elif os.path.exists(cred_path):
            cred_obj = credentials.Certificate(cred_path)
        else:
            print("⚠ No Firebase credentials found, share feature disabled")
            return

        firebase_admin.initialize_app(cred_obj)
        _firestore_db = _fs.client()
        print("✓ Firestore initialized")
    except ImportError:
        print("⚠ firebase-admin not installed, share feature disabled")
    except Exception as e:
        print(f"⚠ Firebase init error: {e}")


def get_db():
    return _firestore_db


def get_mod():
    return _firestore_mod
