# =============================================================================
# SKREENIT LOCAL SERVER DOCKERFILE
# For: Intel Xeon E-2276M + 64GB RAM + NVIDIA Quadro T2000 (4GB)
# =============================================================================

# Step 1: Use NVIDIA CUDA base image for GPU support
FROM nvidia/cuda:11.8.0-runtime-ubuntu22.04

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production
ENV HOME=/root
ENV PYTHONPATH=/app
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Install Python and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3.10-dev \
    python3-pip \
    build-essential \
    ffmpeg \
    pkg-config \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libswscale-dev \
    libswresample-dev \
    libavfilter-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    git \
    git-lfs \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set Python3.10 as default
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

WORKDIR /app

# --- InsightFace Model Setup ---
# Create the hidden system directory
RUN mkdir -p /root/.insightface/models/buffalo_m

# Copy models from your project root into the system path
# Path: root -> backend -> resources -> models -> buffalo_m
COPY backend/resources/models/buffalo_m/ /root/.insightface/models/buffalo_m/

# Copy and install requirements
COPY backend/requirements.txt .

# Upgrade build tools and install requirements
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend code
COPY backend/ .

# Create directories for uploads and temp processing
RUN mkdir -p /app/uploads /app/temp /app/logs

# Expose the port for local server
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the app - main.py is at /app/main.py because we COPY backend/ .
# Using 4 workers for 64GB RAM system
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "4"]