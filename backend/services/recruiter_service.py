from typing import Optional, Dict, Any, List
from supabase import Client
from services.supabase_client import get_client
from utils_others.logger import logger
from uuid import uuid4


class RecruiterService:
    """
    Enterprise-grade Recruiter Service.
    """

    def __init__(self, client: Optional[Client] = None):
        self.supabase = client or get_client()

    # ---------------------------------------------------------
    # JOB CRUD
    # ---------------------------------------------------------
    def post_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if not job_data.get("company_id"):
                raise ValueError("company_id is required")

            res = self.supabase.table("jobs").insert(job_data).execute()

            if getattr(res, "error", None):
                raise Exception(res.error)

            logger.info("Job posted", extra={"created_by": job_data.get("created_by")})
            return res.data

        except Exception as e:
            logger.error(f"Job post failed: {str(e)}", extra={"created_by": job_data.get("created_by")})
            raise RuntimeError("Failed to post job")

    def list_jobs(self, recruiter_id: str, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        try:
            offset = (page - 1) * page_size

            query = (
                self.supabase.table("jobs")
                .select("*", count="exact")
                .eq("created_by", recruiter_id)
                .order("created_at", desc=True)
                .range(offset, offset + page_size - 1)
            )

            res = query.execute()

            if getattr(res, "error", None):
                raise Exception(res.error)

            return {
                "jobs": res.data,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": res.count or 0
                }
            }

        except Exception as e:
            logger.error(f"List jobs failed: {str(e)}", extra={"recruiter_id": recruiter_id})
            raise RuntimeError("Failed to fetch jobs")

    def get_job(self, job_id: str, recruiter_id: Optional[str] = None) -> Dict[str, Any]:
        try:
            query = self.supabase.table("jobs").select("*").eq("id", job_id)

            if recruiter_id:
                query = query.eq("created_by", recruiter_id)

            res = query.single().execute()

            if getattr(res, "error", None):
                raise Exception(res.error)

            return res.data

        except Exception as e:
            logger.error(f"Get job failed: {str(e)}", extra={"job_id": job_id})
            raise RuntimeError("Job not found")

    def update_job(self, job_id: str, update_data: Dict[str, Any], recruiter_id: str) -> Dict[str, Any]:
        try:
            res = (
                self.supabase.table("jobs")
                .update(update_data)
                .eq("id", job_id)
                .eq("created_by", recruiter_id)
                .execute()
            )

            if getattr(res, "error", None):
                raise Exception(res.error)

            logger.info("Job updated", extra={"job_id": job_id, "recruiter_id": recruiter_id})
            return res.data

        except Exception as e:
            logger.error(f"Update job failed: {str(e)}", extra={"job_id": job_id})
            raise RuntimeError("Failed to update job")

    def delete_job(self, job_id: str, recruiter_id: str) -> Dict[str, Any]:
        try:
            res = (
                self.supabase.table("jobs")
                .delete()
                .eq("id", job_id)
                .eq("created_by", recruiter_id)
                .execute()
            )

            if getattr(res, "error", None):
                raise Exception(res.error)

            logger.info("Job deleted", extra={"job_id": job_id})
            return res.data

        except Exception as e:
            logger.error(f"Delete job failed: {str(e)}", extra={"job_id": job_id})
            raise RuntimeError("Failed to delete job")

    # ---------------------------------------------------------
    # GET APPLICATIONS FOR RECRUITER'S JOBS ONLY (FIXED)
    # ---------------------------------------------------------
    def get_recruiter_applications(self, recruiter_id: str, job_id: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            # 1. Fetch ONLY jobs created by this recruiter
            job_query = self.supabase.table("jobs").select("id, title").eq("created_by", recruiter_id)
            
            # If job_id is specific, only fetch that job
            if job_id:
                job_query = job_query.eq("id", job_id)
                
            jobs_res = job_query.execute()
            jobs = getattr(jobs_res, "data", []) or []
            
            if not jobs:
                return [] 
                
            # Extract IDs and map them
            job_ids = [j["id"] for j in jobs]
            job_map = {j["id"]: j["title"] for j in jobs}

            # 2. Fetch applications ONLY for these job IDs
            # CRITICAL FIX: Breaking the chain to avoid "AttributeError: execute"
            query = self.supabase.table("job_applications").select("*").in_("job_id", job_ids).order("applied_at", desc=True)

            # Only limit if we are NOT filtering by a specific job. 
            # If viewing a specific job, we want to see ALL candidates.
            if not job_id:
                query = query.limit(100)
            
            apps_res = query.execute()
            
            applications = getattr(apps_res, "data", []) or []
            
            if not applications:
                return []

            # 3. Get Candidate Names
            candidate_ids = list(set(a["candidate_id"] for a in applications))
            cand_map = {}
            
            if candidate_ids:
                users_res = self.supabase.table("users")\
                    .select("id, full_name, email")\
                    .in_("id", candidate_ids)\
                    .execute()
                
                users_data = getattr(users_res, "data", []) or []
                
                for u in users_data:
                    cand_map[u["id"]] = u.get("full_name") or u.get("email") or "Candidate"

            # 4. Format the Data
            results = []
            for app in applications:
                enriched_app = dict(app)
                enriched_app["job_title"] = job_map.get(app["job_id"], "Unknown Job")
                enriched_app["candidate_name"] = cand_map.get(app["candidate_id"], "Unknown Candidate")
                results.append(enriched_app)
                
            return results

        except Exception as e:
            logger.error(f"Get recruiter applications failed: {str(e)}")
            return []

    # ---------------------------------------------------------
    # JOB SKILLS CRUD
    # ---------------------------------------------------------
    def add_job_skill(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            res = self.supabase.table("job_skills").insert(payload).execute()
            if getattr(res, "error", None):
                raise Exception(res.error)
            return res.data
        except Exception as e:
            logger.error(f"Add job skill failed: {str(e)}")
            raise RuntimeError("Failed to add job skill")

    def list_job_skills(self, job_id: str) -> List[Dict[str, Any]]:
        try:
            res = self.supabase.table("job_skills").select("*").eq("job_id", job_id).execute()
            return res.data
        except Exception as e:
            logger.error(f"List job skills failed: {str(e)}")
            raise RuntimeError("Failed to fetch job skills")

    def delete_job_skill(self, skill_id: str) -> None:
        try:
            self.supabase.table("job_skills").delete().eq("id", skill_id).execute()
        except Exception as e:
            logger.error(f"Delete job skill failed: {str(e)}")
            raise RuntimeError("Failed to delete job skill")

    # ---------------------------------------------------------
    # INTERVIEW QUESTIONS CRUD
    # ---------------------------------------------------------
    def add_interview_question(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            res = self.supabase.table("interview_questions").insert(payload).execute()
            if getattr(res, "error", None):
                raise Exception(res.error)
            return res.data
        except Exception as e:
            logger.error(f"Add interview question failed: {str(e)}")
            raise RuntimeError("Failed to add interview question")

    def list_interview_questions(self, job_id: str) -> List[Dict[str, Any]]:
        try:
            res = (
                self.supabase.table("interview_questions")
                .select("*")
                .eq("job_id", job_id)
                .order("question_order")
                .execute()
            )
            return res.data
        except Exception as e:
            logger.error(f"List interview questions failed: {str(e)}")
            raise RuntimeError("Failed to fetch interview questions")

    def delete_interview_question(self, question_id: str) -> None:
        try:
            self.supabase.table("interview_questions").delete().eq("id", question_id).execute()
        except Exception as e:
            logger.error(f"Delete interview question failed: {str(e)}")
            raise RuntimeError("Failed to delete interview question")

    # ---------------------------------------------------------
    # COMPANY CRUD
    # ---------------------------------------------------------
    def create_company(self, name: str, created_by: str, description: Optional[str], website: Optional[str]) -> Dict[str, Any]:
        try:
            company_id = str(uuid4())[:8].upper()

            payload = {
                "id": company_id,
                "name": name,
                "description": description,
                "website": website,
                "created_by": created_by,
            }

            res = self.supabase.table("companies").insert(payload).execute()

            if getattr(res, "error", None):
                raise Exception(res.error)

            logger.info("Company created", extra={"company_id": company_id})
            return {"company_id": company_id, "company": res.data}

        except Exception as e:
            logger.error(f"Create company failed: {str(e)}")
            raise RuntimeError("Failed to create company")

    def list_companies(self) -> List[Dict[str, Any]]:
        try:
            res = self.supabase.table("companies").select("*").order("name").execute()
            return res.data
        except Exception as e:
            logger.error(f"List companies failed: {str(e)}")
            raise RuntimeError("Failed to fetch companies")

    # ---------------------------------------------------------
    # RECRUITER PROFILE CRUD
    # ---------------------------------------------------------
    def upsert_profile(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            res = (
                self.supabase.table("recruiter_profiles")
                .upsert(payload, on_conflict="user_id")
                .execute()
            )
            return res.data
        except Exception as e:
            logger.error(f"Upsert recruiter profile failed: {str(e)}")
            raise RuntimeError(f"Failed to save recruiter profile: {str(e)}")

    def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = (
                self.supabase.table("recruiter_profiles")
                .select("*")
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            return res.data
        except Exception:
            return None

    # ---------------------------------------------------------
    # CANDIDATE DETAILS AGGREGATION
    # ---------------------------------------------------------
    def get_candidate_details(self, candidate_id: str, job_id: Optional[str]) -> Dict[str, Any]:
        try:
            profile = self._fetch_candidate_profile(candidate_id)
            application = self._fetch_candidate_application(candidate_id, job_id)
            resume_url = self._generate_resume_signed_url(profile)
            general_video = self._fetch_general_video(candidate_id)
            job_video_responses = self._fetch_job_video_responses(candidate_id, job_id)

            return {
                "candidate": profile,
                "application": application,
                "resume_url": resume_url,
                "general_video": general_video,
                "job_video_responses": job_video_responses
            }

        except Exception as e:
            logger.error(f"Candidate details fetch failed: {str(e)}")
            raise RuntimeError("Failed to fetch candidate details")

    # ---------------------------------------------------------
    # PRIVATE HELPERS
    # ---------------------------------------------------------
    def _fetch_candidate_profile(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        res = (
            self.supabase.table("candidate_profiles")
            .select("*")
            .eq("user_id", candidate_id)
            .single()
            .execute()
        )
        return getattr(res, "data", None)

    def _fetch_candidate_application(self, candidate_id: str, job_id: Optional[str]) -> Optional[Dict[str, Any]]:
        if job_id:
            query = (
                self.supabase.table("job_applications")
                .select("*")
                .eq("candidate_id", candidate_id)
                .eq("job_id", job_id)
                .single()
            )
        else:
            query = (
                self.supabase.table("job_applications")
                .select("*")
                .eq("candidate_id", candidate_id)
                .order("applied_at", desc=True)
                .limit(1)
                .single()
            )

        res = query.execute()
        return getattr(res, "data", None)

    def _generate_resume_signed_url(self, profile: Optional[Dict[str, Any]]) -> Optional[str]:
        if not profile or not profile.get("resume_url"):
            return None

        try:
            path = profile["resume_url"]
            signed = self.supabase.storage.from_("resumes").create_signed_url(path, 3600)
            return signed.get("signedURL")
        except Exception:
            return None

    def _fetch_general_video(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        res = (
            self.supabase.table("general_video_interviews")
            .select("*")
            .eq("candidate_id", candidate_id)
            .single()
            .execute()
        )
        return getattr(res, "data", None)

    def _fetch_job_video_responses(self, candidate_id: str, job_id: Optional[str]) -> List[Dict[str, Any]]:
        if not job_id:
            return []

        res = (
            self.supabase.table("video_responses")
            .select("*")
            .eq("candidate_id", candidate_id)
            .eq("job_id", job_id)
            .order("recorded_at")
            .execute()
        )
        return res.data or []

    # ---------------------------------------------------------
    # GET SINGLE APPLICATION DETAILS (For Details Page)
    # ---------------------------------------------------------
    def get_application_by_id(self, app_id: str) -> Dict[str, Any]:
        try:
            # 1. Get Application Data
            res = self.supabase.table("job_applications").select("*").eq("id", app_id).single().execute()
            app = getattr(res, "data", None)
            if not app: return None

            # 2. Get Job Title
            job_res = self.supabase.table("jobs").select("title").eq("id", app["job_id"]).single().execute()
            app["job_title"] = job_res.data["title"] if job_res.data else "Unknown Job"

            # 3. Get Candidate Name & Email (from Users table)
            user_res = self.supabase.table("users").select("full_name, email").eq("id", app["candidate_id"]).single().execute()
            if user_res.data:
                app["candidate_name"] = user_res.data.get("full_name") or "Candidate"
                app["candidate_email"] = user_res.data.get("email")

            # 4. Get Resume & Skills
            profile_res = self.supabase.table("candidate_profiles").select("*").eq("user_id", app["candidate_id"]).single().execute()
            if profile_res.data:
                profile = profile_res.data
                app["skills"] = profile.get("skills", [])
                app["linkedin"] = profile.get("linkedin_url")
                
                # Generate Resume Link
                if profile.get("resume_url"):
                    try:
                        signed = self.supabase.storage.from_("resumes").create_signed_url(profile["resume_url"], 3600)
                        app["resume_link"] = signed.get("signedURL")
                    except Exception:
                        app["resume_link"] = None

            return app
        except Exception as e:
            logger.error(f"Get application detail failed: {str(e)}")
            return None

    # ---------------------------------------------------------
    # UPDATE STATUS
    # ---------------------------------------------------------
    def update_application_status(self, app_id: str, new_status: str, questions: list = None) -> bool:
        try:
            update_data = {"status": new_status}
            if questions is not None:
                update_data["interview_questions"] = questions

            self.supabase.table("job_applications").update(update_data).eq("id", app_id).execute()
            return True
            
        except Exception as e:
            logger.error(f"Update status failed: {str(e)}")
            print(f"❌ DB UPDATE ERROR: {str(e)}") 
            return False