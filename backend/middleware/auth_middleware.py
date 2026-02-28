# backend/middleware/auth_middleware.py

import os
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from services.auth_service import AuthService
from utils_others.logger import logger

# ---------------------------------------------------------
# CONFIG: EXCLUDED PATHS (Public)
# ---------------------------------------------------------
EXCLUDED_PATHS = [
    "/",
    "",
    "/favicon.ico",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/health",
    "/api/v1/health",
    "/api/v1/login",
    "/api/v1/register",
    "/api/v1/confirm-email",
    "/api/v1/auth/confirm-email",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/refresh-token",
    "/api/v1/system/info",
]

class CustomAuthMiddleware(BaseHTTPMiddleware):
    """
    Custom Authentication Middleware that replaces Supabase auth middleware.
    Validates JWT tokens using the custom auth service.
    """

    def __init__(self, app, excluded_paths=None):
        super().__init__(app)
        # Combine passed paths with the global default list
        self.excluded_paths = set(excluded_paths or [])
        for p in EXCLUDED_PATHS:
            self.excluded_paths.add(p)
        self.auth_service = AuthService()

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # 1. Allow CORS preflight
        if request.method == "OPTIONS":
            return await call_next(request)

        # 2. Allow Static Files & Logos
        if path.startswith("/logos") or path.startswith("/static"):
             return await call_next(request)

        # 3. Check Excluded Paths
        # Clean path to handle trailing slashes or query params if needed
        clean_path = path.split("?")[0].rstrip("/") 
        if clean_path in self.excluded_paths or path in self.excluded_paths:
            return await call_next(request)

        # 4. Require Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
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
