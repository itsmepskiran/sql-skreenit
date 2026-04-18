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
from middleware.role_required import ensure_permission
from models.recruiter_models import CompanyCreate, RecruiterProfileCreate, JobCreateRequest, JobUpdateRequest
from utils_others.logger import logger
from config import PROFILE_IMAGE_UPLOAD_PATH, PROFILE_IMAGE_PUBLIC_URL

# Create recruiter service instance
recruiter_service = RecruiterService()

router = APIRouter(prefix="/recruiter", tags=["Recruiter"])

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_user_from_request(request: Request):
    """Get user from request state."""
    user = getattr(request.state, "user", None)
    if not user:
        return None
    
    # Handle JWT token structure where user ID is in 'sub' field
    if "sub" in user and "id" not in user:
        user["id"] = user["sub"]
    
    return user

def handle_file_upload(file: UploadFile, upload_path: str, public_url_base: str) -> str:
    if not file:
        return None
    try:
        from services.r2_service import R2Service
        r2_service = R2Service()
        
        # Reset file pointer to beginning
        file.file.seek(0)
        
        if "profilepics" in upload_path or "profile-images" in upload_path:
            folder = "profilepics"
        elif "company" in upload_path or "logos" in upload_path:
            folder = "profilepics"
        else:
            folder = "uploads"
        
        # Read file content
        file_content = file.file.read()
        
        # Upload to R2
        public_url = r2_service.upload_file(file_content, file.filename, folder)
        
        return public_url
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

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
        
        # If the user has not yet created a profile, do not auto-create a placeholder company.
        # This prevents the UI from showing "Unknown Company" or generating a company display ID
        # before the recruiter has actually completed onboarding.
        if not profile:
            return {"ok": True, "data": {}}
        
        return {"ok": True, "data": profile}
    
    except Exception as e:
        logger.error(f"Get recruiter profile failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def update_profile(request: Request, profile_data: dict):
    """Update recruiter profile."""
    ensure_permission(request, "profile:update")
    user = get_user_from_request(request)
    
    try:
        profile_data["user_id"] = user["id"]
        result = recruiter_service.upsert_profile(profile_data)
        return {"ok": True, "data": result}
    
    except ValueError as e:
        # Validation errors (e.g., missing company name) should be surfaced as 400
        logger.warning(f"Update recruiter profile validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
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
    
    try:
        # Upload file
        avatar_url = handle_file_upload(
            file,
            PROFILE_IMAGE_UPLOAD_PATH,
            PROFILE_IMAGE_PUBLIC_URL
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
            PROFILE_IMAGE_UPLOAD_PATH,
            PROFILE_IMAGE_PUBLIC_URL
        )
        
        # Update company logo only (doesn't require company name for existing companies)
        recruiter_service.update_company_logo(user["id"], logo_url)
        
        return {"ok": True, "data": {"avatar_url": logo_url}}
    
    except ValueError as e:
        # Validation errors should be surfaced as 400 for cleaner frontend handling.
        logger.warning(f"Company logo upload validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Company logo upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.options("/profile/company-logo")
async def upload_company_logo_options(request: Request):
    """Handle OPTIONS preflight for company logo upload."""
    return {"ok": True}

# ============================================================
# JOB ENDPOINTS
# ============================================================

@router.post("/jobs")
async def create_job(request: Request, job_data: JobCreateRequest):
    """Create a new job posting."""
    ensure_permission(request, "jobs:create")
    user = get_user_from_request(request)
    
    try:
        # Fetch profile to get the company_id
        profile = recruiter_service.get_profile(user["id"])

        if not profile or not profile.get("company_id"):
            # Require profile completion before allowing job creation.
            raise HTTPException(status_code=400, detail="Please complete your recruiter profile before posting jobs.")

        data = job_data.model_dump()
        data["created_by"] = user["id"]
        data["company_id"] = profile.get("company_id")
        
        result = recruiter_service.post_job(data)
        return {"ok": True, "data": result}
    
    except HTTPException:
        raise
    except Exception as e:
        # Log the full error for debugging
        import traceback
        error_details = f"Create job failed: {str(e)}\n{traceback.format_exc()}"
        print(error_details)  # This will show in console
        raise HTTPException(status_code=500, detail=f"Failed to create job: {str(e)}")

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
        logger.info(f"Job update data received: {data}")
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
    """Get detailed application information including video analysis."""
    ensure_permission(request, "applications:read")
    user = get_user_from_request(request)
    
    try:
        # Get basic application details using existing method
        app_data = recruiter_service.get_application_by_id(application_id)
        if not app_data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        logger.info(f"Raw app_data structure: {app_data}")
        
        # Extract the nested data into a flat structure for frontend compatibility
        application = app_data.get("application", {})
        job = app_data.get("job", {})
        candidate_data = app_data.get("candidate", {})
        
        logger.info(f"Application keys: {list(application.keys()) if application else 'None'}")
        logger.info(f"Job keys: {list(job.keys()) if job else 'None'}")
        logger.info(f"Candidate data keys: {list(candidate_data.keys()) if candidate_data else 'None'}")
        
        # Handle the nested candidate profile structure
        profile = candidate_data.get("profile", {})
        logger.info(f"Profile keys: {list(profile.keys()) if profile else 'None'}")
        logger.info(f"Candidate name from profile: {profile.get('full_name', '')}")
        logger.info(f"Candidate email from profile: {profile.get('email', '')}")
        
        # Profile should now have combined data from both users and candidate_profiles tables
        if not profile or not profile.get("email"):
            logger.warning("Profile is missing or email is still missing after combining tables")
        else:
            logger.info("Profile has required fields from combined tables")
        
        # Flatten the data structure
        flat_application = {
            **application,
            "job_title": job.get("job_title", ""),
            "job_location": job.get("location", ""),
            "job_type": job.get("job_type", ""),
            "candidate_name": (
                profile.get("full_name", "") or 
                f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip() or
                profile.get("candidate_display_id", "") or
                "Unknown Candidate"
            ),
            "candidate_email": profile.get("email", "") or "No email available",
            "candidate_phone": profile.get("phone", ""),
            "candidate_display_id": profile.get("candidate_display_id", ""),
            "candidate_summary": profile.get("summary", ""),
            "intro_video_url": candidate_data.get("intro_video_url", ""),
            "skills": profile.get("skills", []),
            "linkedin": profile.get("linkedin_url", ""),
            "resume_url": candidate_data.get("resume_url", "") or application.get("resume_url", ""),
            "cover_letter": application.get("cover_letter", ""),
            "interview_responses": application.get("interview_responses", []),
            "interview_video_urls": application.get("interview_video_urls", [])
        }
        
        logger.info(f"Available profile fields for name: full_name={profile.get('full_name')}, first_name={profile.get('first_name')}, last_name={profile.get('last_name')}, candidate_display_id={profile.get('candidate_display_id')}")
        logger.info(f"Available profile fields for email: email={profile.get('email')}")
        
        logger.info(f"Final flat_application keys: {list(flat_application.keys())}")
        logger.info(f"Final candidate_name: '{flat_application.get('candidate_name')}'")
        logger.info(f"Final job_title: '{flat_application.get('job_title')}'")
        
        # Get video analysis data if intro video exists
        analysis_data = None
        if flat_application.get("intro_video_url"):
            from services.video_analysis_service import VideoAnalysisService
            video_analysis_svc = VideoAnalysisService()
            candidate_id = flat_application.get("candidate_id") or application.get("candidate_id")
            
            # Get existing analysis for intro video
            analysis_data = video_analysis_svc.get_analysis(
                candidate_id, 
                video_url=flat_application.get("intro_video_url")
            )
        
        # Get video response analyses if they exist
        response_analyses = []
        try:
            from services.mysql_service import MySQLService
            mysql = MySQLService()
            
            # Get video responses for this application
            video_responses = mysql.get_records("video_responses", {"application_id": application_id}, order_by="question_index ASC")
            
            for vr in video_responses:
                video_url = vr.get("video_url")
                if video_url:
                    from services.video_analysis_service import VideoAnalysisService
                    video_analysis_svc = VideoAnalysisService()
                    analysis = video_analysis_svc.get_analysis(flat_application.get("candidate_id") or application.get("candidate_id"), video_url=video_url)
                    
                    response_analyses.append({
                        "question_index": vr.get("question_index"),
                        "question": vr.get("question"),
                        "video_url": video_url,
                        "analysis": analysis
                    })
        except Exception as e:
            logger.warning(f"Failed to load response analyses: {str(e)}")
        
        # Combine all data
        result = {
            **flat_application,
            "video_analysis": analysis_data,
            "response_analyses": response_analyses
        }
        
        return {"ok": True, "data": result}
    
    except Exception as e:
        logger.error(f"Get application details failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/applications/{application_id}/status")
async def update_application_status(request: Request, application_id: str, status_data: dict):
    """Update application status."""
    ensure_permission(request, "applications:read")
    user = get_user_from_request(request)
    
    try:
        # Extract status and optional data from request body
        new_status = status_data.get("status")
        questions = status_data.get("questions", [])
        feedback = status_data.get("rejection_reason") or status_data.get("comment") or status_data.get("feedback")
        
        if not new_status:
            raise HTTPException(status_code=400, detail="Status is required")
        
        # Update the application status in the database
        success = recruiter_service.update_application_status(application_id, new_status, questions, feedback)
        
        if success:
            # ✅ NOTIFICATIONS: Notify candidate about status update
            try:
                from services.notification_service_mysql import NotificationService
                notification_service = NotificationService()
                
                # Get application details to notify candidate
                application = recruiter_service.get_application_details(application_id)
                if application:
                    candidate_id = application.get("candidate_id")
                    job_id = application.get("job_id")
                    job_title = application.get("job_title", "a position")
                    
                    # Create user-friendly status message
                    status_messages = {
                        "submitted": "received",
                        "reviewed": "reviewed", 
                        "shortlisted": "shortlisted",
                        "interviewing": "selected for interview",
                        "interview_submitted": "interview completed",
                        "responses_submitted": "responses submitted",
                        "analysis_ready": "analysis ready",
                        "hired": "hired! 🎉",
                        "rejected": "not selected"
                    }
                    
                    status_display = status_messages.get(new_status, new_status)
                    
                    # Notify candidate with full metadata for navigation
                    notification_service.create_notification({
                        "created_by": candidate_id,
                        "title": "Application Status Updated",
                        "message": f"Your application for {job_title} has been {status_display}",
                        "category": "application_status",
                        "related_id": application_id,
                        "metadata": {
                            "type": "status_update",
                            "application_id": application_id,
                            "job_id": job_id,
                            "job_title": job_title,
                            "status": new_status
                        }
                    })
                    
                    # Special handling for interview scheduling
                    if new_status == "interviewing":
                        # Create additional interview notification with full metadata
                        notification_service.create_notification({
                            "created_by": candidate_id,
                            "title": "Video Interview Scheduled",
                            "message": f"You have been invited for a video interview for {job_title}. Click to start your interview.",
                            "category": "interview",
                            "related_id": application_id,
                            "metadata": {
                                "type": "interview_invitation",
                                "application_id": application_id,
                                "job_id": job_id,
                                "job_title": job_title
                            }
                        })
                        logger.info(f"Interview notification sent to candidate {candidate_id}")
                    
                    logger.info(f"Status update notification sent to candidate {candidate_id}: {new_status}")
                    
            except Exception as notif_error:
                logger.error(f"Failed to create status update notification: {str(notif_error)}")
                # Continue without failing the main process
            
            return {"ok": True, "message": "Application status updated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Application not found or update failed")
    
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
