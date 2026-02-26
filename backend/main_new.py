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
    print(f"[✗] Failed to import database module: {e}")
    sys.exit(1)

# ============================================================
# 3. SERVICES INITIALIZATION
# ============================================================

try:
    from services.mysql_service import (
        UserService,
        RecruiterService,
        CandidateService,
        DashboardService,
        NotificationService,
        VideoService
    )
    print("[✓] MySQL services loaded")
except ImportError as e:
    print(f"[✗] Failed to import MySQL services: {e}")
    sys.exit(1)

try:
    from services.supabase_client import get_client
    print("[✓] Supabase client loaded")
except ImportError as e:
    print(f"[✗] Failed to import Supabase client: {e}")
    sys.exit(1)

# Initialize Supabase client
try:
    print("[*] Initializing Supabase client...")
    supabase_client = get_client()
    print("[✓] Supabase client initialized")
except Exception as e:
    print(f"[✗] Failed to initialize Supabase client: {e}")
    sys.exit(1)

# Initialize service instances
try:
    print("[*] Initializing services...")
    user_service = UserService()
    recruiter_service = RecruiterService()
    candidate_service = CandidateService()
    dashboard_service = DashboardService()
    notification_service = NotificationService()
    video_service = VideoService()
    print("[✓] All services initialized")
except Exception as e:
    print(f"[✗] Failed to initialize services: {e}")
    sys.exit(1)

# ============================================================
# 4. LIFESPAN CONTEXT (Startup/Shutdown)
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan:
    - Startup: Create database tables
    - Shutdown: Cleanup
    """
    # Startup
    print("\n" + "=" * 60)
    print("🚀 STARTING SKREENIT API")
    print("=" * 60)
    
    try:
        print("📊 Creating MySQL database tables...")
        # Safely get and call create_tables function
        create_tables_fn = getattr(database, 'create_tables', None)
        if create_tables_fn and callable(create_tables_fn):
            create_tables_fn()
            print("[✓] Database tables created successfully")
        else:
            print("[!] create_tables function not found in database module")
    except Exception as e:
        print(f"⚠️  Database tables initialization: {e}")
    
    print("🔐 Auth: Supabase (JWT-based)")
    print("📁 Data: MySQL (via SQLAlchemy)")
    print("🪣 Storage: Cloudflare R2")
    print("✅ API Ready for requests")
    print("=" * 60 + "\n")
    
    yield
    
    # Shutdown
    print("\n" + "=" * 60)
    print("🛑 SHUTTING DOWN SKREENIT API")
    print("=" * 60)

# ============================================================
# 5. FASTAPI APP CREATION
# ============================================================

try:
    print("🔍 Creating FastAPI application...")
    app = FastAPI(
        title="Skreenit API",
        description="Recruitment Platform: MySQL + Supabase Auth + R2 Storage",
        version="2.0.0",
        lifespan=lifespan
    )
    print("✅ FastAPI application created")
except Exception as e:
    print(f"❌ Failed to create FastAPI app: {e}")
    sys.exit(1)

# ============================================================
# 6. MIDDLEWARE SETUP
# ============================================================

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print("✅ CORS middleware configured")

# ============================================================
# 7. AUTHENTICATION & MIDDLEWARE
# ============================================================

async def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """
    Extract and verify current user from JWT token.
    Syncs user to MySQL if needed.
    """
    try:
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        
        # Verify token with Supabase
        user_response = supabase_client.auth.get_user(token)
        if not user_response:
            return None
        
        # Extract user data (handle Supabase UserResponse object)
        try:
            user = user_response.user if hasattr(user_response, 'user') else user_response
        except:
            user = user_response
        
        # Extract metadata safely
        metadata = getattr(user, 'user_metadata', {}) or {}
        
        # Build user data dict for database sync
        user_data = {
            "id": getattr(user, 'id', None),
            "email": getattr(user, 'email', None),
            "full_name": metadata.get("full_name") if isinstance(metadata, dict) else None,
            "phone": getattr(user, 'phone', None),
            "role": metadata.get("role", "candidate") if isinstance(metadata, dict) else "candidate",
            "avatar_url": metadata.get("avatar_url") if isinstance(metadata, dict) else None,
            "metadata": metadata
        }
        
        # Validate required fields
        if not user_data.get("id") or not user_data.get("email"):
            return None
        
        # Sync to MySQL
        try:
            user_service.sync_user_from_supabase(user_data)
        except Exception as e:
            print(f"⚠️  Failed to sync user to MySQL: {e}")
            # Continue anyway - user is authenticated
        
        return {
            "id": user_data["id"],
            "email": user_data["email"],
            "role": user_data["role"],
            "full_name": user_data["full_name"] or user_data["email"]
        }
    
    except Exception as e:
        print(f"⚠️  Auth error: {e}")
        return None


async def require_auth(request: Request) -> Dict[str, Any]:
    """Dependency: Require authentication."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user

# ============================================================
# 8. ROUTER REGISTRATION
# ============================================================

try:
    print("🔍 Loading routers...")
    
    # Try to import current routers
    try:
        from routers import auth
        app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
        print("  ✅ Auth router loaded")
    except Exception as e:
        print(f"  ⚠️  Auth router: {e}")
    
    # Data routers
    for router_info in [
        ("applicant_new", "Applicant"),
        ("recruiter_new", "Recruiter"),
        ("dashboard_new", "Dashboard"),
        ("notifications_new", "Notifications"),
        ("video", "Video"),
    ]:
        router_name, tag = router_info
        try:
            module = __import__(f"routers.{router_name}", fromlist=[router_name])
            if hasattr(module, 'router'):
                app.include_router(
                    module.router,
                    prefix=f"/api/v1/{router_name.replace('_new', '')}",
                    tags=[tag]
                )
                print(f"  ✅ {tag} router loaded")
            else:
                print(f"  ⚠️  {tag} router: No 'router' object found")
        except Exception as e:
            print(f"  ⚠️  {tag} router: {e}")
    
    print("✅ Router configuration complete")
    
except Exception as e:
    print(f"⚠️  Router loading error: {e}")

# ============================================================
# 9. HEALTH CHECK & INFO ENDPOINTS
# ============================================================

@app.get("/health", tags=["System"])
async def health_check() -> Dict[str, Any]:
    """System health check endpoint."""
    return {
        "status": "healthy",
        "database": "MySQL",
        "auth": "Supabase",
        "storage": "Cloudflare R2",
        "version": "2.0.0"
    }


@app.get("/", tags=["System"])
async def root() -> Dict[str, Any]:
    """Root endpoint with API information."""
    return {
        "message": "Skreenit Recruitment Platform API",
        "version": "2.0.0",
        "architecture": {
            "database": "MySQL (Hostinger)",
            "authentication": "Supabase",
            "storage": "Cloudflare R2"
        },
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/api/v1/status", tags=["System"])
async def api_status() -> Dict[str, Any]:
    """API status endpoint."""
    return {
        "api": "operational",
        "database": "MySQL",
        "auth": "Supabase",
        "storage": "Cloudflare R2",
        "timestamp": __import__('datetime').datetime.utcnow().isoformat()
    }

# ============================================================
# 10. ERROR HANDLERS
# ============================================================

@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors (form parameters, etc)."""
    errors = exc.errors()
    print(f"\n❌ VALIDATION ERROR on {request.method} {request.url.path}")
    print(f"   Details: {errors}")
    
    # Try to read the body for debugging
    try:
        body = await request.body()
        print(f"   Request body: {body}")
    except:
        pass
    
    return JSONResponse(
        status_code=400,
        content={
            "error": "Validation error",
            "details": [{"field": e.get("loc", "unknown"), "message": e.get("msg", "Invalid")} for e in errors],
            "status_code": 400
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": request.url.path
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    import traceback
    
    print(f"❌ Unhandled exception: {type(exc).__name__}: {exc}")
    traceback.print_exc()
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "type": type(exc).__name__
        }
    )

# ============================================================
# 11. STARTUP SUMMARY
# ============================================================

print("\n✅ APPLICATION INITIALIZATION COMPLETE")
print("=" * 60)

# ============================================================
# 12. MAIN ENTRY POINT
# ============================================================

if __name__ == "__main__":
    import uvicorn
    
    PORT = int(os.getenv("PORT", 8000))
    HOST = os.getenv("HOST", "0.0.0.0")
    
    print(f"\n🚀 Starting Skreenit API on {HOST}:{PORT}")
    print(f"📖 API Documentation: http://{HOST}:{PORT}/docs")
    print("=" * 60 + "\n")
    
    try:
        uvicorn.run(
            app,
            host=HOST,
            port=PORT,
            reload=os.getenv("DEBUG", "false").lower() == "true"
        )
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
