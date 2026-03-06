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

            # Generate UUID for new job
            job_data["id"] = str(uuid4())
            
            # Insert into MySQL
            job_id = self.mysql.insert_record("jobs", job_data)
            
            logger.info("Job posted", extra={"created_by": job_data.get("created_by")})
            return {"data": job_data, "id": job_id}

        except Exception as e:
            logger.error(f"Job post failed: {str(e)}", extra={"created_by": job_data.get("created_by")})
            raise RuntimeError("Failed to post job")

    def list_jobs(self, recruiter_id: str, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        try:
            offset = (page - 1) * page_size
            
            # Build query conditions
            conditions = {"created_by": recruiter_id}
            
            # Get jobs with pagination
            jobs = self.mysql.get_records_with_pagination(
                table="jobs",
                conditions=conditions,
                order_by="created_at DESC",
                limit=page_size,
                offset=offset
            )
            
            # Get total count
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
            
            # Return updated job
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
            # 1. Fetch ONLY jobs created by this recruiter
            job_conditions = {"created_by": recruiter_id}
            if job_id:
                job_conditions["id"] = job_id
                
            jobs = self.mysql.get_records("jobs", job_conditions)
            job_ids = [job["id"] for job in jobs] if jobs else []
            
            if not job_ids:
                return []
            
            # 2. Fetch applications ONLY for these job IDs
            app_conditions = {"job_id": job_ids}  # MySQL service should handle IN clause
            applications = self.mysql.get_records(
                "job_applications", 
                app_conditions, 
                order_by="applied_at DESC"
            )
            
            if not applications:
                return []
            
            # 3. Fetch candidate details for all applications
            candidate_ids = list(set(app["candidate_id"] for app in applications))
            candidate_map = {}
            
            if candidate_ids:
                users = self.mysql.get_records("users", {"id": candidate_ids})
                for user in users or []:
                    candidate_map[user["id"]] = user
            
            # 4. Enrich applications with candidate info
            enriched_apps = []
            for app in applications:
                candidate = candidate_map.get(app["candidate_id"])
                if candidate:
                    app["candidate"] = {
                        "full_name": candidate.get("full_name"),
                        "email": candidate.get("email"),
                        "phone": candidate.get("phone")
                    }
                enriched_apps.append(app)
            
            return enriched_apps

        except Exception as e:
            logger.error(f"Get recruiter applications failed: {str(e)}")
            raise RuntimeError("Failed to get applications")

    # ---------------------------------------------------------
    # JOB SKILLS
    # ---------------------------------------------------------
    def add_job_skill(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload["id"] = str(uuid4())
            skill_id = self.mysql.insert_record("job_skills", payload)
            return {"data": payload, "id": skill_id}
        except Exception as e:
            logger.error(f"Add job skill failed: {str(e)}")
            raise RuntimeError("Failed to add job skill")

    def list_job_skills(self, job_id: str) -> List[Dict[str, Any]]:
        try:
            skills = self.mysql.get_records("job_skills", {"job_id": job_id})
            return skills or []
        except Exception as e:
            logger.error(f"List job skills failed: {str(e)}")
            raise RuntimeError("Failed to list job skills")

    def delete_job_skill(self, skill_id: str) -> None:
        try:
            success = self.mysql.delete_record("job_skills", {"id": skill_id})
            if not success:
                raise ValueError("Skill not found")
        except Exception as e:
            logger.error(f"Delete job skill failed: {str(e)}")
            raise RuntimeError("Failed to delete job skill")

    # ---------------------------------------------------------
    # INTERVIEW QUESTIONS
    # ---------------------------------------------------------
    def add_interview_question(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            payload["id"] = str(uuid4())
            question_id = self.mysql.insert_record("interview_questions", payload)
            return {"data": payload, "id": question_id}
        except Exception as e:
            logger.error(f"Add interview question failed: {str(e)}")
            raise RuntimeError("Failed to add interview question")

    def list_interview_questions(self, job_id: str) -> List[Dict[str, Any]]:
        try:
            questions = self.mysql.get_records(
                "interview_questions", 
                {"job_id": job_id}, 
                order_by="question_order ASC"
            )
            return questions or []
        except Exception as e:
            logger.error(f"List interview questions failed: {str(e)}")
            raise RuntimeError("Failed to list interview questions")

    def delete_interview_question(self, question_id: str) -> None:
        try:
            success = self.mysql.delete_record("interview_questions", {"id": question_id})
            if not success:
                raise ValueError("Question not found")
        except Exception as e:
            logger.error(f"Delete interview question failed: {str(e)}")
            raise RuntimeError("Failed to delete interview question")

    # ---------------------------------------------------------
    # COMPANY MANAGEMENT
    # ---------------------------------------------------------
    def create_company(self, name: str, created_by: str) -> Dict[str, Any]:
        try:
            payload = {
                "id": str(uuid4()),
                "name": name,
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
            # Check if profile exists
            existing = self.mysql.get_single_record("recruiter_profiles", {"user_id": payload["user_id"]})
            
            if existing:
                # Update existing profile - only include valid recruiter profile fields
                profile_update_data = {
                    "contact_name": payload.get("contact_name"),
                    "contact_email": payload.get("contact_email"),
                    "location": payload.get("location"),
                    "company_description": payload.get("company_description")
                }
                
                # Remove None/empty values (don’t overwrite existing values with blanks)
                profile_update_data = {k: v for k, v in profile_update_data.items() if v not in (None, "")}
                
                # Also update company if exists
                if existing.get("company_id"):
                    company_update_data = {
                        "name": payload.get("company_name"),
                        "website": payload.get("company_website"),
                        "description": payload.get("company_description"),
                        "logo_url": payload.get("company_logo_url")
                    }
                    # Remove None/empty values
                    company_update_data = {k: v for k, v in company_update_data.items() if v not in (None, "")}
                    
                    if company_update_data:  # Only update if there are fields to update
                        self.mysql.update_record("companies", 
                            company_update_data, 
                            {"id": existing["company_id"]}
                        )

                    # Ensure company_display_id exists (generate if missing)
                    company = self.mysql.get_single_record("companies", {"id": existing["company_id"]})
                    if company and not company.get("company_display_id"):
                        display_id = self._generate_company_display_id(company.get("name"))
                        self.mysql.update_record("companies", {"company_display_id": display_id}, {"id": existing["company_id"]})
                
                if profile_update_data:  # Only update if there are fields to update
                    success = self.mysql.update_record(
                        "recruiter_profiles", 
                        profile_update_data, 
                        {"user_id": payload["user_id"]}
                    )
                
                # Get updated profile with company info
                updated_profile = self.get_profile(payload["user_id"])
                return {"data": updated_profile, "updated": True}
            else:
                # Create new profile - need to create company first
                company_data = {
                    "name": payload.get("company_name") or "Unknown Company",
                    "description": payload.get("company_description"),
                    "website": payload.get("company_website"),
                    "logo_url": payload.get("company_logo_url"),
                    "created_by": payload["user_id"]
                }
                
                # Create company
                company_data["id"] = str(uuid4())
                company_id = self.mysql.insert_record("companies", company_data)
                
                # Generate company display ID (8-char alphanumeric based on company name + uuid)
                company_display_id = self._generate_company_display_id(company_data.get("name"))

                # Update company with display ID
                self.mysql.update_record("companies", 
                    {"company_display_id": company_display_id}, 
                    {"id": company_data["id"]}
                )
                
                # Create recruiter profile - only include valid fields
                profile_data = {
                    "id": str(uuid4()),
                    "user_id": payload["user_id"],
                    "company_id": company_data["id"],
                    "contact_name": payload.get("contact_name"),
                    "contact_email": payload.get("contact_email"),
                    "location": payload.get("location"),
                    "company_description": payload.get("company_description")
                }
                
                profile_id = self.mysql.insert_record("recruiter_profiles", profile_data)
                
                # Get complete profile with company info
                complete_profile = self.get_profile(payload["user_id"])
                
                return {"data": complete_profile, "id": profile_id, "updated": False}
                
        except Exception as e:
            logger.error(f"Upsert recruiter profile failed: {str(e)}")
            raise RuntimeError("Failed to save recruiter profile")

    def _generate_company_display_id(self, company_name: Optional[str] = None) -> str:
        """Generate a short, human-friendly company ID using company name + UUID.

        Format: <PREFIX><SUFFIX>
        - PREFIX: First 3 alphanumeric characters from the company name (uppercased).
        - SUFFIX: 5 characters from a UUID4 hex string.

        Example: "ACMEB1F2" for "Acme".
        """
        try:
            # Normalize company name to alphanumeric uppercase
            prefix = "".join([c for c in (company_name or "") if c.isalnum()]).upper()[:3]
            if not prefix:
                prefix = "CMP"

            # Use uuid4 to generate a random suffix
            suffix = uuid4().hex.upper()[:5]
            return f"{prefix}{suffix}"
        except Exception:
            import random
            prefix = (company_name or "CMP").upper()[:3]
            suffix = str(random.randint(0, 99999)).zfill(5)
            return f"{prefix}{suffix}"

    def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            # Fetch recruiter profile record
            profile = self.mysql.get_single_record("recruiter_profiles", {"user_id": user_id})
            if not profile:
                return None

            # Fetch basic user info for the recruiter (name / email / avatar)
            user = self.mysql.get_single_record("users", {"id": user_id})
            if user:
                # Use existing profile values if set, otherwise fallback to user table
                profile["contact_name"] = profile.get("contact_name") or user.get("full_name")
                profile["contact_email"] = profile.get("contact_email") or user.get("email")
                profile["avatar_url"] = profile.get("avatar_url") or user.get("avatar_url")

            # Get company information if company_id exists
            if profile.get("company_id"):
                company = self.mysql.get_single_record("companies", {"id": profile["company_id"]})
                if company:
                    profile["company_name"] = company.get("name")
                    profile["company_website"] = company.get("website")
                    profile["company_display_id"] = company.get("company_display_id")
                    profile["company_logo_url"] = company.get("logo_url")

            return profile
        except Exception as e:
            logger.error(f"Get recruiter profile failed: {str(e)}")
            return None

    # ---------------------------------------------------------
    # CANDIDATE DETAILS (For Application Viewing)
    # ---------------------------------------------------------
    def get_candidate_details_for_application(self, candidate_id: str, job_id: Optional[str] = None) -> Dict[str, Any]:
        try:
            # Get candidate profile
            profile = self._fetch_candidate_profile(candidate_id)
            if not profile:
                return {}
            
            # Get application (if job_id provided)
            application = self._fetch_candidate_application(candidate_id, job_id) if job_id else None
            
            # Get resume URL
            resume_url = self._get_resume_signed_url(profile)
            
            # Get video data
            intro_video = self._fetch_intro_video(candidate_id)
            job_videos = self._fetch_job_video_responses(candidate_id, job_id) if job_id else []
            
            return {
                "profile": profile,
                "application": application,
                "resume_url": resume_url,
                "intro_video": intro_video,
                "job_videos": job_videos
            }
            
        except Exception as e:
            logger.error(f"Get candidate details failed: {str(e)}")
            return {}

    def _fetch_candidate_profile(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        try:
            profile = self.mysql.get_single_record("candidate_profiles", {"user_id": candidate_id})
            return profile
        except Exception:
            return None

    def _fetch_candidate_application(self, candidate_id: str, job_id: Optional[str]) -> Optional[Dict[str, Any]]:
        try:
            if job_id:
                application = self.mysql.get_single_record(
                    "job_applications", 
                    {"candidate_id": candidate_id, "job_id": job_id}
                )
            else:
                applications = self.mysql.get_records(
                    "job_applications", 
                    {"candidate_id": candidate_id}, 
                    order_by="applied_at DESC",
                    limit=1
                )
                application = applications[0] if applications else None
            
            return application
        except Exception:
            return None

    def _get_resume_signed_url(self, profile: Dict[str, Any]) -> Optional[str]:
        try:
            # TODO: Implement Cloudflare R2 or local storage signed URL generation
            # For now, return the resume URL directly
            path = profile.get("resume_url")
            if path:
                # This would need to be implemented based on your storage solution
                return f"/storage/resumes/{path}"
            return None
        except Exception:
            return None

    def _fetch_intro_video(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        try:
            video = self.mysql.get_single_record("intro_videos", {"candidate_id": candidate_id})
            return video
        except Exception:
            return None

    def _fetch_job_video_responses(self, candidate_id: str, job_id: Optional[str]) -> List[Dict[str, Any]]:
        if not job_id:
            return []

        try:
            responses = self.mysql.get_records(
                "video_responses",
                {"candidate_id": candidate_id, "job_id": job_id},
                order_by="recorded_at ASC"
            )
            return responses or []
        except Exception:
            return []

    # ---------------------------------------------------------
    # GET SINGLE APPLICATION DETAILS (For Details Page)
    # ---------------------------------------------------------
    def get_application_by_id(self, app_id: str) -> Dict[str, Any]:
        try:
            # Get Application Data
            application = self.mysql.get_single_record("job_applications", {"id": app_id})
            
            if not application:
                raise ValueError("Application not found")
            
            # Get Job Details
            job = self.mysql.get_single_record("jobs", {"id": application["job_id"]})
            
            # Get Candidate Details
            candidate_details = self.get_candidate_details_for_application(
                application["candidate_id"], 
                application["job_id"]
            )
            
            return {
                "application": application,
                "job": job,
                "candidate": candidate_details
            }
            
        except Exception as e:
            logger.error(f"Get application by ID failed: {str(e)}")
            raise RuntimeError("Failed to get application details")
