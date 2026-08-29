"""
Configuration module for Homelab & Network Ops Center
Uses Pydantic Settings for environment variable management
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # App Environment
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    # Database
    DB_PATH: str = "/app/data/homelab.db"
    
    # Firebase Configuration
    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_SERVICE_ACCOUNT_KEY_PATH: Optional[str] = None
    FIREBASE_DATABASE_URL: Optional[str] = None
    
    # Cloudflare DDNS
    CF_API_TOKEN: Optional[str] = None
    CF_ZONE_ID: Optional[str] = None
    CF_RECORD_ID: Optional[str] = None
    CF_RECORD_NAME: Optional[str] = None
    
    # Alert Notifications
    DISCORD_WEBHOOK_URL: Optional[str] = None
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_ID: Optional[str] = None
    
    # Worker Intervals
    PING_INTERVAL: int = 30
    DDNS_CHECK_INTERVAL: int = 300
    LOG_RETENTION_DAYS: int = 3
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.APP_ENV == "production"
    
    @property
    def database_url(self) -> str:
        """Get SQLite database URL"""
        return f"file:{self.DB_PATH}?mode=rwc"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Create global settings instance
settings = Settings()
