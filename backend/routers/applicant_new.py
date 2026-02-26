"""
Updated Applicant Router to use MySQL service layer.
"""

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from typing import Optional, List
import json
import os
from datetime import datetime

# Import MySQL services
from services.mysql_service import candidate_service, recruiter_service, video_service, user_service
from services.auth_service import get_current_user
from middleware.role_required import ensure_permission
from models.applicant_models import ApplicationCreate
from utils_others.logger import logger

router = APIRouter(tags=["Applicant"])

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_user_from_request(request: Request):
    """Get user from request state."""
    return getattr(request.state, "user", None)

def handle_file_upload(file: UploadFile, upload_path: str, public_url_base: str) -> str:
    """Handle file upload to Hostinger file system."""
    if not file:
        return None
    
    try:
        # Create filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(upload_path, filename)
        
        # Ensure upload directory exists
        os.makedirs(upload_path, exist_ok=True)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = file.file.read()
            buffer.write(content)
        
        # Return public URL
        return f"{public_url_base}/{filename}"
    
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail="File upload failed")

# ============================================================
# PROFILE ENDPOINTS
# ============================================================

@router.get("/profile")
async def get_profile(request: Request):
    """Get candidate profile."""
    ensure_permission(request, "profile:read")
    user = get_user_from_request(request)
    
    try:
        profile = candidate_service.get_profile(user["id"])
        if not profile:
            # Create empty profile if doesn't exist
            profile = candidate_service.upsert_profile(user["id"], {})
        
        return {"ok": True, "data": profile}
    
    except Exception as e:
        logger.error(f"Get profile failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile")
async def update_profile(request: Request, profile_data: dict):
    """Update candidate profile."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    
    try:
        result = candidate_service.upsert_profile(user["id"], profile_data)
        return {"ok": True, "data": result}
    
    except Exception as e:
        logger.error(f"Update profile failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile/education")
async def save_education(request: Request, education_data: List[dict]):
    """Save candidate education."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    
    try:
        result = candidate_service.save_education(user["id"], education_data)
        return {"ok": True, "data": result}
    
    except Exception as e:
        logger.error(f"Save education failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile/experience")
async def save_experience(request: Request, experience_data: List[dict]):
    """Save candidate experience."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    
    try:
        result = candidate_service.save_experience(user["id"], experience_data)
        return {"ok": True, "data": result}
    
    except Exception as e:
        logger.error(f"Save experience failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile/avatar")
async def upload_avatar(request: Request, file: UploadFile = File(...)):
    """Upload profile avatar."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    
    try:
        # Upload file
        avatar_url = handle_file_upload(
            file, 
            os.getenv("PROFILE_IMAGE_UPLOAD_PATH", "/uploads/profile-images"),
            os.getenv("PROFILE_IMAGE_PUBLIC_URL", "https://yourdomain.com/uploads/profile-images")
        )
        
        # Update profile
        candidate_service.upsert_profile(user["id"], {"avatar_url": avatar_url})
        
        return {"ok": True, "data": {"avatar_url": avatar_url}}
    
    except Exception as e:
        logger.error(f"Avatar upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile/resume")
async def upload_resume(request: Request, file: UploadFile = File(...)):
    """Upload resume."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    
    try:
        # Upload file
        resume_url = handle_file_upload(
            file,
            os.getenv("RESUME_UPLOAD_PATH", "/uploads/resumes"),
            os.getenv("RESUME_PUBLIC_URL", "https://yourdomain.com/uploads/resumes")
        )
        
        # Update profile
        candidate_service.upsert_profile(user["id"], {"resume_url": resume_url})
        
        return {"ok": True, "data": {"resume_url": resume_url}}
    
    except Exception as e:
        logger.error(f"Resume upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# JOB APPLICATION ENDPOINTS
# ============================================================

@router.get("/check-status")
async def check_status(request: Request, job_id: str):
    """Check if candidate has applied for job."""
    ensure_permission(request, "applications:create")
    user = get_user_from_request(request)
    
    try:
        status = candidate_service.check_application_status(job_id, user["id"])
        return {"ok": True, "data": status}
    
    except Exception as e:
        logger.error(f"Check status failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/apply")
async def apply_for_job(request: Request, payload: ApplicationCreate):
    """Apply for a job."""
    ensure_permission(request, "applications:create")
    user = get_user_from_request(request)
    
    try:
        # Prepare data
        data = payload.model_dump()
        data["candidate_id"] = user["id"]
        
        result = candidate_service.submit_application(data)
        return {"ok": True, "data": result}
    
    except Exception as e:
        logger.error(f"Job application failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/applications")
async def get_applications(request: Request):
    """Get candidate's applications."""
    ensure_permission(request, "applications:read")
    user = get_user_from_request(request)
    
    try:
        applications = candidate_service.get_candidate_applications(user["id"])
        return {"ok": True, "data": applications}
    
    except Exception as e:
        logger.error(f"Get applications failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# VIDEO ENDPOINTS
# ============================================================

@router.post("/upload-intro-video")
async def upload_intro_video(request: Request, file: UploadFile = File(...)):
    """Upload intro video."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    
    try:
        # Upload file
        video_url = handle_file_upload(
            file,
            os.getenv("VIDEO_UPLOAD_PATH", "/uploads/videos"),
            os.getenv("VIDEO_PUBLIC_URL", "https://yourdomain.com/uploads/videos")
        )
        
        # Update profile
        candidate_service.upsert_profile(user["id"], {"intro_video_url": video_url})
        
        return {"ok": True, "data": {"video_url": video_url}}
    
    except Exception as e:
        logger.error(f"Intro video upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-video-response")
async def save_video_response(request: Request, data: dict):
    """Save video response for job application."""
    ensure_permission(request, "applications:create")
    user = get_user_from_request(request)
    
    try:
        data["candidate_id"] = user["id"]
        result = video_service.save_video_response(data)
        return {"ok": True, "data": result}
    
    except Exception as e:
        logger.error(f"Save video response failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/videos")
async def get_candidate_videos(request: Request):
    """Get candidate's videos."""
    ensure_permission(request, "profile:read")
    user = get_user_from_request(request)
    
    try:
        videos = video_service.get_candidate_videos(user["id"])
        return {"ok": True, "data": videos}
    
    except Exception as e:
        logger.error(f"Get videos failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# PUBLIC JOBS ENDPOINTS
# ============================================================

@router.get("/jobs")
async def get_public_jobs(request: Request, search: Optional[str] = None):
    """Get public jobs list."""
    try:
        jobs = recruiter_service.list_public_jobs(search)
        return {"ok": True, "data": jobs}
    
    except Exception as e:
        logger.error(f"Get public jobs failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}")
async def get_public_job(request: Request, job_id: str):
    """Get public job details."""
    try:
        job = recruiter_service.get_public_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {"ok": True, "data": job}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get public job failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
