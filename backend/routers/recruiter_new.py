"""
Updated Recruiter Router to use MySQL service layer.
"""

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from typing import Optional, List
import json
import os
from datetime import datetime

# Import MySQL services
from services.mysql_service import user_service, candidate_service
from services.recruiter_service_mysql import RecruiterService
from services.auth_service import get_current_user
from services.r2_service import r2_service
from middleware.role_required import ensure_permission
from models.recruiter_models import CompanyCreate, RecruiterProfileCreate, JobCreateRequest, JobUpdateRequest
from utils_others.logger import logger

# Create recruiter service instance
recruiter_service = RecruiterService()

router = APIRouter(prefix="/recruiter", tags=["Recruiter"])

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_user_from_request(request: Request) -> dict:
    """Get user from request state."""
    user = getattr(request.state, "user", None) or {}

    # Handle JWT token structure where user ID is in 'sub' field
    if isinstance(user, dict) and "sub" in user and "id" not in user:
        user["id"] = user["sub"]

    return user

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


def upload_to_r2_or_local(file: UploadFile, folder: str, local_upload_path: str, local_public_url: str) -> str:
    """Upload file to R2 if possible, falling back to local storage."""
    if not file:
        return None

    try:
        # Read file content for R2 upload
        content = file.file.read()
        # Reset file pointer in case fallback triggers
        file.file.seek(0)

        # Pyright/typing: UploadFile.filename can be None, so ensure a fallback
        filename = file.filename or "upload"
        return r2_service.upload_file(content, filename, folder)
    except Exception as r2_err:
        logger.warning(f"R2 upload failed (falling back to local storage): {str(r2_err)}")
        # Seek back to start for the local upload path
        try:
            file.file.seek(0)
        except Exception:
            pass
        return handle_file_upload(file, local_upload_path, local_public_url)

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
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        profile = recruiter_service.get_profile(user_id)
        if not profile:
            # Create empty profile if doesn't exist
            profile = recruiter_service.upsert_profile({"user_id": user_id})
        
        return {"ok": True, "data": profile}
    
    except Exception as e:
        logger.error(f"Get recruiter profile failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def update_profile(request: Request, profile_data: dict):
    """Update recruiter profile."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        profile_data["user_id"] = user_id
        result = recruiter_service.upsert_profile(profile_data)
        return {"ok": True, "data": result}
    
    except Exception as e:
        logger.error(f"Update recruiter profile failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile")
async def update_profile_post(request: Request, profile_data: dict):
    """Update recruiter profile (POST endpoint for compatibility)."""
    return await update_profile(request, profile_data)

@router.post("/profile/avatar")
async def upload_avatar(request: Request, file: UploadFile = File(...)):
    """Upload recruiter avatar."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        # Upload file to R2 (fallback to local storage)
        avatar_url = upload_to_r2_or_local(
            file,
            folder="profilepics",
            local_upload_path=os.getenv("PROFILE_IMAGE_UPLOAD_PATH", "/uploads/profilepics"),
            local_public_url=os.getenv("PROFILE_IMAGE_PUBLIC_URL", "https://storage.skreenit.com/uploads/profilepics")
        )
        
        # Update users table so avatar_url is persisted
        from services.mysql_service import user_service
        user_service.update_record("users", {"avatar_url": avatar_url}, {"id": user_id})

        return {"ok": True, "data": {"avatar_url": avatar_url}}
    
    except Exception as e:
        logger.error(f"Recruiter avatar upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile/company-logo")
async def upload_company_logo(request: Request, file: UploadFile = File(...)):
    """Upload company logo."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        # Upload file to R2 (fallback to local storage)
        logo_url = upload_to_r2_or_local(
            file,
            folder="profilepics",
            local_upload_path=os.getenv("PROFILE_IMAGE_UPLOAD_PATH", "/uploads/profilepics"),
            local_public_url=os.getenv("PROFILE_IMAGE_PUBLIC_URL", "https://storage.skreenit.com/uploads/profilepics")
        )
        
        # Update company record with logo URL via recruiter profile service
        recruiter_service.upsert_profile({"user_id": user_id, "company_logo_url": logo_url})
        
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

# ============================================================
# JOB SKILLS ENDPOINTS
# ============================================================

@router.post("/jobs/{job_id}/skills")
async def add_job_skill(request: Request, job_id: str, skill_data: dict):
    """Add a skill to a job posting."""
    ensure_permission(request, "jobs:update")
    user = get_user_from_request(request)
    
    try:
        # Verify job belongs to recruiter
        job = recruiter_service.get_job(job_id, user["id"])
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        payload = {
            "job_id": job_id,
            "skill_name": skill_data.get("skill_name")
        }
        
        result = recruiter_service.add_job_skill(payload)
        return {"ok": True, "data": result}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add job skill failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}/skills")
async def list_job_skills(request: Request, job_id: str):
    """List all skills for a job posting."""
    ensure_permission(request, "jobs:read")
    
    try:
        skills = recruiter_service.list_job_skills(job_id)
        return {"ok": True, "data": skills}
    
    except Exception as e:
        logger.error(f"List job skills failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/jobs/{job_id}/skills/{skill_id}")
async def delete_job_skill(request: Request, job_id: str, skill_id: str):
    """Delete a skill from a job posting."""
    ensure_permission(request, "jobs:update")
    user = get_user_from_request(request)
    
    try:
        # Verify job belongs to recruiter
        job = recruiter_service.get_job(job_id, user["id"])
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        recruiter_service.delete_job_skill(skill_id)
        return {"ok": True, "message": "Skill deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete job skill failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# INTERVIEW QUESTIONS ENDPOINTS
# ============================================================

@router.post("/jobs/{job_id}/questions")
async def add_interview_question(request: Request, job_id: str, question_data: dict):
    """Add an interview question to a job posting."""
    ensure_permission(request, "jobs:update")
    user = get_user_from_request(request)
    
    try:
        # Verify job belongs to recruiter
        job = recruiter_service.get_job(job_id, user["id"])
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        payload = {
            "job_id": job_id,
            "question": question_data.get("question"),
            "question_order": question_data.get("question_order", 0),
            "time_limit": question_data.get("time_limit", 120)
        }
        
        result = recruiter_service.add_interview_question(payload)
        return {"ok": True, "data": result}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add interview question failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}/questions")
async def list_interview_questions(request: Request, job_id: str):
    """List all interview questions for a job posting."""
    ensure_permission(request, "jobs:read")
    
    try:
        questions = recruiter_service.list_interview_questions(job_id)
        return {"ok": True, "data": questions}
    
    except Exception as e:
        logger.error(f"List interview questions failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/jobs/{job_id}/questions/{question_id}")
async def delete_interview_question(request: Request, job_id: str, question_id: str):
    """Delete an interview question from a job posting."""
    ensure_permission(request, "jobs:update")
    user = get_user_from_request(request)
    
    try:
        # Verify job belongs to recruiter
        job = recruiter_service.get_job(job_id, user["id"])
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        recruiter_service.delete_interview_question(question_id)
        return {"ok": True, "message": "Question deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete interview question failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
