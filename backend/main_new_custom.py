import os
import sys
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

print("=" * 60)
print("[*] SKREENIT API INITIALIZATION")
print("=" * 60)

# ============================================================
# 1. CONFIGURATION & VALIDATION
# ============================================================

try:
    from config import validate_config, ALLOWED_ORIGINS
    print("[✓] Config module loaded")
except ImportError as e:
    print(f"[✗] Failed to import config: {e}")
    sys.exit(1)

try:
    print("[*] Validating configuration...")
    validate_config()
    print("[✓] Configuration validated successfully")
except ValueError as e:
    print(f"[✗] Configuration validation failed: {e}")
    sys.exit(1)
except Exception as e:
    print(f"[✗] Unexpected error during config validation: {e}")
    sys.exit(1)

# ============================================================
# 2. DATABASE SETUP
# ============================================================

# Database module will be used in lifespan context
try:
    import database
    print("[✓] Database module loaded")
except ImportError as e:
    print(f"[✗] Failed to import database: {e}")
    sys.exit(1)

# ============================================================
# 3. CUSTOM AUTHENTICATION SETUP
# ============================================================

try:
    from services.auth_service import AuthService
    print("[✓] Custom auth service loaded")
except ImportError as e:
    print(f"[✗] Failed to import auth service: {e}")
    sys.exit(1)

# Initialize custom auth service
try:
    print("[*] Initializing custom auth service...")
    auth_service = AuthService()
    print("[✓] Custom auth service initialized")
except Exception as e:
    print(f"[✗] Failed to initialize auth service: {e}")
    sys.exit(1)

# Initialize service instances
try:
    from services.mysql_service import UserService
    user_service = UserService()
    print("[✓] User service initialized")
except ImportError as e:
    print(f"[✗] Failed to import user service: {e}")
    sys.exit(1)

# ============================================================
# 4. LIFESPAN MANAGEMENT
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[*] Starting up application...")
    
    # Initialize database tables
    try:
        database.init_db_tables()
        print("[✓] Database tables initialized")
    except Exception as e:
        print(f"⚠️  Database tables initialization: {e}")
    
    print("🔐 Auth: Custom JWT-based")
    print("📁 Data: MySQL (via SQLAlchemy)")
    print("🪣 Storage: Cloudflare R2")
    print("✅ API Ready for requests")
    
    yield
    
    # Shutdown
    print("[*] Shutting down application...")

# ============================================================
# 5. FASTAPI APPLICATION
# ============================================================

def create_app() -> FastAPI:
    print("🔍 Creating FastAPI application...")
    app = FastAPI(
        title="Skreenit API",
        description="Recruitment Platform: MySQL + Custom Auth + R2 Storage",
        version="2.0.0",
        lifespan=lifespan
    )

    # ========================================================
    # MIDDLEWARE
    # ========================================================
    
    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Custom Auth Middleware
    try:
        from middleware.auth_middleware import CustomAuthMiddleware
        app.add_middleware(CustomAuthMiddleware)
        print("[✓] Custom auth middleware added")
    except ImportError as e:
        print(f"[✗] Failed to add auth middleware: {e}")

    # Security Headers Middleware
    try:
        from middleware.security_headers import SecurityHeadersMiddleware
        app.add_middleware(SecurityHeadersMiddleware)
        print("[✓] Security headers middleware added")
    except ImportError as e:
        print(f"[✗] Failed to add security headers: {e}")

    # ========================================================
    # EXCEPTION HANDLERS
    # ========================================================

    @app.exception_handler(ValidationError)
    async def validation_exception_handler(request: Request, exc: ValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors()}
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        print(f"Unhandled exception: {exc}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )

    # ========================================================
    # AUTHENTICATION DEPENDENCY
    # ========================================================

    async def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
        """Get current authenticated user from JWT token."""
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        
        # Verify token with custom auth service
        try:
            user_data = auth_service.verify_token(token)
            if not user_data:
                return None
            
            # Sync to MySQL
            try:
                user_service.create_user_from_auth(user_data)
            except Exception as e:
                print(f"⚠️  Failed to sync user to MySQL: {e}")
                # Continue anyway - user is authenticated
            
            return user_data
            
        except Exception as e:
            print(f"Token verification failed: {e}")
            return None

    # ========================================================
    # ROUTERS
    # ========================================================

    # Auth Router
    try:
        from routers.auth import router as auth_router
        app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
        print("[✓] Auth router included")
    except ImportError as e:
        print(f"[✗] Failed to include auth router: {e}")

    # Other routers (add as needed)
    # try:
    #     from routers.jobs import router as jobs_router
    #     app.include_router(jobs_router, prefix="/jobs", tags=["Jobs"])
    #     print("[✓] Jobs router included")
    # except ImportError as e:
    #     print(f"[✗] Failed to include jobs router: {e}")

    # ========================================================
    # HEALTH CHECK ENDPOINTS
    # ========================================================

    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "database": "MySQL",
            "auth": "Custom JWT",
            "storage": "Cloudflare R2",
            "version": "2.0.0"
        }

    @app.get("/")
    async def root():
        return {
            "message": "Skreenit API",
            "version": "2.0.0",
            "architecture": {
                "database": "MySQL (Hostinger)",
                "authentication": "Custom JWT",
                "storage": "Cloudflare R2"
            },
            "docs": "/docs",
            "health": "/health"
        }

    @app.get("/status")
    async def status():
        return {
            "api": "operational",
            "database": "MySQL",
            "auth": "Custom JWT",
            "storage": "Cloudflare R2",
            "timestamp": __import__('datetime').datetime.utcnow().isoformat()
        }

    return app

# ============================================================
# 6. APPLICATION ENTRY POINT
# ============================================================

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main_new:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )
