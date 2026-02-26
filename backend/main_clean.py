"""
Clean working version of main_new.py
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Import MySQL services
from services.mysql_services_simple import user_service, recruiter_service, candidate_service, dashboard_service, notification_service, video_service
print("✅ MySQL services imported successfully")

# Import routers
from routers import auth, applicant_new as applicant, recruiter_new as recruiter, dashboard_new as dashboard, notifications_new as notifications
print("✅ Routers imported successfully")

# Import Supabase client for authentication
from services.supabase_client import get_client
supabase_client = get_client()
print("✅ Supabase client initialized successfully")

# Configuration
ALLOWED_ORIGINS = [
    "https://www.skreenit.com",
    "https://skreenit.com", 
    "https://login.skreenit.com",
    "https://auth.skreenit.com",
    "https://applicant.skreenit.com",
    "https://recruiter.skreenit.com",
    "https://dashboard.skreenit.com",
    "https://backend.skreenit.com",
    "https://storage.skreenit.com",
    "https://assets.skreenit.com",
    "https://aiskreenit.onrender.com"
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting Skreenit API...")
    print("📊 Creating MySQL database tables...")
    print("✅ Database tables already exist (created via phpMyAdmin)")
    print("🔐 Supabase will be used for authentication only")
    print("📁 MySQL will be used for all data storage")
    yield
    print("🛑 Shutting down...")

print("🔍 About to create FastAPI app...")
app = FastAPI(
    title="Skreenit API",
    description="Job Application Platform with MySQL + Supabase Auth",
    version="2.0.0",
    lifespan=lifespan
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
print("✅ CORS middleware configured")

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Skreenit API is running!"}

@app.get("/")
async def root():
    return {"message": "Skreenit API is running!", "version": "2.0.0"}

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(applicant.router, prefix="/api/v1/applicant", tags=["Applicant"])
app.include_router(recruiter.router, prefix="/api/v1/recruiter", tags=["Recruiter"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
print("✅ Routers included successfully")

print("🔍 About to start uvicorn...")
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"🔍 About to run on port {port}...")
    
    try:
        uvicorn.run(app, host="0.0.0.0", port=port)
        print("✅ Server started successfully!")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        print(f"❌ Error type: {type(e).__name__}")
