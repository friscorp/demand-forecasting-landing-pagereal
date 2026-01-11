import firebase_admin
from firebase_admin import auth, credentials
from app.config import get_settings

_app = None

def init_firebase():
    global _app
    if _app:
        return _app
    settings = get_settings()
    cred = credentials.Certificate(settings.firebase_service_account_path)
    _app = firebase_admin.initialize_app(cred)
    return _app

def verify_firebase_token(id_token: str) -> dict:
    init_firebase()
    decoded = auth.verify_id_token(id_token)
    return decoded  # contains uid, email, etc.
