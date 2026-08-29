"""
Power Management Service for Homelab & Network Ops Center
Handles shutdown, reboot, and system power operations
"""

import asyncio
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class PowerService:
    """Service for system power management"""

    @staticmethod
    async def shutdown(delay: int = 0) -> dict:
        """
        Shutdown the system

        Args:
            delay: Delay in seconds before shutdown (0 = immediate)
        """
        try:
            if os.environ.get("APP_ENV") != "production":
                return {
                    "success": False,
                    "message": "Power operations only available in production",
                }

            cmd = f"sudo shutdown -h +{delay}" if delay > 0 else "sudo shutdown -h now"
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            logger.warning(f"System shutdown requested (delay: {delay}s)")
            return {
                "success": True,
                "message": f"System will shutdown in {delay} seconds"
                if delay > 0
                else "System is shutting down",
            }
        except Exception as e:
            logger.error(f"Shutdown failed: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    async def reboot(delay: int = 0) -> dict:
        """
        Reboot the system

        Args:
            delay: Delay in seconds before reboot (0 = immediate)
        """
        try:
            if os.environ.get("APP_ENV") != "production":
                return {
                    "success": False,
                    "message": "Power operations only available in production",
                }

            cmd = f"sudo shutdown -r +{delay}" if delay > 0 else "sudo shutdown -r now"
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            logger.warning(f"System reboot requested (delay: {delay}s)")
            return {
                "success": True,
                "message": f"System will reboot in {delay} seconds"
                if delay > 0
                else "System is rebooting",
            }
        except Exception as e:
            logger.error(f"Reboot failed: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    async def cancel_shutdown() -> dict:
        """Cancel a pending shutdown/reboot"""
        try:
            process = await asyncio.create_subprocess_shell(
                "sudo shutdown -c",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            return {"success": True, "message": "Pending shutdown/reboot cancelled"}
        except Exception as e:
            logger.error(f"Cancel shutdown failed: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    async def get_power_status() -> dict:
        """Get current power status"""
        try:
            from app.services.ping_service import PingService

            result = await PingService.execute_command("uptime -p 2>/dev/null || uptime")
            uptime = result.get("stdout", "").strip()

            result = await PingService.execute_command("cat /proc/uptime 2>/dev/null | awk '{print $1}'")
            uptime_seconds = float(result.get("stdout", "0").strip() or "0")

            return {
                "uptime": uptime,
                "uptime_seconds": uptime_seconds,
                "is_production": os.environ.get("APP_ENV") == "production",
            }
        except Exception as e:
            return {"uptime": "unknown", "uptime_seconds": 0, "is_production": False}
