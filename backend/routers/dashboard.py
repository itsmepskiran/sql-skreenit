from fastapi import APIRouter, Request, HTTPException
from typing import Optional
from services.dashboard_service import DashboardService
from middleware.role_required import ensure_permission

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
dash_svc = DashboardService()

# ---------------------------------------------------------
# CANDIDATE/PUBLIC: LIST ACTIVE JOBS
# ---------------------------------------------------------
@router.get("/jobs")
async def list_active_jobs(request: Request, q: Optional[str] = None):
    # Ensure user is logged in
    user = getattr(request.state, "user", None)
    if not user:
         raise HTTPException(status_code=401, detail="Authentication required")

    try:
        # Fetch jobs with optional search query
        jobs = dash_svc.list_public_jobs(search_query=q)
        return {"ok": True, "data": jobs}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------
# CANDIDATE/PUBLIC: GET JOB DETAILS
# ---------------------------------------------------------
@router.get("/jobs/{job_id}")
async def get_job_details(job_id: str, request: Request):
    user = getattr(request.state, "user", None)
    if not user:
         raise HTTPException(status_code=401, detail="Authentication required")

    try:
        job = dash_svc.get_public_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return {"ok": True, "data": job}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------
# DASHBOARD SUMMARY (Keep existing logic)
# ---------------------------------------------------------
@router.get("/")
async def get_dashboard(request: Request):
    ensure_permission(request, "dashboard:view")
    try:
        summary = dash_svc.get_summary(request.state.user["id"])
        return {"ok": True, "data": summary}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))