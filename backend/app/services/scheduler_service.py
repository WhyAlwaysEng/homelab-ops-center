"""
Scheduler Service for Homelab & Network Ops Center
Manages scheduled tasks and cron jobs
"""

import json
import asyncio
from datetime import datetime
from typing import Optional, Dict, List
from pathlib import Path
import os
import logging

logger = logging.getLogger(__name__)

SCHEDULE_FILE = Path(os.environ.get("DB_PATH", "/app/data")).parent / "schedule.json"


class SchedulerService:
    """Service for managing scheduled tasks"""

    @staticmethod
    def load_schedule() -> dict:
        """Load schedule from file"""
        try:
            if SCHEDULE_FILE.exists():
                with open(SCHEDULE_FILE, "r") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load schedule: {e}")
        return {"tasks": []}

    @staticmethod
    def save_schedule(schedule: dict) -> bool:
        """Save schedule to file"""
        try:
            SCHEDULE_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(SCHEDULE_FILE, "w") as f:
                json.dump(schedule, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Failed to save schedule: {e}")
            return False

    @staticmethod
    def list_tasks() -> List[dict]:
        """List all scheduled tasks"""
        schedule = SchedulerService.load_schedule()
        return schedule.get("tasks", [])

    @staticmethod
    def add_task(task: dict) -> dict:
        """Add a new scheduled task"""
        schedule = SchedulerService.load_schedule()
        task["id"] = len(schedule["tasks"]) + 1
        task["created_at"] = datetime.utcnow().isoformat()
        task["enabled"] = task.get("enabled", True)
        task["last_run"] = None
        task["next_run"] = None
        schedule["tasks"].append(task)

        if SchedulerService.save_schedule(schedule):
            return {"success": True, "task": task}
        return {"success": False, "message": "Failed to save task"}

    @staticmethod
    def update_task(task_id: int, updates: dict) -> dict:
        """Update a scheduled task"""
        schedule = SchedulerService.load_schedule()
        for task in schedule["tasks"]:
            if task["id"] == task_id:
                task.update(updates)
                task["updated_at"] = datetime.utcnow().isoformat()
                if SchedulerService.save_schedule(schedule):
                    return {"success": True, "task": task}
                return {"success": False, "message": "Failed to save"}
        return {"success": False, "message": "Task not found"}

    @staticmethod
    def delete_task(task_id: int) -> dict:
        """Delete a scheduled task"""
        schedule = SchedulerService.load_schedule()
        schedule["tasks"] = [t for t in schedule["tasks"] if t["id"] != task_id]
        if SchedulerService.save_schedule(schedule):
            return {"success": True, "message": "Task deleted"}
        return {"success": False, "message": "Failed to delete task"}

    @staticmethod
    def toggle_task(task_id: int) -> dict:
        """Enable/disable a scheduled task"""
        schedule = SchedulerService.load_schedule()
        for task in schedule["tasks"]:
            if task["id"] == task_id:
                task["enabled"] = not task["enabled"]
                if SchedulerService.save_schedule(schedule):
                    return {"success": True, "task": task}
                return {"success": False, "message": "Failed to save"}
        return {"success": False, "message": "Task not found"}
