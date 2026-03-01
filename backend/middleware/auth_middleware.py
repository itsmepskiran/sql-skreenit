# backend/middleware/auth_middleware.py

import os
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
from services.auth_service import AuthService
from utils_others.logger import logger

# ---------------------------------------------------------
# CONFIG: EXCLUDED PATHS (Public)
# ---------------------------------------------------------
# Ensure these match the exact prefixes and full paths used in your routers
EXCLUDED_PATHS = {
    "/",
    "/favicon.ico",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/health",
    "/api/v1/health",
    "/api/v1/login",
    "/api/v1/register",
    "/api/v1/confirm-email",
    "/api/v1/reset-password",
    "/api/v1/refresh-token",
    "/api/v1/system/info",
}

class CustomAuthMiddleware(BaseHTTPMiddleware):
    """
    Custom Authentication Middleware.
    Validates JWT tokens using the custom auth service.
    """

    def __init__(self, app, excluded_paths=None):
        super().__init__(app)
        # Combine provided paths with default excluded set
        self.excluded_paths = EXCLUDED_PATHS.copy()
        if excluded_paths:
            self.excluded_paths.update(excluded_paths)
        self.auth_service = AuthService()

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # 1. Allow CORS preflight
        if request.method == "OPTIONS":
            return await call_next(request)

        # 2. Allow Static Files & Logos
        if path.startswith("/logos") or path.startswith("/static"):
            return await call_next(request)

        # 3. Check Excluded Paths (Handling trailing slashes)
        clean_path = path.rstrip("/")
        if clean_path in self.excluded_paths or path in self.excluded_paths:
            return await call_next(request)

        # 4. Require Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.warning(f"Missing Authorization for protected path: {path}")
            return JSONResponse(
                status_code=401, 
                content={"detail": "Missing Authorization header"}
            )

        # Extract token
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401, 
                content={"detail": "Invalid Authorization header format"}
            )

        token = auth_header.replace("Bearer ", "").strip()

        try:
            # Verify token using custom auth service
            user_data = self.auth_service.verify_token(token)
            
            # Add user data to request state
            request.state.user = user_data

        except ValueError as e:
            logger.error(f"Authentication failed: {str(e)}")
            return JSONResponse(
                status_code=401, 
                content={"detail": str(e)}
            )
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            return JSONResponse(
                status_code=401, 
                content={"detail": "Invalid authentication token"}
            )

        return await call_next(request)