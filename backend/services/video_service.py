import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from supabase import Client
from services.supabase_client import get_client
from utils_others.logger import logger


class VideoService:
    """
    Handles all video-related operations:
    - Uploading videos to Supabase storage
    - Creating signed URLs
    - Saving per-question video responses
    - Saving general video interviews
    - Listing video responses
    - Listing candidate videos
    """

    def __init__(self, supabase_client: Optional[Client] = None):
        self.supabase = supabase_client or get_client()
        self.bucket_name = "video-responses"

    # ---------------------------------------------------------
    # STORAGE UPLOAD
    # ---------------------------------------------------------
    def upload_video_to_storage(self, file_content: bytes, filename: str, candidate_id: str) -> str:
        """
        Upload a video file to Supabase storage and return a public URL.
        """
        try:
            file_extension = filename.split(".")[-1] if "." in filename else "mp4"
            unique_filename = f"{candidate_id}/{uuid.uuid4()}.{file_extension}"

            storage_response = (
                self.supabase
                .storage
                .from_(self.bucket_name)
                .upload(unique_filename, file_content)
            )

            if getattr(storage_response, "error", None):
                raise RuntimeError(storage_response.error)

            public_url = (
                self.supabase
                .storage
                .from_(self.bucket_name)
                .get_public_url(unique_filename)
            )

            logger.info(
                "Video uploaded to storage",
                extra={"candidate_id": candidate_id, "path": unique_filename},
            )

            return public_url

        except Exception as e:
            logger.error(
                f"Video upload failed: {str(e)}",
                extra={"candidate_id": candidate_id, "filename": filename},
            )
            raise RuntimeError("Failed to upload video")

    # ---------------------------------------------------------
    # SIGNED URL
    # ---------------------------------------------------------
    def create_signed_url(self, file_path: str, expires_in: int = 3600) -> str:
        """
        Create a signed URL for a stored video file.
        """
        try:
            signed = (
                self.supabase
                .storage
                .from_(self.bucket_name)
                .create_signed_url(file_path, expires_in)
            )
            url = signed.get("signedURL")
            if not url:
                raise RuntimeError("Signed URL missing")

            logger.info("Signed video URL created", extra={"file_path": file_path})

            return url

        except Exception as e:
            logger.error(f"Signed URL creation failed: {str(e)}", extra={"file_path": file_path})
            raise RuntimeError("Failed to create signed URL")

    # ---------------------------------------------------------
    # SAVE VIDEO RESPONSE
    # ---------------------------------------------------------
    def save_video_response(
        self,
        application_id: str,
        question: str, # Changed from question_id to match actual data
        video_url: str,
        transcript: Optional[str] = None,
        duration: Optional[int] = None,
        status: str = "completed",
        candidate_id: Optional[str] = None,
        ai_analysis: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        try:
            payload: Dict[str, Any] = {
                "application_id": application_id,
                "question": question, # Ensure column name in Supabase is 'question'
                "video_url": video_url,
                "transcript": transcript,
                "duration": duration,
                "status": status,
                "recorded_at": datetime.now(timezone.utc).isoformat(),
                "ai_analysis": ai_analysis or {},
            }
            
            if candidate_id:
                payload["candidate_id"] = candidate_id

            res = self.supabase.table("video_responses").insert(payload).execute()

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            data = getattr(res, "data", None) or []
            row = data[0] if isinstance(data, list) and data else {}

            logger.info(
                "Video response saved",
                extra={
                    "application_id": application_id,
                    "question": question,
                    "candidate_id": candidate_id,
                },
            )

            return row

        except Exception as e:
            logger.error(
                f"Save video response failed: {str(e)}",
                extra={
                    "application_id": application_id,
                    "question": question,
                    "candidate_id": candidate_id,
                },
            )
            raise RuntimeError("Failed to save video response")

    # ---------------------------------------------------------
    # SAVE GENERAL VIDEO
    # ---------------------------------------------------------
    def save_general_video(
        self,
        candidate_id: str,
        video_url: str,
        status: str = "completed",
        ai_analysis: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Save or update a general video interview record for a candidate.
        """
        try:
            payload = {
                "candidate_id": candidate_id,
                "video_url": video_url,
                "status": status,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_general": True,
                "ai_analysis": ai_analysis or {},
            }

            res = (
                self.supabase
                .table("general_video_interviews")
                .upsert(payload, on_conflict="candidate_id")
                .execute()
            )

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            data = getattr(res, "data", None) or []
            row = data[0] if isinstance(data, list) and data else {}

            logger.info(
                "General video saved",
                extra={"candidate_id": candidate_id},
            )

            return row

        except Exception as e:
            logger.error(
                f"Save general video failed: {str(e)}",
                extra={"candidate_id": candidate_id},
            )
            raise RuntimeError("Failed to save general video")

    # ---------------------------------------------------------
    # LIST RESPONSES FOR AN APPLICATION
    # ---------------------------------------------------------
    def list_video_responses(self, application_id: str) -> List[Dict[str, Any]]:
        """
        List all video responses for a given application.
        """
        try:
            res = (
                self.supabase
                .table("video_responses")
                .select("*")
                .eq("application_id", application_id)
                .order("recorded_at", desc=True)
                .execute()
            )

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            data = res.data or []

            logger.info(
                "Video responses fetched",
                extra={"application_id": application_id, "count": len(data)},
            )

            return data

        except Exception as e:
            logger.error(
                f"Fetch video responses failed: {str(e)}",
                extra={"application_id": application_id},
            )
            raise RuntimeError("Failed to fetch video responses")

    # ---------------------------------------------------------
    # LIST ALL VIDEOS FOR A CANDIDATE
    # ---------------------------------------------------------
    def get_candidate_videos(self, candidate_id: str) -> List[Dict[str, Any]]:
        """
        List all video responses for a candidate.
        """
        try:
            res = (
                self.supabase
                .table("video_responses")
                .select("*")
                .eq("candidate_id", candidate_id)
                .order("recorded_at", desc=True)
                .execute()
            )

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            data = res.data or []

            logger.info(
                "Candidate videos fetched",
                extra={"candidate_id": candidate_id, "count": len(data)},
            )

            return data

        except Exception as e:
            logger.error(
                f"Fetch candidate videos failed: {str(e)}",
                extra={"candidate_id": candidate_id},
            )
            raise RuntimeError("Failed to fetch candidate videos")
def get_interview_responses(self, application_id: str) -> List[Dict[str, Any]]:
    """
    Get all video responses for a specific interview application.
    Returns a list of responses with their details.
    """
    try:
        # First get all responses for this application
        response = (
            self.supabase
            .table("interview_responses")
            .select("*")
            .eq("application_id", application_id)
            .order("created_at", desc=False)  # Oldest first
            .execute()
        )

        if not response.data:
            return []

        # Process each response to include signed URLs if needed
        processed_responses = []
        for resp in response.data:
            # If the URL is a path (not a full URL), get a signed URL
            video_url = resp.get("video_url", "")
            if video_url and not video_url.startswith(("http://", "https://")):
                try:
                    video_url = self.create_signed_url(video_url)
                except Exception as e:
                    logger.error(f"Failed to create signed URL: {str(e)}")
                    continue  # Skip this response if we can't generate a URL

            processed_responses.append({
                "id": resp.get("id"),
                "question": resp.get("question"),
                "video_url": video_url,
                "status": resp.get("status", "pending_review"),
                "created_at": resp.get("created_at"),
                "updated_at": resp.get("updated_at")
            })

        return processed_responses

    except Exception as e:
        logger.error(f"Error getting interview responses: {str(e)}")
        raise RuntimeError("Failed to retrieve interview responses")