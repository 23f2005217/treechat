import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URL: str = os.getenv("MONGODB_URL", os.getenv("DATABASE_URL", "mongodb://localhost:27017"))
    DATABASE_NAME: str = "treechat"
    
    # CORS - allow all origins for Replit proxy
    CORS_ORIGINS: List[str] = ["*"]
    
    # API Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 5000
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
