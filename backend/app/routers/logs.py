"""
Logs Router for Homelab & Network Ops Center
API endpoints for viewing system and application logs
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from app.services.log_service import LogService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("")
async def list_log_files() -> List[Dict[str, Any]]:
    """List available log files"""
    return LogService.list_log_files()


@router.get("/{name}")
async def read_log(
    name: str,
    lines: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    level: Optional[str] = None,
) -> Dict[str, Any]:
    """Read log file content"""
    result = LogService.read_log(name, lines, search, level)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@router.get("/docker/{container}")
async def get_docker_logs(
    container: str,
    lines: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
) -> Dict[str, Any]:
    """Get Docker container logs"""
    result = await LogService.get_docker_logs(container, lines, search)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result
