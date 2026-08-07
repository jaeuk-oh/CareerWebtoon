from supabase import create_client, Client
from app.core.config import get_settings

def get_supabase_client() -> Client:
    settings = get_settings()
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY
    )
