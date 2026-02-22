from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from typing import Optional, List
import json
from services.auth_service import get_current_user
from services.applicant_service import ApplicantService
from services.recruiter_service import RecruiterService
from services.video_service import VideoService
from services.supabase_client import get_client
from middleware.role_required import ensure_permission
from models.applicant_models import ApplicationCreate

router = APIRouter(prefix="/applicant", tags=["Applicant"])
app_svc = ApplicantService()
rec_svc = RecruiterService()
vd_svc = VideoService()

# ---------------------------------------------------------
# CHECK APPLICATION STATUS
# ---------------------------------------------------------
@router.get("/check-status")
async def check_status(request: Request, job_id: str):
    ensure_permission(request, "applications:create") # Candidate role
    user = request.state.user
    
    try:
        status = app_svc.check_application_status(user["id"], job_id)
        return {"ok": True, "applied": status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------
# APPLY FOR JOB
# ---------------------------------------------------------
@router.post("/apply")
async def apply_for_job(request: Request, payload: ApplicationCreate):
    ensure_permission(request, "applications:create")
    user = request.state.user
    
    try:
        # Prepare Data
        data = payload.model_dump()
        data["candidate_id"] = user["id"]
        result = app_svc.submit_application(data)
        return {"ok": True, "data": result}
    except Exception as e:
        print(f"Application Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile")
async def get_profile(request: Request):
    ensure_permission(request, "profile:view")
    try:
        profile = app_svc.get_profile(request.state.user["id"])
        return {"ok": True, "data": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def update_profile(
    request: Request,
    full_name: str = Form(None),
    phone: str = Form(None),
    location: str = Form(None),
    summary: str = Form(None),
    linkedin_url: str = Form(None),
    portfolio_url: str = Form(None),
    skills: str = Form("[]"), # JSON string
    experience: str = Form("[]"), # JSON string
    education: str = Form("[]"), # JSON string
    resume: UploadFile = File(None)
):
    current_user = request.state.user
    # Parse the JSON strings back into Python lists
    parsed_skills = json.loads(skills)
    parsed_exp = json.loads(experience)
    parsed_edu = json.loads(education)
    
    # Read file content if a new resume was uploaded
    file_content = await resume.read() if resume else None
    filename = resume.filename if resume else None

    # Pass to the applicant_service.py method we fixed yesterday!
    app_svc.update_profile(
        candidate_id=current_user["id"],
        profile_data={"full_name": full_name, "phone": phone, "location": location, "bio": summary, "linkedin_url": linkedin_url, "portfolio_url": portfolio_url},
        education=parsed_edu,
        experience=parsed_exp,
        skills=parsed_skills,
        resume_file=file_content,
        resume_filename=filename
    )
    return {"ok": True, "message": "Profile updated"}      

# ---------------------------------------------------------
# LIST MY APPLICATIONS
# ---------------------------------------------------------
@router.get("/applications")
async def list_my_applications(request: Request):
    ensure_permission(request, "applications:view")
    try:
        apps = app_svc.get_candidate_applications(request.state.user["id"])
        return apps # Return list directly for cleaner JS handling
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# GET APPLICATION DETAILS
# ---------------------------------------------------------
@router.get("/applications/{application_id}")
async def get_application_details(request: Request, application_id: str):
    ensure_permission(request, "applications:view")
    try:
        app = app_svc.get_application_details(application_id)
        return {"ok": True, "data": app}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# 1. GET INTERVIEW QUESTIONS / SETUP
# ---------------------------------------------------------

@router.get("/applications/{application_id}/interview")
async def get_interview_setup(request: Request, application_id: str):
    ensure_permission(request, "applications:view")
    current_user = request.state.user

    try:
        db = get_client() 
        # ✅ FIX: Explicitly select the 'interview_questions' column
        res = db.table("job_applications").select("id, status, job_id, candidate_id, interview_questions").eq("id", application_id).single().execute()
        app = res.data

        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
        
        if app.get("candidate_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized access to this interview")
        
        # ✅ Return the questions to the frontend
        return {
            "ok": True,
            "status": app.get("status"),
            "job_id": app.get("job_id"),
            "interview_questions": app.get("interview_questions") or []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# ---------------------------------------------------------
# 2. SAVE VIDEO RESPONSE
# ---------------------------------------------------------
# ...existing code...

@router.post("/applications/{application_id}/response")
async def save_interview_response(request: Request, application_id: str, payload: dict):
    ensure_permission(request, "video:upload")
    current_user = request.state.user

    try:
        # Extract variables safely
        q_text = payload.get("question") 
        if q_text is None:
            raise HTTPException(status_code=400, detail="Question is required")
        v_path = payload.get("video_path")
        if v_path is None:
            raise HTTPException(status_code=400, detail="Video path is required")

        # Call Service
        saved_row = vd_svc.save_video_response(
            application_id=application_id,
            question=q_text,      
            video_url=v_path,
            candidate_id=current_user["id"],
            status="completed"
        )

        return {
            "ok": True, 
            "message": "Response saved successfully",
            "data": {
                "question": q_text,
                "video_url": v_path,
                "db_id": saved_row.get("id") if saved_row else None
            }
        }

    except Exception as e:
        print(f"Save Response Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 3. GET INTERVIEW RESPONSES (Review Feature)
# ---------------------------------------------------------
@router.get("/applications/{application_id}/responses")
async def get_interview_responses(
    request: Request, 
    application_id: str,
    db = Depends(get_client) # This defines 'db' as your client
):
    ensure_permission(request, "applications:view")
    current_user = request.state.user

    try:
        # 1. Fetch the raw responses
        query = db.table("video_responses") \
            .select("question, video_url, recorded_at") \
            .eq("application_id", application_id) \
            .eq("candidate_id", current_user["id"]) \
            .order("recorded_at") \
            .execute()

        raw_responses = query.data or []
        
        # 2. Convert storage paths to signed URLs
        for resp in raw_responses:
            path = resp.get("video_url")
            if path:
                try:
                    # ✅ FIX: Use 'db.storage' (the client you defined above)
                    signed_res = db.storage.from_("video-responses").create_signed_url(path, 3600)
                    resp["video_url"] = signed_res.get("signedURL")
                except Exception as e:
                    # This is where your "db_storage not defined" error was printing
                    print(f"Signed URL Error: {e}")
                    resp["video_url"] = None

        return {"responses": raw_responses}

    except Exception as e:
        print(f"Error getting interview responses: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve interview responses")
# ---------------------------------------------------------
# 4. FINISH INTERVIEW
# ---------------------------------------------------------
@router.post("/applications/{application_id}/finish-interview")
async def finish_interview(
    application_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_client)
):
    try:
        # 1. Fetch from job_applications
        res = db.table("job_applications").select("*").eq("id", application_id).single().execute()
        application = res.data

        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        # 2. Security Check (candidate_id must match)
        if application.get('candidate_id') != current_user.get('id'):
            raise HTTPException(status_code=403, detail="Not authorized")

        # 3. Update status
        db.table("job_applications").update({"status": "interview_submitted"}).eq("id", application_id).execute()

        return {"ok": True, "message": "Interview completed", "status": "interview_submitted"}

    except Exception as e:
        print(f"Finish Interview Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))