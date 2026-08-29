"""
Terminal Router for Homelab & Network Ops Center
API endpoints for web-based terminal access
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from app.services.ssh_service import SSHService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/terminal", tags=["terminal"])


class CommandRequest(BaseModel):
    command: str
    timeout: int = 30


@router.post("/exec")
async def execute_command(req: CommandRequest) -> Dict[str, Any]:
    """Execute a shell command"""
    # Basic security: block dangerous commands
    blocked = ["rm -rf /", "mkfs", "dd if=", "> /dev/sd"]
    for b in blocked:
        if b in req.command:
            raise HTTPException(status_code=400, detail="Dangerous command blocked")

    result = await SSHService.execute_command(req.command, req.timeout)
    return result


@router.get("/sysinfo")
async def get_system_info() -> Dict[str, Any]:
    """Get system information"""
    return await SSHService.get_system_info()


@router.get("/available")
async def check_availability() -> Dict[str, Any]:
    """Check if terminal is available"""
    return {"available": SSHService.is_available()}
