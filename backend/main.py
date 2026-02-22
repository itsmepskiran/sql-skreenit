import os
from dotenv import load_dotenv
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from utils_others.logger import logger
from utils_others.error_handler import register_exception_handlers

from middleware.security_headers import SecurityHeadersMiddleware
from middleware.auth_middleware import AuthMiddleware, EXCLUDED_PATHS

from routers import (
    auth,
    applicant,
    recruiter,
    dashboard,
    analytics,
    notification,
    video
)

ENV = os.getenv("ENVIRONMENT", "development")
IS_PROD = ENV == "production"

# ---------------------------------------------------------
# Initialize FastAPI
# ---------------------------------------------------------
app = FastAPI(
    title="Skreenit API",
    description="Backend API for Skreenit recruitment platform",
    version="1.0.0",
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    openapi_url="/openapi.json",
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # 1. Define the Security Scheme (Bearer Token)
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    
    # 2. Apply it globally to all endpoints
    # This tells Swagger: "Every endpoint needs this token"
    openapi_schema["security"] = [{"BearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
# ---------------------------------------------------------
# Mount Static Files (Logos) - CRITICAL FIX
# ---------------------------------------------------------
logos_dir = os.path.join(BASE_DIR, "logos")
if os.path.exists(logos_dir):
    app.mount("/logos", StaticFiles(directory=logos_dir), name="logos")
    print(f"✅ Mounted logos from: {logos_dir}")
else:
    print(f"⚠️ Warning: Logos directory not found at {logos_dir}")

# ---------------------------------------------------------
# Browser Display (Root)
# ---------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
async def root_page():
    # Uses f-string so {ENV} prints the actual value
    return f"""
    <html>
        <head>
            <title>Skreenit Backend API</title>
            <meta http-equiv="refresh" content="5;url=https://www.skreenit.com" />
        </head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <img src="/logos/logobrand.png" alt="Skreenit Logo" style="max-width: 200px;" />
            <h2>Skreenit Backend API</h2>
            <p>Running in <strong>{ENV}</strong> mode.</p>
        </body>
    </html>
    """

# ---------------------------------------------------------
# Logging
# ---------------------------------------------------------
def _mask(v: str | None) -> str | None:
    if not v: return None
    v = str(v)
    return (v[:8] + "...") if len(v) > 12 else "***"

logger.info("Backend Startup", extra={
    "environment": ENV,
    "supabase_url": _mask(os.getenv("SUPABASE_URL")),
})

# ---------------------------------------------------------
# Health Check
# ---------------------------------------------------------
@app.get("/health")
async def health_root():
    return {"status": "healthy", "version": "1.0.0", "environment": ENV}

# ---------------------------------------------------------
# Exception Handlers
# ---------------------------------------------------------
register_exception_handlers(app)

# ---------------------------------------------------------
# API Router
# ---------------------------------------------------------
api = APIRouter(prefix="/api/v1")
api.include_router(auth.router, tags=["Authentication"])
api.include_router(applicant.router, tags=["Applicant"])
api.include_router(recruiter.router, tags=["Recruiter"])
api.include_router(dashboard.router, tags=["Dashboard"])
api.include_router(analytics.router, tags=["Analytics"])
api.include_router(notification.router, tags=["Notification"])
api.include_router(video.router, tags=["Video"])

@api.get("/health")
async def versioned_health():
    return {"status": "healthy", "version": "1.0.0"}

app.include_router(api)

# ---------------------------------------------------------
# MIDDLEWARE SETUP (CRITICAL ORDER)
# ---------------------------------------------------------
# FastAPI executes middleware in REVERSE order of addition.
# Last added = First executed.
# Desired Execution Flow: CORS -> Security -> Auth -> App

# 3. Auth Middleware (Added First, Executed Last - Inner Layer)
class PatchedAuthMiddleware(AuthMiddleware): 
    async def dispatch(self, request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)
        return await super().dispatch(request, call_next)

app.add_middleware(PatchedAuthMiddleware, excluded_paths=EXCLUDED_PATHS)

# 2. Security Headers (Added Second, Executed Middle)
app.add_middleware(SecurityHeadersMiddleware)

# 1. CORS Middleware (Added Third, Executed First)
DEFAULT_ALLOWED_ORIGINS = [
    "https://www.skreenit.com",
    "https://skreenit.com",
    "https://login.skreenit.com",
    "https://auth.skreenit.com",
    "https://applicant.skreenit.com",
    "https://recruiter.skreenit.com",
    "https://dashboard.skreenit.com",
    "https://backend.skreenit.com",
    "https://aiskreenit.onrender.com",
]

LOCAL_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
]
if IS_PROD:
    origins = DEFAULT_ALLOWED_ORIGINS
else:
    origins = DEFAULT_ALLOWED_ORIGINS + LOCAL_DEV_ORIGINS

print(f"✅ DEBUG: CORS Origins set to: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# ---------------------------------------------------------
# Events
# ---------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    logger.info("Backend Started")

@app.on_event("shutdown")
async def on_shutdown():
    logger.info("Backend Stopped")