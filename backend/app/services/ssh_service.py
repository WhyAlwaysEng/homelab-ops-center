"""
SSH Terminal Service for Homelab & Network Ops Center
Provides web-based SSH terminal access via WebSocket
"""

import asyncio
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class SSHService:
    """Service for SSH terminal operations"""

    @staticmethod
    def is_available() -> bool:
        """Check if SSH is available on the system"""
        try:
            return os.path.exists("/usr/bin/ssh") or os.path.exists("/usr/bin/bash")
        except Exception:
            return False

    @staticmethod
    async def execute_command(command: str, timeout: int = 30) -> dict:
        """
        Execute a shell command and return output

        Args:
            command: Shell command to execute
            timeout: Timeout in seconds

        Returns:
            Dictionary with stdout, stderr, and return code
        """
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ, "TERM": "xterm-256color"},
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(), timeout=timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.communicate()
                return {
                    "stdout": "",
                    "stderr": f"Command timed out after {timeout}s",
                    "return_code": -1,
                }

            return {
                "stdout": stdout.decode("utf-8", errors="replace"),
                "stderr": stderr.decode("utf-8", errors="replace"),
                "return_code": process.returncode,
            }
        except Exception as e:
            logger.error(f"Failed to execute command: {e}")
            return {"stdout": "", "stderr": str(e), "return_code": -1}

    @staticmethod
    async def get_system_info() -> dict:
        """Get basic system information"""
        commands = {
            "hostname": "hostname",
            "uptime": "uptime -p 2>/dev/null || uptime",
            "kernel": "uname -r",
            "os": "cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'\"' -f2 || uname -s",
            "load_avg": "cat /proc/loadavg 2>/dev/null | awk '{print $1, $2, $3}'",
        }

        info = {}
        for key, cmd in commands.items():
            result = await SSHService.execute_command(cmd, timeout=5)
            info[key] = result["stdout"].strip()

        return info
