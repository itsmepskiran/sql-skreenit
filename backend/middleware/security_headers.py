# backend/middleware/security_headers.py

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Modern cross-origin protections
        # ✅ FIXED: 'unsafe-none' ensures external images/resources load without strict CORP headers
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Embedder-Policy"] = "unsafe-none" 
        response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"

        # Permissions Policy
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )

        # Prevent caching of API responses
        response.headers["Cache-Control"] = "no-store"

        # Content Security Policy (CSP)
        # Allows scripts/styles from 'self' and https sources. 
        # Allows connections to your backend and Supabase.
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; "
            "style-src 'self' 'unsafe-inline' https:; "
            "img-src 'self' data: https:; "
            "font-src 'self' https: data:; "
            "connect-src 'self' "
                "https://*.supabase.co https://*.supabase.in "
                "wss://*.supabase.co wss://*.supabase.in "
                "https://www.skreenit.com https://skreenit.com "
                "https://login.skreenit.com https://auth.skreenit.com "
                "https://applicant.skreenit.com https://recruiter.skreenit.com "
                "https://dashboard.skreenit.com https://backend.skreenit.com "
                "https://aiskreenit.onrender.com; "
            "frame-ancestors 'none'; "
        )

        return response