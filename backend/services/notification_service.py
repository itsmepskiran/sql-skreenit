from typing import Optional, Dict, Any, List
from supabase import Client
from services.supabase_client import get_client
from utils_others.logger import logger
from datetime import datetime, timezone


class NotificationService:
    """
    Handles creation, retrieval, and updating of notifications.
    """

    def __init__(self, client: Optional[Client] = None):
        self.supabase = client or get_client()

    # ---------------------------------------------------------
    # CREATE NOTIFICATION
    # ---------------------------------------------------------
    def create_notification(self, notif: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert a notification into the notifications table.
        Required fields:
        - created_by (user_id)
        - message
        - category
        """
        try:
            payload = {
                "created_by": notif.get("created_by"),
                "message": notif.get("message"),
                "category": notif.get("category"),
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "metadata": notif.get("metadata") or {},
            }

            if not payload["created_by"] or not payload["message"]:
                raise ValueError("created_by and message are required")

            res = self.supabase.table("notifications").insert(payload).execute()

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            logger.info(
                "Notification created",
                extra={
                    "user_id": payload["created_by"],
                    "category": payload["category"],
                },
            )

            return res.data or {}

        except Exception as e:
            logger.error(
                f"Notification creation failed: {str(e)}",
                extra={"user_id": notif.get("created_by")},
            )
            raise RuntimeError("Failed to create notification")

    # ---------------------------------------------------------
    # LIST NOTIFICATIONS FOR USER (WITH PAGINATION)
    # ---------------------------------------------------------
    def list_notifications(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """
        Fetch notifications for a user with pagination.
        Returns:
        {
            "notifications": [...],
            "pagination": { page, page_size, total }
        }
        """
        try:
            offset = (page - 1) * page_size

            res = (
                self.supabase.table("notifications")
                .select("*", count="exact")
                .eq("created_by", user_id)
                .order("created_at", desc=True)
                .range(offset, offset + page_size - 1)
                .execute()
            )

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            notifications = res.data or []
            total = res.count or 0

            logger.info(
                "Notifications fetched",
                extra={"user_id": user_id, "count": len(notifications)},
            )

            return {
                "notifications": notifications,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                },
            }

        except Exception as e:
            logger.error(
                f"Notification fetch failed: {str(e)}",
                extra={"user_id": user_id},
            )
            raise RuntimeError("Failed to fetch notifications")

    # ---------------------------------------------------------
    # MARK AS READ
    # ---------------------------------------------------------
    def mark_as_read(self, notification_id: str, user_id: str) -> Dict[str, Any]:
        """
        Mark a single notification as read.
        """
        try:
            res = (
                self.supabase.table("notifications")
                .update({"is_read": True})
                .eq("id", notification_id)
                .eq("created_by", user_id)
                .execute()
            )

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            logger.info(
                "Notification marked as read",
                extra={"notification_id": notification_id, "user_id": user_id},
            )

            return res.data or {}

        except Exception as e:
            logger.error(
                f"Mark notification read failed: {str(e)}",
                extra={"notification_id": notification_id, "user_id": user_id},
            )
            raise RuntimeError("Failed to mark notification as read")

    # ---------------------------------------------------------
    # MARK ALL AS READ
    # ---------------------------------------------------------
    def mark_all_as_read(self, user_id: str) -> None:
        """
        Mark all notifications for a user as read.
        """
        try:
            res = (
                self.supabase.table("notifications")
                .update({"is_read": True})
                .eq("created_by", user_id)
                .execute()
            )

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            logger.info("All notifications marked as read", extra={"user_id": user_id})

        except Exception as e:
            logger.error(
                f"Mark all notifications read failed: {str(e)}",
                extra={"user_id": user_id},
            )
            raise RuntimeError("Failed to mark notifications as read")
