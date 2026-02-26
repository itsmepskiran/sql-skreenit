"""
MySQL Service Layer - Replaces Supabase for data operations.
Supabase will only be used for authentication.
"""

import os
import uuid
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func

from database import get_db_session, User, Company, RecruiterProfile, CandidateProfile, CandidateEducation, CandidateExperience, Job, JobSkill, InterviewQuestion, JobApplication, VideoResponse, InterviewResponse, GeneralVideoInterview, Notification, generate_uuid
from utils_others.logger import logger


class MySQLService:
    """Base MySQL service class with common operations."""
    
    def __init__(self):
        self.session_factory = get_db_session


# ============================================================
# USER SERVICE
# ============================================================

class UserService(MySQLService):
    """Handles user operations synced from Supabase Auth."""
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        with self.session_factory() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return None
            
            return {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "phone": user.phone,
                "role": user.role,
                "avatar_url": user.avatar_url,
                "metadata": user.metadata
            }
    
    def sync_user_from_supabase(self, supabase_user: Dict[str, Any]) -> Dict[str, Any]:
        """Sync user data from Supabase to MySQL."""
        user_id = supabase_user.get("id")
        if not user_id:
            raise ValueError("User ID is required")
        
        with self.session_factory() as db:
            # Check if user exists
            existing_user = db.query(User).filter(User.id == user_id).first()
            
            if existing_user:
                # Update existing user
                existing_user.email = supabase_user.get("email", existing_user.email)
                existing_user.full_name = supabase_user.get("full_name", existing_user.full_name)
                existing_user.phone = supabase_user.get("phone", existing_user.phone)
                existing_user.role = supabase_user.get("role", existing_user.role)
                existing_user.avatar_url = supabase_user.get("avatar_url", existing_user.avatar_url)
                existing_user.metadata = supabase_user.get("metadata", existing_user.metadata)
                existing_user.last_sign_in_at = datetime.now(timezone.utc)
                db.commit()
                return {"id": existing_user.id, "action": "updated"}
            else:
                # Create new user
                new_user = User(
                    id=user_id,
                    email=supabase_user.get("email"),
                    full_name=supabase_user.get("full_name"),
                    phone=supabase_user.get("phone"),
                    role=supabase_user.get("role", "candidate"),
                    avatar_url=supabase_user.get("avatar_url"),
                    metadata=supabase_user.get("metadata"),
                    email_confirmed_at=datetime.now(timezone.utc) if supabase_user.get("email_confirmed_at") else None
                )
                db.add(new_user)
                db.commit()
                return {"id": new_user.id, "action": "created"}


# ============================================================
# RECRUITER SERVICE
# ============================================================

class RecruiterService(MySQLService):
    """Handles recruiter operations."""
    
    def create_company(self, name: str, created_by: str, description: Optional[str] = None, website: Optional[str] = None) -> Dict[str, Any]:
        """Create a new company."""
        with self.session_factory() as db:
            company = Company(
                id=generate_uuid(),
                name=name,
                description=description,
                website=website,
                created_by=created_by
            )
            db.add(company)
            db.commit()
            db.refresh(company)
            
            return {
                "company_id": company.id,
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "description": company.description,
                    "website": company.website
                }
            }
    
    def list_companies(self) -> List[Dict[str, Any]]:
        """List all companies."""
        with self.session_factory() as db:
            companies = db.query(Company).order_by(Company.name).all()
            return [
                {
                    "id": c.id,
                    "name": c.name,
                    "description": c.description,
                    "website": c.website,
                    "created_by": c.created_by
                }
                for c in companies
            ]
    
    def upsert_profile(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update recruiter profile."""
        user_id = payload.get("user_id")
        if not user_id:
            raise ValueError("user_id is required")
        
        with self.session_factory() as db:
            # Check if profile exists
            existing_profile = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == user_id).first()
            
            if existing_profile:
                # Update existing profile
                for key, value in payload.items():
                    if key != "user_id" and hasattr(existing_profile, key):
                        setattr(existing_profile, key, value)
                db.commit()
                db.refresh(existing_profile)
                return {"id": existing_profile.id, "action": "updated"}
            else:
                # Create new profile
                profile = RecruiterProfile(
                    id=generate_uuid(),
                    user_id=user_id,
                    company_id=payload.get("company_id"),
                    company_name=payload.get("company_name"),
                    company_website=payload.get("company_website"),
                    contact_name=payload.get("contact_name"),
                    contact_email=payload.get("contact_email"),
                    location=payload.get("location"),
                    about=payload.get("about"),
                    avatar_url=payload.get("avatar_url")
                )
                db.add(profile)
                db.commit()
                db.refresh(profile)
                return {"id": profile.id, "action": "created"}
    
    def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get recruiter profile."""
        with self.session_factory() as db:
            profile = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == user_id).first()
            if not profile:
                return None
            
            return {
                "id": profile.id,
                "user_id": profile.user_id,
                "company_id": profile.company_id,
                "company_name": profile.company_name,
                "company_website": profile.company_website,
                "contact_name": profile.contact_name,
                "contact_email": profile.contact_email,
                "location": profile.location,
                "about": profile.about,
                "avatar_url": profile.avatar_url
            }
    
    def post_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Post a new job."""
        with self.session_factory() as db:
            job = Job(
                id=generate_uuid(),
                title=job_data.get("title"),
                description=job_data.get("description"),
                requirements=job_data.get("requirements"),
                location=job_data.get("location"),
                job_type=job_data.get("job_type"),
                salary_min=job_data.get("salary_min"),
                salary_max=job_data.get("salary_max"),
                currency=job_data.get("currency", "INR"),
                is_remote=job_data.get("is_remote", False),
                status=job_data.get("status", "active"),
                company_id=job_data.get("company_id"),
                created_by=job_data.get("created_by")
            )
            db.add(job)
            db.commit()
            db.refresh(job)
            
            return {
                "id": job.id,
                "title": job.title,
                "status": job.status,
                "created_at": job.created_at.isoformat()
            }
    
    def list_jobs(self, recruiter_id: str, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """List jobs posted by recruiter."""
        with self.session_factory() as db:
            offset = (page - 1) * page_size
            
            # Get total count
            total = db.query(func.count(Job.id)).filter(Job.created_by == recruiter_id).scalar()
            
            # Get jobs with pagination
            jobs = db.query(Job).filter(Job.created_by == recruiter_id)\
                .order_by(desc(Job.created_at))\
                .offset(offset)\
                .limit(page_size)\
                .all()
            
            return {
                "jobs": [
                    {
                        "id": job.id,
                        "title": job.title,
                        "status": job.status,
                        "created_at": job.created_at.isoformat(),
                        "location": job.location,
                        "job_type": job.job_type
                    }
                    for job in jobs
                ],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total or 0
                }
            }
    
    def get_job(self, job_id: str, recruiter_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get job details."""
        with self.session_factory() as db:
            query = db.query(Job).filter(Job.id == job_id)
            
            if recruiter_id:
                query = query.filter(Job.created_by == recruiter_id)
            
            job = query.first()
            if not job:
                return None
            
            return {
                "id": job.id,
                "title": job.title,
                "description": job.description,
                "requirements": job.requirements,
                "location": job.location,
                "job_type": job.job_type,
                "salary_min": job.salary_min,
                "salary_max": job.salary_max,
                "currency": job.currency,
                "is_remote": job.is_remote,
                "status": job.status,
                "company_id": job.company_id,
                "created_by": job.created_by,
                "created_at": job.created_at.isoformat()
            }
    
    def update_job(self, job_id: str, update_data: Dict[str, Any], recruiter_id: str) -> Optional[Dict[str, Any]]:
        """Update job."""
        with self.session_factory() as db:
            job = db.query(Job).filter(
                and_(Job.id == job_id, Job.created_by == recruiter_id)
            ).first()
            
            if not job:
                return None
            
            # Update fields
            for key, value in update_data.items():
                if hasattr(job, key):
                    setattr(job, key, value)
            
            db.commit()
            db.refresh(job)
            
            return {
                "id": job.id,
                "title": job.title,
                "status": job.status,
                "updated_at": job.updated_at.isoformat()
            }
    
    def delete_job(self, job_id: str, recruiter_id: str) -> bool:
        """Delete job."""
        with self.session_factory() as db:
            job = db.query(Job).filter(
                and_(Job.id == job_id, Job.created_by == recruiter_id)
            ).first()
            
            if not job:
                return False
            
            db.delete(job)
            db.commit()
            return True
    
    def get_recruiter_applications(self, recruiter_id: str, job_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get applications for recruiter's jobs."""
        with self.session_factory() as db:
            # Get jobs created by this recruiter
            jobs_query = db.query(Job.id, Job.title).filter(Job.created_by == recruiter_id)
            
            if job_id:
                jobs_query = jobs_query.filter(Job.id == job_id)
            
            jobs = jobs_query.all()
            if not jobs:
                return []
            
            job_ids = [j.id for j in jobs]
            job_map = {j.id: j.title for j in jobs}
            
            # Get applications for these jobs
            applications_query = db.query(JobApplication).filter(JobApplication.job_id.in_(job_ids))
            
            if not job_id:
                applications_query = applications_query.limit(100)
            
            applications = applications_query.order_by(desc(JobApplication.applied_at)).all()
            
            # Get candidate info
            candidate_ids = list(set(app.candidate_id for app in applications))
            candidates = {}
            
            if candidate_ids:
                users = db.query(User.id, User.full_name, User.email, User.phone)\
                    .filter(User.id.in_(candidate_ids)).all()
                candidates = {u.id: {
                    "name": u.full_name or u.email or "Candidate",
                    "email": u.email,
                    "phone": u.phone
                } for u in users}
            
            # Format results
            results = []
            for app in applications:
                candidate_info = candidates.get(app.candidate_id, {})
                results.append({
                    "id": app.id,
                    "job_id": app.job_id,
                    "candidate_id": app.candidate_id,
                    "job_title": job_map.get(app.job_id, "Unknown Job"),
                    "candidate_name": candidate_info.get("name", "Unknown Candidate"),
                    "candidate_email": candidate_info.get("email"),
                    "candidate_phone": candidate_info.get("phone"),
                    "status": app.status,
                    "applied_at": app.applied_at.isoformat(),
                    "intro_video_url": app.intro_video_url
                })
            
            return results


# ============================================================
# CANDIDATE SERVICE
# ============================================================

class CandidateService(MySQLService):
    """Handles candidate operations."""
    
    def upsert_profile(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update candidate profile."""
        with self.session_factory() as db:
            existing_profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()
            
            if existing_profile:
                # Update existing profile
                for key, value in data.items():
                    if key != "user_id" and hasattr(existing_profile, key):
                        setattr(existing_profile, key, value)
                db.commit()
                db.refresh(existing_profile)
                return {"id": existing_profile.id, "action": "updated"}
            else:
                # Create new profile
                profile = CandidateProfile(
                    id=generate_uuid(),
                    user_id=user_id,
                    **data
                )
                db.add(profile)
                db.commit()
                db.refresh(profile)
                return {"id": profile.id, "action": "created"}
    
    def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get candidate profile."""
        with self.session_factory() as db:
            profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()
            if not profile:
                return None
            
            return {
                "id": profile.id,
                "user_id": profile.user_id,
                "full_name": profile.full_name,
                "email": profile.email,
                "phone": profile.phone,
                "location": profile.location,
                "summary": profile.summary,
                "avatar_url": profile.avatar_url,
                "resume_url": profile.resume_url,
                "intro_video_url": profile.intro_video_url,
                "linkedin_url": profile.linkedin_url,
                "portfolio_url": profile.portfolio_url,
                "skills": profile.skills or [],
                "experience_years": profile.experience_years
            }
    
    def save_education(self, candidate_id: str, education_list: List[Dict[str, Any]]) -> bool:
        """Save candidate education."""
        with self.session_factory() as db:
            # Delete existing education
            db.query(CandidateEducation).filter(CandidateEducation.candidate_id == candidate_id).delete()
            
            # Add new education
            for edu in education_list:
                education = CandidateEducation(
                    id=generate_uuid(),
                    candidate_id=candidate_id,
                    degree=edu.get("degree"),
                    institution=edu.get("institution"),
                    completion_year=edu.get("completion_year")
                )
                db.add(education)
            
            db.commit()
            return True
    
    def save_experience(self, candidate_id: str, experience_list: List[Dict[str, Any]]) -> bool:
        """Save candidate experience."""
        with self.session_factory() as db:
            # Delete existing experience
            db.query(CandidateExperience).filter(CandidateExperience.candidate_id == candidate_id).delete()
            
            # Add new experience
            for exp in experience_list:
                experience = CandidateExperience(
                    id=generate_uuid(),
                    candidate_id=candidate_id,
                    job_title=exp.get("job_title"),
                    company=exp.get("company"),
                    start_date=exp.get("start_date"),
                    end_date=exp.get("end_date"),
                    description=exp.get("description")
                )
                db.add(experience)
            
            db.commit()
            return True
    
    def submit_application(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit job application."""
        with self.session_factory() as db:
            # Check if already applied
            existing = db.query(JobApplication).filter(
                and_(JobApplication.job_id == data["job_id"], JobApplication.candidate_id == data["candidate_id"])
            ).first()
            
            if existing:
                raise ValueError("Already applied for this job")
            
            application = JobApplication(
                id=generate_uuid(),
                job_id=data["job_id"],
                candidate_id=data["candidate_id"],
                cover_letter=data.get("cover_letter"),
                intro_video_url=data.get("intro_video_url"),
                resume_url=data.get("resume_url"),
                custom_answers=data.get("custom_answers"),
                status="submitted"
            )
            
            db.add(application)
            db.commit()
            db.refresh(application)
            
            return {
                "id": application.id,
                "job_id": application.job_id,
                "candidate_id": application.candidate_id,
                "status": application.status,
                "applied_at": application.applied_at.isoformat()
            }
    
    def check_application_status(self, job_id: str, candidate_id: str) -> Optional[Dict[str, Any]]:
        """Check if candidate has applied for job."""
        with self.session_factory() as db:
            application = db.query(JobApplication).filter(
                and_(JobApplication.job_id == job_id, JobApplication.candidate_id == candidate_id)
            ).first()
            
            if not application:
                return None
            
            return {
                "applied": True,
                "status": application.status,
                "applied_at": application.applied_at.isoformat()
            }
    
    def get_candidate_applications(self, candidate_id: str) -> List[Dict[str, Any]]:
        """Get all applications by candidate."""
        with self.session_factory() as db:
            applications = db.query(JobApplication).filter(JobApplication.candidate_id == candidate_id)\
                .order_by(desc(JobApplication.applied_at)).all()
            
            job_ids = [app.job_id for app in applications]
            jobs = {}
            
            if job_ids:
                job_list = db.query(Job.id, Job.title, Job.location, Job.job_type)\
                    .filter(Job.id.in_(job_ids)).all()
                jobs = {j.id: {
                    "title": j.title,
                    "location": j.location,
                    "job_type": j.job_type
                } for j in job_list}
            
            results = []
            for app in applications:
                job_info = jobs.get(app.job_id, {})
                results.append({
                    "id": app.id,
                    "job_id": app.job_id,
                    "status": app.status,
                    "applied_at": app.applied_at.isoformat(),
                    "job_title": job_info.get("title"),
                    "location": job_info.get("location"),
                    "job_type": job_info.get("job_type")
                })
            
            return results


# ============================================================
# DASHBOARD SERVICE
# ============================================================

class DashboardService(MySQLService):
    """Handles dashboard operations for both roles."""
    
    def get_summary(self, user_id: str) -> Dict[str, Any]:
        """Get dashboard summary."""
        with self.session_factory() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return {"role": None, "stats": {}, "jobs": [], "applications": []}
            
            role = user.role
            
            if role == "recruiter":
                return self._get_recruiter_summary(user_id, db)
            elif role == "candidate":
                return self._get_candidate_summary(user_id, db)
            else:
                return {"role": None, "stats": {}, "jobs": [], "applications": []}
    
    def _get_recruiter_summary(self, user_id: str, db: Session) -> Dict[str, Any]:
        """Get recruiter dashboard summary."""
        # Get jobs
        jobs = db.query(Job).filter(Job.created_by == user_id)\
            .order_by(desc(Job.created_at)).all()
        
        job_ids = [j.id for j in jobs]
        
        # Get applications for these jobs
        applications = []
        if job_ids:
            apps = db.query(JobApplication).filter(JobApplication.job_id.in_(job_ids))\
                .order_by(desc(JobApplication.applied_at)).all()
            applications = [
                {
                    "id": app.id,
                    "job_id": app.job_id,
                    "status": app.status,
                    "applied_at": app.applied_at.isoformat()
                }
                for app in apps
            ]
        
        # Calculate stats
        stats = {
            "total_jobs": len(jobs),
            "active_jobs": sum(1 for j in jobs if j.status == "active"),
            "closed_jobs": sum(1 for j in jobs if j.status == "closed"),
            "total_applications": len(applications),
            "shortlisted": sum(1 for a in applications if a["status"] == "shortlisted"),
            "interviews": sum(1 for a in applications if a["status"] == "interview_scheduled"),
            "hired": sum(1 for a in applications if a["status"] == "hired")
        }
        
        return {
            "role": "recruiter",
            "stats": stats,
            "jobs": [
                {
                    "id": j.id,
                    "title": j.title,
                    "status": j.status,
                    "created_at": j.created_at.isoformat(),
                    "location": j.location,
                    "job_type": j.job_type
                }
                for j in jobs
            ],
            "applications": applications
        }
    
    def _get_candidate_summary(self, user_id: str, db: Session) -> Dict[str, Any]:
        """Get candidate dashboard summary."""
        # Get applications
        applications = db.query(JobApplication).filter(JobApplication.candidate_id == user_id)\
            .order_by(desc(JobApplication.applied_at)).all()
        
        job_ids = [app.job_id for app in applications]
        jobs = {}
        
        if job_ids:
            job_list = db.query(Job.id, Job.title, Job.location, Job.job_type)\
                .filter(Job.id.in_(job_ids)).all()
            jobs = {j.id: {
                "title": j.title,
                "location": j.location,
                "job_type": j.job_type
            } for j in job_list}
        
        # Format applications with job info
        formatted_apps = []
        for app in applications:
            job_info = jobs.get(app.job_id, {})
            formatted_apps.append({
                "id": app.id,
                "job_id": app.job_id,
                "status": app.status,
                "applied_at": app.applied_at.isoformat(),
                "job_title": job_info.get("title"),
                "location": job_info.get("location"),
                "job_type": job_info.get("job_type")
            })
        
        # Calculate stats
        stats = {
            "total_applications": len(formatted_apps),
            "shortlisted": sum(1 for a in formatted_apps if a["status"] == "shortlisted"),
            "interviews": sum(1 for a in formatted_apps if a["status"] == "interview_scheduled"),
            "hired": sum(1 for a in formatted_apps if a["status"] == "hired")
        }
        
        return {
            "role": "candidate",
            "stats": stats,
            "jobs": [],  # Candidates don't have jobs
            "applications": formatted_apps
        }
    
    def list_public_jobs(self, search_query: Optional[str] = None) -> List[Dict[str, Any]]:
        """List active jobs for public view."""
        with self.session_factory() as db:
            query = db.query(Job).filter(Job.status == "active")
            
            if search_query:
                query = query.filter(
                    or_(
                        Job.title.ilike(f"%{search_query}%"),
                        Job.location.ilike(f"%{search_query}%")
                    )
                )
            
            jobs = query.order_by(desc(Job.created_at)).limit(100).all()
            
            # Get company info
            company_ids = list(set(j.company_id for j in jobs if j.company_id))
            companies = {}
            
            if company_ids:
                company_list = db.query(Company.id, Company.name)\
                    .filter(Company.id.in_(company_ids)).all()
                companies = {c.id: c.name for c in company_list}
            
            return [
                {
                    "id": job.id,
                    "title": job.title,
                    "description": job.description,
                    "location": job.location,
                    "job_type": job.job_type,
                    "salary_min": job.salary_min,
                    "salary_max": job.salary_max,
                    "currency": job.currency,
                    "is_remote": job.is_remote,
                    "status": job.status,
                    "company_name": companies.get(job.company_id, "Unknown Company"),
                    "created_at": job.created_at.isoformat()
                }
                for job in jobs
            ]
    
    def get_public_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get single job for public view."""
        with self.session_factory() as db:
            job = db.query(Job).filter(Job.id == job_id).first()
            if not job or job.status != "active":
                return None
            
            # Get company info
            company_name = "Unknown Company"
            if job.company_id:
                company = db.query(Company.name).filter(Company.id == job.company_id).first()
                if company:
                    company_name = company.name
            
            return {
                "id": job.id,
                "title": job.title,
                "description": job.description,
                "requirements": job.requirements,
                "location": job.location,
                "job_type": job.job_type,
                "salary_min": job.salary_min,
                "salary_max": job.salary_max,
                "currency": job.currency,
                "is_remote": job.is_remote,
                "status": job.status,
                "company_name": company_name,
                "created_at": job.created_at.isoformat()
            }


# ============================================================
# NOTIFICATION SERVICE
# ============================================================

class NotificationService(MySQLService):
    """Handles notification operations."""
    
    def create_notification(self, notif: Dict[str, Any]) -> Dict[str, Any]:
        """Create notification."""
        with self.session_factory() as db:
            notification = Notification(
                id=generate_uuid(),
                created_by=notif.get("created_by"),
                title=notif.get("title"),
                message=notif.get("message"),
                category=notif.get("category", "system"),
                related_id=notif.get("related_id"),
                metadata=notif.get("metadata", {})
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)
            
            return {
                "id": notification.id,
                "created_by": notification.created_by,
                "message": notification.message,
                "category": notification.category,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat()
            }
    
    def list_notifications(self, user_id: str, page: int = 1, page_size: int = 50) -> Dict[str, Any]:
        """List notifications for user."""
        with self.session_factory() as db:
            offset = (page - 1) * page_size
            
            # Get total count
            total = db.query(func.count(Notification.id)).filter(Notification.created_by == user_id).scalar()
            
            # Get notifications
            notifications = db.query(Notification).filter(Notification.created_by == user_id)\
                .order_by(desc(Notification.created_at))\
                .offset(offset)\
                .limit(page_size)\
                .all()
            
            return {
                "notifications": [
                    {
                        "id": notif.id,
                        "created_by": notif.created_by,
                        "title": notif.title,
                        "message": notif.message,
                        "category": notif.category,
                        "related_id": notif.related_id,
                        "is_read": notif.is_read,
                        "metadata": notif.metadata,
                        "created_at": notif.created_at.isoformat()
                    }
                    for notif in notifications
                ],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total or 0
                }
            }
    
    def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark notification as read."""
        with self.session_factory() as db:
            notification = db.query(Notification).filter(
                and_(Notification.id == notification_id, Notification.created_by == user_id)
            ).first()
            
            if not notification:
                return False
            
            notification.is_read = True
            db.commit()
            return True
    
    def mark_all_as_read(self, user_id: str) -> bool:
        """Mark all notifications as read."""
        with self.session_factory() as db:
            db.query(Notification).filter(Notification.created_by == user_id)\
                .update({"is_read": True})
            db.commit()
            return True


# ============================================================
# VIDEO SERVICE
# ============================================================

class VideoService(MySQLService):
    """Handles video operations."""
    
    def save_video_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Save video response."""
        with self.session_factory() as db:
            response = VideoResponse(
                id=generate_uuid(),
                application_id=data.get("application_id"),
                candidate_id=data.get("candidate_id"),
                question=data.get("question"),
                video_url=data.get("video_url"),
                transcript=data.get("transcript"),
                duration=data.get("duration"),
                status=data.get("status", "completed"),
                ai_analysis=data.get("ai_analysis", {})
            )
            db.add(response)
            db.commit()
            db.refresh(response)
            
            return {
                "id": response.id,
                "application_id": response.application_id,
                "question": response.question,
                "video_url": response.video_url,
                "status": response.status,
                "recorded_at": response.recorded_at.isoformat()
            }
    
    def save_general_video(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Save general video interview."""
        with self.session_factory() as db:
            video = GeneralVideoInterview(
                id=generate_uuid(),
                candidate_id=data.get("candidate_id"),
                video_url=data.get("video_url"),
                status=data.get("status", "completed"),
                ai_analysis=data.get("ai_analysis", {})
            )
            db.add(video)
            db.commit()
            db.refresh(video)
            
            return {
                "id": video.id,
                "candidate_id": video.candidate_id,
                "video_url": video.video_url,
                "status": video.status,
                "created_at": video.created_at.isoformat()
            }
    
    def get_candidate_videos(self, candidate_id: str) -> List[Dict[str, Any]]:
        """Get all videos for candidate."""
        with self.session_factory() as db:
            videos = db.query(VideoResponse).filter(VideoResponse.candidate_id == candidate_id)\
                .order_by(desc(VideoResponse.recorded_at)).all()
            
            return [
                {
                    "id": video.id,
                    "application_id": video.application_id,
                    "question": video.question,
                    "video_url": video.video_url,
                    "status": video.status,
                    "recorded_at": video.recorded_at.isoformat()
                }
                for video in videos
            ]


# ============================================================
# SERVICE INSTANCES
# ============================================================

# Create service instances
user_service = UserService()
recruiter_service = RecruiterService()
candidate_service = CandidateService()
dashboard_service = DashboardService()
notification_service = NotificationService()
video_service = VideoService()
