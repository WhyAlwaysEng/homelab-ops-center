"""
Bandwidth Router for Homelab & Network Ops Center
API endpoints for network bandwidth monitoring
"""

from fastapi import APIRouter
from typing import Dict, Any
from app.services.bandwidth_service import BandwidthService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/bandwidth", tags=["bandwidth"])


@router.get("")
async def get_bandwidth_stats() -> Dict[str, Any]:
    """Get bandwidth statistics for all interfaces"""
    return await BandwidthService.get_bandwidth_stats()


@router.get("/interfaces")
async def get_interfaces() -> list:
    """Get list of network interfaces"""
    return BandwidthService.get_interfaces()
