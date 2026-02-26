"""
Updated main.py to use MySQL for data + Supabase for auth.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import create_client
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Import new MySQL services
# Import new MySQL services
from services.mysql_services_simple import user_service, recruiter_service, candidate_service, dashboard_service, notification_service, video_service
# from services.supabase_client import get_client
from config import validate_config, ALLOWED_ORIGINS

# Validate configuration
print("🔍 About to validate config...")
validate_config()
print("✅ Configuration validated successfully")

# ============================================================
# FASTAPI APP INITIALIZATION
# ============================================================

print("🔍 About to create FastAPI app...")
app = FastAPI(
    title="Skreenit API",
    description="Job Application Platform with MySQL + Supabase Auth",
    version="2.0.0"
    # lifespan=lifespan
)
print("✅ FastAPI app created successfully")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# SUPABASE CLIENT (AUTH ONLY)
# ============================================================

# supabase_client = get_client()

# ============================================================
# DATABASE INITIALIZATION
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup."""
    print("🚀 Starting Skreenit API...")
    print("📊 Creating MySQL database tables...")
    try:
        create_tables()
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"❌ Database tables creation failed: {str(e)}")
    print("🔐 Supabase will be used for authentication only")
    print("📁 MySQL will be used for all data storage")
    yield
    print("🛑 Shutting down...")

print("🔍 About to set lifespan...")
app.lifespan = lifespan
print("✅ Lifespan set successfully")

# ============================================================
# AUTHENTICATION MIDDLEWARE
# ============================================================

async def get_current_user(request: Request):
    """Get current user from Supabase JWT token."""
    try:
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        
        # Verify with Supabase
        user = supabase_client.auth.get_user(token)
        if not user:
            return None
        
        # Sync user to MySQL if needed
        user_data = {
            "id": user.id,
            "email": user.email,
            "full_name": user.user_metadata.get("full_name") if user.user_metadata else None,
            "phone": user.phone,
            "role": user.user_metadata.get("role", "candidate") if user.user_metadata else "candidate",
            "avatar_url": user.user_metadata.get("avatar_url") if user.user_metadata else None,
            "metadata": user.user_metadata
        }
        
        user_service.sync_user_from_supabase(user_data)
        
        return {
            "id": user.id,
            "email": user.email,
            "role": user.user_metadata.get("role", "candidate") if user.user_metadata else "candidate",
            "full_name": user.user_metadata.get("full_name") if user.user_metadata else user.email
        }
    
    except Exception as e:
        print(f"Auth error: {e}")
        return None

async def require_auth(request: Request):
    """Require authentication."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user

# ============================================================
# INCLUDE ROUTERS (Updated to use MySQL)
# ============================================================
print("🔍 About to import routers...")
# Include routers
# from routers import auth, applicant_new as applicant, recruiter_new as recruiter, dashboard_new as dashboard, notifications_new as notifications
print("✅ Routers imported successfully (temporarily disabled)")

# Auth router (uses Supabase)
# app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])

# Data routers (use MySQL)
# app.include_router(applicant.router, prefix="/api/v1/applicant", tags=["Applicant"])
# app.include_router(recruiter.router, prefix="/api/v1/recruiter", tags=["Recruiter"])
# app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
# app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])

# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "database": "MySQL",
        "auth": "Supabase",
        "version": "2.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Skreenit API v2.0.0",
        "database": "MySQL",
        "auth": "Supabase",
        "docs": "/docs"
    }

# ============================================================
# ERROR HANDLING
# ============================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    print(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "status_code": 500}
    )

# ============================================================
# MIGRATION HELPER
# ============================================================

@app.get("/api/v1/migrate/supabase-to-mysql")
async def migrate_supabase_to_mysql():
    """
    One-time migration endpoint to sync Supabase data to MySQL.
    Run this after setting up MySQL database.
    """
    try:
        # This would need to be implemented based on your existing Supabase data
        # For now, just return instructions
        return {
            "message": "Manual migration required",
            "instructions": [
                "1. Export data from Supabase tables",
                "2. Transform data to match MySQL schema",
                "3. Import into MySQL database",
                "4. Run this endpoint to verify migration"
            ],
            "schema_file": "/database/schema.sql"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")

if __name__ == "__main__":
    print("🔍 About to start uvicorn...")
    import uvicorn
    
    port = int(os.getenv("PORT", 9999))
    print(f"🔍 About to run on port {port}...")
    print(f"🔍 App object: {app}")
    print(f"🔍 About to call uvicorn.run...")
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=port
        )
        print("✅ Uvicorn started successfully")
    except Exception as e:
        print(f"❌ Uvicorn failed to start: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
