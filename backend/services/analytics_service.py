from typing import Optional, Dict, Any, List
from supabase import Client
from services.supabase_client import get_client
from utils_others.logger import logger
from datetime import datetime, timezone


class AnalyticsService:
    """
    Handles analytics event creation and retrieval.
    """

    def __init__(self, client: Optional[Client] = None):
        self.supabase = client or get_client()

    # ---------------------------------------------------------
    # CREATE EVENT
    # ---------------------------------------------------------
    def create_event(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert an analytics event into analytics_events table.
        Ensures event_data is always a dict and timestamp is normalized.
        """
        try:
            payload = {
                "user_id": data.get("user_id"),
                "event_type": data.get("event_type"),
                "event_data": data.get("event_data") or {},
                "ip_address": data.get("ip_address"),
                "user_agent": data.get("user_agent"),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            res = self.supabase.table("analytics_events").insert(payload).execute()

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            logger.info(
                "Analytics event created",
                extra={
                    "user_id": payload["user_id"],
                    "event_type": payload["event_type"],
                },
            )

            return res.data or {}

        except Exception as e:
            logger.error(
                f"Analytics event creation failed: {str(e)}",
                extra={"user_id": data.get("user_id")},
            )
            raise RuntimeError("Failed to create analytics event")

    # ---------------------------------------------------------
    # LIST EVENTS FOR USER
    # ---------------------------------------------------------
    def list_events(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """
        Fetch analytics events for a given user with pagination.
        Returns:
        {
            "events": [...],
            "pagination": { page, page_size, total }
        }
        """
        try:
            offset = (page - 1) * page_size

            res = (
                self.supabase.table("analytics_events")
                .select("*", count="exact")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .range(offset, offset + page_size - 1)
                .execute()
            )

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            events = res.data or []
            total = res.count or 0

            logger.info(
                "Analytics events fetched",
                extra={"user_id": user_id, "count": len(events)},
            )

            return {
                "events": events,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                },
            }

        except Exception as e:
            logger.error(
                f"Analytics event fetch failed: {str(e)}",
                extra={"user_id": user_id},
            )
            raise RuntimeError("Failed to fetch analytics events")
