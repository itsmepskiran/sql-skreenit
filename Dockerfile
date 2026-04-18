# Step 1: Use a slim Python image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production
ENV HOME=/root
ENV PYTHONPATH=/app
# Install system dependencies
# Added build-essential and python3-dev for GCC/Compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
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
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Git LFS Setup ---
# Install git-lfs to pull LFS files during build
RUN apt-get update && apt-get install -y --no-install-recommends git-lfs && rm -rf /var/lib/apt/lists/*

# --- InsightFace Model Setup ---
# Create the hidden system directory
RUN mkdir -p /root/.insightface/models/buffalo_m

# Copy models from your project root into the system path
# Path: root -> backend -> resources -> models -> buffalo_m
COPY backend/resources/models/buffalo_m/ /root/.insightface/models/buffalo_m/

# Verify models are actual files not LFS pointers, download if needed
RUN cd /root/.insightface/models/buffalo_m/ && \
    echo "Checking model files..." && \
    for f in *.onnx; do \
        if [ -f "$f" ]; then \
            size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null || echo "0"); \
            echo "$f size: $size bytes"; \
            if [ "$size" -lt 1000 ]; then \
                echo "ERROR: $f is too small (likely LFS pointer), need to download manually"; \
            fi; \
        else \
            echo "ERROR: $f not found"; \
        fi; \
    done && \
    ls -lh /root/.insightface/models/buffalo_m/

# Copy and install requirements
COPY backend/requirements.txt .

# Upgrade build tools and install requirements
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend code
COPY backend/ .

# Expose the port Render expects
EXPOSE 8080

# Start the app - main.py is at /app/main.py because we COPY backend/ .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]