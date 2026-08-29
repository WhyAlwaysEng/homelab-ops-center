"""
Ping Service for Homelab & Network Ops Center
Async ICMP ping with state transition detection
"""

import asyncio
from ping3 import ping
from typing import Optional, Tuple, Dict, Any
from datetime import datetime
from app.database import get_db
from app.services.alert_service import AlertService
from app.services.firebase_service import FirebaseService
import logging

logger = logging.getLogger(__name__)

# Cache for tracking node states (for transition detection)
_node_states: Dict[int, str] = {}


class PingService:
    """Service for network ping operations"""
    
    @staticmethod
    async def ping_host(host: str, timeout: int = 2) -> Tuple[Optional[float], float, str]:
        """
        Ping a host and return latency, packet loss, and status
        
        Args:
            host: Hostname or IP address to ping
            timeout: Timeout in seconds
            
        Returns:
            Tuple of (latency_ms, packet_loss_pct, status)
        """
        try:
            # Run ping in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: ping(host, timeout=timeout, unit='ms')
            )
            
            if result is None or result is False:
                # Host is unreachable
                return None, 100.0, "DOWN"
            else:
                # Host responded
                return round(result, 2), 0.0, "UP"
                
        except Exception as e:
            logger.error(f"Ping failed for {host}: {e}")
            return None, 100.0, "DOWN"
    
    @staticmethod
    async def check_node_status(node_id: int, host: str) -> Dict[str, Any]:
        """
        Check status of a single node and detect state transitions
        
        Args:
            node_id: Database node ID
            host: Hostname or IP to ping
            
        Returns:
            Dictionary with check results
        """
        latency_ms, packet_loss, status = await PingService.ping_host(host)
        
        # Get previous state for transition detection
        previous_status = _node_states.get(node_id)
        
        # Update state cache
        _node_states[node_id] = status
        
        # Detect state transitions and send alerts
        if previous_status is not None and previous_status != status:
            db = await get_db()
            cursor = await db.execute(
                "SELECT name FROM monitored_nodes WHERE id = ?",
                (node_id,)
            )
            node = await cursor.fetchone()
            
            if node:
                node_name = node[0]
                if previous_status == "UP" and status == "DOWN":
                    logger.warning(f"Node {node_name} went DOWN")
                    await AlertService.send_node_down_alert(node_name, host)
                elif previous_status == "DOWN" and status == "UP":
                    logger.info(f"Node {node_name} came back UP")
                    await AlertService.send_node_up_alert(node_name, host)
        
        # Log to database
        db = await get_db()
        await db.execute(
            """INSERT INTO latency_logs (node_id, latency_ms, packet_loss_pct, status)
               VALUES (?, ?, ?, ?)""",
            (node_id, latency_ms, packet_loss, status)
        )
        await db.commit()
        
        # Push to Firebase for real-time updates
        await FirebaseService.push_network_status(str(node_id), {
            'host': host,
            'status': status.lower(),
            'latency_ms': latency_ms,
            'packet_loss_pct': packet_loss
        })
        
        return {
            'node_id': node_id,
            'host': host,
            'latency_ms': latency_ms,
            'packet_loss_pct': packet_loss,
            'status': status
        }
    
    @staticmethod
    async def check_all_active_nodes():
        """Check all active nodes in the database"""
        try:
            db = await get_db()
            cursor = await db.execute(
                "SELECT id, host FROM monitored_nodes WHERE is_active = 1"
            )
            nodes = await cursor.fetchall()
            
            if not nodes:
                logger.debug("No active nodes to check")
                return []
            
            logger.debug(f"Checking {len(nodes)} active nodes")
            
            # Check all nodes concurrently
            tasks = [PingService.check_node_status(node_id, host) for node_id, host in nodes]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions
            valid_results = [r for r in results if isinstance(r, dict)]
            
            logger.debug(f"Completed {len(valid_results)} node checks")
            return valid_results
            
        except Exception as e:
            logger.error(f"Error checking all nodes: {e}")
            return []
    
    @staticmethod
    async def get_node_stats(node_id: int, hours: int = 24) -> Dict[str, Any]:
        """Get statistics for a specific node"""
        try:
            db = await get_db()
            
            # Get uptime percentage
            cursor = await db.execute(
                """SELECT 
                    COUNT(CASE WHEN status = 'UP' THEN 1 END) as up_count,
                    COUNT(*) as total_count,
                    AVG(latency_ms) as avg_latency,
                    MIN(latency_ms) as min_latency,
                    MAX(latency_ms) as max_latency
                FROM latency_logs 
                WHERE node_id = ? AND checked_at > datetime('now', ?)""",
                (node_id, f'-{hours} hours')
            )
            stats = await cursor.fetchone()
            
            if stats and stats[1] > 0:
                up_count, total_count, avg_latency, min_latency, max_latency = stats
                return {
                    'uptime_pct': round((up_count / total_count) * 100, 2),
                    'total_checks': total_count,
                    'avg_latency': round(avg_latency, 2) if avg_latency else None,
                    'min_latency': round(min_latency, 2) if min_latency else None,
                    'max_latency': round(max_latency, 2) if max_latency else None
                }
            
            return {
                'uptime_pct': 0,
                'total_checks': 0,
                'avg_latency': None,
                'min_latency': None,
                'max_latency': None
            }
            
        except Exception as e:
            logger.error(f"Error getting node stats: {e}")
            return {}


async def run_ping_worker():
    """Background worker that pings all active nodes periodically"""
    from app.config import settings
    
    logger.info("Starting ping worker")
    
    while True:
        try:
            await PingService.check_all_active_nodes()
        except Exception as e:
            logger.error(f"Ping worker error: {e}")
        
        await asyncio.sleep(settings.PING_INTERVAL)
