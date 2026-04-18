# Skreenit Local Server Architecture

## Overview

Your local machine now acts as the **backend server** with direct GPU access for heavy ML processing.

**Hardware:**
- Intel Xeon E-2276M @ 2.80GHz
- 64GB RAM
- NVIDIA Quadro T2000 (4GB VRAM)
- 1.86TB SSD

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLOUDFLARE PAGES                                  │
│                    (Frontend: *.skreenit.com)                               │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE TUNNEL                                   │
│                    (*.trycloudflare.com)                                    │
│         [ Bridges internet to your local machine ]                          │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      YOUR LOCAL MACHINE (Server)                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Backend API (FastAPI) - Port 8080                                  │   │
│  │  - Handles authentication, database, file uploads                   │   │
│  │  - GPU-accelerated video analysis (Whisper, FER, MediaPipe)         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Ollama (LLM) - Port 11434                                          │   │
│  │  - Local LLM for resume evaluation                                  │   │
│  │  - Runs entirely on this machine                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. Install NVIDIA CUDA Toolkit 11.8

Download and install from: https://developer.nvidia.com/cuda-11-8-0-download-archive

Verify installation:
```bash
nvidia-smi
```

### 2. Install Ollama

Download from: https://ollama.com

After installation, pull the model:
```bash
ollama pull llama3
```

### 3. Install cloudflared (for tunnel bridge)

Using winget:
```powershell
winget install --id Cloudflare.cloudflared
```

Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

## Installation

### Step 1: Create Python Environment

```powershell
cd f:\Skreenit_App
cd backend
python -m venv venv
venv\Scripts\activate
```

### Step 2: Install Dependencies

```powershell
# Install PyTorch with CUDA first
pip install torch==2.0.1+cu118 torchvision==0.15.2+cu118 torchaudio==2.0.2+cu118 --extra-index-url https://download.pytorch.org/whl/cu118

# Install remaining dependencies
pip install -r requirements.txt
```

### Step 3: Verify GPU Access

```powershell
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"
```

Expected output:
```
CUDA available: True
GPU: Quadro T2000
```

## Running the Server

### Method 1: Direct Python (Recommended for Development)

```powershell
cd f:\Skreenit_App\backend
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8080 --workers 4
```

### Method 2: Using Docker (with GPU support)

```powershell
cd f:\Skreenit_App

# Build image
docker build -t skreenit-backend .

# Run with GPU support
docker run -d --gpus all -p 8080:8080 --name skreenit-backend skreenit-backend
```

### Method 3: Using start.bat script

```powershell
cd f:\Skreenit_App\backend
start.bat
```

## Starting the Tunnel Bridge

Once the backend is running, start the tunnel to make it accessible from Cloudflare Pages:

### Option 1: Using Python Script (Recommended)

```powershell
cd f:\Skreenit_App
python tunnel-bridge.py
```

This will:
- Start the Cloudflare tunnel
- Display the public tunnel URL
- Automatically update `.env` with the tunnel URL
- Print instructions for frontend configuration

### Option 2: Using Batch Script

```powershell
cd f:\Skreenit_App
start-tunnel.bat
```

### Option 3: Manual

```powershell
cloudflared tunnel --url http://localhost:8080
```

## Frontend Configuration

Once the tunnel is running, you'll see a URL like:
```
https://something-unique.trycloudflare.com
```

Update your Cloudflare Pages frontend to use this URL:

### JavaScript:
```javascript
const API_BASE = "https://something-unique.trycloudflare.com";
```

### Environment Variable:
```
VITE_API_BASE_URL=https://something-unique.trycloudflare.com
```

## File Structure

```
f:\Skreenit_App\
├── backend\                    # FastAPI backend
│   ├── main.py                # Entry point
│   ├── config.py              # Configuration (updated for tunnel)
│   ├── requirements.txt       # GPU-optimized dependencies
│   ├── .env                   # Environment variables
│   └── ...
├── Dockerfile                 # CUDA-enabled Docker image
├── tunnel-bridge.py           # Python tunnel setup script
├── start-tunnel.bat          # Windows batch tunnel script
└── LOCAL-SERVER-SETUP.md      # This file
```

## Performance Expectations

With your hardware (Xeon + 64GB + Quadro T2000):

| Task | Expected Performance |
|------|---------------------|
| Video Analysis (Whisper + FER) | ~30-60 seconds per video |
| Resume Evaluation (Ollama) | ~10-30 seconds |
| Concurrent Users | 50+ simultaneous connections |
| GPU Memory Usage | ~3GB for ML workloads |

## Troubleshooting

### GPU Not Detected
```powershell
# Verify NVIDIA driver
nvidia-smi

# Reinstall PyTorch with CUDA
pip uninstall torch torchvision torchaudio
pip install torch==2.0.1+cu118 torchvision==0.15.2+cu118 torchaudio==2.0.2+cu118 --extra-index-url https://download.pytorch.org/whl/cu118
```

### Tunnel Not Starting
```powershell
# Verify cloudflared
cloudflared version

# If not installed:
winget install --id Cloudflare.cloudflared
```

### Ollama Connection Failed
```powershell
# Verify Ollama is running
ollama list

# Start Ollama if not running
ollama serve
```

### CORS Errors
The backend is configured to accept requests from:
- All `*.skreenit.com` domains
- All `*.trycloudflare.com` tunnels
- Local development ports (3000, 5173, 8000-8085)

If you see CORS errors, verify the tunnel URL is correct in your frontend.

## Security Notes

1. **Tunnel URLs are temporary** - Each time you restart the tunnel, you get a new URL. Consider using a named tunnel for permanent setup.

2. **Local-only Ollama** - The LLM runs entirely on your machine, keeping data private.

3. **No external backend** - Your data never leaves your machine (except through the secure tunnel).

## Next Steps

1. ✅ Install CUDA 11.8
2. ✅ Install Ollama and pull llama3
3. ✅ Install Python dependencies
4. ✅ Verify GPU is working
5. ⏳ Start the backend server
6. ⏳ Start the tunnel bridge
7. ⏳ Update frontend with tunnel URL

---

**Questions?** The tunnel URL changes each time you restart the tunnel. Update your frontend accordingly.
