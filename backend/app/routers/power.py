"""
Power Router for Homelab & Network Ops Center
API endpoints for system power management
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from app.services.power_service import PowerService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/power", tags=["power"])


class PowerAction(BaseModel):
    delay: int = 0


@router.get("/status")
async def get_power_status() -> Dict[str, Any]:
    """Get current power status"""
    return await PowerService.get_power_status()


@router.post("/shutdown")
async def shutdown(action: PowerAction = PowerAction()) -> Dict[str, Any]:
    """Shutdown the system"""
    result = await PowerService.shutdown(action.delay)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])
    return result


@router.post("/reboot")
async def reboot(action: PowerAction = PowerAction()) -> Dict[str, Any]:
    """Reboot the system"""
    result = await PowerService.reboot(action.delay)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])
    return result


@router.post("/cancel")
async def cancel_shutdown() -> Dict[str, Any]:
    """Cancel pending shutdown/reboot"""
    result = await PowerService.cancel_shutdown()
    return result
