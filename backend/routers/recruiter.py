from uuid import uuid4
from fastapi import APIRouter, Request, HTTPException, Depends
from services.supabase_client import get_client
from models.recruiter_models import (
    JobCreateRequest,
    JobUpdateRequest,
    RecruiterProfileUpdate,
)
from services.auth_service import get_current_user
from services.recruiter_service import RecruiterService
from services.dashboard_service import DashboardService
from services.analytics_service import AnalyticsService
from services.video_service import VideoService
from middleware.role_required import ensure_permission

router = APIRouter(prefix="/recruiter", tags=["Recruiter"])

rec_svc = RecruiterService()
dash_svc = DashboardService()
analytics_svc = AnalyticsService()
vd_svc = VideoService()

# ---------------------------------------------------------
# HELPER: Get or Create Company
# ---------------------------------------------------------
def get_or_create_company_id(user_id: str) -> str:
    try:
        res = rec_svc.supabase.table("companies").select("id").eq("created_by", user_id).limit(1).execute()
        existing = getattr(res, "data", [])
        if existing and len(existing) > 0: return existing[0]["id"]

        profile = rec_svc.get_profile(user_id)
        company_name = profile.get("company_name", "My Company") if profile else "My Company"
        
        company_id = str(uuid4()) 
        new_company = {
            "id": company_id,
            "name": company_name,
            "description": profile.get("about_company", "") if profile else "",
            "website": profile.get("company_website", "") if profile else "",
            "created_by": user_id
        }
        rec_svc.supabase.table("companies").insert(new_company).execute()
        return company_id
    except Exception as e:
        print(f"❌ Company Lookup Failed: {str(e)}")
        return f"CMP-{uuid4().hex[:8]}"

# ---------------------------------------------------------
# GET RECRUITER PROFILE
# ---------------------------------------------------------
@router.get("/profile")
async def get_profile(request: Request):
    ensure_permission(request, "profile:view") 
    user = request.state.user

    try:
        profile = rec_svc.get_profile(user["id"])
        if not profile: return {"ok": True, "data": {}}

        # Generate Display ID
        company = rec_svc.supabase.table("companies").select("id, name").eq("created_by", user["id"]).limit(1).execute()
        display_id = "PENDING (Save Profile First)"
        
        if company.data and len(company.data) > 0:
            comp = company.data[0]
            clean_name = ''.join(c for c in comp.get("name","").upper() if c.isalnum())
            name_part = clean_name[:4] if clean_name else "COMP"
            uuid_part = comp["id"][:4].upper()
            display_id = f"{name_part}{uuid_part}"
            
        profile["company_display_id"] = display_id
        return {"ok": True, "data": profile}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------
# UPDATE RECRUITER PROFILE
# ---------------------------------------------------------
@router.put("/profile")
async def update_profile(request: Request, payload: RecruiterProfileUpdate):
    ensure_permission(request, "profile:edit")
    user = request.state.user

    data = payload.model_dump(exclude_unset=True)
    db_data = {
        "user_id": user["id"],
        "company_name": data.get("company_name"),
        "company_website": data.get("company_website"),
        "contact_email": data.get("contact_email"),
        "contact_name": data.get("contact_name"),
        "location": data.get("location"),
        "about_company": data.get("about"),
    }
    # Filter Nones
    db_data = {k: v for k, v in db_data.items() if v is not None}

    try:
        profile = rec_svc.upsert_profile(db_data)
        get_or_create_company_id(user["id"]) # Ensure company exists
        
        # Sync Auth Metadata
        try:
            meta = {"onboarded": True}
            if data.get("contact_name"): meta["full_name"] = data["contact_name"]
            rec_svc.supabase.auth.admin.update_user_by_id(user["id"], {"user_metadata": meta})
        except: pass

        return {"ok": True, "data": profile}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Update failed: {str(e)}")

# ---------------------------------------------------------
# JOBS & DASHBOARD ENDPOINTS
# ---------------------------------------------------------
@router.post("/jobs")
async def create_job(request: Request, payload: JobCreateRequest):
    ensure_permission(request, "jobs:create")
    user = request.state.user
    try:
        data = payload.model_dump()
        data["created_by"] = user["id"]
        data["company_id"] = get_or_create_company_id(user["id"])
        job = rec_svc.post_job(data)
        return {"ok": True, "data": job}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/jobs")
async def list_jobs(request: Request, page: int = 1, page_size: int = 20):
    ensure_permission(request, "jobs:view")
    user = request.state.user
    try:
        jobs = rec_svc.list_jobs(user["id"], page=page, page_size=page_size)
        return {"ok": True, "data": jobs}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/jobs/{job_id}")
async def get_job(request: Request, job_id: str):
    ensure_permission(request, "jobs:view")
    try:
        job = rec_svc.get_job(job_id)
        return {"ok": True, "data": job}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/jobs/{job_id}")
async def update_job(request: Request, job_id: str, payload: JobUpdateRequest):
    ensure_permission(request, "jobs:edit")
    user = request.state.user
    try:
        updated = rec_svc.update_job(job_id, payload.model_dump(), user["id"])
        return {"ok": True, "data": updated}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/jobs/{job_id}")
async def delete_job(request: Request, job_id: str):
    ensure_permission(request, "jobs:delete")
    user = request.state.user
    try:
        deleted = rec_svc.delete_job(job_id, user["id"])
        return {"ok": True, "data": deleted}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# This endpoint is valid for recruiters (to see WHO applied)
@router.get("/applications")
async def list_recruiter_applications(request: Request):
    ensure_permission(request, "applications:view")
    try:
        # Calls service to get applications for jobs OWNED by this recruiter
        apps = rec_svc.get_recruiter_applications(request.state.user["id"])
        return {"ok": True, "data": apps}
    except Exception as e:
        return {"ok": True, "data": []}

# ---------------------------------------------------------
# ✅ NEW: Get Single Application Details (SECURED)
# ---------------------------------------------------------
@router.get("/applications/{application_id}")
async def get_application_details(request: Request, application_id: str):
    # 1. Enforce Role & Permission
    ensure_permission(request, "applications:view")
    user = request.state.user
    
    # 2. Fetch the Application
    app = rec_svc.get_application_by_id(application_id)
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # 3. 🔒 SECURITY CHECK: Verify Ownership
    # We try to fetch the job associated with this application, 
    # filtering by the current recruiter's ID. 
    try:
        # If this raises an error, it means the recruiter didn't create this job
        rec_svc.get_job(app["job_id"], recruiter_id=user["id"])
    except:
        # If the job doesn't belong to you, you can't see the application
        raise HTTPException(status_code=403, detail="You are not authorized to view this application")
        
    return app
# ---------------------------------------------------------
# ✅ NEW: Update Application Status
# ---------------------------------------------------------
@router.post("/applications/{application_id}/status")
async def update_application_status(application_id: str, request: Request):
    payload = await request.json()
    new_status = payload.get("status")
    questions = payload.get("questions", []) # Default to empty list if none
    
    # Ensure rec_svc.update_application_status processes the questions array
    success = rec_svc.update_application_status(application_id, new_status, questions)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update status")
        
    return {"message": "Success"}

# ---------------------------------------------------------
# ✅ NEW: Get Application Responses (SECURED)
# ---------------------------------------------------------
@router.get("/applications/{application_id}/responses")
async def get_application_responses(request: Request, application_id: str, db = Depends(get_client)):
    ensure_permission(request, "applications:view")
    
    # Optional: Add check to ensure recruiter owns the job associated with this app
    
    query = db.table("video_responses") \
        .select("question, video_url, recorded_at") \
        .eq("application_id", application_id) \
        .order("recorded_at") \
        .execute()

    responses = query.data or []
    
    # Generate signed URLs for the recruiter
    for resp in responses:
        path = resp.get("video_url")
        if path:
            signed = db.storage.from_("video-responses").create_signed_url(path, 3600)
            resp["video_url"] = signed.get("signedURL")
            
    return {"responses": responses}