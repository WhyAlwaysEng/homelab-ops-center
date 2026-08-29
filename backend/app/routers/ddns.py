"""
DDNS Router for Homelab & Network Ops Center
Endpoints for Cloudflare DDNS management
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from app.services.ddns_service import DDNSService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ddns", tags=["ddns"])


@router.get("/status")
async def get_ddns_status() -> Dict[str, Any]:
    """
    Get current DDNS status
    
    Returns current public IP, DNS record info, and configuration status
    """
    try:
        status = await DDNSService.get_current_status()
        return status
    except Exception as e:
        logger.error(f"Failed to get DDNS status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
async def trigger_ddns_sync() -> Dict[str, Any]:
    """
    Trigger immediate DDNS synchronization
    
    Checks public IP and updates DNS record if changed
    """
    try:
        result = await DDNSService.check_and_update()
        return result
    except Exception as e:
        logger.error(f"Failed to sync DDNS: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs")
async def get_ddns_logs(limit: int = 50) -> List[Dict[str, Any]]:
    """
    Get recent DDNS update logs
    """
    try:
        logs = await DDNSService.get_ddns_logs(limit)
        return logs
    except Exception as e:
        logger.error(f"Failed to get DDNS logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
