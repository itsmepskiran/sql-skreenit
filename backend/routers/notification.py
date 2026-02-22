from fastapi import APIRouter, Request, HTTPException
from models.notification_models import NotificationRequest
from services.notification_service import NotificationService
# ✅ FIX: Correct Import
from middleware.role_required import ensure_permission
from utils_others.logger import logger

router = APIRouter(prefix="/notification", tags=["Notification"])
svc = NotificationService()


# ---------------------------------------------------------
# SEND NOTIFICATION (Recruiter/Admin)
# ---------------------------------------------------------
@router.post("/")
async def send_notification(request: Request, payload: NotificationRequest):
    # Recruiters and admins can send notifications
    # ✅ FIX: Check permission
    ensure_permission(request, "notifications:create")

    user = request.state.user

    try:
        notif = payload.model_dump()
        notif["created_by"] = user["id"]

        result = svc.create_notification(notif)

        logger.info(
            "Notification created",
            extra={
                "request_id": getattr(request.state, "request_id", None),
                "user_id": user["id"],
            },
        )

        return {"ok": True, "data": result}

    except Exception as e:
        logger.error(
            f"Notification error: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", None),
                "user_id": user["id"],
            },
        )
        raise HTTPException(status_code=400, detail="Failed to create notification")