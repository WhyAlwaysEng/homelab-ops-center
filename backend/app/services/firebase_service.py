"""
Firebase Service for Homelab & Network Ops Center
Handles real-time database operations and push notifications
"""

import firebase_admin
from firebase_admin import credentials, db, messaging
from datetime import datetime
from typing import Optional, Dict, Any
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Firebase app instance
_firebase_app = None


def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    global _firebase_app
    
    if _firebase_app is not None:
        return
    
    try:
        import os
        key_path = settings.FIREBASE_SERVICE_ACCOUNT_KEY_PATH
        db_url = settings.FIREBASE_DATABASE_URL
        
        if key_path and db_url and os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            _firebase_app = firebase_admin.initialize_app(cred, {
                'databaseURL': db_url
            })
            logger.info("Firebase initialized successfully")
        else:
            if not key_path:
                logger.warning("FIREBASE_SERVICE_ACCOUNT_KEY_PATH not set")
            elif not os.path.exists(key_path):
                logger.warning(f"Firebase key file not found: {key_path}")
            if not db_url:
                logger.warning("FIREBASE_DATABASE_URL not set")
            logger.info("Running without Firebase (optional)")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        logger.info("Continuing without Firebase")


class FirebaseService:
    """Service for Firebase Realtime Database operations"""
    
    @staticmethod
    def is_configured() -> bool:
        """Check if Firebase is properly configured"""
        return _firebase_app is not None
    
    @staticmethod
    async def push_metrics(metrics: Dict[str, Any]):
        """Push live system metrics to Firebase"""
        if not FirebaseService.is_configured():
            return
        
        try:
            db.reference('live_metrics').update({
                **metrics,
                'updated_at': datetime.utcnow().isoformat()
            })
            logger.debug("Metrics pushed to Firebase")
        except Exception as e:
            logger.error(f"Failed to push metrics to Firebase: {e}")
    
    @staticmethod
    async def push_container_status(container_id: str, status: Dict[str, Any]):
        """Push container status update to Firebase"""
        if not FirebaseService.is_configured():
            return
        
        try:
            db.reference(f'containers/{container_id}').update({
                **status,
                'updated_at': datetime.utcnow().isoformat()
            })
        except Exception as e:
            logger.error(f"Failed to push container status to Firebase: {e}")
    
    @staticmethod
    async def push_all_containers(containers: list):
        """Push all container statuses to Firebase"""
        if not FirebaseService.is_configured():
            return
        
        try:
            containers_data = {}
            for container in containers:
                containers_data[container['id']] = {
                    'name': container['name'],
                    'status': container['status'],
                    'image': container['image'],
                    'updated_at': datetime.utcnow().isoformat()
                }
            db.reference('containers').set(containers_data)
        except Exception as e:
            logger.error(f"Failed to push containers to Firebase: {e}")
    
    @staticmethod
    async def push_network_status(node_id: str, status: Dict[str, Any]):
        """Push network node status to Firebase"""
        if not FirebaseService.is_configured():
            return
        
        try:
            db.reference(f'network_nodes/{node_id}').update({
                **status,
                'last_check': datetime.utcnow().isoformat()
            })
        except Exception as e:
            logger.error(f"Failed to push network status to Firebase: {e}")
    
    @staticmethod
    async def push_alert(alert: Dict[str, Any]):
        """Push alert notification to Firebase"""
        if not FirebaseService.is_configured():
            return
        
        try:
            db.reference('alerts').push({
                **alert,
                'timestamp': datetime.utcnow().isoformat(),
                'read': False
            })
        except Exception as e:
            logger.error(f"Failed to push alert to Firebase: {e}")
    
    @staticmethod
    async def get_live_metrics() -> Optional[Dict[str, Any]]:
        """Get current live metrics from Firebase"""
        if not FirebaseService.is_configured():
            return None
        
        try:
            ref = db.reference('live_metrics')
            return ref.get()
        except Exception as e:
            logger.error(f"Failed to get metrics from Firebase: {e}")
            return None
    
    @staticmethod
    async def get_containers() -> Optional[Dict[str, Any]]:
        """Get all container statuses from Firebase"""
        if not FirebaseService.is_configured():
            return None
        
        try:
            ref = db.reference('containers')
            return ref.get()
        except Exception as e:
            logger.error(f"Failed to get containers from Firebase: {e}")
            return None
    
    @staticmethod
    async def send_push_notification(token: str, title: str, body: str) -> bool:
        """Send push notification via FCM"""
        if not FirebaseService.is_configured():
            return False
        
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                token=token,
            )
            response = messaging.send(message)
            logger.info(f"Push notification sent: {response}")
            return True
        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
            return False
    
    @staticmethod
    async def send_push_to_all_tokens(title: str, body: str):
        """Send push notification to all registered tokens"""
        if not FirebaseService.is_configured():
            return
        
        try:
            from app.database import get_db
            db_conn = await get_db()
            
            cursor = await db_conn.execute("SELECT token FROM fcm_tokens")
            tokens = await cursor.fetchall()
            
            for (token,) in tokens:
                await FirebaseService.send_push_notification(token, title, body)
                
        except Exception as e:
            logger.error(f"Failed to send push to all tokens: {e}")
