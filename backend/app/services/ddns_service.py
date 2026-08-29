"""
DDNS Service for Homelab & Network Ops Center
Cloudflare DNS updates with public IP detection
"""

import httpx
from typing import Optional, Dict, Any
from datetime import datetime
from app.config import settings
from app.database import get_db
from app.services.alert_service import AlertService
from app.services.firebase_service import FirebaseService
import logging

logger = logging.getLogger(__name__)

# Reusable HTTP client
_http_client = httpx.AsyncClient(timeout=10.0)

# Cache for current public IP
_current_public_ip: Optional[str] = None


class DDNSService:
    """Service for Cloudflare DDNS operations"""
    
    @staticmethod
    async def get_public_ip() -> Optional[str]:
        """
        Get current public IP address from ipify
        
        Returns:
            Public IP address string or None on failure
        """
        global _current_public_ip
        
        try:
            response = await _http_client.get("https://api.ipify.org?format=json")
            response.raise_for_status()
            ip = response.json()["ip"]
            logger.debug(f"Current public IP: {ip}")
            return ip
        except Exception as e:
            logger.error(f"Failed to get public IP: {e}")
            return _current_public_ip  # Return cached value on error
    
    @staticmethod
    async def get_cloudflare_dns_record() -> Optional[Dict[str, Any]]:
        """
        Get current DNS record from Cloudflare
        
        Returns:
            DNS record information or None on failure
        """
        if not all([settings.CF_API_TOKEN, settings.CF_ZONE_ID, settings.CF_RECORD_ID]):
            logger.warning("Cloudflare credentials not configured")
            return None
        
        try:
            headers = {
                "Authorization": f"Bearer {settings.CF_API_TOKEN}",
                "Content-Type": "application/json"
            }
            
            url = f"https://api.cloudflare.com/client/v4/zones/{settings.CF_ZONE_ID}/dns_records/{settings.CF_RECORD_ID}"
            
            response = await _http_client.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                return data.get("result")
            else:
                logger.error(f"Cloudflare API error: {data.get('errors')}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get Cloudflare DNS record: {e}")
            return None
    
    @staticmethod
    async def update_cloudflare_dns_record(new_ip: str) -> bool:
        """
        Update Cloudflare DNS A record with new IP
        
        Args:
            new_ip: New IP address to set
            
        Returns:
            True if successful, False otherwise
        """
        if not all([settings.CF_API_TOKEN, settings.CF_ZONE_ID, settings.CF_RECORD_ID]):
            logger.warning("Cloudflare credentials not configured")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {settings.CF_API_TOKEN}",
                "Content-Type": "application/json"
            }
            
            url = f"https://api.cloudflare.com/client/v4/zones/{settings.CF_ZONE_ID}/dns_records/{settings.CF_RECORD_ID}"
            
            payload = {
                "type": "A",
                "name": settings.CF_RECORD_NAME,
                "content": new_ip,
                "ttl": 1,  # Auto TTL
                "proxied": False
            }
            
            response = await _http_client.put(url, headers=headers, json=payload)
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                logger.info(f"Successfully updated DNS record to {new_ip}")
                return True
            else:
                logger.error(f"Cloudflare API error: {data.get('errors')}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to update Cloudflare DNS record: {e}")
            return False
    
    @staticmethod
    async def check_and_update() -> Dict[str, Any]:
        """
        Check public IP and update DNS if changed
        
        Returns:
            Dictionary with check results
        """
        global _current_public_ip
        
        result = {
            'checked_at': datetime.utcnow().isoformat(),
            'public_ip': None,
            'dns_ip': None,
            'updated': False,
            'error': None
        }
        
        try:
            # Get current public IP
            public_ip = await DDNSService.get_public_ip()
            result['public_ip'] = public_ip
            
            if not public_ip:
                result['error'] = 'Failed to get public IP'
                return result
            
            # Get current DNS record
            dns_record = await DDNSService.get_cloudflare_dns_record()
            
            if dns_record:
                dns_ip = dns_record.get('content')
                result['dns_ip'] = dns_ip
                
                # Check if update needed
                if dns_ip != public_ip:
                    logger.info(f"IP changed from {dns_ip} to {public_ip}, updating DNS")
                    
                    success = await DDNSService.update_cloudflare_dns_record(public_ip)
                    result['updated'] = success
                    
                    if success:
                        # Log to database
                        db = await get_db()
                        await db.execute(
                            """INSERT INTO ddns_logs (old_ip, new_ip, record_name)
                               VALUES (?, ?, ?)""",
                            (dns_ip, public_ip, settings.CF_RECORD_NAME)
                        )
                        await db.commit()
                        
                        # Send alert
                        await AlertService.send_ddns_update_alert(
                            settings.CF_RECORD_NAME,
                            dns_ip,
                            public_ip
                        )
                        
                        # Push to Firebase
                        await FirebaseService.push_alert({
                            'type': 'ddns_update',
                            'record_name': settings.CF_RECORD_NAME,
                            'old_ip': dns_ip,
                            'new_ip': public_ip
                        })
                        
                        logger.info(f"DNS record updated: {settings.CF_RECORD_NAME} -> {public_ip}")
                else:
                    logger.debug(f"IP unchanged: {public_ip}")
            else:
                # No existing record, create one
                if settings.CF_RECORD_NAME:
                    logger.info(f"Creating new DNS record for {public_ip}")
                    success = await DDNSService.update_cloudflare_dns_record(public_ip)
                    result['updated'] = success
                    
                    if success:
                        db = await get_db()
                        await db.execute(
                            """INSERT INTO ddns_logs (old_ip, new_ip, record_name)
                               VALUES (?, ?, ?)""",
                            (None, public_ip, settings.CF_RECORD_NAME)
                        )
                        await db.commit()
            
            _current_public_ip = public_ip
            
        except Exception as e:
            logger.error(f"DDNS check failed: {e}")
            result['error'] = str(e)
        
        return result
    
    @staticmethod
    async def get_ddns_logs(limit: int = 50) -> list:
        """Get recent DDNS update logs"""
        try:
            db = await get_db()
            cursor = await db.execute(
                """SELECT id, old_ip, new_ip, record_name, updated_at
                   FROM ddns_logs
                   ORDER BY updated_at DESC
                   LIMIT ?""",
                (limit,)
            )
            logs = await cursor.fetchall()
            
            return [
                {
                    'id': log[0],
                    'old_ip': log[1],
                    'new_ip': log[2],
                    'record_name': log[3],
                    'updated_at': log[4]
                }
                for log in logs
            ]
        except Exception as e:
            logger.error(f"Failed to get DDNS logs: {e}")
            return []
    
    @staticmethod
    async def get_current_status() -> Dict[str, Any]:
        """Get current DDNS status"""
        global _current_public_ip
        
        public_ip = _current_public_ip or await DDNSService.get_public_ip()
        dns_record = await DDNSService.get_cloudflare_dns_record()
        
        return {
            'public_ip': public_ip,
            'dns_record': {
                'name': settings.CF_RECORD_NAME,
                'ip': dns_record.get('content') if dns_record else None,
                'proxied': dns_record.get('proxied', False) if dns_record else None
            } if settings.CF_RECORD_NAME else None,
            'configured': all([settings.CF_API_TOKEN, settings.CF_ZONE_ID, settings.CF_RECORD_ID])
        }


import asyncio


async def run_ddns_worker():
    """Background worker that checks DDNS periodically"""
    from app.config import settings
    
    logger.info("Starting DDNS worker")
    
    # Initial check
    await DDNSService.check_and_update()
    
    while True:
        try:
            await asyncio.sleep(settings.DDNS_CHECK_INTERVAL)
            await DDNSService.check_and_update()
        except Exception as e:
            logger.error(f"DDNS worker error: {e}")
