import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pathlib import Path


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "treechat"

    # CORS - allow all origins for Replit proxy
    CORS_ORIGINS: List[str] = ["*"]

    # API Keys
    OPENAI_API_KEY: str = ""
    NVIDIA_API_KEY: str = ""

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
