from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from enum import Enum


# ---------------------------------------------------------
# VIDEO STATUS ENUM
# ---------------------------------------------------------
class VideoStatus(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"


# ---------------------------------------------------------
# REQUEST MODELS (from frontend)
# ---------------------------------------------------------

class VideoResponseRequest(BaseModel):
    application_id: str
    question_id: str
    transcript: Optional[str] = None
    duration: Optional[int] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    status: Optional[VideoStatus] = VideoStatus.not_started
    recorded_at: Optional[str] = None  # ISO datetime

    model_config = ConfigDict(from_attributes=True)


class GeneralVideoInterviewRequest(BaseModel):
    status: VideoStatus = VideoStatus.not_started
    ai_analysis: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None  # ISO datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# RESPONSE MODELS (to frontend)
# ---------------------------------------------------------

class VideoResponse(BaseModel):
    id: str
    application_id: str
    question_id: str
    video_url: Optional[str] = None
    transcript: Optional[str] = None
    duration: Optional[int] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    status: VideoStatus
    recorded_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class VideoResponseList(BaseModel):
    responses: List[VideoResponse]

    model_config = ConfigDict(from_attributes=True)


class GeneralVideoInterview(BaseModel):
    id: str
    candidate_id: str
    video_url: Optional[str] = None
    status: VideoStatus
    ai_analysis: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class GeneralVideoInterviewList(BaseModel):
    interviews: List[GeneralVideoInterview]

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# VIDEO QUESTION MODEL
# ---------------------------------------------------------
class VideoQuestion(BaseModel):
    id: str
    job_id: str
    question_text: str
    question_order: int
    time_limit: int

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# VIDEO UPLOAD URL RESPONSE
# ---------------------------------------------------------
class VideoUploadURLResponse(BaseModel):
    upload_url: str
    video_url: str

    model_config = ConfigDict(from_attributes=True)
