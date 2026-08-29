"""
Network Router for Homelab & Network Ops Center
Endpoints for network node management and monitoring
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.database import get_db
from app.services.ping_service import PingService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/network", tags=["network"])


class NodeCreate(BaseModel):
    """Schema for creating a new network node"""
    name: str
    host: str
    is_active: bool = True


class NodeUpdate(BaseModel):
    """Schema for updating a network node"""
    name: Optional[str] = None
    host: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/nodes")
async def list_nodes() -> List[Dict[str, Any]]:
    """
    List all monitored network nodes
    """
    try:
        db = await get_db()
        cursor = await db.execute(
            """SELECT id, name, host, is_active, created_at
               FROM monitored_nodes
               ORDER BY created_at DESC"""
        )
        nodes = await cursor.fetchall()
        
        return [
            {
                'id': node[0],
                'name': node[1],
                'host': node[2],
                'is_active': bool(node[3]),
                'created_at': node[4]
            }
            for node in nodes
        ]
    except Exception as e:
        logger.error(f"Failed to list nodes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/nodes")
async def create_node(node: NodeCreate) -> Dict[str, Any]:
    """
    Create a new network node to monitor
    """
    try:
        db = await get_db()
        
        # Check if host already exists
        cursor = await db.execute(
            "SELECT id FROM monitored_nodes WHERE host = ?",
            (node.host,)
        )
        existing = await cursor.fetchone()
        
        if existing:
            raise HTTPException(status_code=400, detail="Host already exists")
        
        # Insert new node
        cursor = await db.execute(
            """INSERT INTO monitored_nodes (name, host, is_active)
               VALUES (?, ?, ?)""",
            (node.name, node.host, node.is_active)
        )
        await db.commit()
        
        node_id = cursor.lastrowid
        
        # Get the created node
        cursor = await db.execute(
            "SELECT id, name, host, is_active, created_at FROM monitored_nodes WHERE id = ?",
            (node_id,)
        )
        created_node = await cursor.fetchone()
        
        return {
            'id': created_node[0],
            'name': created_node[1],
            'host': created_node[2],
            'is_active': bool(created_node[3]),
            'created_at': created_node[4]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create node: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nodes/{node_id}")
async def get_node(node_id: int) -> Dict[str, Any]:
    """
    Get a specific network node with its current status
    """
    try:
        db = await get_db()
        cursor = await db.execute(
            "SELECT id, name, host, is_active, created_at FROM monitored_nodes WHERE id = ?",
            (node_id,)
        )
        node = await cursor.fetchone()
        
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")
        
        # Get latest status
        cursor = await db.execute(
            """SELECT status, latency_ms, packet_loss_pct, checked_at
               FROM latency_logs
               WHERE node_id = ?
               ORDER BY checked_at DESC
               LIMIT 1""",
            (node_id,)
        )
        latest_check = await cursor.fetchone()
        
        # Get stats
        stats = await PingService.get_node_stats(node_id, hours=24)
        
        return {
            'id': node[0],
            'name': node[1],
            'host': node[2],
            'is_active': bool(node[3]),
            'created_at': node[4],
            'latest_check': {
                'status': latest_check[0] if latest_check else None,
                'latency_ms': latest_check[1] if latest_check else None,
                'packet_loss_pct': latest_check[2] if latest_check else None,
                'checked_at': latest_check[3] if latest_check else None
            } if latest_check else None,
            'stats_24h': stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get node: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/nodes/{node_id}")
async def update_node(node_id: int, node_update: NodeUpdate) -> Dict[str, Any]:
    """
    Update a network node
    """
    try:
        db = await get_db()
        
        # Check if node exists
        cursor = await db.execute(
            "SELECT id FROM monitored_nodes WHERE id = ?",
            (node_id,)
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Node not found")
        
        # Build update query
        updates = []
        params = []
        
        if node_update.name is not None:
            updates.append("name = ?")
            params.append(node_update.name)
        
        if node_update.host is not None:
            # Check if new host already exists
            cursor = await db.execute(
                "SELECT id FROM monitored_nodes WHERE host = ? AND id != ?",
                (node_update.host, node_id)
            )
            if await cursor.fetchone():
                raise HTTPException(status_code=400, detail="Host already exists")
            updates.append("host = ?")
            params.append(node_update.host)
        
        if node_update.is_active is not None:
            updates.append("is_active = ?")
            params.append(node_update.is_active)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        params.append(node_id)
        
        await db.execute(
            f"UPDATE monitored_nodes SET {', '.join(updates)} WHERE id = ?",
            params
        )
        await db.commit()
        
        # Get updated node
        cursor = await db.execute(
            "SELECT id, name, host, is_active, created_at FROM monitored_nodes WHERE id = ?",
            (node_id,)
        )
        updated_node = await cursor.fetchone()
        
        return {
            'id': updated_node[0],
            'name': updated_node[1],
            'host': updated_node[2],
            'is_active': bool(updated_node[3]),
            'created_at': updated_node[4]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update node: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/nodes/{node_id}")
async def delete_node(node_id: int) -> Dict[str, str]:
    """
    Delete a network node
    """
    try:
        db = await get_db()
        
        # Check if node exists
        cursor = await db.execute(
            "SELECT id FROM monitored_nodes WHERE id = ?",
            (node_id,)
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Node not found")
        
        # Delete node (cascade will delete latency logs)
        await db.execute("DELETE FROM monitored_nodes WHERE id = ?", (node_id,))
        await db.commit()
        
        return {"message": "Node deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete node: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nodes/{node_id}/logs")
async def get_node_logs(
    node_id: int,
    limit: int = 100,
    hours: int = 24
) -> List[Dict[str, Any]]:
    """
    Get latency logs for a specific node
    """
    try:
        db = await get_db()
        
        # Check if node exists
        cursor = await db.execute(
            "SELECT id FROM monitored_nodes WHERE id = ?",
            (node_id,)
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Node not found")
        
        # Get logs
        cursor = await db.execute(
            """SELECT id, node_id, latency_ms, packet_loss_pct, status, checked_at
               FROM latency_logs
               WHERE node_id = ? AND checked_at > datetime('now', ?)
               ORDER BY checked_at DESC
               LIMIT ?""",
            (node_id, f'-{hours} hours', limit)
        )
        logs = await cursor.fetchall()
        
        return [
            {
                'id': log[0],
                'node_id': log[1],
                'latency_ms': log[2],
                'packet_loss_pct': log[3],
                'status': log[4],
                'checked_at': log[5]
            }
            for log in logs
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get node logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_network_stats() -> Dict[str, Any]:
    """
    Get aggregate network monitoring statistics
    """
    try:
        db = await get_db()
        
        # Get total nodes
        cursor = await db.execute("SELECT COUNT(*) FROM monitored_nodes")
        total_nodes = (await cursor.fetchone())[0]
        
        # Get active nodes
        cursor = await db.execute("SELECT COUNT(*) FROM monitored_nodes WHERE is_active = 1")
        active_nodes = (await cursor.fetchone())[0]
        
        # Get latest status for all active nodes
        cursor = await db.execute(
            """SELECT mn.id, mn.name, mn.host, ll.status, ll.latency_ms
               FROM monitored_nodes mn
               LEFT JOIN latency_logs ll ON mn.id = ll.node_id
               AND ll.id = (
                   SELECT MAX(id) FROM latency_logs WHERE node_id = mn.id
               )
               WHERE mn.is_active = 1"""
        )
        nodes_status = await cursor.fetchall()
        
        up_count = sum(1 for node in nodes_status if node[3] == 'UP')
        down_count = sum(1 for node in nodes_status if node[3] == 'DOWN')
        
        return {
            'total_nodes': total_nodes,
            'active_nodes': active_nodes,
            'up_count': up_count,
            'down_count': down_count,
            'nodes': [
                {
                    'id': node[0],
                    'name': node[1],
                    'host': node[2],
                    'status': node[3],
                    'latency_ms': node[4]
                }
                for node in nodes_status
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to get network stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/nodes/{node_id}/check")
async def check_node(node_id: int) -> Dict[str, Any]:
    """
    Trigger immediate check for a specific node
    """
    try:
        db = await get_db()
        cursor = await db.execute(
            "SELECT id, host FROM monitored_nodes WHERE id = ?",
            (node_id,)
        )
        node = await cursor.fetchone()
        
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")
        
        result = await PingService.check_node_status(node[0], node[1])
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to check node: {e}")
        raise HTTPException(status_code=500, detail=str(e))
