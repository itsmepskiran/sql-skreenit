"""
Environment Configuration for MySQL + Supabase (Auth Only)
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# SUPABASE CONFIGURATION (AUTH ONLY)
# ============================================================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# ============================================================
# MYSQL CONFIGURATION (DATA STORAGE)
# ============================================================
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "skreenit")

# ============================================================
# APPLICATION CONFIGURATION
# ============================================================
APP_NAME = "Skreenit"
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# ============================================================
# FILE STORAGE (Hostinger File Manager)
# ============================================================
# For resumes, videos, profile images
UPLOAD_BASE_PATH = os.getenv("UPLOAD_BASE_PATH", "/uploads")
RESUME_UPLOAD_PATH = os.getenv("RESUME_UPLOAD_PATH", f"{UPLOAD_BASE_PATH}/resumes")
VIDEO_UPLOAD_PATH = os.getenv("VIDEO_UPLOAD_PATH", f"{UPLOAD_BASE_PATH}/videos")
PROFILE_IMAGE_UPLOAD_PATH = os.getenv("PROFILE_IMAGE_UPLOAD_PATH", f"{UPLOAD_BASE_PATH}/profile-images")

# Public URLs for serving files
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "https://login.skreenit.com")
RESUME_PUBLIC_URL = os.getenv("RESUME_PUBLIC_URL", f"{PUBLIC_BASE_URL}/uploads/resumes")
VIDEO_PUBLIC_URL = os.getenv("VIDEO_PUBLIC_URL", f"{PUBLIC_BASE_URL}/uploads/videos")
PROFILE_IMAGE_PUBLIC_URL = os.getenv("PROFILE_IMAGE_PUBLIC_URL", f"{PUBLIC_BASE_URL}/uploads/profile-images")

# ============================================================
# EMAIL CONFIGURATION (RESEND)
# ============================================================
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@skreenit.com")
FROM_NAME = os.getenv("FROM_NAME", "Skreenit")

# ============================================================
# JWT CONFIGURATION
# ============================================================
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", 7))

# ============================================================
# CORS CONFIGURATION
# ============================================================
ALLOWED_ORIGINS = [
    # Local development
    "http://localhost:8080",
    "http://localhost:8081",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081",
    # Production domains
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
    "https://aiskreenit.onrender.com",
    "https://hrms.skreenit.com",
    "https://app.skreenit.com",
    "https://in.skreenit.com",
    "https://support.skreenit.com",
    "https://legal.skreenit.com"
]

# ============================================================
# VALIDATION
# ============================================================
def validate_config():
    """Validate required environment variables."""
    required_vars = {
        "SUPABASE_URL": SUPABASE_URL,
        "SUPABASE_SERVICE_ROLE_KEY": SUPABASE_SERVICE_ROLE_KEY,
        "MYSQL_HOST": MYSQL_HOST,
        "MYSQL_USER": MYSQL_USER,
        "MYSQL_PASSWORD": MYSQL_PASSWORD,
        "MYSQL_DATABASE": MYSQL_DATABASE
    }
    
    missing_vars = [var for var, value in required_vars.items() if not value]
    
    if missing_vars:
        raise ValueError(
            f"❌ Missing required environment variables: {', '.join(missing_vars)}\n"
            f"Please set these in your .env file."
        )
    
    return True
    
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    print("✅ Configuration validated successfully")
    return True
