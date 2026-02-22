# backend/middleware/auth_middleware.py

import os
import jwt
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from utils_others.logger import logger

# ---------------------------------------------------------
# CONFIG: EXCLUDED PATHS (Public)
# ---------------------------------------------------------
# ✅ FIX: Define this at the top level so main.py can import it
EXCLUDED_PATHS = [
    "/",
    "",
    "/favicon.ico",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/health",
    "/api/v1/health",
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/confirm-email",
    "/api/v1/auth/reset-password",
    "/api/v1/system/info",
]

class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, excluded_paths=None):
        super().__init__(app)
        # Combine passed paths with the global default list
        self.excluded_paths = set(excluded_paths or [])
        for p in EXCLUDED_PATHS:
            self.excluded_paths.add(p)

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
            return JSONResponse(status_code=401, content={"detail": "Missing Authorization header"})

        token = auth_header.replace("Bearer ", "").strip()
        secret = os.getenv("SUPABASE_JWT_SECRET", "").strip()

        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )

            # ✅ CRITICAL FIX: Map 'sub' (from JWT) to 'id' (expected by your code)
            payload["id"] = payload.get("sub")

            request.state.user = payload

        except Exception as e:
            logger.error(f"Token error: {str(e)}")
            return JSONResponse(status_code=401, content={"detail": "Invalid Token"})

        return await call_next(request)