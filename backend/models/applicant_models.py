from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Optional, List, Dict, Any

# -------------------------------------------------------------------
# SHARED / BASE MODELS
# -------------------------------------------------------------------

class ApplicantProfileBase(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    resume_url: Optional[str] = None
    linkedin_url: Optional[HttpUrl] = None
    portfolio_url: Optional[HttpUrl] = None
    skills: Optional[List[str]] = []
    experience_years: Optional[int] = None
    
class ApplicantProfileUpdate(ApplicantProfileBase):
    """
    Used for profile updates via PUT /api/v1/applicant/profile
    """
    pass

# -------------------------------------------------------------------
# APPLICATION MODELS
# -------------------------------------------------------------------

class ApplicationBase(BaseModel):
    job_id: str
    cover_letter: Optional[str] = None
    custom_answers: Optional[Dict[str, Any]] = None

class ApplicationCreate(BaseModel):
    job_id: str
    candidate_id: Optional[str] = None
    cover_letter: Optional[str] = None
    custom_answers: Optional[Dict[str, Any]] = None
    
class ApplicationResponse(ApplicationBase):
    id: str
    status: str
    applied_at: str
    job_title: Optional[str] = None
    company_name: Optional[str] = None