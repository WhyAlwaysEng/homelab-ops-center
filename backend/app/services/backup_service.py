"""
Backup & Restore Service for Homelab & Network Ops Center
Handles database backup, restore, and auto-backup scheduling
"""

import shutil
import os
import json
from datetime import datetime
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)

BACKUP_DIR = Path(os.environ.get("DB_PATH", "/app/data")).parent / "backups"
DB_PATH = Path(os.environ.get("DB_PATH", "/app/data/homelab.db"))


class BackupService:
    """Service for database backup and restore operations"""

    @staticmethod
    def list_backups() -> list:
        """List all available backups"""
        try:
            BACKUP_DIR.mkdir(parents=True, exist_ok=True)
            backups = []
            for f in sorted(BACKUP_DIR.glob("*.db"), reverse=True):
                stat = f.stat()
                backups.append({
                    "filename": f.name,
                    "size_bytes": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                })
            return backups
        except Exception as e:
            logger.error(f"Failed to list backups: {e}")
            return []

    @staticmethod
    def create_backup(name: Optional[str] = None) -> dict:
        """Create a backup of the database"""
        try:
            BACKUP_DIR.mkdir(parents=True, exist_ok=True)

            if not DB_PATH.exists():
                return {"success": False, "message": "Database file not found"}

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = name or f"backup_{timestamp}"
            backup_file = BACKUP_DIR / f"{backup_name}.db"

            shutil.copy2(str(DB_PATH), str(backup_file))

            # Also backup settings if exists
            settings_file = DB_PATH.parent / "settings.json"
            if settings_file.exists():
                settings_backup = BACKUP_DIR / f"{backup_name}_settings.json"
                shutil.copy2(str(settings_file), str(settings_backup))

            logger.info(f"Backup created: {backup_file}")
            return {
                "success": True,
                "message": f"Backup created: {backup_name}",
                "filename": backup_file.name,
                "size_bytes": backup_file.stat().st_size,
            }
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    def restore_backup(filename: str) -> dict:
        """Restore database from a backup"""
        try:
            backup_file = BACKUP_DIR / filename
            if not backup_file.exists():
                return {"success": False, "message": "Backup file not found"}

            # Create a safety backup before restore
            BackupService.create_backup(f"pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}")

            shutil.copy2(str(backup_file), str(DB_PATH))

            # Restore settings if exists
            settings_backup = BACKUP_DIR / filename.replace(".db", "_settings.json")
            if settings_backup.exists():
                settings_file = DB_PATH.parent / "settings.json"
                shutil.copy2(str(settings_backup), str(settings_file))

            logger.info(f"Backup restored: {filename}")
            return {"success": True, "message": f"Restored from: {filename}"}
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    def delete_backup(filename: str) -> dict:
        """Delete a backup file"""
        try:
            backup_file = BACKUP_DIR / filename
            if not backup_file.exists():
                return {"success": False, "message": "Backup file not found"}

            backup_file.unlink()

            # Also delete settings backup if exists
            settings_backup = BACKUP_DIR / filename.replace(".db", "_settings.json")
            if settings_backup.exists():
                settings_backup.unlink()

            logger.info(f"Backup deleted: {filename}")
            return {"success": True, "message": f"Deleted: {filename}"}
        except Exception as e:
            logger.error(f"Delete failed: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    def get_backup_info() -> dict:
        """Get backup directory information"""
        try:
            BACKUP_DIR.mkdir(parents=True, exist_ok=True)
            total_size = sum(f.stat().st_size for f in BACKUP_DIR.iterdir() if f.is_file())
            count = len(list(BACKUP_DIR.glob("*.db")))
            return {
                "backup_dir": str(BACKUP_DIR),
                "total_backups": count,
                "total_size_bytes": total_size,
            }
        except Exception as e:
            logger.error(f"Failed to get backup info: {e}")
            return {"backup_dir": str(BACKUP_DIR), "total_backups": 0, "total_size_bytes": 0}
