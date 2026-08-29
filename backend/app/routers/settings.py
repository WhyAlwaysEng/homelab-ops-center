"""
Settings Router for Homelab & Network Ops Center
Endpoints for managing application configuration
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])

# Settings file path
SETTINGS_DIR = Path(os.environ.get("DB_PATH", "/app/data")).parent
SETTINGS_FILE = SETTINGS_DIR / "settings.json"

# Default settings
DEFAULT_SETTINGS: Dict[str, Any] = {
    # Cloudflare DDNS
    "cloudflare": {
        "enabled": False,
        "api_token": "",
        "zone_id": "",
        "record_id": "",
        "record_name": "",
        "check_interval": 300,
    },
    # Discord Webhook
    "discord": {
        "enabled": False,
        "webhook_url": "",
    },
    # Telegram Bot
    "telegram": {
        "enabled": False,
        "bot_token": "",
        "chat_id": "",
    },
    # Firebase
    "firebase": {
        "enabled": False,
        "project_id": "",
        "database_url": "",
        "api_key": "",
        "auth_domain": "",
    },
    # Network Monitoring
    "monitoring": {
        "ping_interval": 30,
        "log_retention_days": 3,
        "auto_retry_failed_nodes": True,
    },
    # General
    "general": {
        "app_name": "Homelab Ops Center",
        "theme": "dark",
        "language": "en",
        "refresh_interval": 5,
    },
}


def load_settings() -> Dict[str, Any]:
    """Load settings from file, return defaults if not found"""
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, "r") as f:
                saved = json.load(f)
                # Merge with defaults (in case new settings were added)
                merged = DEFAULT_SETTINGS.copy()
                for key, value in saved.items():
                    if isinstance(value, dict) and key in merged:
                        merged[key].update(value)
                    else:
                        merged[key] = value
                return merged
    except Exception as e:
        logger.error(f"Failed to load settings: {e}")
    return DEFAULT_SETTINGS.copy()


def save_settings(settings: Dict[str, Any]) -> bool:
    """Save settings to file"""
    try:
        SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SETTINGS_FILE, "w") as f:
            json.dump(settings, f, indent=2)
        logger.info("Settings saved successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to save settings: {e}")
        return False


class CloudflareSettings(BaseModel):
    enabled: bool = False
    api_token: str = ""
    zone_id: str = ""
    record_id: str = ""
    record_name: str = ""
    check_interval: int = 300


class DiscordSettings(BaseModel):
    enabled: bool = False
    webhook_url: str = ""


class TelegramSettings(BaseModel):
    enabled: bool = False
    bot_token: str = ""
    chat_id: str = ""


class FirebaseSettings(BaseModel):
    enabled: bool = False
    project_id: str = ""
    database_url: str = ""
    api_key: str = ""
    auth_domain: str = ""


class MonitoringSettings(BaseModel):
    ping_interval: int = 30
    log_retention_days: int = 3
    auto_retry_failed_nodes: bool = True


class GeneralSettings(BaseModel):
    app_name: str = "Homelab Ops Center"
    theme: str = "dark"
    language: str = "en"
    refresh_interval: int = 5


class AllSettings(BaseModel):
    cloudflare: CloudflareSettings = CloudflareSettings()
    discord: DiscordSettings = DiscordSettings()
    telegram: TelegramSettings = TelegramSettings()
    firebase: FirebaseSettings = FirebaseSettings()
    monitoring: MonitoringSettings = MonitoringSettings()
    general: GeneralSettings = GeneralSettings()


@router.get("")
async def get_settings() -> Dict[str, Any]:
    """Get all current settings"""
    return load_settings()


@router.put("")
async def update_settings(settings: AllSettings) -> Dict[str, Any]:
    """Update all settings"""
    settings_dict = settings.model_dump()
    
    if save_settings(settings_dict):
        return {
            "success": True,
            "message": "Settings saved successfully",
            "settings": settings_dict,
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to save settings")


@router.put("/cloudflare")
async def update_cloudflare(settings: CloudflareSettings) -> Dict[str, Any]:
    """Update Cloudflare DDNS settings only"""
    all_settings = load_settings()
    all_settings["cloudflare"] = settings.model_dump()
    
    if save_settings(all_settings):
        return {"success": True, "message": "Cloudflare settings saved"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save settings")


@router.put("/discord")
async def update_discord(settings: DiscordSettings) -> Dict[str, Any]:
    """Update Discord settings only"""
    all_settings = load_settings()
    all_settings["discord"] = settings.model_dump()
    
    if save_settings(all_settings):
        return {"success": True, "message": "Discord settings saved"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save settings")


@router.put("/telegram")
async def update_telegram(settings: TelegramSettings) -> Dict[str, Any]:
    """Update Telegram settings only"""
    all_settings = load_settings()
    all_settings["telegram"] = settings.model_dump()
    
    if save_settings(all_settings):
        return {"success": True, "message": "Telegram settings saved"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save settings")


@router.put("/firebase")
async def update_firebase(settings: FirebaseSettings) -> Dict[str, Any]:
    """Update Firebase settings only"""
    all_settings = load_settings()
    all_settings["firebase"] = settings.model_dump()
    
    if save_settings(all_settings):
        return {"success": True, "message": "Firebase settings saved"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save settings")


@router.put("/monitoring")
async def update_monitoring(settings: MonitoringSettings) -> Dict[str, Any]:
    """Update monitoring settings only"""
    all_settings = load_settings()
    all_settings["monitoring"] = settings.model_dump()
    
    if save_settings(all_settings):
        return {"success": True, "message": "Monitoring settings saved"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save settings")


@router.post("/test-discord")
async def test_discord() -> Dict[str, Any]:
    """Send a test notification to Discord"""
    settings = load_settings()
    discord = settings.get("discord", {})
    
    if not discord.get("enabled") or not discord.get("webhook_url"):
        return {"success": False, "message": "Discord not configured"}
    
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                discord["webhook_url"],
                json={
                    "embeds": [{
                        "title": "✅ Test Notification",
                        "description": "Homelab Ops Center is connected!",
                        "color": 0x2ecc71,
                        "footer": {"text": "Test from Settings Page"}
                    }]
                }
            )
            response.raise_for_status()
            return {"success": True, "message": "Test notification sent!"}
    except Exception as e:
        return {"success": False, "message": f"Failed: {str(e)}"}


@router.post("/test-telegram")
async def test_telegram() -> Dict[str, Any]:
    """Send a test notification to Telegram"""
    settings = load_settings()
    telegram = settings.get("telegram", {})
    
    if not telegram.get("enabled") or not telegram.get("bot_token"):
        return {"success": False, "message": "Telegram not configured"}
    
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{telegram['bot_token']}/sendMessage",
                json={
                    "chat_id": telegram["chat_id"],
                    "text": "✅ *Test Notification*\n\nHomelab Ops Center is connected!",
                    "parse_mode": "Markdown"
                }
            )
            response.raise_for_status()
            return {"success": True, "message": "Test notification sent!"}
    except Exception as e:
        return {"success": False, "message": f"Failed: {str(e)}"}


@router.post("/test-cloudflare")
async def test_cloudflare() -> Dict[str, Any]:
    """Test Cloudflare API connection"""
    settings = load_settings()
    cf = settings.get("cloudflare", {})
    
    if not cf.get("enabled") or not cf.get("api_token"):
        return {"success": False, "message": "Cloudflare not configured"}
    
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"https://api.cloudflare.com/client/v4/zones/{cf['zone_id']}",
                headers={
                    "Authorization": f"Bearer {cf['api_token']}",
                    "Content-Type": "application/json"
                }
            )
            data = response.json()
            if data.get("success"):
                return {"success": True, "message": "Cloudflare connected!"}
            else:
                return {"success": False, "message": f"API Error: {data.get('errors')}"}
    except Exception as e:
        return {"success": False, "message": f"Failed: {str(e)}"}


@router.post("/reset")
async def reset_settings() -> Dict[str, Any]:
    """Reset all settings to defaults"""
    if save_settings(DEFAULT_SETTINGS):
        return {"success": True, "message": "Settings reset to defaults"}
    else:
        raise HTTPException(status_code=500, detail="Failed to reset settings")
