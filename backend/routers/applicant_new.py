"""
Updated Applicant Router to use MySQL service layer.
"""

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from typing import Optional, List
import json
import os
from datetime import datetime

# Import MySQL services
from services.mysql_service import candidate_service, recruiter_service, video_service, user_service, dashboard_service
from services.auth_service import get_current_user
from middleware.role_required import ensure_permission
from models.applicant_models import ApplicationCreate
from utils_others.logger import logger

router = APIRouter(prefix="/applicant", tags=["Applicant"])

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_user_from_request(request: Request):
    """Get user from request state."""
    return getattr(request.state, "user", None)

def handle_file_upload(file: UploadFile, upload_path: str, public_url_base: str) -> str:
    """Handle file upload to R2 storage."""
    if not file:
        return None
    
    try:
        # Import R2 service
        from services.r2_service import R2Service
        r2_service = R2Service()
        
        # Determine folder from upload_path
        if "profilepics" in upload_path or "profile-images" in upload_path:
            folder = "profilepics"
        elif "resumes" in upload_path:
            folder = "resumes"
        elif "videos" in upload_path:
            folder = "videos"
        else:
            folder = "uploads"
        
        # Read file content
        file_content = file.file.read()
        
        # Upload to R2
        public_url = r2_service.upload_file(file_content, file.filename, folder)
        
        return public_url
    
    except Exception as e:
        logger.error(f"R2 file upload failed: {str(e)}")
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
        profile = candidate_service.get_profile(user["sub"])
        if not profile:
            # Create empty profile if doesn't exist
            profile = candidate_service.upsert_profile(user["sub"], {})
        
        return {"ok": True, "data": profile}
    
    except Exception as e:
        logger.error(f"Get profile failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def update_profile_put(request: Request, profile_data: Optional[dict] = None, resume: Optional[UploadFile] = File(None), profile_image: Optional[UploadFile] = File(None), intro_video: Optional[UploadFile] = File(None)):
    """Update candidate profile (PUT method)."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    
    try:
        # Handle FormData (when files are uploaded)
        content_type = request.headers.get("content-type", "")
        if "multipart/form-data" in content_type:
            form = await request.form()
            data = {}
            
            # Process form fields
            for key, value in form.items():
                if hasattr(value, 'filename'):  # Skip files - handle separately
                    continue
                # Convert string values to appropriate types
                if key in ['skills', 'experience', 'education']:
                    try:
                        data[key] = json.loads(value) if value else []
                    except (ValueError, AttributeError):
                        data[key] = []
                elif key == 'experience_years':
                    try:
                        data[key] = int(value) if value else None
                    except (ValueError, AttributeError):
                        data[key] = None
                else:
                    data[key] = value
            
            # Handle file uploads
            if resume and resume.filename:
                resume_url = handle_file_upload(
                    resume,
                    os.getenv("RESUME_UPLOAD_PATH", "/datastorage/resumes"),
                    os.getenv("RESUME_PUBLIC_URL", "https://storage.skreenit.com/datastorage/resumes")
                )
                data["resume_url"] = resume_url
            
            if profile_image and profile_image.filename:
                image_url = handle_file_upload(
                    profile_image,
                    os.getenv("PROFILE_IMAGE_UPLOAD_PATH", "/datastorage/profilepics"),
                    os.getenv("PROFILE_IMAGE_PUBLIC_URL", "https://storage.skreenit.com/datastorage/profilepics")
                )
                data["avatar_url"] = image_url
            
            if intro_video and intro_video.filename:
                video_url = handle_file_upload(
                    intro_video,
                    os.getenv("VIDEO_UPLOAD_PATH", "/datastorage/videos"),
                    os.getenv("VIDEO_PUBLIC_URL", "https://storage.skreenit.com/datastorage/videos")
                )
                data["intro_video_url"] = video_url
            
            profile_data = data
        elif profile_data is None:
            profile_data = {}
        
        result = candidate_service.upsert_profile(user["sub"], profile_data)
        return {"ok": True, "data": result}
    
    except Exception as e:
        logger.error(f"Update profile failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile")
async def update_profile(request: Request, profile_data: dict):
    """Update candidate profile (POST method - alias for compatibility)."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    
    try:
        result = candidate_service.upsert_profile(user["sub"], profile_data)
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
        result = candidate_service.save_education(user["sub"], education_data)
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
        result = candidate_service.save_experience(user["sub"], experience_data)
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
            os.getenv("PROFILE_IMAGE_UPLOAD_PATH", "/datastorage/profilepics"),
            os.getenv("PROFILE_IMAGE_PUBLIC_URL", "https://storage.skreenit.com/datastorage/profilepics")
        )
        
        # Update profile
        candidate_service.upsert_profile(user["sub"], {"avatar_url": avatar_url})
        
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
            os.getenv("RESUME_UPLOAD_PATH", "/datastorage/resumes"),
            os.getenv("RESUME_PUBLIC_URL", "https://storage.skreenit.com/datastorage/resumes")
        )
        
        # Update profile
        candidate_service.upsert_profile(user["sub"], {"resume_url": resume_url})
        
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
        status = candidate_service.check_application_status(job_id, user["sub"])
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
        data["candidate_id"] = user["sub"]
        
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
        applications = candidate_service.get_candidate_applications(user["sub"])
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
            os.getenv("VIDEO_UPLOAD_PATH", "/datastorage/videos"),
            os.getenv("VIDEO_PUBLIC_URL", "https://storage.skreenit.com/datastorage/videos")
        )
        
        # Update profile
        candidate_service.upsert_profile(user["sub"], {"intro_video_url": video_url})
        
        return {"ok": True, "data": {"video_url": video_url}}
    
    except Exception as e:
        logger.error(f"Intro video upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/delete-intro-video")
async def delete_intro_video(request: Request):
    """Delete intro video."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    
    try:
        # Get current profile to remove old video file
        profile = candidate_service.get_profile(user["sub"])
        if profile and profile.get("intro_video_url"):
            # TODO: Delete file from storage (implement R2 file deletion)
            pass
        
        # Update profile to remove video URL
        candidate_service.upsert_profile(user["sub"], {"intro_video_url": None})
        
        return {"ok": True, "success": True}
    
    except Exception as e:
        logger.error(f"Intro video delete failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-video-response")
async def save_video_response(request: Request, data: dict):
    """Save video response for job application."""
    ensure_permission(request, "applications:create")
    user = get_user_from_request(request)
    
    try:
        data["candidate_id"] = user["sub"]
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
        videos = video_service.get_candidate_videos(user["sub"])
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
        jobs = dashboard_service.list_public_jobs(search)
        return {"ok": True, "data": jobs}
    
    except Exception as e:
        logger.error(f"Get public jobs failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}")
async def get_public_job(request: Request, job_id: str):
    """Get public job details."""
    try:
        job = dashboard_service.get_public_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {"ok": True, "data": job}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get public job failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
