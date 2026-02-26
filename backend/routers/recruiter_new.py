"""
Updated Recruiter Router to use MySQL service layer.
"""

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from typing import Optional, List
import json
import os
from datetime import datetime

# Import MySQL services
from services.mysql_service import recruiter_service, user_service, candidate_service
from services.auth_service import get_current_user
from middleware.role_required import ensure_permission
from models.recruiter_models import CompanyCreate, RecruiterProfileCreate, JobCreateRequest, JobUpdateRequest
from utils_others.logger import logger

router = APIRouter(tags=["Recruiter"])

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
# COMPANY ENDPOINTS
# ============================================================

@router.get("/companies")
async def list_companies(request: Request):
    """List all companies."""
    ensure_permission(request, "companies:read")
    
    try:
        companies = recruiter_service.list_companies()
        return {"ok": True, "data": companies}
    
    except Exception as e:
        logger.error(f"List companies failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/companies")
async def create_company(request: Request, company_data: CompanyCreate):
    """Create a new company."""
    ensure_permission(request, "companies:create")
    user = get_user_from_request(request)
    
    try:
        data = company_data.model_dump()
        data["created_by"] = user["id"]
        
        result = recruiter_service.create_company(**data)
        return {"ok": True, "data": result}
    
    except Exception as e:
        logger.error(f"Create company failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# RECRUITER PROFILE ENDPOINTS
# ============================================================

@router.get("/profile")
async def get_profile(request: Request):
    """Get recruiter profile."""
    ensure_permission(request, "profile:read")
    user = get_user_from_request(request)
    
    try:
        profile = recruiter_service.get_profile(user["id"])
        if not profile:
            # Create empty profile if doesn't exist
            profile = recruiter_service.upsert_profile({"user_id": user["id"]})
        
        return {"ok": True, "data": profile}
    
    except Exception as e:
        logger.error(f"Get recruiter profile failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile")
async def update_profile(request: Request, profile_data: dict):
    """Update recruiter profile."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    
    try:
        profile_data["user_id"] = user["id"]
        result = recruiter_service.upsert_profile(profile_data)
        return {"ok": True, "data": result}
    
    except Exception as e:
        logger.error(f"Update recruiter profile failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile/avatar")
async def upload_avatar(request: Request, file: UploadFile = File(...)):
    """Upload recruiter avatar."""
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
        recruiter_service.upsert_profile({"user_id": user["id"], "avatar_url": avatar_url})
        
        return {"ok": True, "data": {"avatar_url": avatar_url}}
    
    except Exception as e:
        logger.error(f"Recruiter avatar upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile/company-logo")
async def upload_company_logo(request: Request, file: UploadFile = File(...)):
    """Upload company logo."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    
    try:
        # Upload file
        logo_url = handle_file_upload(
            file,
            os.getenv("PROFILE_IMAGE_UPLOAD_PATH", "/uploads/profile-images"),
            os.getenv("PROFILE_IMAGE_PUBLIC_URL", "https://yourdomain.com/uploads/profile-images")
        )
        
        # Update profile
        recruiter_service.upsert_profile({"user_id": user["id"], "avatar_url": logo_url})
        
        return {"ok": True, "data": {"logo_url": logo_url}}
    
    except Exception as e:
        logger.error(f"Company logo upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# JOB ENDPOINTS
# ============================================================

@router.post("/jobs")
async def create_job(request: Request, job_data: JobCreateRequest):
    """Create a new job posting."""
    ensure_permission(request, "jobs:create")
    user = get_user_from_request(request)
    
    try:
        data = job_data.model_dump()
        data["created_by"] = user["id"]
        
        result = recruiter_service.post_job(data)
        return {"ok": True, "data": result}
    
    except Exception as e:
        logger.error(f"Create job failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs")
async def list_jobs(request: Request, page: int = 1, page_size: int = 20):
    """List jobs posted by recruiter."""
    ensure_permission(request, "jobs:read")
    user = get_user_from_request(request)
    
    try:
        result = recruiter_service.list_jobs(user["id"], page, page_size)
        return {"ok": True, "data": result}
    
    except Exception as e:
        logger.error(f"List jobs failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}")
async def get_job(request: Request, job_id: str):
    """Get job details."""
    ensure_permission(request, "jobs:read")
    user = get_user_from_request(request)
    
    try:
        job = recruiter_service.get_job(job_id, user["id"])
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {"ok": True, "data": job}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get job failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/jobs/{job_id}")
async def update_job(request: Request, job_id: str, job_data: JobUpdateRequest):
    """Update job posting."""
    ensure_permission(request, "jobs:update")
    user = get_user_from_request(request)
    
    try:
        data = job_data.model_dump(exclude_unset=True)
        result = recruiter_service.update_job(job_id, data, user["id"])
        
        if not result:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {"ok": True, "data": result}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update job failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/jobs/{job_id}")
async def delete_job(request: Request, job_id: str):
    """Delete job posting."""
    ensure_permission(request, "jobs:delete")
    user = get_user_from_request(request)
    
    try:
        result = recruiter_service.delete_job(job_id, user["id"])
        
        if not result:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {"ok": True, "message": "Job deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete job failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# APPLICATION ENDPOINTS
# ============================================================

@router.get("/applications")
async def get_applications(request: Request, job_id: Optional[str] = None):
    """Get applications for recruiter's jobs."""
    ensure_permission(request, "applications:read")
    user = get_user_from_request(request)
    
    try:
        applications = recruiter_service.get_recruiter_applications(user["id"], job_id)
        return {"ok": True, "data": applications}
    
    except Exception as e:
        logger.error(f"Get applications failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/applications/{application_id}")
async def get_application_details(request: Request, application_id: str):
    """Get detailed application information."""
    ensure_permission(request, "applications:read")
    user = get_user_from_request(request)
    
    try:
        # This would need to be implemented in the service
        # For now, return a placeholder
        return {"ok": True, "data": {"application_id": application_id}}
    
    except Exception as e:
        logger.error(f"Get application details failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/applications/{application_id}/status")
async def update_application_status(request: Request, application_id: str, status_data: dict):
    """Update application status."""
    ensure_permission(request, "applications:update")
    user = get_user_from_request(request)
    
    try:
        # This would need to be implemented in the service
        # For now, return a placeholder
        return {"ok": True, "message": "Application status updated"}
    
    except Exception as e:
        logger.error(f"Update application status failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# CANDIDATE ENDPOINTS
# ============================================================

@router.get("/candidates/{candidate_id}")
async def get_candidate_details(request: Request, candidate_id: str):
    """Get candidate details for recruiter."""
    ensure_permission(request, "candidates:read")
    
    try:
        # Get candidate profile
        profile = candidate_service.get_profile(candidate_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Get user info
        user_info = user_service.get_user(candidate_id)
        
        return {"ok": True, "data": {"profile": profile, "user": user_info}}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get candidate details failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
