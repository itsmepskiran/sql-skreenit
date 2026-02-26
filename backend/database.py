"""
Database module for MySQL connectivity using SQLAlchemy.
This replaces Supabase for data operations while keeping Supabase for auth.
"""

import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any, Generator
from contextlib import contextmanager
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

# Create database URL
DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"

# Create engine
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
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
# DATABASE MODELS
# ============================================================

class User(Base):
    """User model synced from Supabase Auth."""
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(VARCHAR(255), nullable=False, unique=True, index=True)
    full_name: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(VARCHAR(50), nullable=True)
    role: Mapped[str] = mapped_column(Enum("recruiter", "candidate", name="user_role"), default="candidate")
    avatar_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    email_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_sign_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    recruiter_profile: Mapped[Optional["RecruiterProfile"]] = relationship("RecruiterProfile", back_populates="user", uselist=False)
    candidate_profile: Mapped[Optional["CandidateProfile"]] = relationship("CandidateProfile", back_populates="user", uselist=False)
    jobs: Mapped[List["Job"]] = relationship("Job", back_populates="creator")
    applications: Mapped[List["JobApplication"]] = relationship("JobApplication", foreign_keys="JobApplication.candidate_id", back_populates="candidate")


class Company(Base):
    """Company model for recruiters."""
    __tablename__ = "companies"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(VARCHAR(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    website: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    created_by: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator: Mapped["User"] = relationship("User", back_populates="jobs")
    jobs: Mapped[List["Job"]] = relationship("Job", back_populates="company")
    recruiter_profiles: Mapped[List["RecruiterProfile"]] = relationship("RecruiterProfile", back_populates="company")


class RecruiterProfile(Base):
    """Recruiter profile model."""
    __tablename__ = "recruiter_profiles"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    company_id: Mapped[Optional[str]] = mapped_column(VARCHAR(36), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    company_name: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    company_website: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    contact_name: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    about: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
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
    full_name: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(VARCHAR(50), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    resume_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    intro_video_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    portfolio_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    skills: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    experience_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="candidate_profile")
    education: Mapped[List["CandidateEducation"]] = relationship("CandidateEducation", back_populates="candidate_profile", lazy="dynamic")
    experience: Mapped[List["CandidateExperience"]] = relationship("CandidateExperience", back_populates="candidate_profile", lazy="dynamic")


class CandidateEducation(Base):
    """Candidate education history."""
    __tablename__ = "candidate_education"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    candidate_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("candidate_profiles.user_id", ondelete="CASCADE"), nullable=False, index=True)
    degree: Mapped[str] = mapped_column(VARCHAR(255), nullable=False)
    institution: Mapped[str] = mapped_column(VARCHAR(255), nullable=False)
    completion_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    candidate_profile: Mapped[Optional["CandidateProfile"]] = relationship("CandidateProfile", back_populates="education", uselist=False)


class CandidateExperience(Base):
    """Candidate work experience."""
    __tablename__ = "candidate_experience"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    candidate_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("candidate_profiles.user_id", ondelete="CASCADE"), nullable=False, index=True)
    job_title: Mapped[str] = mapped_column(VARCHAR(255), nullable=False)
    company: Mapped[str] = mapped_column(VARCHAR(255), nullable=False)
    start_date: Mapped[Optional[str]] = mapped_column(VARCHAR(50), nullable=True)
    end_date: Mapped[Optional[str]] = mapped_column(VARCHAR(50), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    candidate_profile: Mapped["CandidateProfile"] = relationship("CandidateProfile", back_populates="experience")


class Job(Base):
    """Job posting model."""
    __tablename__ = "jobs"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    title: Mapped[str] = mapped_column(VARCHAR(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    job_type: Mapped[str] = mapped_column(VARCHAR(50), nullable=False)
    salary_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(VARCHAR(10), default="INR")
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(Enum("active", "closed", "draft", name="job_status"), default="active", index=True)
    company_id: Mapped[Optional[str]] = mapped_column(VARCHAR(36), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    created_by: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    creator: Mapped["User"] = relationship("User", back_populates="jobs")
    company: Mapped[Optional["Company"]] = relationship("Company", back_populates="jobs")
    skills: Mapped[List["JobSkill"]] = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")
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
    job: Mapped["Job"] = relationship("Job", back_populates="skills")


class InterviewQuestion(Base):
    """Interview questions for a job."""
    __tablename__ = "interview_questions"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    job_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    question_order: Mapped[int] = mapped_column(Integer, default=0)
    time_limit: Mapped[int] = mapped_column(Integer, default=120)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="interview_questions")


class JobApplication(Base):
    """Job application from candidate."""
    __tablename__ = "job_applications"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    job_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    cover_letter: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    intro_video_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    resume_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    custom_answers: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    interview_questions: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(Enum("submitted", "reviewed", "shortlisted", "interview_scheduled", "interviewing", "hired", "rejected", name="application_status"), default="submitted", index=True)
    ai_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
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
    application_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    video_url: Mapped[str] = mapped_column(VARCHAR(500), nullable=False)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(Enum("not_started", "in_progress", "completed", "failed", name="video_status"), default="completed")
    ai_analysis: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
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


class GeneralVideoInterview(Base):
    """General video interview for candidates."""
    __tablename__ = "general_video_interviews"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    candidate_id: Mapped[str] = mapped_column(VARCHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    video_url: Mapped[str] = mapped_column(VARCHAR(500), nullable=False)
    status: Mapped[str] = mapped_column(Enum("not_started", "in_progress", "completed", "failed", name="general_video_status"), default="completed")
    ai_analysis: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    is_general: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


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
    metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
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
