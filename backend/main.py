import os
from dotenv import load_dotenv
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from fastapi import FastAPI, APIRouter, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from jinja2 import Environment, FileSystemLoader
from utils_others.logger import logger
from utils_others.error_handler import register_exception_handlers

from middleware.security_headers import SecurityHeadersMiddleware
from middleware.auth_middleware import CustomAuthMiddleware, EXCLUDED_PATHS

from routers import (
    auth,
    applicant_new as applicant,
    recruiter_new as recruiter,
    dashboard_new as dashboard,
    analytics,
    notifications_new as notification,
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
# Setup Jinja2 Template Environment
# ---------------------------------------------------------
template_dir = os.path.join(BASE_DIR, "..", "assets", "templates")
if os.path.exists(template_dir):
    template_env = Environment(
        loader=FileSystemLoader(template_dir),
        autoescape=True
    )
    print(f"✅ Templates loaded from: {template_dir}")
else:
    print(f"⚠️ Warning: Templates directory not found at {template_dir}")
    template_env = None

# ---------------------------------------------------------
# Mount Static Files (Logos & Assets) - CRITICAL FIX
# ---------------------------------------------------------
logos_dir = os.path.join(BASE_DIR, "logos")
if os.path.exists(logos_dir):
    app.mount("/logos", StaticFiles(directory=logos_dir), name="logos")
    print(f"✅ Mounted logos from: {logos_dir}")
else:
    print(f"⚠️ Warning: Logos directory not found at {logos_dir}")

# Mount assets directory for templates to access static files
assets_dir = os.path.join(BASE_DIR, "..", "assets")
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    print(f"✅ Mounted assets from: {assets_dir}")
else:
    print(f"⚠️ Warning: Assets directory not found at {assets_dir}")

# ---------------------------------------------------------
# Browser Display (Root)
# ---------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
async def root_page():
    if not template_env:
        # Fallback to simple HTML if template not found
        return HTMLResponse("""
        <html>
            <head><title>Skreenit Backend API</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h2>Skreenit Backend API</h2>
                <p>Running in {} mode.</p>
            </body>
        </html>
        """.format(ENV))
    
    try:
        template = template_env.get_template("welcome.html")
        
        # Prepare template context
        context = {
            "ENV": ENV,
            "loginLink": "https://login.skreenit.com" if IS_PROD else "http://localhost:8080/login.html",
            "full_name": "User",  # Default name for welcome page
            "confirmation_url": "#"  # Default placeholder
        }
        
        # Render template with context
        html_content = template.render(**context)
        return HTMLResponse(html_content)
        
    except Exception as e:
        logger.error(f"Error rendering template: {str(e)}")
        # Fallback to simple response
        return HTMLResponse(f"""
        <html>
            <head><title>Skreenit Backend API</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h2>Skreenit Backend API</h2>
                <p>Running in {ENV} mode.</p>
                <p>Template Error: {str(e)}</p>
            </body>
        </html>
        """)

# ---------------------------------------------------------
# Logging
# ---------------------------------------------------------
def _mask(v: str | None) -> str | None:
    if not v: return None
    v = str(v)
    return (v[:8] + "...") if len(v) > 12 else "***"

logger.info("Backend Startup", extra={
    "environment": ENV,
    "auth_system": "Custom JWT",
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
class PatchedCustomAuthMiddleware(CustomAuthMiddleware): 
    async def dispatch(self, request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)
        return await super().dispatch(request, call_next)

app.add_middleware(PatchedCustomAuthMiddleware, excluded_paths=EXCLUDED_PATHS)

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
    "https://assets.skreenit.com",
    "https://storage.skreenit.com",
    "https://support.skreenit.com",
    "https://in.skreenit.com",
    "https://legal.skreenit.com",
    "https://app.skreenit.com",
    "https://hrms.skreenit.com",
    "https://jobs.skreenit.com",
    
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
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
    "http://localhost:8083",
    "http://127.0.0.1:8083",
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