from typing import Optional, Dict, Any, List
from supabase import Client
from services.supabase_client import get_client
from utils_others.logger import logger


class DashboardService:
    """
    Provides dashboard summaries for both recruiters and candidates.
    Fetches:
    - User role
    - Jobs (for recruiters)
    - Applications (for both)
    - Basic stats
    """

    def __init__(self, client: Optional[Client] = None):
        self.supabase = client or get_client()

    # ---------------------------------------------------------
    # PUBLIC API
    # ---------------------------------------------------------
    def get_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Returns dashboard summary for recruiter or candidate.
        Structure:
        {
            "role": "recruiter" | "candidate",
            "stats": {...},
            "jobs": [...],
            "applications": [...]
        }
        """
        try:
            role = self._get_user_role(user_id)

            if role == "recruiter":
                return self._get_recruiter_summary(user_id)

            if role == "candidate":
                return self._get_candidate_summary(user_id)

            logger.warning("Unknown user role, returning empty summary", extra={"user_id": user_id})
            return {"role": None, "stats": self._empty_stats(), "jobs": [], "applications": []}

        except Exception as e:
            logger.error(f"Dashboard summary failed: {str(e)}", extra={"user_id": user_id})
            return {"role": None, "stats": self._empty_stats(), "jobs": [], "applications": []}

    # ---------------------------------------------------------
    # USER ROLE
    # ---------------------------------------------------------
    def _get_user_role(self, user_id: str) -> str:
        try:
            auth_user = self.supabase.auth.admin.get_user_by_id(user_id)
            user_obj = getattr(auth_user, "user", None)

            if not user_obj:
                logger.warning("User not found in auth, defaulting to candidate", extra={"user_id": user_id})
                return "candidate"

            metadata = user_obj.user_metadata or {}
            role = metadata.get("role")

            if not role:
                logger.warning("User role missing in metadata, defaulting to candidate", extra={"user_id": user_id})
                return "candidate"

            return role
        except Exception as e:
            logger.error(f"Failed to fetch user role, defaulting to candidate: {str(e)}", extra={"user_id": user_id})
            return "candidate"

    # ---------------------------------------------------------
    # RECRUITER SUMMARY
    # ---------------------------------------------------------
    def _get_recruiter_summary(self, user_id: str) -> Dict[str, Any]:
        try:
            jobs = self._fetch_recruiter_jobs(user_id)
            job_ids = [j["id"] for j in jobs]

            applications = self._fetch_applications_for_jobs(job_ids) if job_ids else []

            stats = self._compute_recruiter_stats(jobs, applications)

            logger.info("Recruiter dashboard loaded", extra={"user_id": user_id})

            return {
                "role": "recruiter",
                "stats": stats,
                "jobs": jobs,
                "applications": applications,
            }

        except Exception as e:
            logger.error(f"Recruiter dashboard failed: {str(e)}", extra={"user_id": user_id})
            return {"role": "recruiter", "stats": self._empty_stats(), "jobs": [], "applications": []}

    def _fetch_recruiter_jobs(self, user_id: str) -> List[Dict[str, Any]]:
        res = (
            self.supabase.table("jobs")
            .select("id, title, status, created_at, expires_at, location, job_type")
            .eq("created_by", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        if getattr(res, "error", None):
            raise RuntimeError(res.error)

        return res.data or []

    def _fetch_applications_for_jobs(self, job_ids: List[str]) -> List[Dict[str, Any]]:
        res = (
            self.supabase.table("job_applications")
            .select("id, status, ai_score, candidate_id, applied_at, job_id")
            .in_("job_id", job_ids)
            .order("applied_at", desc=True)
            .execute()
        )

        if getattr(res, "error", None):
            raise RuntimeError(res.error)

        return res.data or []

    # ---------------------------------------------------------
    # CANDIDATE SUMMARY
    # ---------------------------------------------------------
    def _get_candidate_summary(self, user_id: str) -> Dict[str, Any]:
        try:
            applications = self._fetch_candidate_applications(user_id)
            job_ids = [a["job_id"] for a in applications]

            jobs = self._fetch_jobs_for_candidate(job_ids) if job_ids else []

            stats = self._compute_candidate_stats(applications)

            logger.info("Candidate dashboard loaded", extra={"user_id": user_id})

            return {
                "role": "candidate",
                "stats": stats,
                "jobs": jobs,
                "applications": applications,
            }

        except Exception as e:
            logger.error(f"Candidate dashboard failed: {str(e)}", extra={"user_id": user_id})
            return {"role": "candidate", "stats": self._empty_stats(), "jobs": [], "applications": []}

    def _fetch_candidate_applications(self, user_id: str) -> List[Dict[str, Any]]:
        res = (
            self.supabase.table("job_applications")
            .select("id, status, ai_score, applied_at, job_id")
            .eq("candidate_id", user_id)
            .order("applied_at", desc=True)
            .execute()
        )

        if getattr(res, "error", None):
            raise RuntimeError(res.error)

        return res.data or []

    def _fetch_jobs_for_candidate(self, job_ids: List[str]) -> List[Dict[str, Any]]:
        # jobs table does not have "company" column; we keep it minimal here
        res = (
            self.supabase.table("jobs")
            .select("id, title, location, job_type, status")
            .in_("id", job_ids)
            .execute()
        )

        if getattr(res, "error", None):
            raise RuntimeError(res.error)

        return res.data or []

    # ---------------------------------------------------------
    # STATS HELPERS
    # ---------------------------------------------------------
    def _empty_stats(self) -> Dict[str, int]:
        return {
            "total_jobs": 0,
            "active_jobs": 0,
            "closed_jobs": 0,
            "total_applications": 0,
            "shortlisted": 0,
            "interviews": 0,
            "hired": 0,
        }

    def _compute_recruiter_stats(self, jobs: List[Dict[str, Any]], applications: List[Dict[str, Any]]) -> Dict[str, int]:
        stats = self._empty_stats()

        stats["total_jobs"] = len(jobs)
        stats["active_jobs"] = sum(1 for j in jobs if j.get("status") == "active")
        stats["closed_jobs"] = sum(1 for j in jobs if j.get("status") == "closed")

        stats["total_applications"] = len(applications)
        stats["shortlisted"] = sum(1 for a in applications if a.get("status") == "shortlisted")
        stats["interviews"] = sum(1 for a in applications if a.get("status") == "interview_scheduled")
        stats["hired"] = sum(1 for a in applications if a.get("status") == "hired")

        return stats

    def _compute_candidate_stats(self, applications: List[Dict[str, Any]]) -> Dict[str, int]:
        stats = self._empty_stats()

        stats["total_applications"] = len(applications)
        stats["shortlisted"] = sum(1 for a in applications if a.get("status") == "shortlisted")
        stats["interviews"] = sum(1 for a in applications if a.get("status") == "interview_scheduled")
        stats["hired"] = sum(1 for a in applications if a.get("status") == "hired")

        return stats

    def list_public_jobs(self, search_query: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            query = self.supabase.table("jobs").select("*").eq("status", "active")
            
            if search_query:
                query = query.ilike("title", f"%{search_query}%")
            
            # We use .execute() which ALWAYS returns a list []
            res = query.order("created_at", desc=True).limit(50).execute()
            
            # Safely handle data
            jobs = res.data if res.data else []
            
            # Enrich
            if jobs:
                self._enrich_jobs(jobs)
                
            return jobs
        except Exception as e:
            print(f"❌ Service Error (List): {e}")
            logger.error(f"List jobs failed: {e}")
            return []

    # ---------------------------------------------------------
    # PUBLIC JOB LISTING (For Candidates)
    # ---------------------------------------------------------
    def list_public_jobs(self, search_query: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            # Query for ACTIVE jobs only
            query = self.supabase.table("jobs").select("*").eq("status", "active")
            
            # Search Filter
            if search_query:
                search_filter = f"title.ilike.%{search_query}%,location.ilike.%{search_query}%"
                query = query.or_(search_filter)
            
            # Fetch up to 100 jobs (Fixes "Limited Jobs" issue)
            res = query.order("created_at", desc=True).limit(100).execute()
            jobs = getattr(res, "data", []) or []
            
            # Attach Company Names
            self._enrich_jobs_with_company(jobs)
            return jobs
        except Exception as e:
            logger.error(f"List public jobs failed: {e}")
            return []

    def get_public_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.supabase.table("jobs").select("*").eq("id", job_id).single().execute()
            job = getattr(res, "data", None)
            
            if job:
                self._enrich_jobs_with_company([job])
                return job
            return None
        except Exception as e:
            logger.error(f"Get public job failed: {e}")
            return None

    def _enrich_jobs_with_company(self, jobs: List[Dict[str, Any]]):
        if not jobs: return
        company_ids = list(set(j["company_id"] for j in jobs if j.get("company_id")))
        if company_ids:
            try:
                c_res = self.supabase.table("companies").select("id, name").in_("id", company_ids).execute()
                c_map = {c["id"]: c["name"] for c in getattr(c_res, "data", [])}
                for j in jobs:
                    j["company_name"] = c_map.get(j.get("company_id"), "Unknown Company")
            except: pass

    # ---------------------------------------------------------
    # EXISTING DASHBOARD SUMMARY LOGIC
    # ---------------------------------------------------------
    def get_summary(self, user_id: str) -> Dict[str, Any]:
        # (Simplified for brevity - assumes existing logic handles role dispatch)
        # You can keep your existing get_summary logic here if you have it, 
        # or use this placeholder which relies on the frontend fetching specific data lists.
        return {"role": "candidate", "stats": {}, "jobs": [], "applications": []}