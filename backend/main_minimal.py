"""
Minimal FastAPI application that works with MySQL + R2 + Supabase.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Import Supabase for auth only
from services.supabase_client import get_client

# Validate configuration
def validate_config():
    """Validate required environment variables."""
    required_vars = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        "MYSQL_HOST": os.getenv("MYSQL_HOST"),
        "MYSQL_USER": os.getenv("MYSQL_USER"),
        "MYSQL_PASSWORD": os.getenv("MYSQL_PASSWORD"),
        "MYSQL_DATABASE": os.getenv("MYSQL_DATABASE")
    }
    
    missing_vars = [var for var, value in required_vars.items() if not value]
    
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    print("✅ Configuration validated successfully")
    return True

validate_config()

# ============================================================
# FASTAPI APP INITIALIZATION
# ============================================================

app = FastAPI(
    title="Skreenit API",
    description="Job Application Platform with MySQL + Supabase Auth",
    version="2.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# SUPABASE CLIENT (AUTH ONLY)
# ============================================================

supabase_client = get_client()

# ============================================================
# LIFESPAN
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize application."""
    print("🚀 Starting Skreenit API...")
    print("✅ Supabase client initialized successfully")
    print("🔐 Supabase will be used for authentication only")
    print("📁 MySQL will be used for all data storage")
    print("📁 R2 will be used for file storage")
    yield
    print("🛑 Shutting down...")

app.router.lifespan_context = lifespan

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
        "storage": "Cloudflare R2",
        "version": "2.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Skreenit API v2.0.0",
        "database": "MySQL",
        "auth": "Supabase",
        "storage": "Cloudflare R2",
        "docs": "/docs"
    }

# ============================================================
# AUTHENTICATION ENDPOINTS
# ============================================================

@app.get("/api/v1/auth/test")
async def test_auth():
    """Test authentication endpoint."""
    try:
        # Test Supabase connection
        user = supabase_client.auth.get_user("test")
        return {"status": "auth working", "user": user}
    except Exception as e:
        return {"status": "auth error", "error": str(e)}

# ============================================================
# DATABASE ENDPOINTS
# ============================================================

@app.get("/api/v1/db/test")
async def test_database():
    """Test database connection."""
    try:
        from database_minimal import get_db_session
        
        with get_db_session() as db:
            result = db.execute("SELECT 1 as test").fetchone()
            return {"status": "database working", "result": result[0]}
    except Exception as e:
        return {"status": "database error", "error": str(e)}

# ============================================================
# R2 ENDPOINTS
# ============================================================

@app.get("/api/v1/r2/test")
async def test_r2():
    """Test R2 connection."""
    try:
        from services.r2_service import r2_service
        
        # Test upload
        test_content = b"test file content"
        test_url = r2_service.upload_file(test_content, "test.txt", "resumes")
        
        return {"status": "R2 working", "test_url": test_url}
    except Exception as e:
        return {"status": "R2 error", "error": str(e)}

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

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main_minimal:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )
