# ===========================================
# Multi-stage Dockerfile for Python Backend
# Optimized for Orange Pi ARM64
# ===========================================

# Stage 1: Builder
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system dependencies for ARM64
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    linux-libc-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (better layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim AS production

WORKDIR /app

# Copy installed dependencies
COPY --from=builder /install /usr/local

# Copy application code
COPY app/ ./app/

# Create data directory
RUN mkdir -p /app/data

# Create non-root user for security
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health')" || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
