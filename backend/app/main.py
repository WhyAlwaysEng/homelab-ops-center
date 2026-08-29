"""
Main application module for Homelab & Network Ops Center
FastAPI application with background workers and middleware
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import asyncio
import logging
import time

from app.config import settings
from app.database import get_db, close_db, run_retention_cleanup
from app.routers import system, network, ddns, settings as settings_router, backup, terminal, power, bandwidth, logs, scheduler
from app.services.firebase_service import initialize_firebase

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    
    Handles startup and shutdown events
    """
    # Startup
    logger.info("Starting Homelab & Network Ops Center")
    
    # Initialize database
    await get_db()
    logger.info("Database initialized")
    
    # Initialize Firebase
    initialize_firebase()
    logger.info("Firebase initialized")
    
    # Start background workers
    workers = []
    
    # Retention cleanup worker
    cleanup_task = asyncio.create_task(run_retention_cleanup())
    workers.append(cleanup_task)
    
    # Network ping worker
    from app.services.ping_service import run_ping_worker
    ping_task = asyncio.create_task(run_ping_worker())
    workers.append(ping_task)
    
    # DDNS worker
    from app.services.ddns_service import run_ddns_worker
    ddns_task = asyncio.create_task(run_ddns_worker())
    workers.append(ddns_task)
    
    logger.info("Background workers started")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")
    
    # Cancel background workers
    for task in workers:
        task.cancel()
    
    # Wait for workers to finish
    await asyncio.gather(*workers, return_exceptions=True)
    
    # Close database
    await close_db()
    
    # Close Docker client
    from app.services.docker_service import close_docker_client
    close_docker_client()
    
    logger.info("Application shutdown complete")


# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI application
app = FastAPI(
    title="Homelab & Network Ops Center",
    description="Self-hosted dashboard for homelab monitoring and management",
    version="1.0.0",
    lifespan=lifespan
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global exception handler for unhandled errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# Request timing middleware
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response

# CORS middleware
# In production, restrict to specific origins
allowed_origins = [
    "http://localhost:3000",           # Local dev
    "http://127.0.0.1:3000",           # Local dev (alternate)
]

# Add production origins from environment
import os
if os.environ.get("FRONTEND_URL"):
    allowed_origins.append(os.environ["FRONTEND_URL"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include routers
app.include_router(system.router)
app.include_router(network.router)
app.include_router(ddns.router)
app.include_router(settings_router.router)
app.include_router(backup.router)
app.include_router(terminal.router)
app.include_router(power.router)
app.include_router(bandwidth.router)
app.include_router(logs.router)
app.include_router(scheduler.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Homelab & Network Ops Center",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database
        db = await get_db()
        await db.execute("SELECT 1")
        
        return {
            "status": "healthy",
            "database": "connected",
            "firebase": "configured" if settings.FIREBASE_PROJECT_ID else "not_configured"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
