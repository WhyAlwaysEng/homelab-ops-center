"""
System Router for Homelab & Network Ops Center
Endpoints for system metrics and Docker container management
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import psutil
import os
from datetime import datetime
from app.config import settings
from app.services.docker_service import DockerService
from app.services.firebase_service import FirebaseService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/system/metrics")
async def get_system_metrics() -> Dict[str, Any]:
    """
    Get current system metrics
    
    Returns CPU, RAM, Disk, and Temperature information
    """
    try:
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        
        # Temperature (platform-specific)
        temperature = None
        if settings.is_production:
            # Read from thermal zone on Linux/Orange Pi
            try:
                with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                    temp_raw = int(f.read().strip())
                    temperature = round(temp_raw / 1000.0, 1)
            except FileNotFoundError:
                temperature = None
        else:
            # Mock temperature for development
            import random
            temperature = round(random.uniform(35.0, 55.0), 1)
        
        metrics = {
            'cpu': {
                'percent': cpu_percent,
                'count': cpu_count,
                'frequency': {
                    'current': cpu_freq.current if cpu_freq else None,
                    'min': cpu_freq.min if cpu_freq else None,
                    'max': cpu_freq.max if cpu_freq else None
                } if cpu_freq else None
            },
            'memory': {
                'total': memory.total,
                'used': memory.used,
                'available': memory.available,
                'percent': memory.percent
            },
            'disk': {
                'total': disk.total,
                'used': disk.used,
                'free': disk.free,
                'percent': disk.percent
            },
            'temperature': temperature,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Push to Firebase for real-time updates
        await FirebaseService.push_metrics({
            'cpu_percent': cpu_percent,
            'ram_used': memory.used,
            'ram_total': memory.total,
            'ram_percent': memory.percent,
            'disk_used': disk.used,
            'disk_total': disk.total,
            'disk_percent': disk.percent,
            'temperature': temperature
        })
        
        return metrics
        
    except Exception as e:
        logger.error(f"Failed to get system metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/docker/containers")
async def list_containers() -> List[Dict[str, Any]]:
    """
    List all Docker containers
    
    Returns list of containers with their status
    """
    if not DockerService.is_available():
        return []
    
    try:
        containers = await DockerService.list_containers(all_containers=True)
        
        # Push to Firebase for real-time updates
        await FirebaseService.push_all_containers(containers)
        
        return containers
    except Exception as e:
        logger.error(f"Failed to list containers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/docker/containers/{container_id}")
async def get_container(container_id: str) -> Dict[str, Any]:
    """
    Get detailed information about a specific container
    """
    if not DockerService.is_available():
        raise HTTPException(status_code=503, detail="Docker not available")
    
    container = await DockerService.get_container(container_id)
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    return container


@router.post("/docker/containers/{container_id}/start")
async def start_container(container_id: str) -> Dict[str, Any]:
    """
    Start a stopped container
    """
    if not DockerService.is_available():
        raise HTTPException(status_code=503, detail="Docker not available")
    
    success = await DockerService.start_container(container_id)
    if not success:
        raise HTTPException(status_code=404, detail="Container not found or failed to start")
    
    return {"status": "started", "container_id": container_id}


@router.post("/docker/containers/{container_id}/stop")
async def stop_container(container_id: str) -> Dict[str, Any]:
    """
    Stop a running container
    """
    if not DockerService.is_available():
        raise HTTPException(status_code=503, detail="Docker not available")
    
    success = await DockerService.stop_container(container_id)
    if not success:
        raise HTTPException(status_code=404, detail="Container not found or failed to stop")
    
    return {"status": "stopped", "container_id": container_id}


@router.post("/docker/containers/{container_id}/restart")
async def restart_container(container_id: str) -> Dict[str, Any]:
    """
    Restart a container
    """
    if not DockerService.is_available():
        raise HTTPException(status_code=503, detail="Docker not available")
    
    success = await DockerService.restart_container(container_id)
    if not success:
        raise HTTPException(status_code=404, detail="Container not found or failed to restart")
    
    return {"status": "restarted", "container_id": container_id}


@router.get("/docker/containers/{container_id}/stats")
async def get_container_stats(container_id: str) -> Dict[str, Any]:
    """
    Get resource usage statistics for a container
    """
    if not DockerService.is_available():
        raise HTTPException(status_code=503, detail="Docker not available")
    
    stats = await DockerService.get_container_stats(container_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Container not found or stats unavailable")
    
    return stats
