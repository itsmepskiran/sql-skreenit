import time
from typing import Any, Dict, List, Optional
from services.mysql_service import MySQLService
from utils_others.logger import logger


class ApplicantService:
    def __init__(self, mysql_service: Optional[MySQLService] = None):
        self.mysql = mysql_service or MySQLService()

    # ---------------------------------------------------------
    # PROFILE UPDATE (Unified Method)
    # ---------------------------------------------------------
    def update_profile(
        self,
        candidate_id: str,
        profile_data: Dict[str, Any],
        education: Optional[List[Dict[str, Any]]] = None,
        experience: Optional[List[Dict[str, Any]]] = None,
        skills: Optional[List[str]] = None,
        resume_file: Optional[bytes] = None,
        resume_filename: Optional[str] = None,
        profile_image_file: Optional[bytes] = None,
        profile_image_filename: Optional[str] = None,
        intro_video_file: Optional[bytes] = None,
        intro_video_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates the candidate's profile by splitting data between 'users' and 'candidate_profiles' tables.
        """
        try:
            # 1. Handle Resume Upload (if provided)
            if resume_file and resume_filename:
                resume_url = self._upload_resume_internal(candidate_id, resume_filename, resume_file)
                profile_data["resume_url"] = resume_url

            # 2. Handle Profile Image Upload (if provided)
            if profile_image_file and profile_image_filename:
                avatar_url = self._upload_profile_image_internal(candidate_id, profile_image_filename, profile_image_file)
                profile_data["avatar_url"] = avatar_url

            # 3. Handle Introduction Video Upload (if provided)
            if intro_video_file and intro_video_filename:
                intro_video_url = self._upload_intro_video_internal(candidate_id, intro_video_filename, intro_video_file)
                profile_data["intro_video_url"] = intro_video_url

            # 4. Split Data for Tables
            # Fields that belong to the 'users' table
            user_fields = ["full_name", "email", "phone", "location", "avatar_url"]
            user_updates = {k: v for k, v in profile_data.items() if k in user_fields}
            
            # Fields that belong to the 'candidate_profiles' table
            profile_fields = ["resume_url", "intro_video_url", "linkedin_url", "github_url", "portfolio_url"]
            profile_updates = {k: v for k, v in profile_data.items() if k in profile_fields}
            profile_updates["user_id"] = candidate_id

            # 5. Update 'users' Table
            if user_updates:
                try:
                    self.mysql.update_record("users", user_updates, {"id": candidate_id})
                except Exception as e:
                    logger.error(f"Failed to update users table: {e}")

            # 6. Upsert 'candidate_profiles' Table
            if profile_updates:
                try:
                    existing = self.mysql.get_single_record("candidate_profiles", {"user_id": candidate_id})
                    if existing:
                        self.mysql.update_record("candidate_profiles", profile_updates, {"user_id": candidate_id})
                    else:
                        profile_updates["id"] = str(uuid4())
                        self.mysql.insert_record("candidate_profiles", profile_updates)
                except Exception as e:
                    logger.error(f"Failed to update candidate_profiles table: {e}")

            # 7. Handle Related Data (Education, Experience, Skills)
            if education is not None:
                self._save_education(candidate_id, education)
            if experience is not None:
                self._save_experience(candidate_id, experience)
            if skills is not None:
                self._save_skills(candidate_id, skills)

            # 8. Mark Onboarded in MySQL users table
            try:
                self.mysql.update_record("users", {"onboarded": True}, {"id": candidate_id})
            except Exception as e:
                logger.error(f"Failed to mark user as onboarded: {e}")

            return {"success": True, "message": "Profile updated successfully"}

        except Exception as e:
            logger.error(f"Profile update failed: {str(e)}")
            raise RuntimeError("Failed to update profile")

    def _upload_resume_internal(self, candidate_id: str, filename: str, content: bytes) -> str:
        try:
            safe_name = f"{int(time.time())}_{filename.replace(' ', '_')}"
            path = f"{candidate_id}/{safe_name}"
            
            # TODO: Implement Cloudflare R2 or local storage upload
            # For now, save to local storage or return path
            storage_path = f"storage/resumes/{path}"
            
            # Save file locally (temporary solution)
            os.makedirs(f"storage/resumes/{candidate_id}", exist_ok=True)
            with open(storage_path, "wb") as f:
                f.write(content)
            
            return path
        except Exception as e:
            logger.error(f"Resume upload failed: {str(e)}")
            raise RuntimeError("Failed to upload resume")
    
    def _upload_profile_image_internal(self, candidate_id: str, filename: str, content: bytes) -> str:
        try:
            safe_name = f"{int(time.time())}_{filename.replace(' ', '_')}"
            path = f"{candidate_id}/{safe_name}"
            
            # TODO: Implement Cloudflare R2 or local storage upload
            storage_path = f"storage/profile-images/{path}"
            
            # Save file locally (temporary solution)
            os.makedirs(f"storage/profile-images/{candidate_id}", exist_ok=True)
            with open(storage_path, "wb") as f:
                f.write(content)
            
            return path
        except Exception as e:
            logger.error(f"Profile image upload failed: {str(e)}")
            raise RuntimeError("Failed to upload profile image")
    
    def _upload_intro_video_internal(self, candidate_id: str, filename: str, content: bytes) -> str:
        try:
            safe_name = f"{int(time.time())}_{filename.replace(' ', '_')}"
            path = f"{candidate_id}/{safe_name}"
            
            # TODO: Implement Cloudflare R2 or local storage upload
            storage_path = f"storage/intro-videos/{path}"
            
            # Save file locally (temporary solution)
            os.makedirs(f"storage/intro-videos/{candidate_id}", exist_ok=True)
            with open(storage_path, "wb") as f:
                f.write(content)
            
            return path
        except Exception as e:
            logger.error(f"Intro video upload failed: {str(e)}")
            raise RuntimeError("Failed to upload intro video")

    def _save_education(self, candidate_id: str, items: List[Dict[str, Any]]):
        try:
            # Delete existing education
            self.mysql.delete_record("candidate_education", {"candidate_id": candidate_id})
            
            if not items:
                return
            
            data = []
            for item in items:
                edu_row = {
                    "id": str(uuid4()),
                    "candidate_id": candidate_id,
                    "institution": item.get("institution", ""),
                    "degree": item.get("degree", ""),
                    "field_of_study": item.get("field_of_study", ""),
                    "start_date": item.get("start_date"),
                    "end_date": item.get("end_date"),
                    "description": item.get("description", "")
                }
                data.append(edu_row)
            
            if data:
                self.mysql.insert_records("candidate_education", data)
        except Exception as e:
            logger.error(f"Save education failed: {str(e)}")

    def _save_experience(self, candidate_id: str, items: List[Dict[str, Any]]):
        try:
            # Delete existing experience
            self.mysql.delete_record("candidate_experience", {"candidate_id": candidate_id})
            
            if not items:
                return
            
            data = []
            for item in items:
                exp_row = {
                    "id": str(uuid4()),
                    "candidate_id": candidate_id,
                    "company": item.get("company", ""),
                    "position": item.get("position", ""),
                    "start_date": item.get("start_date"),
                    "end_date": item.get("end_date"),
                    "description": item.get("description", "")
                }
                data.append(exp_row)
            
            if data:
                self.mysql.insert_records("candidate_experience", data)
        except Exception as e:
            logger.error(f"Save experience failed: {str(e)}")

    def _save_skills(self, candidate_id: str, items: List[str]):
        try:
            # Delete existing skills
            self.mysql.delete_record("candidate_skills", {"candidate_id": candidate_id})
            
            if not items:
                return
            
            data = [{"id": str(uuid4()), "candidate_id": candidate_id, "skill_name": s} for s in items]
            self.mysql.insert_records("candidate_skills", data)
        except Exception as e:
            logger.error(f"Save skills failed: {str(e)}")

    # ---------------------------------------------------------
    # READ OPERATIONS
    # ---------------------------------------------------------
    def get_profile(self, candidate_id: str) -> Dict[str, Any]:
        try:
            # Get user data
            user_data = self.mysql.get_single_record("users", {"id": candidate_id})
            
            # Get profile data
            profile_data = self.mysql.get_single_record("candidate_profiles", {"user_id": candidate_id})
            
            # Combine data
            combined = {}
            if user_data:
                combined.update(user_data)
            if profile_data:
                combined.update(profile_data)
            
            # Get related data
            education = self.mysql.get_records("candidate_education", {"candidate_id": candidate_id})
            experience = self.mysql.get_records("candidate_experience", {"candidate_id": candidate_id})
            skills = self.mysql.get_records("candidate_skills", {"candidate_id": candidate_id})
            
            combined["education"] = education or []
            combined["experience"] = experience or []
            combined["skills"] = [s["skill_name"] for s in skills] if skills else []
            
            return combined
            
        except Exception as e:
            logger.error(f"Get profile failed: {str(e)}")
            return {}

    def has_applied_to_job(self, candidate_id: str, job_id: str) -> bool:
        try:
            application = self.mysql.get_single_record(
                "job_applications", 
                {"candidate_id": candidate_id, "job_id": job_id}
            )
            return application is not None
        except Exception as e:
            logger.error(f"Check application failed: {str(e)}")
            return False

    def apply_to_job(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            # 1. Verify Job Exists and is Active
            job = self.mysql.get_single_record("jobs", {"id": data["job_id"]})
            if not job or job.get("status") != "active":
                raise RuntimeError("Job is no longer active")

            # 2. Check if already applied
            if self.has_applied_to_job(data["candidate_id"], data["job_id"]):
                raise RuntimeError("You have already applied to this job")

            # 3. Prepare application data
            clean_data = {
                "id": str(uuid4()),
                "candidate_id": data["candidate_id"],
                "job_id": data["job_id"],
                "cover_letter": data.get("cover_letter", ""),
                "status": "submitted"  # Default status
            }
            
            # Insert application
            app_id = self.mysql.insert_record("job_applications", clean_data)
            
            return {"data": clean_data, "id": app_id, "success": True}

        except Exception as e:
            logger.error(f"Job application failed: {str(e)}")
            raise RuntimeError("Failed to submit application")

    def get_my_applications(self, candidate_id: str) -> List[Dict[str, Any]]:
        try:
            # 1. Get Applications
            applications = self.mysql.get_records(
                "job_applications",
                {"candidate_id": candidate_id},
                order_by="applied_at DESC"
            )
            
            if not applications:
                return []
            
            # 2. Get Job Details for these applications
            job_ids = [a["job_id"] for a in applications]
            jobs_map = {}
            
            if job_ids:
                jobs = self.mysql.get_records("jobs", {"id": job_ids})
                jobs_map = {j["id"]: j for j in jobs}
                
                # 3. Get Company Names (Optional)
                comp_ids = list(set(j["company_id"] for j in jobs_map.values() if j.get("company_id")))
                comp_map = {}
                if comp_ids:
                    companies = self.mysql.get_records("companies", {"id": comp_ids})
                    comp_map = {c["id"]: c["name"] for c in companies}

                # 4. Merge
                for job in jobs_map.values():
                    if job.get("company_id") and job["company_id"] in comp_map:
                        job["company_name"] = comp_map[job["company_id"]]

            # 5. Final merge
            final_apps = []
            for app in applications:
                job = jobs_map.get(app["job_id"])
                if job:
                    merged = {**app, **job}
                    final_apps.append(merged)

            return final_apps

        except Exception as e:
            logger.error(f"Get my applications failed: {str(e)}")
            return []
