from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # NVIDIA API Catalog
    NVIDIA_API_KEY: str
    NVIDIA_API_BASE_URL: str

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    DATABASE_URL: str

    # App
    DEBUG: bool = False
    ALLOWED_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Toss Payments billing
    TOSS_SECRET_KEY: str = ""
    TOSS_CLIENT_KEY: str = ""

    # Exa Search API (web research for JD/company interview insights)
    EXA_API_KEY: str = ""

    # Comma-separated emails exempt from the free monthly usage quota (owner/dev testing)
    ADMIN_EMAILS: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

@lru_cache
def get_settings() -> Settings:
    return Settings()
