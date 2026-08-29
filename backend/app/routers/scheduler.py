"""
Scheduler Router for Homelab & Network Ops Center
API endpoints for managing scheduled tasks
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.services.scheduler_service import SchedulerService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scheduler", tags=["scheduler"])


class TaskCreate(BaseModel):
    name: str
    command: str
    cron_expression: str = ""  # e.g., "0 */6 * * *" for every 6 hours
    interval_seconds: Optional[int] = None
    enabled: bool = True


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    command: Optional[str] = None
    cron_expression: Optional[str] = None
    interval_seconds: Optional[int] = None
    enabled: Optional[bool] = None


@router.get("")
async def list_tasks():
    """List all scheduled tasks"""
    return SchedulerService.list_tasks()


@router.post("")
async def create_task(task: TaskCreate):
    """Create a new scheduled task"""
    result = SchedulerService.add_task(task.model_dump())
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])
    return result


@router.put("/{task_id}")
async def update_task(task_id: int, updates: TaskUpdate):
    """Update a scheduled task"""
    result = SchedulerService.update_task(task_id, updates.model_dump(exclude_unset=True))
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@router.delete("/{task_id}")
async def delete_task(task_id: int):
    """Delete a scheduled task"""
    result = SchedulerService.delete_task(task_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@router.post("/{task_id}/toggle")
async def toggle_task(task_id: int):
    """Enable/disable a scheduled task"""
    result = SchedulerService.toggle_task(task_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result
