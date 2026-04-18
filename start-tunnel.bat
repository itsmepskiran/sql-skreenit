@echo off
REM =============================================================================
REM SKREENIT TUNNEL BRIDGE - Local Server to Cloudflare Pages
REM =============================================================================
REM This script starts a Cloudflare tunnel that bridges:
REM - Backend: Local server (http://localhost:8080)
REM - Frontend: Cloudflare Pages (https://*.skreenit.com)
REM 
REM Hardware: Xeon E-2276M + 64GB RAM + Quadro T2000 (4GB)
REM =============================================================================

echo.
echo =============================================================================
echo SKREENIT TUNNEL BRIDGE
echo =============================================================================
echo.
echo This will create a secure tunnel from your local server to the internet.
echo The tunnel URL will be used by the Cloudflare Pages frontend.
echo.
echo Backend (Local): http://localhost:8080
echo Frontend (Cloudflare Pages): https://*.skreenit.com
echo.
echo =============================================================================
echo.

REM Check if cloudflared is installed
where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: cloudflared is not installed!
    echo.
    echo Please install cloudflared:
    echo   1. Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
    echo   2. Or use winget: winget install --id Cloudflare.cloudflared
    echo.
    pause
    exit /b 1
)

echo [1/3] cloudflared found...
echo.

REM Start the tunnel
echo [2/3] Starting Cloudflare tunnel...
echo [3/3] Tunnel will forward: localhost:8080 --^> public URL
echo.
echo =============================================================================
echo TUNNEL STARTED - Share this URL with your frontend:
echo =============================================================================
echo.

cloudflared tunnel --url http://localhost:8080

echo.
echo =============================================================================
echo TUNNEL CLOSED
echo =============================================================================
echo.
pause
