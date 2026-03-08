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
    "/api/v1/update-password",
    "/api/v1/forgot-password",
    "/api/v1/reset-password",
    "/api/v1/verify-reset-token",
    "/api/v1/refresh-token",
    "/api/v1/system/info",
    "/api/v1/dashboard/jobs",
    "/api/v1/applicant/jobs",
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
        
        # DEBUG: Log path checking
        print(f"[AUTH_MIDDLEWARE] Request path: {path}, Method: {request.method}", flush=True)
        print(f"[AUTH_MIDDLEWARE] Excluded paths: {self.excluded_paths}", flush=True)
        
        # 1. Allow CORS preflight
        if request.method == "OPTIONS":
            print(f"[AUTH_MIDDLEWARE] OPTIONS request, allowing through", flush=True)
            return await call_next(request)

        # 2. Allow Static Files & Logos
        if path.startswith("/logos") or path.startswith("/static") or path.startswith("/uploads") or path.startswith("/datastorage"):
            return await call_next(request)

        # 3. Check Excluded Paths (Handling trailing slashes)
        clean_path = path.rstrip("/")
        is_excluded = clean_path in self.excluded_paths or path in self.excluded_paths
        print(f"[AUTH_MIDDLEWARE] clean_path: {clean_path}, is_excluded: {is_excluded}", flush=True)
        
        if is_excluded:
            print(f"[AUTH_MIDDLEWARE] Path {path} is EXCLUDED, allowing through", flush=True)
            return await call_next(request)

        # 4. Require Authorization header
        print(f"[AUTH_MIDDLEWARE] Path {path} is NOT excluded, checking auth", flush=True)
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            print(f"[AUTH_MIDDLEWARE] Missing Authorization for protected path: {path}", flush=True)
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