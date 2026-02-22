from fastapi import APIRouter, Request, HTTPException
from models.analytics_models import AnalyticsEventRequest
from services.analytics_service import AnalyticsService
# ✅ FIX: Correct Import
from middleware.role_required import ensure_permission

router = APIRouter(prefix="/analytics", tags=["Analytics"])
svc = AnalyticsService()


# ---------------------------------------------------------
# CREATE EVENT (All authenticated users)
# ---------------------------------------------------------
@router.post("/")
async def create_event(request: Request, payload: AnalyticsEventRequest):
    """
    All authenticated users can create analytics events.
    No permission check required, just valid auth (handled by middleware).
    """
    try:
        event = svc.create_event(payload.model_dump())
        return {"ok": True, "data": event}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# LIST EVENTS (Recruiter/Admin)
# ---------------------------------------------------------
@router.get("/")
async def list_events(
    request: Request,
    page: int = 1,
    page_size: int = 50
):
    # ✅ FIX: Check permission
    ensure_permission(request, "analytics:view")

    try:
        events = svc.list_events(
            request.state.user["id"],
            page=page,
            page_size=page_size
        )
        return {"ok": True, "data": events}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))