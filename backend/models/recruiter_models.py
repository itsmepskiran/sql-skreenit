from pydantic import BaseModel, EmailStr, Field
from typing import Optional

# -------------------------------------------------------------------
# SHARED / BASE MODELS
# -------------------------------------------------------------------

class RecruiterProfileBase(BaseModel):
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    location: Optional[str] = None
    # 'about' maps to the frontend payload
    about: Optional[str] = None 
    avatar_url: Optional[str] = None

# -------------------------------------------------------------------
# PROFILE MODELS
# -------------------------------------------------------------------

class RecruiterProfileCreate(RecruiterProfileBase):
    """
    Model used when creating a profile (often internally or via Auth)
    """
    user_id: str

class RecruiterProfileUpdate(RecruiterProfileBase):
    """
    Used when the recruiter updates their profile from the dashboard.
    All fields are optional because they might update just one.
    """
    pass

# -------------------------------------------------------------------
# JOB MODELS
# -------------------------------------------------------------------

class JobBase(BaseModel):
    title: str
    description: str
    requirements: Optional[str] = "No specific requirements"
    location: str
    
    # Matches the strict lowercase constraints of your Database
    # and the values in job-create.html / job-edit.html
    job_type: str = Field(..., description="full-time, part-time, contract, internship, freelance, remote, onsite, hybrid")
    
    # Salary fields must be Integers or None (handled by JS before sending)
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    
    currency: Optional[str] = "INR"
    is_remote: Optional[bool] = False
    status: Optional[str] = "active"

class JobCreateRequest(JobBase):
    """
    Payload for POST /api/v1/recruiter/jobs
    """
    pass

class JobUpdateRequest(BaseModel):
    """
    Payload for PUT /api/v1/recruiter/jobs/{job_id}
    All fields optional to allow partial updates.
    """
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = None
    is_remote: Optional[bool] = None
    status: Optional[str] = None