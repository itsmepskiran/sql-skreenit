import time
from typing import Any, Dict, List, Optional

from supabase import Client
from services.supabase_client import get_client
from utils_others.logger import logger


class ApplicantService:
    def __init__(self, client: Optional[Client] = None):
        self.supabase = client or get_client()

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
        resume_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates the candidate's profile by splitting data between 'users' and 'candidate_profiles' tables.
        """
        try:
            # 1. Handle Resume Upload (if provided)
            if resume_file and resume_filename:
                resume_url = self._upload_resume_internal(candidate_id, resume_filename, resume_file)
                profile_data["resume_url"] = resume_url

            # 2. Split Data for Tables
            # Fields that belong to the 'users' table
            user_fields = ["full_name", "phone", "location", "avatar_url"]
            user_updates = {k: v for k, v in profile_data.items() if k in user_fields}

            # Fields that belong to the 'candidate_profiles' table
            # (Everything else, excluding special keys)
            profile_updates = {
                k: v for k, v in profile_data.items() 
                if k not in user_fields and k not in ["contact_email", "email"]
            }
            profile_updates["user_id"] = candidate_id

            # 3. Update 'users' Table
            if user_updates:
                try:
                    self.supabase.table("users").update(user_updates).eq("id", candidate_id).execute()
                except Exception as e:
                    logger.error(f"Failed to update users table: {e}")

            # 4. Upsert 'candidate_profiles' Table
            # We use on_conflict="user_id" to ensure we update if exists, insert if not
            if profile_updates:
                self.supabase.table("candidate_profiles").upsert(
                    profile_updates, on_conflict="user_id"
                ).execute()

            # 5. Update Related Tables (Skills, Edu, Exp)
            if education is not None:
                self._save_education(candidate_id, education)

            if experience is not None:
                self._save_experience(candidate_id, experience)

            if skills is not None:
                self._save_skills(candidate_id, skills)

            # 6. Mark Onboarded in Auth
            try:
                self.supabase.auth.admin.update_user_by_id(
                    candidate_id, 
                    {"user_metadata": {"onboarded": True}}
                )
            except Exception:
                pass 

            logger.info("Profile updated successfully", extra={"candidate_id": candidate_id})
            return {"status": "success"}

        except Exception as e:
            logger.error(f"Profile update failed: {str(e)}", extra={"candidate_id": candidate_id})
            raise RuntimeError(f"Failed to update profile: {str(e)}")

    # ---------------------------------------------------------
    # PRIVATE HELPERS
    # ---------------------------------------------------------
    def _upload_resume_internal(self, candidate_id: str, filename: str, content: bytes) -> str:
        safe_name = f"{int(time.time())}_{filename.replace(' ', '_')}"
        path = f"{candidate_id}/{safe_name}"
        self.supabase.storage.from_("resumes").upload(path, content, {"upsert": "true"})
        return path

    def _save_education(self, candidate_id: str, items: List[Dict[str, Any]]):
        self.supabase.table("candidate_education").delete().eq("candidate_id", candidate_id).execute()
        if not items: return
        
        data = []
        for item in items:
            edu_row = {
                "candidate_id": candidate_id,
                "degree": item.get("degree", ""),
                "institution": item.get("institution", ""),
                "completion_year": item.get("completion_year") # Reversed back to completion_year!
            }
            data.append(edu_row)
            
        self.supabase.table("candidate_education").insert(data).execute()

    def _save_experience(self, candidate_id: str, items: List[Dict[str, Any]]):
        self.supabase.table("candidate_experience").delete().eq("candidate_id", candidate_id).execute()
        if not items: return
        
        data = []
        for item in items:
            start_val = item.get("start_date")
            end_val = item.get("end_date")
            
            exp_row = {
                "candidate_id": candidate_id,
                "title": item.get("title", ""),          # Reversed back to 'title'
                "company": item.get("company", ""),      # Reversed back to 'company'
                "start_date": None if not start_val or str(start_val).strip() == "" else start_val,
                "end_date": None if not end_val or str(end_val).strip() == "" else end_val,
                "description": item.get("description", "")
            }
            data.append(exp_row)
            
        self.supabase.table("candidate_experience").insert(data).execute()
    def _save_skills(self, candidate_id: str, items: List[str]):
        self.supabase.table("candidate_skills").delete().eq("candidate_id", candidate_id).execute()
        if not items: return
        data = [{"candidate_id": candidate_id, "skill_name": s} for s in items]
        self.supabase.table("candidate_skills").insert(data).execute()
# ---------------------------------------------------------
    # READ OPERATIONS
    # ---------------------------------------------------------
    def get_profile(self, candidate_id: str) -> Dict[str, Any]:
        try:
            # Join users and profiles
            user_res = self.supabase.table("users").select("full_name, email, phone, location, avatar_url").eq("id", candidate_id).maybe_single().execute()
            prof_res = self.supabase.table("candidate_profiles").select("*").eq("user_id", candidate_id).maybe_single().execute()
            
            # Combine data
            user_data = user_res.data or {}
            prof_data = prof_res.data or {}
            combined = {**prof_data, **user_data}
            
            # ✅ FIX: Use 'candidate_id' here, because that is what we used to SAVE the data!
            edu = self.supabase.table("candidate_education").select("*").eq("candidate_id", candidate_id).execute()
            exp = self.supabase.table("candidate_experience").select("*").eq("candidate_id", candidate_id).execute()
            skills = self.supabase.table("candidate_skills").select("skill_name").eq("candidate_id", candidate_id).execute()

            combined["education"] = edu.data if getattr(edu, "data", None) else []
            combined["experience"] = exp.data if getattr(exp, "data", None) else []
            combined["skills"] = [s["skill_name"] for s in getattr(skills, "data", [])] if skills else []
            
            return combined
        except Exception as e:
            logger.error(f"Get Profile Failed: {e}")
            return {}
    # ---------------------------------------------------------
    # JOB APPLICATIONS
    # ---------------------------------------------------------
    def check_application_status(self, candidate_id: str, job_id: str) -> bool:
        """
        Returns True if the candidate has already applied for this job.
        """
        try:
            res = (
                self.supabase.table("job_applications")
                .select("id")
                .eq("candidate_id", candidate_id)
                .eq("job_id", job_id)
                .execute()
            )
            return len(res.data) > 0
        except Exception as e:
            logger.error(f"Check status failed: {e}")
            return False

    def submit_application(self, data: Dict[str, Any]):
        """
        Inserts a new record into job_applications.
        """
        try:
            # 1. Verify Job Exists and is Active
            job_res = self.supabase.table("jobs").select("status").eq("id", data["job_id"]).single().execute()
            if not job_res.data or job_res.data.get("status") != "active":
                 raise RuntimeError("Job is no longer active")

            # 2. Check for Duplicate
            if self.check_application_status(data["candidate_id"], data["job_id"]):
                raise RuntimeError("You have already applied for this job")

            # 3. Insert Application
            clean_data = {
                "job_id": data["job_id"],
                "candidate_id": data["candidate_id"],
                "cover_letter": data.get("cover_letter"),
                "status": "submitted" # Default status
            }
            
            res = self.supabase.table("job_applications").insert(clean_data).execute()
            
            if getattr(res, "error", None):
                raise Exception(res.error)
                
            logger.info(f"Application submitted", extra={"candidate_id": data["candidate_id"], "job_id": data["job_id"]})
            return res.data[0] if res.data else {}

        except Exception as e:
            logger.error(f"Application submission failed: {str(e)}")
            raise RuntimeError(f"Application failed: {str(e)}")

    # ---------------------------------------------------------
    # GET ALL APPLICATIONS (For Candidate Dashboard)
    # ---------------------------------------------------------
    def get_candidate_applications(self, candidate_id: str) -> List[Dict[str, Any]]:
        try:
            # 1. Get Applications
            res = (
                self.supabase.table("job_applications")
                .select("*")
                .eq("candidate_id", candidate_id)
                .order("applied_at", desc=True)
                .execute()
            )
            apps = getattr(res, "data", []) or []
            
            if not apps: return []
            
            # 2. Get Job Details for these applications
            job_ids = [a["job_id"] for a in apps]
            if job_ids:
                jobs_res = self.supabase.table("jobs").select("id, title, company_id").in_("id", job_ids).execute()
                jobs_map = {j["id"]: j for j in getattr(jobs_res, "data", [])}
                
                # 3. Get Company Names (Optional)
                comp_ids = list(set(j["company_id"] for j in jobs_map.values() if j.get("company_id")))
                comp_map = {}
                if comp_ids:
                    c_res = self.supabase.table("companies").select("id, name").in_("id", comp_ids).execute()
                    comp_map = {c["id"]: c["name"] for c in getattr(c_res, "data", [])}

                # 4. Merge
                for app in apps:
                    job = jobs_map.get(app["job_id"])
                    if job:
                        app["job_title"] = job.get("title")
                        app["company_name"] = comp_map.get(job.get("company_id"), "Unknown Company")
            
            return apps
        except Exception as e:
            logger.error(f"Fetch candidate applications failed: {e}")
            return []