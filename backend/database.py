import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any, Generator
from contextlib import contextmanager
from urllib.parse import quote
from sqlalchemy import create_engine, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON, Enum, event
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session, mapped_column, Mapped
from sqlalchemy.dialects.mysql import VARCHAR
from dotenv import load_dotenv

load_dotenv()

# Database Configuration
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "skreenit")

# URL-encode the password to handle special characters like @
ENCD_PASS = quote(MYSQL_PASSWORD, safe='')

# Create database URL with encoded password
DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{ENCD_PASS}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"

# Create engine
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_timeout=30,  # Timeout for getting connection from pool
    pool_recycle=3600,  # Recycle connections after 1 hour
    connect_args={
        "connect_timeout": 10,  # Connection timeout in seconds
        "read_timeout": 30,     # Read timeout in seconds
        "write_timeout": 30     # Write timeout in seconds
    },
    echo=False  # Set to True for SQL logging during development
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


# ============================================================
# REFERENCE TABLES (for dropdowns)
# ============================================================

class Department(Base):
    """Department reference table."""
    __tablename__ = "departments"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(VARCHAR(100), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(VARCHAR(50), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Role(Base):
    """Role/Designation reference table."""
    __tablename__ = "roles"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(VARCHAR(100), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(VARCHAR(50), nullable=False, unique=True)
    department_id: Mapped[Optional[str]] = mapped_column(VARCHAR(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    level: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    department: Mapped[Optional["Department"]] = relationship("Department")


class EmploymentType(Base):
    """Employment type reference table."""
    __tablename__ = "employment_types"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(VARCHAR(50), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(VARCHAR(50), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Industry(Base):
    """Industry reference table."""
    __tablename__ = "industries"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(VARCHAR(100), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(VARCHAR(50), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class JobType(Base):
    """Job type (work location preference) reference table."""
    __tablename__ = "job_types"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(VARCHAR(50), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(VARCHAR(50), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EducationLevel(Base):
    """Education level reference table."""
    __tablename__ = "education_levels"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(VARCHAR(100), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(VARCHAR(50), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SalaryRange(Base):
    """Salary range reference table."""
    __tablename__ = "salary_ranges"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    label: Mapped[str] = mapped_column(VARCHAR(100), nullable=False)
    min_salary: Mapped[int] = mapped_column(Integer, nullable=False)
    max_salary: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(VARCHAR(10), default="INR")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ExperienceLevel(Base):
    """Experience level reference table."""
    __tablename__ = "experience_levels"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(VARCHAR(50), nullable=False, unique=True)
    min_years: Mapped[int] = mapped_column(Integer, nullable=False)
    max_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ============================================================
# DATABASE MODELS
# ============================================================

class User(Base):
    """User model for custom authentication."""
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(VARCHAR(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(VARCHAR(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(VARCHAR(50), nullable=True)
    role: Mapped[str] = mapped_column(Enum("admin", "recruiter", "candidate", name="user_role"), default="candidate")
    location: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    email_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_sign_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    user_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    onboarded: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    extra_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column("metadata", JSON, nullable=True)
    
    # Relationships
    recruiter_profile: Mapped[Optional["RecruiterProfile"]] = relationship("RecruiterProfile", back_populates="user", uselist=False)
    candidate_profile: Mapped[Optional["CandidateProfile"]] = relationship("CandidateProfile", back_populates="user", uselist=False)
    jobs: Mapped[List["Job"]] = relationship("Job", back_populates="creator")
    applications: Mapped[List["JobApplication"]] = relationship("JobApplication", foreign_keys="JobApplication.candidate_id", back_populates="candidate")


class Company(Base):
    """Company model."""
    __tablename__ = "companies"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(VARCHAR(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    website: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    company_display_id: Mapped[Optional[str]] = mapped_column(VARCHAR(20), nullable=True, index=True)
    recruiter_id: Mapped[Optional[str]] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    recruiter: Mapped[Optional["User"]] = relationship("User", foreign_keys=[recruiter_id])
    jobs: Mapped[List["Job"]] = relationship("Job", back_populates="company")
    recruiter_profiles: Mapped[List["RecruiterProfile"]] = relationship("RecruiterProfile", back_populates="company")


class RecruiterProfile(Base):
    """Recruiter profile model."""
    __tablename__ = "recruiter_profiles"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    company_id: Mapped[Optional[str]] = mapped_column(VARCHAR(36), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    # Removed: company_name, company_website, company_description (these belong in companies/users table)
    location: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    contact_name: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    # Removed: avatar_url (belongs in users table)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="recruiter_profile")
    company: Mapped[Optional["Company"]] = relationship("Company", back_populates="recruiter_profiles")


class CandidateProfile(Base):
    """Candidate profile model."""
    __tablename__ = "candidate_profiles"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    # Display ID for candidates (similar to company_display_id)
    candidate_display_id: Mapped[Optional[str]] = mapped_column(VARCHAR(20), nullable=True, index=True)
    
    # Personal Information
    date_of_birth: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(VARCHAR(20), nullable=True)
    marital_status: Mapped[Optional[str]] = mapped_column(VARCHAR(20), nullable=True)
    
    # Current Address
    current_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    current_city: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)
    current_state: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)
    current_country: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)
    
    # Permanent Address
    permanent_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    permanent_city: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)
    permanent_state: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)
    permanent_country: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)
    
    # Professional Details
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expected_salary: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notice_period_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Social & Web Presence
    linkedin_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    portfolio_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    personal_projects: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    personal_blogs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Skills & Languages
    skills: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    spoken_languages: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    certifications: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    
    # Education - Structured
    highest_qualification: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)
    schooling: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    schooling_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    schooling_percentage: Mapped[Optional[float]] = mapped_column(Integer, nullable=True)
    pre_university: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    pre_university_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    pre_university_percentage: Mapped[Optional[float]] = mapped_column(Integer, nullable=True)
    graduation: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    graduation_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    graduation_percentage: Mapped[Optional[float]] = mapped_column(Integer, nullable=True)
    post_graduation: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    post_graduation_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    post_graduation_percentage: Mapped[Optional[float]] = mapped_column(Integer, nullable=True)
    
    # Experience
    experience_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Latest/Current Experience
    current_company: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    current_designation: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    current_doj: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    current_dol: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    current_salary: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Full experience history as JSON
    experience: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    # Full education history as JSON (for additional degrees)
    education: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    
    # Documents
    resume_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    intro_video_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="candidate_profile")


class Job(Base):
    """Job posting model."""
    __tablename__ = "jobs"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    job_title: Mapped[str] = mapped_column(VARCHAR(255), nullable=False)
    
    # Job Classification
    department: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)
    role: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)
    employment_type: Mapped[Optional[str]] = mapped_column(VARCHAR(50), nullable=True)  # full-time, part-time, contract, internship
    job_type: Mapped[str] = mapped_column(VARCHAR(50), nullable=False)  # work type preference (wfo, wfh, hybrid)
    
    # Location
    location: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    location_city: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)
    location_state: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)
    location_country: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Experience Requirements
    experience_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    experience_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)  # Candidate current industry
    
    # Diversity & Inclusion
    diversity_hiring: Mapped[Optional[str]] = mapped_column(VARCHAR(100), nullable=True)  # e.g., "women-only", "disability-friendly", "open-to-all"
    
    # Job Details
    description: Mapped[str] = mapped_column(Text, nullable=False)
    responsibilities: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Compensation
    salary_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(VARCHAR(10), default="INR")
    
    # Hiring Details
    no_of_openings: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=1)
    notice_period_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Education & Skills
    education_qualification: Mapped[Optional[str]] = mapped_column(VARCHAR(50), nullable=True)
    work_location_preference: Mapped[Optional[str]] = mapped_column(VARCHAR(50), nullable=True)
    skills: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    
    # Contact Person
    contact_person_name: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    contact_person_email: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    
    # Status & Ownership
    status: Mapped[str] = mapped_column(Enum("active", "closed", "draft", name="job_status"), default="active", index=True)
    company_id: Mapped[Optional[str]] = mapped_column(VARCHAR(36), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    created_by: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    creator: Mapped["User"] = relationship("User", back_populates="jobs")
    company: Mapped[Optional["Company"]] = relationship("Company", back_populates="jobs")
    skills_rel: Mapped[List["JobSkill"]] = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")
    interview_questions: Mapped[List["InterviewQuestion"]] = relationship("InterviewQuestion", back_populates="job", cascade="all, delete-orphan")
    applications: Mapped[List["JobApplication"]] = relationship("JobApplication", back_populates="job")


class JobSkill(Base):
    """Skills required for a job."""
    __tablename__ = "job_skills"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    job_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_name: Mapped[str] = mapped_column(VARCHAR(100), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="skills_rel")


class InterviewQuestion(Base):
    """Interview questions for a job."""
    __tablename__ = "interview_questions"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    job_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[Optional[str]] = mapped_column(VARCHAR(36), nullable=True)
    question_order: Mapped[int] = mapped_column(Integer, default=0)
    time_limit: Mapped[int] = mapped_column(Integer, default=120)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="interview_questions")


class JobApplication(Base):
    """Job application from candidate."""
    __tablename__ = "job_applications"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"))
    candidate_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    cover_letter: Mapped[Optional[str]] = mapped_column(Text)
    intro_video_url: Mapped[Optional[str]] = mapped_column(String(500))
    resume_url: Mapped[Optional[str]] = mapped_column(String(500))
    custom_answers: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)
    interview_questions: Mapped[Optional[List[str]]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(
        Enum("submitted", "responses_submitted", "reviewed", "shortlisted", "interview_scheduled", "interviewing", "hired", "rejected", name="application_status"),
        default="submitted"
    )
    ai_score: Mapped[Optional[int]] = mapped_column(Integer)
    feedback: Mapped[Optional[str]] = mapped_column(Text)  # Recruiter feedback for candidate
    face_match_result: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)  # Face verification result
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="applications")
    candidate: Mapped["User"] = relationship("User", foreign_keys=[candidate_id], back_populates="applications")
    video_responses: Mapped[List["VideoResponse"]] = relationship("VideoResponse", back_populates="application")


class VideoResponse(Base):
    """Video response for job application questions."""
    __tablename__ = "video_responses"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    job_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("jobs.id"), nullable=False)
    application_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[Optional[str]] = mapped_column(VARCHAR(36), nullable=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    video_url: Mapped[str] = mapped_column(VARCHAR(500), nullable=False)
    video_path: Mapped[str] = mapped_column(VARCHAR(500), nullable=False)
    question_index: Mapped[int] = mapped_column(Integer, default=0)
    duration: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    application: Mapped["JobApplication"] = relationship("JobApplication", back_populates="video_responses")


class InterviewResponse(Base):
    """Alternative interview response table."""
    __tablename__ = "interview_responses"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    application_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    video_url: Mapped[str] = mapped_column(VARCHAR(500), nullable=False)
    status: Mapped[str] = mapped_column(Enum("pending_review", "reviewed", "approved", "rejected", name="interview_response_status"), default="pending_review")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CandidateVideo(Base):
    """Videos for candidates (intro, portfolio, etc.)."""
    __tablename__ = "candidate_videos"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    candidate_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    video_type: Mapped[str] = mapped_column(Enum("intro", "portfolio", "other", name="video_type"), default="intro")
    video_url: Mapped[str] = mapped_column(VARCHAR(500), nullable=False)
    video_path: Mapped[str] = mapped_column(VARCHAR(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Notification(Base):
    """Notifications for users."""
    __tablename__ = "notifications"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    created_by: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(VARCHAR(50), default="system")
    related_id: Mapped[Optional[str]] = mapped_column(VARCHAR(36), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    notification_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


# ============================================================
# DATABASE UTILITIES
# ============================================================

def create_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Drop all database tables."""
    Base.metadata.drop_all(bind=engine)


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Context manager for database sessions."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@event.listens_for(Session, 'before_flush')
def receive_before_flush(session, flush_context, instances):
    """Automatically update updated_at timestamp before flush."""
    for instance in session.dirty:
        if hasattr(instance, 'updated_at'):
            instance.updated_at = datetime.utcnow()
