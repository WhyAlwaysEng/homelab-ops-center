"""
Alert Service for Homelab & Network Ops Center
Supports Discord Webhooks and Telegram Bot notifications
"""

import httpx
from typing import Optional
from app.config import settings
from app.services.firebase_service import FirebaseService
import logging

logger = logging.getLogger(__name__)

# Reusable HTTP client
_http_client = httpx.AsyncClient(timeout=10.0)


class AlertService:
    """Service for sending alerts via multiple channels"""
    
    @staticmethod
    async def send_alert(title: str, message: str, color: int = 0x3498db):
        """
        Send alert to all configured channels
        
        Args:
            title: Alert title
            message: Alert message
            color: Hex color for Discord embed (default: blue)
        """
        await AlertService.send_discord_alert(title, message, color)
        await AlertService.send_telegram_alert(title, message)
        await FirebaseService.push_alert({
            'type': 'alert',
            'title': title,
            'message': message,
            'color': color
        })
    
    @staticmethod
    async def send_discord_alert(title: str, message: str, color: int = 0x3498db):
        """Send alert via Discord webhook with Rich Embed"""
        if not settings.DISCORD_WEBHOOK_URL:
            return
        
        try:
            embed = {
                "title": title,
                "description": message,
                "color": color,
                "timestamp": __import__('datetime').datetime.utcnow().isoformat(),
                "footer": {
                    "text": "Homelab Ops Center"
                }
            }
            
            payload = {
                "embeds": [embed]
            }
            
            response = await _http_client.post(
                settings.DISCORD_WEBHOOK_URL,
                json=payload
            )
            response.raise_for_status()
            logger.info(f"Discord alert sent: {title}")
            
        except Exception as e:
            logger.error(f"Failed to send Discord alert: {e}")
    
    @staticmethod
    async def send_telegram_alert(title: str, message: str):
        """Send alert via Telegram bot with Markdown formatting"""
        if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
            return
        
        try:
            text = f"*{title}*\n\n{message}"
            
            payload = {
                "chat_id": settings.TELEGRAM_CHAT_ID,
                "text": text,
                "parse_mode": "MarkdownV2"
            }
            
            url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
            response = await _http_client.post(url, json=payload)
            response.raise_for_status()
            logger.info(f"Telegram alert sent: {title}")
            
        except Exception as e:
            logger.error(f"Failed to send Telegram alert: {e}")
    
    @staticmethod
    async def send_node_down_alert(node_name: str, host: str):
        """Send alert when a network node goes down"""
        await AlertService.send_alert(
            title="🔴 Node Down",
            message=f"**{node_name}** ({host}) is now **offline**",
            color=0xe74c3c  # Red
        )
    
    @staticmethod
    async def send_node_up_alert(node_name: str, host: str):
        """Send alert when a network node comes back up"""
        await AlertService.send_alert(
            title="🟢 Node Recovered",
            message=f"**{node_name}** ({host}) is now **online**",
            color=0x2ecc71  # Green
        )
    
    @staticmethod
    async def send_ddns_update_alert(record_name: str, old_ip: str, new_ip: str):
        """Send alert when DDNS record is updated"""
        await AlertService.send_alert(
            title="🌐 DDNS Updated",
            message=f"**{record_name}** updated from `{old_ip}` to `{new_ip}`",
            color=0x3498db  # Blue
        )
