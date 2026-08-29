"""
Backup Router for Homelab & Network Ops Center
API endpoints for database backup and restore
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from app.services.backup_service import BackupService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backup", tags=["backup"])


@router.get("")
async def list_backups() -> List[Dict[str, Any]]:
    """List all available backups"""
    return BackupService.list_backups()


@router.post("/create")
async def create_backup(name: str = None) -> Dict[str, Any]:
    """Create a new backup"""
    result = BackupService.create_backup(name)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])
    return result


@router.post("/restore/{filename}")
async def restore_backup(filename: str) -> Dict[str, Any]:
    """Restore from a backup"""
    result = BackupService.restore_backup(filename)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@router.delete("/{filename}")
async def delete_backup(filename: str) -> Dict[str, Any]:
    """Delete a backup"""
    result = BackupService.delete_backup(filename)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@router.get("/info")
async def get_backup_info() -> Dict[str, Any]:
    """Get backup directory info"""
    return BackupService.get_backup_info()
