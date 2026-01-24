from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "treechat"
    
    # CORS - allow all origins for Replit proxy
    CORS_ORIGINS: List[str] = ["*"]
    
    # API Keys (for future AI integration)
    OPENAI_API_KEY: str = ""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 5000
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
