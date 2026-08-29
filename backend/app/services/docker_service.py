"""
Docker Service for Homelab & Network Ops Center
Manages Docker containers via Docker SDK
"""

import docker
from docker.errors import DockerException, NotFound, APIError
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Docker client (reused connection)
_docker_client: Optional[docker.DockerClient] = None


def get_docker_client() -> Optional[docker.DockerClient]:
    """Get or create Docker client connection"""
    global _docker_client
    
    if _docker_client is None:
        try:
            _docker_client = docker.DockerClient(
                base_url='unix:///var/run/docker.sock',
                timeout=10
            )
            # Test connection
            _docker_client.ping()
            logger.info("Docker client connected successfully")
        except DockerException as e:
            logger.error(f"Failed to connect to Docker: {e}")
            _docker_client = None
    
    return _docker_client


def close_docker_client():
    """Close Docker client connection gracefully"""
    global _docker_client
    if _docker_client:
        try:
            _docker_client.close()
            logger.info("Docker client closed")
        except Exception as e:
            logger.error(f"Error closing Docker client: {e}")
        _docker_client = None


class DockerService:
    """Service for Docker container operations"""
    
    @staticmethod
    def is_available() -> bool:
        """Check if Docker is available"""
        client = get_docker_client()
        return client is not None
    
    @staticmethod
    async def list_containers(all_containers: bool = True) -> List[Dict[str, Any]]:
        """
        List all Docker containers
        
        Args:
            all_containers: If True, include stopped containers
            
        Returns:
            List of container information dictionaries
        """
        client = get_docker_client()
        if not client:
            logger.warning("Docker not available, returning empty list")
            return []
        
        try:
            containers = client.containers.list(all=all_containers)
            
            result = []
            for container in containers:
                info = {
                    'id': container.short_id,
                    'name': container.name,
                    'status': container.status,
                    'image': container.image.tags[0] if container.image.tags else str(container.image.id)[:12],
                    'created': container.attrs.get('Created', ''),
                    'state': container.attrs.get('State', {}).get('Status', ''),
                    'health': container.attrs.get('State', {}).get('Health', {}).get('Status', 'N/A')
                }
                result.append(info)
            
            logger.debug(f"Found {len(result)} containers")
            return result
            
        except Exception as e:
            logger.error(f"Failed to list containers: {e}")
            return []
    
    @staticmethod
    async def get_container(container_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific container"""
        client = get_docker_client()
        if not client:
            return None
        
        try:
            container = client.containers.get(container_id)
            return {
                'id': container.short_id,
                'name': container.name,
                'status': container.status,
                'image': container.image.tags[0] if container.image.tags else str(container.image.id)[:12],
                'created': container.attrs.get('Created', ''),
                'state': container.attrs.get('State', {}),
                'mounts': [
                    {
                        'source': m.get('Source', ''),
                        'destination': m.get('Destination', ''),
                        'mode': m.get('Mode', '')
                    } for m in container.attrs.get('Mounts', [])
                ],
                'network_settings': {
                    'ports': container.attrs.get('NetworkSettings', {}).get('Ports', {}),
                    'ip_address': container.attrs.get('NetworkSettings', {}).get('IPAddress', '')
                }
            }
        except NotFound:
            logger.warning(f"Container not found: {container_id}")
            return None
        except Exception as e:
            logger.error(f"Failed to get container {container_id}: {e}")
            return None
    
    @staticmethod
    async def start_container(container_id: str) -> bool:
        """Start a stopped container"""
        client = get_docker_client()
        if not client:
            return False
        
        try:
            container = client.containers.get(container_id)
            container.start()
            logger.info(f"Container {container_id} started")
            return True
        except NotFound:
            logger.warning(f"Container not found: {container_id}")
            return False
        except APIError as e:
            logger.error(f"Failed to start container {container_id}: {e}")
            return False
    
    @staticmethod
    async def stop_container(container_id: str) -> bool:
        """Stop a running container"""
        client = get_docker_client()
        if not client:
            return False
        
        try:
            container = client.containers.get(container_id)
            container.stop(timeout=10)
            logger.info(f"Container {container_id} stopped")
            return True
        except NotFound:
            logger.warning(f"Container not found: {container_id}")
            return False
        except APIError as e:
            logger.error(f"Failed to stop container {container_id}: {e}")
            return False
    
    @staticmethod
    async def restart_container(container_id: str) -> bool:
        """Restart a container"""
        client = get_docker_client()
        if not client:
            return False
        
        try:
            container = client.containers.get(container_id)
            container.restart(timeout=10)
            logger.info(f"Container {container_id} restarted")
            return True
        except NotFound:
            logger.warning(f"Container not found: {container_id}")
            return False
        except APIError as e:
            logger.error(f"Failed to restart container {container_id}: {e}")
            return False
    
    @staticmethod
    async def get_container_stats(container_id: str) -> Optional[Dict[str, Any]]:
        """Get resource usage statistics for a container"""
        client = get_docker_client()
        if not client:
            return None
        
        try:
            container = client.containers.get(container_id)
            stats = container.stats(stream=False)
            
            # Calculate CPU percentage
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                       stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                          stats['precpu_stats']['system_cpu_usage']
            num_cpus = stats['cpu_stats']['online_cpus']
            
            cpu_percent = (cpu_delta / system_delta * num_cpus * 100.0) if system_delta > 0 else 0.0
            
            # Calculate memory usage
            memory_usage = stats['memory_stats'].get('usage', 0)
            memory_limit = stats['memory_stats'].get('limit', 0)
            memory_percent = (memory_usage / memory_limit * 100.0) if memory_limit > 0 else 0.0
            
            return {
                'cpu_percent': round(cpu_percent, 2),
                'memory_usage': memory_usage,
                'memory_limit': memory_limit,
                'memory_percent': round(memory_percent, 2),
                'network_rx': stats.get('networks', {}).get('eth0', {}).get('rx_bytes', 0),
                'network_tx': stats.get('networks', {}).get('eth0', {}).get('tx_bytes', 0)
            }
        except Exception as e:
            logger.error(f"Failed to get stats for container {container_id}: {e}")
            return None
