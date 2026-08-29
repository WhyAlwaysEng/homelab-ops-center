"""
Bandwidth Monitor Service for Homelab & Network Ops Center
Tracks network interface traffic statistics
"""

import psutil
import asyncio
import time
from typing import Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Store previous readings for delta calculation
_prev_readings: Dict[str, dict] = {}
_prev_time: Optional[float] = None


class BandwidthService:
    """Service for monitoring network bandwidth"""

    @staticmethod
    def get_interfaces() -> List[dict]:
        """Get all network interfaces with their stats"""
        interfaces = []

        # Get IO counters
        io_counters = psutil.net_io_counters(pernic=True)

        # Get addresses
        addrs = psutil.net_if_addrs()

        for name, counters in io_counters.items():
            # Skip loopback
            if name == "lo" or name.startswith("veth") or name.startswith("docker"):
                continue

            interface = {
                "name": name,
                "bytes_sent": counters.bytes_sent,
                "bytes_recv": counters.bytes_recv,
                "packets_sent": counters.packets_sent,
                "packets_recv": counters.packets_recv,
                "errin": counters.errin,
                "errout": counters.errout,
                "dropin": counters.dropin,
                "dropout": counters.dropout,
                "addresses": [],
            }

            # Add IP addresses
            if name in addrs:
                for addr in addrs[name]:
                    if addr.family.name == "AF_INET":
                        interface["addresses"].append({
                            "type": "IPv4",
                            "address": addr.address,
                            "netmask": addr.netmask,
                        })
                    elif addr.family.name == "AF_INET6":
                        interface["addresses"].append({
                            "type": "IPv6",
                            "address": addr.address,
                        })

            interfaces.append(interface)

        return interfaces

    @staticmethod
    def get_bandwidth_rates() -> Dict[str, dict]:
        """Calculate bandwidth rates (bytes/sec) for each interface"""
        global _prev_readings, _prev_time

        current_time = time.time()
        current_readings = {}

        for iface in BandwidthService.get_interfaces():
            current_readings[iface["name"]] = {
                "bytes_sent": iface["bytes_sent"],
                "bytes_recv": iface["bytes_recv"],
            }

        rates = {}

        if _prev_time and _prev_readings:
            elapsed = current_time - _prev_time
            if elapsed > 0:
                for name, current in current_readings.items():
                    if name in _prev_readings:
                        sent_delta = current["bytes_sent"] - _prev_readings[name]["bytes_sent"]
                        recv_delta = current["bytes_recv"] - _prev_readings[name]["bytes_recv"]

                        # Handle counter overflow
                        if sent_delta < 0:
                            sent_delta += 2**32
                        if recv_delta < 0:
                            recv_delta += 2**32

                        rates[name] = {
                            "send_rate": max(0, sent_delta / elapsed),
                            "recv_rate": max(0, recv_delta / elapsed),
                            "send_rate_human": BandwidthService._format_bytes(sent_delta / elapsed) + "/s",
                            "recv_rate_human": BandwidthService._format_bytes(recv_delta / elapsed) + "/s",
                        }

        _prev_readings = current_readings
        _prev_time = current_time

        return rates

    @staticmethod
    def _format_bytes(bytes_per_sec: float) -> str:
        """Format bytes to human readable string"""
        for unit in ["B", "KB", "MB", "GB", "TB"]:
            if abs(bytes_per_sec) < 1024.0:
                return f"{bytes_per_sec:.1f} {unit}"
            bytes_per_sec /= 1024.0
        return f"{bytes_per_sec:.1f} PB"

    @staticmethod
    async def get_bandwidth_stats() -> dict:
        """Get comprehensive bandwidth statistics"""
        interfaces = BandwidthService.get_interfaces()
        rates = BandwidthService.get_bandwidth_rates()

        result = []
        for iface in interfaces:
            name = iface["name"]
            rate_info = rates.get(name, {})

            result.append({
                **iface,
                "send_rate": rate_info.get("send_rate", 0),
                "recv_rate": rate_info.get("recv_rate", 0),
                "send_rate_human": rate_info.get("send_rate_human", "0 B/s"),
                "recv_rate_human": rate_info.get("recv_rate_human", "0 B/s"),
            })

        return {
            "interfaces": result,
            "timestamp": datetime.utcnow().isoformat(),
        }
