"""
Database module for Homelab & Network Ops Center
SQLite with WAL mode for concurrent read/write operations
"""

import aiosqlite
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Global database connection
_db: Optional[aiosqlite.Connection] = None
_db_lock = asyncio.Lock()


async def get_db() -> aiosqlite.Connection:
    """Get or create database connection with WAL mode"""
    global _db
    if _db is None:
        async with _db_lock:
            if _db is None:
                logger.info(f"Initializing database at {settings.DB_PATH}")
                _db = await aiosqlite.connect(settings.DB_PATH)
                
                # Enable WAL mode for better concurrency
                await _db.execute("PRAGMA journal_mode=WAL")
                await _db.execute("PRAGMA synchronous=NORMAL")
                await _db.execute("PRAGMA cache_size=-64000")  # 64MB page cache
                await _db.execute("PRAGMA temp_store=MEMORY")
                
                # Create tables
                await create_tables(_db)
                
                logger.info("Database initialized successfully")
    return _db


async def create_tables(db: aiosqlite.Connection):
    """Create database tables if they don't exist"""
    
    # Monitored network nodes
    await db.execute("""
        CREATE TABLE IF NOT EXISTS monitored_nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            host TEXT NOT NULL UNIQUE,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Latency logs for network monitoring
    await db.execute("""
        CREATE TABLE IF NOT EXISTS latency_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            node_id INTEGER NOT NULL,
            latency_ms REAL,
            packet_loss_pct REAL DEFAULT 0,
            status TEXT CHECK(status IN ('UP', 'DOWN')),
            checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (node_id) REFERENCES monitored_nodes(id) ON DELETE CASCADE
        )
    """)
    
    # DDNS change logs
    await db.execute("""
        CREATE TABLE IF NOT EXISTS ddns_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            old_ip TEXT,
            new_ip TEXT NOT NULL,
            record_name TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # FCM tokens for push notifications
    await db.execute("""
        CREATE TABLE IF NOT EXISTS fcm_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL UNIQUE,
            user_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create indexes for better query performance
    await db.execute("CREATE INDEX IF NOT EXISTS idx_latency_logs_node_id ON latency_logs(node_id)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_latency_logs_checked_at ON latency_logs(checked_at)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_ddns_logs_updated_at ON ddns_logs(updated_at)")
    
    await db.commit()


async def cleanup_old_logs():
    """Delete logs older than retention period"""
    global _db
    if _db is None:
        return
    
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=settings.LOG_RETENTION_DAYS)
        
        # Delete old latency logs
        cursor = await _db.execute(
            "DELETE FROM latency_logs WHERE checked_at < ?",
            (cutoff_date.isoformat(),)
        )
        latency_deleted = cursor.rowcount
        
        # Delete old DDNS logs
        cursor = await _db.execute(
            "DELETE FROM ddns_logs WHERE updated_at < ?",
            (cutoff_date.isoformat(),)
        )
        ddns_deleted = cursor.rowcount
        
        await _db.commit()
        
        if latency_deleted > 0 or ddns_deleted > 0:
            logger.info(f"Cleaned up {latency_deleted} latency logs and {ddns_deleted} DDNS logs")
            
    except Exception as e:
        logger.error(f"Error cleaning up old logs: {e}")


async def close_db():
    """Close database connection"""
    global _db
    if _db:
        await _db.close()
        _db = None
        logger.info("Database connection closed")


async def run_retention_cleanup():
    """Background task to clean up old logs periodically"""
    while True:
        await asyncio.sleep(3600)  # Run every hour
        await cleanup_old_logs()
