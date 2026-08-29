"""
Log Viewer Service for Homelab & Network Ops Center
Provides access to system and application logs
"""

import os
import subprocess
from typing import List, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class LogService:
    """Service for viewing system and application logs"""

    # Common log file locations
    LOG_PATHS = {
        "syslog": "/var/log/syslog",
        "auth": "/var/log/auth.log",
        "kern": "/var/log/kern.log",
        "dmesg": "/var/log/dmesg",
        "docker": "/var/log/docker.log",
        "nginx_access": "/var/log/nginx/access.log",
        "nginx_error": "/var/log/nginx/error.log",
    }

    @staticmethod
    def list_log_files() -> List[dict]:
        """List available log files"""
        logs = []
        for name, path in LogService.LOG_PATHS.items():
            if os.path.exists(path):
                stat = os.stat(path)
                logs.append({
                    "name": name,
                    "path": path,
                    "size_bytes": stat.st_size,
                    "readable": os.access(path, os.R_OK),
                })
        return logs

    @staticmethod
    def read_log(
        name: str,
        lines: int = 100,
        search: Optional[str] = None,
        level: Optional[str] = None,
    ) -> dict:
        """
        Read log file content

        Args:
            name: Log file name (from LOG_PATHS)
            lines: Number of lines to read from end
            search: Optional search string to filter lines
            level: Optional log level filter (ERROR, WARN, INFO)

        Returns:
            Dictionary with log content and metadata
        """
        try:
            path = LogService.LOG_PATHS.get(name)
            if not path or not os.path.exists(path):
                return {"success": False, "message": f"Log '{name}' not found", "lines": []}

            # Use tail command for efficiency
            cmd = f"tail -n {lines * 3} {path}"
            result = subprocess.run(
                cmd, shell=True, capture_output=True, text=True, timeout=10
            )

            if result.returncode != 0:
                return {"success": False, "message": result.stderr, "lines": []}

            log_lines = result.stdout.strip().split("\n")

            # Apply filters
            if search:
                log_lines = [l for l in log_lines if search.lower() in l.lower()]

            if level:
                log_lines = [l for l in log_lines if level.upper() in l.upper()]

            # Limit to requested number
            log_lines = log_lines[-lines:]

            return {
                "success": True,
                "name": name,
                "path": path,
                "lines": log_lines,
                "total_lines": len(log_lines),
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "message": "Log read timed out", "lines": []}
        except Exception as e:
            logger.error(f"Failed to read log {name}: {e}")
            return {"success": False, "message": str(e), "lines": []}

    @staticmethod
    async def get_docker_logs(
        container: str, lines: int = 100, search: Optional[str] = None
    ) -> dict:
        """Get Docker container logs"""
        try:
            cmd = f"docker logs --tail {lines * 3} {container}"
            process = await __import__("asyncio").create_subprocess_shell(
                cmd,
                stdout=__import__("asyncio").subprocess.PIPE,
                stderr=__import__("asyncio").subprocess.PIPE,
            )
            stdout, stderr = await process.communicate()

            output = stdout.decode("utf-8", errors="replace") + stderr.decode(
                "utf-8", errors="replace"
            )
            log_lines = output.strip().split("\n")

            if search:
                log_lines = [l for l in log_lines if search.lower() in l.lower()]

            log_lines = log_lines[-lines:]

            return {
                "success": True,
                "container": container,
                "lines": log_lines,
                "total_lines": len(log_lines),
            }
        except Exception as e:
            return {"success": False, "message": str(e), "lines": []}
