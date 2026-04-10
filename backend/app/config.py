"""
Configuration & environment variable management.
Initializes Firebase Admin SDK and Gemini API.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env from backend root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Gemini
    gemini_api_key: str = "placeholder-key"

    # Firebase
    firebase_credentials_path: str = "./firebase-service-account.json"
    firebase_project_id: str = "invisible-fraud-detector"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()


# ──────────────────────────────────────────────
# Firebase Admin SDK Initialization
# ──────────────────────────────────────────────
_firebase_app = None


def init_firebase():
    """Initialize Firebase Admin SDK (idempotent)."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    try:
        import firebase_admin
        from firebase_admin import credentials

        cred_path = Path(settings.firebase_credentials_path)
        if cred_path.exists():
            cred = credentials.Certificate(str(cred_path))
            _firebase_app = firebase_admin.initialize_app(cred, {
                "projectId": settings.firebase_project_id,
            })
            print(f"[OK] Firebase initialized with credentials from {cred_path}")
        else:
            # Fallback: initialize without credentials (emulator / default)
            _firebase_app = firebase_admin.initialize_app(options={
                "projectId": settings.firebase_project_id,
            })
            print("[WARN] Firebase initialized WITHOUT credentials (mock mode)")

        return _firebase_app

    except Exception as e:
        print(f"[WARN] Firebase initialization failed: {e}")
        print("   Running in OFFLINE mode — Firebase features disabled.")
        return None


def get_firebase_app():
    """Get the initialized Firebase app."""
    return _firebase_app
