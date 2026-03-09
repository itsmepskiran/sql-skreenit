from typing import Optional, Dict, Any, List
from services.mysql_service import MySQLService
from utils_others.logger import logger
from uuid import uuid4
import json

class RecruiterService:
    """
    Enterprise-grade Recruiter Service - MySQL Version
    """

    def __init__(self, mysql_service: Optional[MySQLService] = None):
        self.mysql = mysql_service or MySQLService()

    # ---------------------------------------------------------
    # JOB CRUD
    # ---------------------------------------------------------
    def post_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if not job_data.get("company_id"):
                raise ValueError("company_id is required")

            job_data["id"] = str(uuid4())
            job_id = self.mysql.insert_record("jobs", job_data)
            
            logger.info("Job posted", extra={"created_by": job_data.get("created_by")})
            return {"data": job_data, "id": job_id}
        except Exception as e:
            logger.error(f"Job post failed: {str(e)}")
            raise RuntimeError("Failed to post job")

    def list_jobs(self, recruiter_id: str, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        try:
            offset = (page - 1) * page_size
            conditions = {"created_by": recruiter_id}
            
            jobs = self.mysql.get_records_with_pagination(
                table="jobs",
                conditions=conditions,
                order_by="created_at DESC",
                limit=page_size,
                offset=offset
            )
            total_count = self.mysql.count_records("jobs", conditions)
            
            return {
                "data": jobs or [],
                "count": total_count,
                "page": page,
                "page_size": page_size
            }
        except Exception as e:
            logger.error(f"List jobs failed: {str(e)}")
            raise RuntimeError("Failed to list jobs")

    def get_job(self, job_id: str, recruiter_id: Optional[str] = None) -> Dict[str, Any]:
        try:
            conditions = {"id": job_id}
            if recruiter_id:
                conditions["created_by"] = recruiter_id
            
            job = self.mysql.get_single_record("jobs", conditions)
            if not job:
                raise ValueError("Job not found")
            return job
        except Exception as e:
            logger.error(f"Get job failed: {str(e)}")
            raise RuntimeError("Failed to get job")

    def update_job(self, job_id: str, update_data: Dict[str, Any], recruiter_id: str) -> Dict[str, Any]:
        try:
            conditions = {"id": job_id, "created_by": recruiter_id}
            success = self.mysql.update_record("jobs", update_data, conditions)
            
            if not success:
                raise ValueError("Job not found or update failed")
            return self.get_job(job_id, recruiter_id)
        except Exception as e:
            logger.error(f"Update job failed: {str(e)}")
            raise RuntimeError("Failed to update job")

    def delete_job(self, job_id: str, recruiter_id: str) -> Dict[str, Any]:
        try:
            conditions = {"id": job_id, "created_by": recruiter_id}
            success = self.mysql.delete_record("jobs", conditions)
            
            if not success:
                raise ValueError("Job not found or delete failed")
            return {"success": True, "message": "Job deleted successfully"}
        except Exception as e:
            logger.error(f"Delete job failed: {str(e)}")
            raise RuntimeError("Failed to delete job")

    # ---------------------------------------------------------
    # APPLICATIONS
    # ---------------------------------------------------------
    def get_recruiter_applications(self, recruiter_id: str, job_id: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            job_conditions = {"created_by": recruiter_id}
            if job_id:
                job_conditions["id"] = job_id
                
            jobs = self.mysql.get_records("jobs", job_conditions)
            job_ids = [job["id"] for job in jobs] if jobs else []
            
            if not job_ids:
                return []
            
            # Keep a quick lookup for job data (title and other metadata)
            job_map = {job["id"]: job for job in jobs}
            
            app_conditions = {"job_id": job_ids}
            applications = self.mysql.get_records("job_applications", app_conditions, order_by="applied_at DESC")
            
            if not applications:
                return []
            
            candidate_ids = list(set(app["candidate_id"] for app in applications))
            candidate_map = {}
            
            if candidate_ids:
                users = self.mysql.get_records("users", {"id": candidate_ids})
                for user in users or []:
                    candidate_map[user["id"]] = user
            
            enriched_apps = []
            for app in applications:
                candidate = candidate_map.get(app["candidate_id"])
                if candidate:
                    app["candidate"] = {
                        "full_name": candidate.get("full_name"),
                        "email": candidate.get("email"),
                        "phone": candidate.get("phone")
                    }
                    # Normalize for frontend convenience
                    app["candidate_name"] = candidate.get("full_name")
                    app["candidate_email"] = candidate.get("email")
                    app["candidate_phone"] = candidate.get("phone")

                job = job_map.get(app.get("job_id"))
                if job:
                    app["job_title"] = job.get("title")

                enriched_apps.append(app)
            return enriched_apps
        except Exception as e:
            logger.error(f"Get recruiter applications failed: {str(e)}")
            raise RuntimeError("Failed to get applications")

    # ---------------------------------------------------------
    # COMPANY & PROFILE MANAGEMENT
    # ---------------------------------------------------------
    def create_company(self, name: str, created_by: str) -> Dict[str, Any]:
        try:
            # Generate a human-friendly display ID for the company.
            # It will be stored in the `company_display_id` column and shown in the recruiter UI.
            display_id = self._generate_company_display_id(name)

            payload = {
                "id": str(uuid4()),
                "name": name,
                "company_display_id": display_id,
                "created_by": created_by,
            }
            company_id = self.mysql.insert_record("companies", payload)
            return {"data": payload, "id": company_id}
        except Exception as e:
            logger.error(f"Create company failed: {str(e)}")
            raise RuntimeError("Failed to create company")

    def list_companies(self) -> List[Dict[str, Any]]:
        try:
            companies = self.mysql.get_records("companies", order_by="name ASC")
            return companies or []
        except Exception as e:
            logger.error(f"List companies failed: {str(e)}")
            raise RuntimeError("Failed to list companies")

    def upsert_profile(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            existing = self.mysql.get_single_record("recruiter_profiles", {"user_id": payload["user_id"]})

            # Backend validation: if the user provides **company metadata**, require a non-empty company name.
            # Note: uploading a logo alone is allowed, because sometimes the recruiter updates logo before setting a name.
            company_name = (payload.get("company_name") or "").strip()
            company_meta_provided = any(
                payload.get(k) for k in ["company_website", "company_description"]
            )
            if company_meta_provided and not company_name:
                raise ValueError("Company name is required when providing company website or description")

            if existing:
                profile_update_data = {
                    "contact_name": payload.get("contact_name"),
                    "contact_email": payload.get("contact_email"),
                    "location": payload.get("location"),
                    "company_description": payload.get("company_description")
                }
                profile_update_data = {k: v for k, v in profile_update_data.items() if v not in (None, "")}
                
                if existing.get("company_id"):
                    company_update_data = {
                        "name": payload.get("company_name"),
                        "website": payload.get("company_website"),
                        "description": payload.get("company_description"),
                        "logo_url": payload.get("company_logo_url")
                    }
                    company_update_data = {k: v for k, v in company_update_data.items() if v not in (None, "")}
                    
                    if company_update_data:
                        self.mysql.update_record("companies", company_update_data, {"id": existing["company_id"]})

                    company = self.mysql.get_single_record("companies", {"id": existing["company_id"]})
                    if company and not company.get("company_display_id"):
                        display_id = self._generate_company_display_id(company.get("name"))
                        self.mysql.update_record("companies", {"company_display_id": display_id}, {"id": existing["company_id"]})
                
                # If this recruiter has a profile but no company record yet, create it when we have a company name
                elif payload.get("company_name"):
                    company_name = payload.get("company_name")
                    company_data = {
                        "id": str(uuid4()),
                        "name": company_name,
                        "description": payload.get("company_description"),
                        "website": payload.get("company_website"),
                        "logo_url": payload.get("company_logo_url"),
                        "company_display_id": self._generate_company_display_id(company_name),
                        "created_by": payload["user_id"]
                    }
                    new_company_id = self.mysql.insert_record("companies", company_data)
                    if new_company_id:
                        self.mysql.update_record("recruiter_profiles", {"company_id": new_company_id}, {"user_id": payload["user_id"]})

                # If the recruiter has a profile but no company yet (company_id is null),
                # create the company once they provide a company name.
                if not existing.get("company_id"):
                    submitted_name = (payload.get("company_name") or "").strip()
                    if submitted_name:
                        company_data = {
                            "id": str(uuid4()),
                            "name": submitted_name,
                            "description": payload.get("company_description"),
                            "website": payload.get("company_website"),
                            "logo_url": payload.get("company_logo_url"),
                            "company_display_id": self._generate_company_display_id(submitted_name),
                            "created_by": payload["user_id"]
                        }
                        new_company_id = self.mysql.insert_record("companies", company_data)
                        if new_company_id:
                            self.mysql.update_record("recruiter_profiles", {"company_id": new_company_id}, {"user_id": payload["user_id"]})

                if profile_update_data:
                    self.mysql.update_record("recruiter_profiles", profile_update_data, {"user_id": payload["user_id"]})
                
                updated_profile = self.get_profile(payload["user_id"])
                return {"data": updated_profile, "updated": True}
            else:
                # Create a new recruiter profile.
                # If a company name is provided, create the company record immediately.
                # This ensures the company name is preserved and visible in the UI.
                company_id = None
                company_name = (payload.get("company_name") or "").strip()

                if company_name:
                    company_data = {
                        "id": str(uuid4()),
                        "name": company_name,
                        "description": payload.get("company_description"),
                        "website": payload.get("company_website"),
                        "logo_url": payload.get("company_logo_url"),
                        "company_display_id": self._generate_company_display_id(company_name),
                        "created_by": payload["user_id"]
                    }
                    company_id = self.mysql.insert_record("companies", company_data)

                profile_data = {
                    "id": str(uuid4()),
                    "user_id": payload["user_id"],
                    "company_id": company_id,
                    "contact_name": payload.get("contact_name"),
                    "contact_email": payload.get("contact_email"),
                    "location": payload.get("location"),
                    "company_description": payload.get("company_description")
                }

                profile_id = self.mysql.insert_record("recruiter_profiles", profile_data)
                complete_profile = self.get_profile(payload["user_id"])

                return {"data": complete_profile, "id": profile_id, "updated": False}
                
        except ValueError:
            # Validation errors should be handled by the caller (e.g., returning 400).
            raise
        except Exception as e:
            logger.error(f"Upsert recruiter profile failed: {str(e)}")
            raise RuntimeError("Failed to save recruiter profile")

    def _generate_company_display_id(self, company_name: Optional[str] = None) -> str:
        try:
            prefix = "".join([c for c in (company_name or "") if c.isalnum()]).upper()[:3]
            if not prefix: prefix = "CMP"
            suffix = uuid4().hex.upper()[:5]
            return f"{prefix}{suffix}"
        except Exception:
            import random
            prefix = (company_name or "CMP").upper()[:3]
            suffix = str(random.randint(0, 99999)).zfill(5)
            return f"{prefix}{suffix}"

    def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch the combined profile data for the recruiter."""
        try:
            profile = self.mysql.get_single_record("recruiter_profiles", {"user_id": user_id})
            if not profile:
                return None

            user = self.mysql.get_single_record("users", {"id": user_id})
            if user:
                profile["contact_name"] = profile.get("contact_name") or user.get("full_name")
                profile["contact_email"] = profile.get("contact_email") or user.get("email")
                profile["avatar_url"] = profile.get("avatar_url") or user.get("avatar_url")

            if profile.get("company_id"):
                company = self.mysql.get_single_record("companies", {"id": profile["company_id"]})
                if company:
                    # Always include company fields so frontend can make correct decisions.
                    # Use empty string defaults to ensure the key is always present.
                    profile["company_name"] = company.get("name") or ""
                    profile["company_website"] = company.get("website") or ""
                    profile["company_display_id"] = company.get("company_display_id") or ""
                    profile["company_logo_url"] = company.get("logo_url") or ""

            return profile
        except Exception as e:
            logger.error(f"Get recruiter profile failed: {str(e)}")
            return None

    # ---------------------------------------------------------
    # SKILLS & QUESTIONS (Trimmed for brevity, assuming standard setup)
    # ---------------------------------------------------------
    def add_job_skill(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        payload["id"] = str(uuid4())
        return {"data": payload, "id": self.mysql.insert_record("job_skills", payload)}

    def list_job_skills(self, job_id: str) -> List[Dict[str, Any]]:
        return self.mysql.get_records("job_skills", {"job_id": job_id}) or []

    def delete_job_skill(self, skill_id: str) -> None:
        self.mysql.delete_record("job_skills", {"id": skill_id})

    def add_interview_question(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        payload["id"] = str(uuid4())
        return {"data": payload, "id": self.mysql.insert_record("interview_questions", payload)}

    def list_interview_questions(self, job_id: str) -> List[Dict[str, Any]]:
        return self.mysql.get_records("interview_questions", {"job_id": job_id}, order_by="question_order ASC") or []

    def delete_interview_question(self, question_id: str) -> None:
        self.mysql.delete_record("interview_questions", {"id": question_id})

    # ---------------------------------------------------------
    # CANDIDATE DETAILS
    # ---------------------------------------------------------
    def get_candidate_details_for_application(self, candidate_id: str, job_id: Optional[str] = None) -> Dict[str, Any]:
        try:
            profile = self._fetch_candidate_profile(candidate_id)
            application = self._fetch_candidate_application(candidate_id, job_id) if job_id else None
            resume_url = self._get_resume_signed_url(profile) if profile else None
            intro_video = self._fetch_intro_video(candidate_id)
            job_videos = self._fetch_job_video_responses(candidate_id, job_id) if job_id else []
            
            return {
                "profile": profile or {},
                "application": application,
                "resume_url": resume_url,
                "intro_video": intro_video,
                "job_videos": job_videos
            }
        except Exception as e:
            logger.error(f"Get candidate details failed: {str(e)}")
            return {}

    def _fetch_candidate_profile(self, candidate_id: str):
        return self.mysql.get_single_record("candidate_profiles", {"user_id": candidate_id})

    def _fetch_candidate_application(self, candidate_id: str, job_id: Optional[str]):
        if job_id:
            return self.mysql.get_single_record("job_applications", {"candidate_id": candidate_id, "job_id": job_id})
        apps = self.mysql.get_records("job_applications", {"candidate_id": candidate_id}, order_by="applied_at DESC", limit=1)
        return apps[0] if apps else None

    def _get_resume_signed_url(self, profile: Dict[str, Any]):
        path = profile.get("resume_url")
        return f"/storage/resumes/{path}" if path else None

    def _fetch_intro_video(self, candidate_id: str):
        return self.mysql.get_single_record("intro_videos", {"candidate_id": candidate_id})

    def _fetch_job_video_responses(self, candidate_id: str, job_id: Optional[str]) -> List[Dict[str, Any]]:
        if not job_id: return []
        try:
            app = self.mysql.get_single_record("job_applications", {"candidate_id": candidate_id, "job_id": job_id})
            if not app: return []
            return self.mysql.get_records("video_responses", {"candidate_id": candidate_id, "application_id": app["id"]}, order_by="recorded_at ASC") or []
        except Exception:
            return []

    def get_application_by_id(self, app_id: str) -> Dict[str, Any]:
        application = self.mysql.get_single_record("job_applications", {"id": app_id})
        if not application: raise ValueError("Application not found")
        job = self.mysql.get_single_record("jobs", {"id": application["job_id"]})
        candidate_details = self.get_candidate_details_for_application(application["candidate_id"], application["job_id"])
        
        return {
            "application": application,
            "job": job,
            "candidate": candidate_details
        }