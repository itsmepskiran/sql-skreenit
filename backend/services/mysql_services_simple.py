"""
Simple working MySQL services without SQLAlchemy model imports.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func

from database_minimal import get_db_session
from services.r2_service import r2_service
from utils_others.logger import logger


class MySQLService:
    """Base MySQL service class with common operations."""
    
    def __init__(self):
        self.session_factory = get_db_session


class UserService(MySQLService):
    """Handles user operations synced from Supabase Auth."""
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        with self.session_factory() as db:
            # Simple query without models
            result = db.execute(
                "SELECT id, email, full_name, phone, role, avatar_url FROM users WHERE id = :user_id",
                {"user_id": user_id}
            ).fetchone()
            
            if not result:
                return None
            
            return {
                "id": result[0],
                "email": result[1],
                "full_name": result[2],
                "phone": result[3],
                "role": result[4],
                "avatar_url": result[5]
            }
    
    def sync_user_from_supabase(self, supabase_user: Dict[str, Any]) -> Dict[str, Any]:
        """Sync user data from Supabase to MySQL."""
        user_id = supabase_user.get("id")
        if not user_id:
            raise ValueError("User ID is required")
        
        with self.session_factory() as db:
            # Check if user exists
            existing = db.execute(
                "SELECT id FROM users WHERE id = :user_id",
                {"user_id": user_id}
            ).fetchone()
            
            if existing:
                # Update existing user
                db.execute(
                    "UPDATE users SET email = :email, full_name = :full_name, phone = :phone, role = :role, avatar_url = :avatar_url, last_sign_in_at = NOW() WHERE id = :user_id",
                    {
                        "email": supabase_user.get("email"),
                        "full_name": supabase_user.get("full_name"),
                        "phone": supabase_user.get("phone"),
                        "role": supabase_user.get("role"),
                        "avatar_url": supabase_user.get("avatar_url")
                    }
                )
            else:
                # Create new user
                db.execute(
                    "INSERT INTO users (id, email, full_name, phone, role, avatar_url, created_at, updated_at) VALUES (:user_id, :email, :full_name, :phone, :role, :avatar_url, NOW(), NOW())",
                    {
                        "user_id": supabase_user.get("id"),
                        "email": supabase_user.get("email"),
                        "full_name": supabase_user.get("full_name"),
                        "phone": supabase_user.get("phone"),
                        "role": supabase_user.get("role"),
                        "avatar_url": supabase_user.get("avatar_url")
                    }
                )
            
            return {"id": user_id, "action": "created" if not existing else "updated"}


class CandidateService(MySQLService):
    """Handles candidate operations with R2 file uploads."""
    
    def upsert_profile(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update candidate profile."""
        with self.session_factory() as db:
            # Check if profile exists
            existing = db.execute(
                "SELECT id FROM candidate_profiles WHERE user_id = :user_id",
                {"user_id": user_id}
            ).fetchone()
            
            if existing:
                # Update existing profile
                set_clauses = []
                update_fields = []
                
                for key, value in data.items():
                    if key != "user_id" and key != "id":
                        set_clauses.append(f"{key} = :{key}")
                        update_fields.append(value)
                
                if set_clauses:
                    db.execute(
                        f"UPDATE candidate_profiles SET {', '.join(set_clauses)} WHERE user_id = :user_id",
                        {**{k: v for k, v in data.items() if k != "user_id" and k != "id"}}
                    )
                
                db.commit()
                return {"id": existing[0], "action": "updated"}
            else:
                # Create new profile
                set_clauses = []
                insert_fields = []
                insert_values = []
                
                for key, value in data.items():
                    if key != "user_id" and key != "id":
                        set_clauses.append(f"{key} = :{key}")
                        insert_values.append(value)
                
                if set_clauses:
                    db.execute(
                        f"INSERT INTO candidate_profiles (id, user_id, {', '.join(set_clauses)}) VALUES ({', '.join([':user_id'] + [f":{v}" for v in insert_values])})",
                        {**{k: v for k, v in data.items() if k != "user_id" and k != "id"}}
                    )
                
                db.commit()
                return {"id": result[0], "action": "created"}
    
    def upload_resume(self, user_id: str, file_content: bytes, filename: str) -> str:
        """Upload resume to R2 and update profile."""
        try:
            resume_url = r2_service.upload_file(file_content, filename, "resumes")
            
            # Update profile
            with self.session_factory() as db:
                db.execute(
                    "UPDATE candidate_profiles SET resume_url = :resume_url WHERE user_id = :user_id",
                    {"user_id": user_id, "resume_url": resume_url}
                )
                db.commit()
            
            return resume_url
            
        except Exception as e:
            logger.error(f"Resume upload failed: {str(e)}")
            raise Exception(f"Resume upload failed: {str(e)}")


class RecruiterService(MySQLService):
    """Handles recruiter operations with R2 file uploads."""
    
    def create_company(self, name: str, created_by: str, description: Optional[str] = None, website: Optional[str] = None) -> Dict[str, Any]:
        """Create a new company."""
        with self.session_factory() as db:
            result = db.execute(
                "INSERT INTO companies (id, name, description, website, created_by, created_at, updated_at) VALUES (:id, :name, :description, :website, :created_by, NOW(), NOW())",
                {
                    "id": user_id,
                    "name": name,
                    "description": description,
                    "website": website,
                    "created_by": created_by
                }
            )
            
            return {
                "company_id": result[0],
                "company": {
                    "id": result[0],
                    "name": result[1],
                    "description": result[2],
                    "website": result[3],
                    "created_by": result[4]
                }
            }
    
    def post_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Post a new job."""
        with self.session_factory() as db:
            result = db.execute(
                "INSERT INTO jobs (id, title, description, requirements, location, job_type, salary_min, salary_max, currency, is_remote, status, company_id, created_by, created_at, updated_at) VALUES (:id, :title, :description, :requirements, :location, :job_type, :salary_min, :salary_max, :currency, :is_remote, :status, :company_id, :created_by, NOW(), NOW())",
                {
                    "id": job_data.get("id"),
                    "title": job_data.get("title"),
                    "description": job_data.get("description"),
                    "requirements": job_data.get("requirements"),
                    "location": job_data.get("location"),
                    "job_type": job_data.get("job_type"),
                    "salary_min": job_data.get("salary_min"),
                    "salary_max": job_data.get("salary_max"),
                    "currency": job_data.get("currency", "INR"),
                    "is_remote": job_data.get("is_remote", False),
                    "status": job_data.get("status", "active"),
                    "company_id": job_data.get("company_id"),
                    "created_by": job_data.get("created_by"),
                }
            )
            
            return {
                "id": result[0],
                "title": result[1],
                "status": result[2],
                "created_at": result[3].isoformat()
            }


class VideoService(MySQLService):
    """Handles video operations with R2 storage."""
    
    def upload_video(self, user_id: str, file_content: bytes, filename: str, video_type: str = "intro") -> str:
        """Upload video to R2 and update profile."""
        try:
            video_url = r2_service.upload_file(file_content, filename, "videos")
            
            # Update profile based on video type
            with self.session_factory() as db:
                if video_type == "intro":
                    db.execute(
                        "UPDATE candidate_profiles SET intro_video_url = :video_url WHERE user_id = :user_id",
                        {"user_id": user_id, "video_url": video_url}
                    )
                elif video_type == "response":
                    db.execute(
                        "INSERT INTO video_responses (id, user_id, video_url, video_type, created_at) VALUES (:id, :user_id, :video_url, :video_type, NOW())",
                        {"id": user_id, "user_id": user_id, "video_url": video_url, "video_type": video_type}
                    )
                
                db.commit()
            
            return video_url
            
        except Exception as e:
            logger.error(f"Video upload failed: {str(e)}")
            raise Exception(f"Video upload failed: {str(e)}")


class DashboardService(MySQLService):
    """Handles dashboard operations."""
    
    def get_recruiter_dashboard(self, user_id: str) -> Dict[str, Any]:
        """Get recruiter dashboard data."""
        with self.session_factory() as db:
            # Get jobs count
            jobs_count = db.execute(
                "SELECT COUNT(*) FROM jobs WHERE created_by = :user_id",
                {"user_id": user_id}
            ).fetchone()[0]
            
            # Get applications count
            applications_count = db.execute(
                "SELECT COUNT(*) FROM job_applications ja JOIN jobs j ON ja.job_id = j.id WHERE j.created_by = :user_id",
                {"user_id": user_id}
            ).fetchone()[0]
            
            return {
                "jobs_count": jobs_count,
                "applications_count": applications_count,
                "recent_activity": []
            }
    
    def get_candidate_dashboard(self, user_id: str) -> Dict[str, Any]:
        """Get candidate dashboard data."""
        with self.session_factory() as db:
            # Get applications count
            applications_count = db.execute(
                "SELECT COUNT(*) FROM job_applications WHERE candidate_id = :user_id",
                {"user_id": user_id}
            ).fetchone()[0]
            
            return {
                "applications_count": applications_count,
                "recent_activity": []
            }


class NotificationService(MySQLService):
    """Handles notification operations."""
    
    def get_notifications(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user notifications."""
        with self.session_factory() as db:
            results = db.execute(
                "SELECT id, title, message, is_read, created_at FROM notifications WHERE user_id = :user_id ORDER BY created_at DESC LIMIT :limit",
                {"user_id": user_id, "limit": limit}
            ).fetchall()
            
            return [
                {
                    "id": result[0],
                    "title": result[1],
                    "message": result[2],
                    "is_read": result[3],
                    "created_at": result[4].isoformat()
                }
                for result in results
            ]
    
    def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark notification as read."""
        with self.session_factory() as db:
            db.execute(
                "UPDATE notifications SET is_read = TRUE WHERE id = :notification_id AND user_id = :user_id",
                {"notification_id": notification_id, "user_id": user_id}
            )
            db.commit()
            return True


# Create service instances
user_service = UserService()
candidate_service = CandidateService()
recruiter_service = RecruiterService()
video_service = VideoService()
dashboard_service = DashboardService()
notification_service = NotificationService()
