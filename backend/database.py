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
    """User model for custom authentication."""
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(VARCHAR(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(VARCHAR(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(VARCHAR(50), nullable=True)
    role: Mapped[str] = mapped_column(Enum("recruiter", "candidate", name="user_role"), default="candidate")
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
    # Removed: full_name, email, phone, location, avatar_url (these belong in users table)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resume_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    intro_video_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    portfolio_url: Mapped[Optional[str]] = mapped_column(VARCHAR(500), nullable=True)
    skills: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    experience_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Education and Experience as JSON fields (unified structure)
    education: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    experience: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="candidate_profile")


class Job(Base):
    """Job posting model."""
    __tablename__ = "jobs"
    
    id: Mapped[str] = mapped_column(VARCHAR(36), primary_key=True, default=generate_uuid)
    job_title: Mapped[str] = mapped_column(VARCHAR(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(VARCHAR(255), nullable=True)
    job_type: Mapped[str] = mapped_column(VARCHAR(50), nullable=False)
    salary_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(VARCHAR(10), default="INR")
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(Enum("active", "closed", "draft", name="job_status"), default="active", index=True)
    skills: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
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
        Enum("submitted", "reviewed", "shortlisted", "interview_scheduled", "interviewing", "hired", "rejected", name="application_status"),
        default="submitted"
    )
    ai_score: Mapped[Optional[int]] = mapped_column(Integer)
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
