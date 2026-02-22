from pydantic import BaseModel, ConfigDict
from typing import Optional, List


# ---------------------------------------------------------
# REQUEST MODEL (from frontend)
# ---------------------------------------------------------
class NotificationRequest(BaseModel):
    title: str
    message: str
    category: str  # e.g., "system", "job_update", "application_update"
    related_id: Optional[str] = None
    is_read: Optional[bool] = False

    # user_id is injected by backend (request.state.user)
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# UPDATE MODEL (mark as read)
# ---------------------------------------------------------
class NotificationUpdateRequest(BaseModel):
    is_read: bool

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# RESPONSE MODEL (single notification)
# ---------------------------------------------------------
class NotificationResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    message: str
    category: str
    related_id: Optional[str] = None
    is_read: bool
    created_at: Optional[str] = None
    created_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# RESPONSE MODEL (list)
# ---------------------------------------------------------
class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# RESPONSE MODEL (counts)
# ---------------------------------------------------------
class NotificationCountResponse(BaseModel):
    unread: int
    total: int

    model_config = ConfigDict(from_attributes=True)
