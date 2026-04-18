import os
import httpx
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response, StreamingResponse
from models.analytics_models import AnalyticsEventRequest
from services.analytics_service_mysql import AnalyticsService
from services.video_analysis_service import VideoAnalysisService
from middleware.role_required import ensure_permission
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])
svc = AnalyticsService()
video_analysis_svc = VideoAnalysisService()


# ---------------------------------------------------------
# VIDEO ANALYSIS (Authenticated users - their own intro videos)
# ---------------------------------------------------------
@router.post("/analyze-video")
async def analyze_video(request: Request):
    """
    Analyze user's intro video using AI (Whisper + FER + MediaPipe).
    Returns transcription, emotion analysis, speaking pace, and confidence score.
    """
    try:
        # Get current user
        user = request.state.user
        user_id = user.get("sub")  # JWT uses 'sub' for user ID

        # Get user's intro video from profile
        from services.mysql_service import MySQLService
        mysql = MySQLService()
        profile = mysql.get_single_record("candidate_profiles", {"user_id": user_id})
        if not profile:
            raise HTTPException(status_code=404, detail="No profile found. Please complete your profile first.")

        video_url = profile.get("intro_video_url")
        if not video_url:
            raise HTTPException(status_code=404, detail="No intro video found. Please record a video first.")

        # Check if analysis already exists and is recent
        existing_analysis = video_analysis_svc.get_analysis(user_id, video_url=video_url)
        if existing_analysis:
            # Return cached analysis if less than 1 hour old
            analyzed_at = existing_analysis.get("analyzed_at")
            if analyzed_at:
                from datetime import datetime, timezone, timedelta
                try:
                    analysis_time = datetime.fromisoformat(analyzed_at.replace('Z', '+00:00'))
                    if datetime.now(timezone.utc) - analysis_time < timedelta(hours=1):
                        return {"ok": True, "data": existing_analysis, "cached": True}
                except:
                    pass

        # Perform analysis
        analysis_result = video_analysis_svc.analyze_video(video_url, user_id)

        # Create notification for candidate about analysis completion
        try:
            from services.notification_service_mysql import NotificationService
            notification_svc = NotificationService()
            notification_svc.create_notification({
                "created_by": user_id,
                "title": "Video Analysis Complete",
                "message": "Your intro video has been analyzed. View your communication insights now!",
                "category": "video_analysis",
                "related_id": user_id,
                "metadata": {
                    "type": "intro_analysis",
                    "analysis_id": analysis_result.get("id"),
                    "overall_score": analysis_result.get("summary", {}).get("overall_score", 0)
                }
            })
        except Exception as notif_err:
            logger.warning(f"Failed to send analysis notification: {notif_err}")

        return {"ok": True, "data": analysis_result}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video analysis endpoint failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Video analysis failed: {str(e)}")


@router.get("/video-analysis")
async def get_video_analysis(request: Request):
    """
    Get existing video analysis for current user's intro video.
    """
    try:
        user = request.state.user
        user_id = user.get("sub")

        # Get user's profile to find intro video URL
        from services.mysql_service import MySQLService
        mysql = MySQLService()
        profile = mysql.get_single_record("candidate_profiles", {"user_id": user_id})
        
        video_url = None
        if profile and profile.get("intro_video_url"):
            video_url = profile.get("intro_video_url")

        analysis = video_analysis_svc.get_analysis(user_id, video_url=video_url)
        if not analysis:
            return {"ok": True, "data": None, "message": "No analysis found. Use POST /analyze-video to analyze your video."}

        return {"ok": True, "data": analysis}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analysis: {str(e)}")


# ---------------------------------------------------------
# VIDEO RESPONSE ANALYSIS (Recruiter only)
# ---------------------------------------------------------
@router.post("/analyze-video-response/{application_id}/{question_index}")
async def analyze_video_response(request: Request, application_id: str, question_index: int):
    """
    Analyze a candidate's video response for a specific question.
    Only recruiters can access this endpoint.
    """
    try:
        # Ensure user is recruiter
        ensure_permission(request, "applications:view")
        
        user = request.state.user
        recruiter_id = user.get("sub")

        # Get video response
        from services.mysql_service import MySQLService
        mysql = MySQLService()
        
        video_response = mysql.get_single_record("video_responses", {
            "application_id": application_id,
            "question_index": question_index
        })
        
        if not video_response:
            raise HTTPException(status_code=404, detail="Video response not found.")

        video_url = video_response.get("video_url")
        candidate_id = video_response.get("candidate_id")
        job_id = video_response.get("job_id")

        # Verify recruiter owns this job
        job = mysql.get_single_record("jobs", {"id": job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
        
        recruiter_profile = mysql.get_single_record("recruiter_profiles", {"user_id": recruiter_id})
        if not recruiter_profile or job.get("company_id") != recruiter_profile.get("company_id"):
            raise HTTPException(status_code=403, detail="You don't have permission to analyze this video.")

        # Check if analysis already exists
        existing_analysis = video_analysis_svc.get_analysis(candidate_id, video_url=video_url)
        if existing_analysis:
            return {"ok": True, "data": existing_analysis, "cached": True}

        # Perform analysis
        analysis_result = video_analysis_svc.analyze_video(video_url, candidate_id, video_type="response")

        return {"ok": True, "data": analysis_result}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video response analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Video analysis failed: {str(e)}")


@router.get("/video-response-analysis/{application_id}")
async def get_video_response_analyses(request: Request, application_id: str):
    """
    Get all video response analyses for an application.
    Only recruiters can access this endpoint.
    """
    try:
        # Ensure user is recruiter
        ensure_permission(request, "applications:view")
        
        user = request.state.user
        recruiter_id = user.get("sub")

        from services.mysql_service import MySQLService
        mysql = MySQLService()
        
        # Get application
        application = mysql.get_single_record("job_applications", {"id": application_id})
        if not application:
            raise HTTPException(status_code=404, detail="Application not found.")

        job_id = application.get("job_id")
        candidate_id = application.get("candidate_id")

        # Verify recruiter owns this job
        job = mysql.get_single_record("jobs", {"id": job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
        
        recruiter_profile = mysql.get_single_record("recruiter_profiles", {"user_id": recruiter_id})
        if not recruiter_profile or job.get("company_id") != recruiter_profile.get("company_id"):
            raise HTTPException(status_code=403, detail="You don't have permission to view these analyses.")

        # Get all video responses for this application
        video_responses = mysql.get_records("video_responses", {"application_id": application_id}, order_by="question_index ASC")
        
        analyses = []
        for vr in video_responses:
            video_url = vr.get("video_url")
            analysis = video_analysis_svc.get_analysis(candidate_id, video_url=video_url)
            analyses.append({
                "question_index": vr.get("question_index"),
                "question": vr.get("question"),
                "video_url": video_url,
                "analysis": analysis
            })

        return {"ok": True, "data": analyses}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get video response analyses: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analyses: {str(e)}")


@router.post("/bulk-analyze-responses")
async def bulk_analyze_responses(request: Request):
    """
    Start background analysis of video responses for multiple applications.
    Only recruiters can access this endpoint.
    Returns immediately with task_id for tracking.
    
    Request body: {
        "application_ids": ["id1", "id2", ...],
        "job_id": "optional_job_id"  // Optional, for filtering
    }
    """
    try:
        from fastapi import BackgroundTasks
        from services.background_tasks import background_task_service, run_video_analysis_background
        import uuid
        
        # Ensure user is recruiter
        ensure_permission(request, "applications:view")
        
        user = request.state.user
        recruiter_id = user.get("sub")
        
        # Parse request body
        body = await request.json()
        application_ids = body.get("application_ids", [])
        job_id = body.get("job_id")
        
        if not application_ids:
            raise HTTPException(status_code=400, detail="At least one application_id is required.")
        
        # Generate task ID
        task_id = str(uuid.uuid4())
        
        # Create task record
        background_task_service.create_task_record(
            task_id=task_id,
            task_type="video_analysis",
            user_id=recruiter_id,
            metadata={"application_ids": application_ids, "job_id": job_id}
        )
        
        # Start background task using asyncio
        import asyncio
        asyncio.create_task(
            run_video_analysis_background(
                task_id,
                application_ids,
                recruiter_id,
                job_id
            )
        )
        
        return {
            "ok": True,
            "data": {
                "task_id": task_id,
                "status": "pending",
                "message": f"Analysis started for {len(application_ids)} application(s). You will be notified when complete."
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start re-analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start re-analysis: {str(e)}")


@router.post("/reanalyze/{application_id}")
async def reanalyze_application(request: Request, application_id: str):
    """
    Re-analyze a single application, ignoring cached results.
    Forces fresh video analysis for all videos associated with this application.
    """
    try:
        from services.background_tasks import background_task_service, run_video_analysis_background
        import uuid
        
        ensure_permission(request, "applications:analyze")
        
        user = request.state.user
        recruiter_id = user.get("sub")
        
        # Get application details to verify it exists
        from services.recruiter_service_mysql import RecruiterService
        recruiter_svc = RecruiterService()
        app_data = recruiter_svc.get_application_by_id(application_id)
        
        if not app_data or not app_data.get("application"):
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Generate task ID
        task_id = str(uuid.uuid4())
        
        # Create task record
        background_task_service.create_task_record(
            task_id=task_id,
            task_type="video_analysis",
            user_id=recruiter_id,
            metadata={"application_ids": [application_id], "force_refresh": True}
        )
        
        # Start background task with force_refresh=True
        import asyncio
        asyncio.create_task(
            run_video_analysis_background(
                task_id=task_id,
                application_ids=[application_id],
                user_id=recruiter_id,
                force_refresh=True
            )
        )
        
        return {
            "ok": True,
            "data": {
                "task_id": task_id,
                "status": "pending",
                "message": "Re-analysis started. You will be notified when complete."
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start re-analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start re-analysis: {str(e)}")


@router.get("/analysis-tasks")
async def get_analysis_tasks(request: Request):
    """
    Get all analysis reports for the current recruiter.
    Queries analysis_reports table for persisted task results.
    """
    try:
        from services.background_tasks import background_task_service
        
        ensure_permission(request, "applications:view")
        
        user = request.state.user
        recruiter_id = user.get("sub")
        
        # Get all tasks from database
        tasks = background_task_service.get_all_tasks(user_id=recruiter_id)
        
        return {"ok": True, "data": tasks}
        
    except Exception as e:
        logger.error(f"Failed to get analysis tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve tasks: {str(e)}")


@router.get("/latest-reports")
async def get_latest_analysis_reports(request: Request):
    """
    Get the latest analysis report per application (candidate+job combination).
    This prevents showing duplicate analyses when an application is analyzed multiple times.
    """
    try:
        from services.background_tasks import background_task_service
        
        ensure_permission(request, "applications:view")
        
        user = request.state.user
        recruiter_id = user.get("sub")
        
        # Get all completed tasks from database
        tasks = background_task_service.get_all_tasks(user_id=recruiter_id)
        completed_tasks = [t for t in tasks if t.get("status") == "completed" and t.get("result")]
        
        # Group by application_id and keep only the latest
        latest_reports = {}  # application_id -> report
        
        # Process tasks in order (they're already sorted by created_at DESC)
        for task in completed_tasks:
            results = task.get("result", {}).get("results", [])
            for result in results:
                app_id = result.get("application_id")
                if not app_id:
                    continue
                
                # Only keep if we haven't seen this application yet
                # (tasks are sorted by date DESC, so first one is latest)
                if app_id not in latest_reports:
                    analyses = result.get("analyses", [])
                    valid_analyses = [a for a in analyses if a.get("analysis", {}).get("summary")]
                    
                    if valid_analyses:
                        # Calculate average scores
                        avg_score = round(
                            sum(a["analysis"]["summary"].get("overall_score", 0) for a in valid_analyses) / len(valid_analyses)
                        )
                        avg_wpm = round(
                            sum(a["analysis"]["summary"].get("speaking_pace", 0) for a in valid_analyses) / len(valid_analyses)
                        )
                        avg_filler = round(
                            sum(a["analysis"]["summary"].get("filler_words", 0) for a in valid_analyses) / len(valid_analyses)
                        )
                        avg_face = round(
                            sum(a["analysis"]["summary"].get("face_presence", 0) for a in valid_analyses) / len(valid_analyses)
                        )
                        
                        # Get dominant emotion
                        emotions = [a["analysis"]["summary"].get("dominant_emotion") for a in valid_analyses if a["analysis"]["summary"].get("dominant_emotion")]
                        
                        latest_reports[app_id] = {
                            "application_id": app_id,
                            "candidate_id": result.get("candidate_id"),
                            "candidate_name": result.get("candidate_name"),
                            "job_title": result.get("job_title"),
                            "job_id": result.get("job_id") or task.get("metadata", {}).get("job_id"),
                            "applied_at": result.get("applied_at") or task.get("completed_at"),
                            "analyzed_at": task.get("completed_at"),
                            "task_id": task.get("task_id"),
                            "analyses": valid_analyses,
                            "avg_score": avg_score,
                            "avg_wpm": avg_wpm,
                            "avg_filler": avg_filler,
                            "avg_face": avg_face,
                            "dominant_emotion": max(set(emotions), key=emotions.count) if emotions else "N/A",
                            "total_questions": len(valid_analyses)
                        }
        
        # Convert to list sorted by analyzed_at DESC
        reports_list = sorted(latest_reports.values(), key=lambda r: r.get("analyzed_at", ""), reverse=True)
        
        return {"ok": True, "data": reports_list}
        
    except Exception as e:
        logger.error(f"Failed to get latest analysis reports: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve reports: {str(e)}")


@router.get("/analysis-task/{task_id}")
async def get_analysis_task(request: Request, task_id: str):
    """
    Get status and results of a specific analysis task.
    """
    try:
        from services.background_tasks import background_task_service
        
        ensure_permission(request, "applications:view")
        
        user = request.state.user
        task = background_task_service.get_task_status(task_id)
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Verify ownership
        if task.get("user_id") != user.get("sub"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        return {"ok": True, "data": task}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get analysis task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve task: {str(e)}")


# ---------------------------------------------------------
# CREATE EVENT (All authenticated users)
# ---------------------------------------------------------
@router.post("/")
async def create_event(request: Request, payload: AnalyticsEventRequest):
    """
    All authenticated users can create analytics events.
    No permission check required, just valid auth (handled by middleware).
    """
    try:
        event = svc.create_event(payload.model_dump())
        return {"ok": True, "data": event}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# LIST EVENTS (Recruiter/Admin)
# ---------------------------------------------------------
@router.get("/")
async def list_events(
    request: Request,
    page: int = 1,
    page_size: int = 50
):
    ensure_permission(request, "analytics:view")

    try:
        events = svc.list_events(
            request.state.user.get("sub"),
            page=page,
            page_size=page_size
        )
        return {"ok": True, "data": events}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# PDF REPORT DOWNLOAD (Recruiter only)
# ---------------------------------------------------------
@router.get("/download-report/{application_id}")
async def download_analysis_report(request: Request, application_id: str):
    """
    Download PDF report for a candidate's video analysis.
    Only recruiters can access this endpoint.
    """
    try:
        from services.mysql_service import MySQLService
        from services.pdf_report_service import generate_analysis_pdf
        from datetime import datetime
        
        ensure_permission(request, "applications:view")
        
        user = request.state.user
        recruiter_id = user.get("sub")
        
        mysql = MySQLService()
        
        # Get application with candidate and job details
        application = mysql.get_single_record("job_applications", {"id": application_id})
        if not application:
            raise HTTPException(status_code=404, detail="Application not found.")
        
        job_id = application.get("job_id")
        candidate_id = application.get("candidate_id")
        
        # Verify recruiter owns this job
        job = mysql.get_single_record("jobs", {"id": job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
        
        recruiter_profile = mysql.get_single_record("recruiter_profiles", {"user_id": recruiter_id})
        if not recruiter_profile or job.get("company_id") != recruiter_profile.get("company_id"):
            raise HTTPException(status_code=403, detail="You don't have permission to download this report.")
        
        # Get candidate details
        candidate_user = mysql.get_single_record("users", {"id": candidate_id})
        candidate_profile = mysql.get_single_record("candidate_profiles", {"user_id": candidate_id})
        
        logger.info(f"PDF Report DEBUG: candidate_id = {candidate_id}")
        logger.info(f"PDF Report DEBUG: candidate_user = {candidate_user}")
        logger.info(f"PDF Report DEBUG: candidate_profile = {candidate_profile}")
        
        candidate_info = {
            "name": candidate_user.get("full_name", "N/A") if candidate_user else "N/A",
            "mobile": candidate_profile.get("phone", "N/A") if candidate_profile else "N/A",
            "email": candidate_user.get("email", "N/A") if candidate_user else "N/A",
            "candidate_id": candidate_id
        }
        
        # Get job details
        job_info = {
            "position": job.get("job_title", "N/A"),
            "company": recruiter_profile.get("company_name", "N/A") if recruiter_profile else "N/A",
            "interview_date": application.get("interview_date") or application.get("created_at", "N/A")
        }
        
        logger.info(f"PDF Report: candidate_info = {candidate_info}")
        logger.info(f"PDF Report: job_info = {job_info}")
        
        # Format interview date
        if job_info["interview_date"] and job_info["interview_date"] != "N/A":
            try:
                dt = datetime.fromisoformat(job_info["interview_date"].replace('Z', '+00:00'))
                job_info["interview_date"] = dt.strftime('%B %d, %Y')
            except:
                pass
        
        # Get all video responses and analyses for this application
        video_responses = mysql.get_records("video_responses", {"application_id": application_id}, order_by="question_index ASC")
        
        logger.info(f"PDF Report: Found {len(video_responses)} video responses for application {application_id}")
        
        analyses = []
        intro_video_analysis = None
        
        # Get intro video analysis (from candidate profile or application)
        intro_video_url = candidate_profile.get("intro_video_url") if candidate_profile else None
        if not intro_video_url:
            intro_video_url = application.get("intro_video_url")
        
        logger.info(f"PDF Report: Intro video URL: {intro_video_url}")
        
        if intro_video_url:
            intro_video_analysis = video_analysis_svc.get_analysis(candidate_id, video_url=intro_video_url)
            logger.info(f"PDF Report: Intro video analysis result: {intro_video_analysis is not None}")
            if intro_video_analysis:
                analyses.append({
                    "question_index": -1,  # -1 indicates intro video
                    "question": "Intro Video",
                    "video_url": intro_video_url,
                    "analysis": intro_video_analysis
                })
        
        for vr in video_responses:
            video_url = vr.get("video_url")
            analysis = video_analysis_svc.get_analysis(candidate_id, video_url=video_url)
            logger.info(f"PDF Report: Video response {vr.get('question_index')} - URL: {video_url}, Analysis found: {analysis is not None}")
            analyses.append({
                "question_index": vr.get("question_index"),
                "question": vr.get("question"),
                "video_url": video_url,
                "analysis": analysis
            })
        
        # Build analysis data structure
        analysis_data = {
            "analyses": analyses,
            "summary": {
                "overall_score": 0,
                "speaking_pace": 0,
                "word_count": 0,
                "duration": 0,
                "filler_words": 0,
                "face_presence": 0,
                "confidence_score": 0,
                "dominant_emotion": "N/A"
            },
            "nlp_analysis": intro_video_analysis.get("nlp_analysis", {}) if intro_video_analysis else {},
            "transcription": intro_video_analysis.get("transcription", {}) if intro_video_analysis else {},
            "audio_analysis": intro_video_analysis.get("audio_analysis", {}) if intro_video_analysis else {},
            "face_match": None  # Will be populated from background task result
        }
        
        # Get face_match result from latest background task for this application
        try:
            from services.background_tasks import background_task_service
            tasks = background_task_service.get_tasks_by_user(recruiter_id, task_type="video_analysis", limit=10)
            for task in tasks:
                task_result = task.get("result", {})
                results = task_result.get("results", [])
                for r in results:
                    if r.get("application_id") == application_id and r.get("face_match"):
                        analysis_data["face_match"] = r["face_match"]
                        break
                if analysis_data["face_match"]:
                    break
        except Exception as e:
            logger.warning(f"Could not retrieve face_match data: {e}")
        
        # Calculate aggregate summary from all analyses
        if analyses:
            total_score = 0
            total_wpm = 0
            total_words = 0
            total_duration = 0
            total_fillers = 0
            total_face = 0
            total_confidence = 0
            count = 0
            emotions = []
            
            for a in analyses:
                if a.get("analysis"):
                    summary = a["analysis"].get("summary", {})
                    total_score += summary.get("overall_score", 0)
                    total_wpm += summary.get("speaking_pace", 0)
                    total_words += summary.get("word_count", 0)
                    total_duration += summary.get("duration", 0)
                    total_fillers += summary.get("filler_words", 0)
                    total_face += summary.get("face_presence", 0)
                    total_confidence += summary.get("confidence_score", 0)
                    if summary.get("dominant_emotion"):
                        emotions.append(summary["dominant_emotion"])
                    count += 1
            
            if count > 0:
                analysis_data["summary"] = {
                    "overall_score": round(total_score / count),
                    "speaking_pace": round(total_wpm / count),
                    "word_count": total_words,
                    "duration": round(total_duration),
                    "filler_words": total_fillers,
                    "face_presence": round(total_face / count),
                    "confidence_score": round(total_confidence / count),
                    "dominant_emotion": max(set(emotions), key=emotions.count) if emotions else "N/A"
                }
        
        # Generate PDF
        pdf_bytes = generate_analysis_pdf(candidate_info, job_info, analysis_data)
        
        # Generate filename
        filename = f"analysis_report_{candidate_info['name'].replace(' ', '_')}_{job_info['position'].replace(' ', '_')}.pdf"
        
        # Use StreamingResponse for optimal memory handling
        # PDF is generated in RAM (io.BytesIO), streamed directly to client
        # No disk storage - safe for Render's ephemeral filesystem
        def iter_pdf():
            yield pdf_bytes
        
        return StreamingResponse(
            iter_pdf(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
# 1. Define what data the frontend will send us
# OLLAMA endpoint
class EvaluationRequest(BaseModel):
    resume_text: str
    jd_text: str

# 2. Grab the Cloudflare Tunnel URL from Render's Environment Variables
# (If it's running locally, it defaults back to localhost!)
OLLAMA_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")

# 3. Create the Endpoint
@router.post("/evaluate")
async def evaluate_candidate_profile(request: EvaluationRequest):
    
    # Format the prompt exactly like we tested in your terminal
    prompt_text = f"""
    Act as an expert technical recruiter. Read the following Job Description and Candidate Resume. 
    1. Give the candidate a match score from 0 to 100.
    2. Provide 3 short bullet points explaining why they got that score.

    --- JOB DESCRIPTION ---
    {request.jd_text}

    --- CANDIDATE RESUME ---
    {request.resume_text}
    """

    payload = {
        "model": "llama3",
        "prompt": prompt_text,
        "stream": False 
    }

    try:
        # Send the data down the Cloudflare Tunnel to your local Quadro GPU
        # Timeout is 60 seconds to give your laptop time to "think"
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status() # Check for tunnel or server errors
            
            result = response.json()
            
            # Return the clean AI text to the frontend
            return {
                "status": "success", 
                "evaluation": result["response"]
            }
            
    except httpx.ReadTimeout:
        raise HTTPException(status_code=504, detail="AI Engine took too long to respond.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Engine Offline or Tunnel Broken: {str(e)}")