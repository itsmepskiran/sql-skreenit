from typing import Optional, Dict, Any, List
from services.mysql_service import MySQLService
from utils_others.logger import logger
from datetime import datetime, timezone


class NotificationService:
    """
    Handles creation, retrieval, and updating of notifications.
    """

    def __init__(self, mysql_service: Optional[MySQLService] = None):
        self.mysql = mysql_service or MySQLService()

    # ---------------------------------------------------------
    # CREATE NOTIFICATION
    # ---------------------------------------------------------
    def create_notification(self, notif: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert a notification into notifications table.
        Required fields:
        - created_by (user_id)
        - message
        - category
        """
        try:
            payload = {
                "id": str(uuid.uuid4()),
                "user_id": notif.get("created_by"),
                "message": notif.get("message"),
                "category": notif.get("category"),
                "read": False,
                "created_at": datetime.now(timezone.utc),
                "metadata": notif.get("metadata") or {},
            }

            if not payload["user_id"] or not payload["message"]:
                raise ValueError("user_id and message are required")

            notification_id = self.mysql.insert_record("notifications", payload)

            logger.info(
                "Notification created",
                extra={
                    "user_id": payload["user_id"],
                    "category": payload["category"],
                },
            )
            return {"data": payload, "id": notification_id}

        except Exception as e:
            logger.error(f"Create notification failed: {str(e)}")
            raise RuntimeError("Failed to create notification")

    # ---------------------------------------------------------
    # RETRIEVE NOTIFICATIONS
    # ---------------------------------------------------------
    def get_user_notifications(
        self, 
        user_id: str, 
        unread_only: bool = False, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get notifications for a specific user.
        """
        try:
            conditions = {"user_id": user_id}
            if unread_only:
                conditions["read"] = False

            notifications = self.mysql.get_records(
                "notifications",
                conditions,
                order_by="created_at DESC",
                limit=limit
            )
            
            return notifications or []

        except Exception as e:
            logger.error(f"Get user notifications failed: {str(e)}")
            return []

    def get_notification_by_id(self, notification_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific notification by ID.
        """
        try:
            notification = self.mysql.get_single_record(
                "notifications",
                {"id": notification_id, "user_id": user_id}
            )
            return notification

        except Exception as e:
            logger.error(f"Get notification by ID failed: {str(e)}")
            return None

    # ---------------------------------------------------------
    # UPDATE NOTIFICATIONS
    # ---------------------------------------------------------
    def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """
        Mark a notification as read.
        """
        try:
            update_data = {
                "read": True,
                "read_at": datetime.now(timezone.utc)
            }
            
            success = self.mysql.update_record(
                "notifications",
                update_data,
                {"id": notification_id, "user_id": user_id}
            )
            
            if success:
                logger.info(f"Notification marked as read: {notification_id}")
            
            return success

        except Exception as e:
            logger.error(f"Mark notification as read failed: {str(e)}")
            return False

    def mark_all_as_read(self, user_id: str) -> int:
        """
        Mark all notifications for a user as read.
        """
        try:
            update_data = {
                "read": True,
                "read_at": datetime.now(timezone.utc)
            }
            
            # Get all unread notifications first
            unread = self.mysql.get_records("notifications", {"user_id": user_id, "read": False})
            
            if not unread:
                return 0
            
            # Update all unread notifications
            success_count = 0
            for notification in unread:
                if self.mysql.update_record(
                    "notifications",
                    update_data,
                    {"id": notification["id"], "user_id": user_id}
                ):
                    success_count += 1
            
            logger.info(f"Marked {success_count} notifications as read for user {user_id}")
            return success_count

        except Exception as e:
            logger.error(f"Mark all as read failed: {str(e)}")
            return 0

    # ---------------------------------------------------------
    # DELETE NOTIFICATIONS
    # ---------------------------------------------------------
    def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """
        Delete a specific notification.
        """
        try:
            success = self.mysql.delete_record(
                "notifications",
                {"id": notification_id, "user_id": user_id}
            )
            
            if success:
                logger.info(f"Notification deleted: {notification_id}")
            
            return success

        except Exception as e:
            logger.error(f"Delete notification failed: {str(e)}")
            return False

    def clear_all_notifications(self, user_id: str) -> int:
        """
        Clear all notifications for a user.
        """
        try:
            # Get all notifications first
            notifications = self.mysql.get_records("notifications", {"user_id": user_id})
            
            if not notifications:
                return 0
            
            # Delete all notifications
            success_count = 0
            for notification in notifications:
                if self.mysql.delete_record("notifications", {"id": notification["id"], "user_id": user_id}):
                    success_count += 1
            
            logger.info(f"Cleared {success_count} notifications for user {user_id}")
            return success_count

        except Exception as e:
            logger.error(f"Clear all notifications failed: {str(e)}")
            return 0

    # ---------------------------------------------------------
    # UTILITY METHODS
    # ---------------------------------------------------------
    def get_unread_count(self, user_id: str) -> int:
        """
        Get count of unread notifications for a user.
        """
        try:
            count = self.mysql.count_records("notifications", {"user_id": user_id, "read": False})
            return count

        except Exception as e:
            logger.error(f"Get unread count failed: {str(e)}")
            return 0

    def create_bulk_notifications(self, notifications: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Create multiple notifications at once.
        """
        try:
            created_notifications = []
            
            for notif in notifications:
                payload = {
                    "id": str(uuid.uuid4()),
                    "user_id": notif.get("user_id"),
                    "message": notif.get("message"),
                    "category": notif.get("category"),
                    "read": False,
                    "created_at": datetime.now(timezone.utc),
                    "metadata": notif.get("metadata") or {},
                }
                
                if payload["user_id"] and payload["message"]:
                    notification_id = self.mysql.insert_record("notifications", payload)
                    created_notifications.append({"data": payload, "id": notification_id})
            
            logger.info(f"Created {len(created_notifications)} bulk notifications")
            return created_notifications

        except Exception as e:
            logger.error(f"Create bulk notifications failed: {str(e)}")
            return []

    # ---------------------------------------------------------
    # NOTIFICATION TEMPLATES
    # ---------------------------------------------------------
    def create_application_notification(self, recruiter_id: str, candidate_name: str, job_title: str) -> Dict[str, Any]:
        """
        Create notification for new job application.
        """
        message = f"New application from {candidate_name} for your job: {job_title}"
        return self.create_notification({
            "created_by": recruiter_id,
            "message": message,
            "category": "application",
            "metadata": {
                "type": "new_application",
                "candidate_name": candidate_name,
                "job_title": job_title
            }
        })

    def create_status_update_notification(self, candidate_id: str, job_title: str, status: str) -> Dict[str, Any]:
        """
        Create notification for application status update.
        """
        message = f"Your application for {job_title} has been {status}"
        return self.create_notification({
            "created_by": candidate_id,
            "message": message,
            "category": "application_status",
            "metadata": {
                "type": "status_update",
                "job_title": job_title,
                "status": status
            }
        })

    def create_interview_notification(self, candidate_id: str, job_title: str, interview_time: str) -> Dict[str, Any]:
        """
        Create notification for interview invitation.
        """
        message = f"You have been invited for an interview for {job_title} at {interview_time}"
        return self.create_notification({
            "created_by": candidate_id,
            "message": message,
            "category": "interview",
            "metadata": {
                "type": "interview_invitation",
                "job_title": job_title,
                "interview_time": interview_time
            }
        })
