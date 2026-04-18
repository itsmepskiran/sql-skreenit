import { customAuth } from '@shared/js/auth-config.js';
import { backendGet, backendPost, backendPut, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import { sidebarManager } from '@shared/js/profile-checker.js';
import { initNotifications } from '@shared/js/notification-manager.js';
import '@shared/js/mobile.js';

// Configuration & Global State
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
let currentApplicationData = null; 

// Initialize Logo
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// --- AUTH & SIDEBAR SYNC ---
async function checkAuth() {
    const user = await customAuth.getUserData();
    if (!user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    // Use centralized sidebar manager
    await sidebarManager.initSidebar();
    
    // Initialize mobile menu after sidebar is ready
    if (window.initMobileMenu) window.initMobileMenu();
    
    // Setup navigation AFTER mobile menu is initialized
    setupNavigation();
    
    // Initialize notifications
    initNotifications();

    const urlParams = new URLSearchParams(window.location.search);
    const appId = urlParams.get('id');
    
    if(!appId) {
        alert("Invalid Application ID");
        window.location.href = CONFIG.PAGES.APPLICATION_LIST;
        return;
    }

    loadApplicationDetails(appId);
}

// --- ABSOLUTE NAVIGATION ---
function setupNavigation() {
    const navDashboard = document.getElementById('navDashboard');
    const navJobs = document.getElementById('navJobs');
    const navApplications = document.getElementById('navApplications');
    const navAnalysis = document.getElementById('navAnalysis');
    const navProfile = document.getElementById('navProfile');
    const logoutBtn = document.getElementById('logoutBtn');
    const backBtn = document.getElementById('backBtn');

    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    if(navJobs) navJobs.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    if(navAnalysis) navAnalysis.addEventListener('click', () => window.location.href = 'analysis.html');
    if(navProfile) navProfile.addEventListener('click', () => window.location.href = CONFIG.PAGES.RECRUITER_PROFILE);
    
    // ✅ FIX: "Back to List" now explicitly passes status=all to bypass the Pending filter
    if(backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = `${CONFIG.PAGES.APPLICATION_LIST}?status=all`;
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await customAuth.signOut();
            window.location.href = CONFIG.PAGES.JOBS;
        });
    }
}

// --- CORE LOGIC ---
async function loadApplicationDetails(appId) {
    console.log('Loading application details for ID:', appId);
    try {
        // Use the enhanced endpoint that includes analysis data
        console.log('Fetching application details with analysis...');
        const response = await backendGet(`/recruiter/applications/${appId}`);
        const result = await handleResponse(response);
        
        console.log('Raw API response:', result);
        console.log('Application data:', result.data);
        
        const app = result.data || result;
        console.log('Application with analysis:', app);
        
        if (!app) {
            throw new Error(`Application with ID ${appId} not found`);
        }

        currentApplicationData = app;
        renderDetails(app);
        setupStatusUpdate(appId);

    } catch (err) {
        console.error("Load failed:", err);
        const state = document.getElementById('loadingState');
        if(state) state.innerHTML = `<p class="text-danger text-center w-100">Failed to load details. ${err.message}</p>`;
    }
}

function renderDetails(app) {
    console.log('renderDetails called with app:', app);
    console.log('Available fields:', Object.keys(app));
    
    const loadingState = document.getElementById('loadingState');
    const content = document.getElementById('detailsContent');
    if(loadingState) loadingState.style.display = 'none';
    if(content) content.style.display = 'block';

    // ✅ FIX: Sync the dropdown with the actual candidate status
    const statusSelect = document.getElementById('statusSelect');
    if (statusSelect) {
        let dbStatus = (app.status || 'pending').toLowerCase();
        console.log('Setting status to:', dbStatus);
        
        // Map all interview sub-statuses to the "interviewing" dropdown option
        if (['interview_submitted', 'responses ready', 'completed'].includes(dbStatus)) {
            dbStatus = 'interviewing';
        }
        
        // Ensure the status exists in the dropdown, otherwise fallback to pending
        const validOptions = ['pending', 'reviewed', 'interviewing', 'hired', 'rejected'];
        statusSelect.value = validOptions.includes(dbStatus) ? dbStatus : 'pending';
    }

    // Basic Info
    console.log('Setting candidate name:', app.candidate_name);
    console.log('Setting job title:', app.job_title);
    console.log('Setting candidate email:', app.candidate_email);
    console.log('Setting candidate phone:', app.candidate_phone);
    
    document.getElementById('candidateName').textContent = app.candidate_name || "Candidate";
    document.getElementById('jobTitle').textContent = app.job_title || "Unknown Job";
    document.getElementById('candidateEmail').textContent = app.candidate_email || "-";
    document.getElementById('candidatePhone').textContent = app.candidate_phone || "No phone available";
    document.getElementById('appliedDate').textContent = new Date(app.applied_at).toLocaleDateString();


    // RESUME EMBED LOGIC
    const viewer = document.getElementById('resumeViewer');
    const noResume = document.getElementById('noResumeState');
    const downloadBtn = document.getElementById('resumeDownloadBtn');

    if (app.resume_url) {
        const isGoogleViewer = !app.resume_url.endsWith('.pdf'); 
        const src = isGoogleViewer 
            ? `https://docs.google.com/gview?url=${encodeURIComponent(app.resume_url)}&embedded=true` 
            : app.resume_url;
        if(viewer) viewer.src = src;
        if(noResume) noResume.style.display = 'none';
        if(downloadBtn) {
            downloadBtn.href = app.resume_url;
            downloadBtn.style.display = 'inline-flex';
        }
    } else {
        if(viewer) viewer.style.display = 'none';
        if(noResume) noResume.style.display = 'flex';
    }

    // INTRO VIDEO SECTION
    const introVideoSection = document.getElementById('introVideoSection');
    const introVideoPlayer = document.getElementById('introVideoPlayer');
    const noIntroVideo = document.getElementById('noIntroVideo');
    
    if (introVideoSection) {
        if (app.intro_video_url) {
            introVideoSection.style.display = 'block';
            if(noIntroVideo) noIntroVideo.style.display = 'none';
            
            // Set video source directly
            if (introVideoPlayer) {
                introVideoPlayer.src = app.intro_video_url;
                introVideoPlayer.style.display = 'block';
                console.log('Loading intro video:', app.intro_video_url);
            }
        } else {
            introVideoSection.style.display = 'none';
            if(noIntroVideo) noIntroVideo.style.display = 'block';
        }
    }

    // NEW: INTERVIEW VIDEO RESPONSES SECTION
    const interviewVideosSection = document.getElementById('interviewVideosSection');
    const interviewVideosContainer = document.getElementById('interviewVideosContainer');
    const noInterviewVideos = document.getElementById('noInterviewVideos');
    const interviewVideoCount = document.getElementById('interviewVideoCount');
    
    console.log('DEBUG: Application data:', app);
    console.log('DEBUG: interview_responses:', app.interview_responses);
    console.log('DEBUG: interview_video_urls:', app.interview_video_urls);
    
    if (interviewVideosSection) {
        const responses = app.interview_responses || [];
        const videoUrls = app.interview_video_urls || [];
        
        // Update count in header
        if (interviewVideoCount) {
            interviewVideoCount.textContent = responses.length > 0 ? `(${responses.length})` : '';
        }
        
        if (responses.length > 0 || videoUrls.length > 0) {
            console.log(`Showing interview videos section with ${responses.length} responses`);
            interviewVideosSection.style.display = 'block';
            if(noInterviewVideos) noInterviewVideos.style.display = 'none';
            
            if (interviewVideosContainer) {
                // Build video player HTML for each response
                const videosHtml = responses.map((response, index) => `
                    <div style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                        <h6 style="margin: 0 0 1rem 0; color: #334155; font-size: 1rem; font-weight: 600;">
                            <span style="background: #4338ca; color: white; padding: 4px 12px; border-radius: 6px; margin-right: 10px; font-size: 0.85rem;">Q${index + 1}</span>
                            ${response.question || `Question ${index + 1}`}
                        </h6>
                        <video controls width="100%" style="max-height: 350px; border-radius: 8px; background: #000;" preload="metadata">
                            <source src="${response.video_url}" type="video/webm">
                            <source src="${response.video_url}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                        <div style="margin-top: 0.75rem; font-size: 0.85rem; color: #64748b; display: flex; gap: 1.5rem;">
                            ${response.duration ? `<span><i class="fas fa-clock me-1"></i> ${Math.round(response.duration / 60)}:${(response.duration % 60).toString().padStart(2, '0')}</span>` : ''}
                            ${response.created_at ? `<span><i class="fas fa-calendar me-1"></i> ${new Date(response.created_at).toLocaleString()}</span>` : ''}
                        </div>
                    </div>
                `).join('');
                
                interviewVideosContainer.innerHTML = videosHtml;
                console.log(`Loaded ${responses.length} interview videos for application ${app.id}`);
            }
        } else {
            // Hide section completely if no data exists
            interviewVideosSection.style.display = 'none';
        }
    }

    const skillsContainer = document.getElementById('skillsContainer');
    if (skillsContainer) {
        if (app.skills && app.skills.length > 0) {
            skillsContainer.innerHTML = app.skills.map(s => `<span class="skill-tag">${s}</span>`).join(' ');
        } else {
            skillsContainer.innerHTML = '<span class="text-muted">No specific skills listed.</span>';
        }
    }

    const linkedinGroup = document.getElementById('linkedinGroup');
    const linkedinLink = document.getElementById('linkedinLink');
    if (app.linkedin && linkedinGroup && linkedinLink) {
        linkedinGroup.style.display = 'block';
        linkedinLink.href = app.linkedin;
    }

    const coverLetter = document.getElementById('coverLetter');
    if (coverLetter) {
        coverLetter.textContent = app.cover_letter || "No cover letter provided.";
    }

    // NEW: VIDEO ANALYSIS SECTION
    renderVideoAnalysis(app.video_analysis, app.response_analyses, app.id, app.face_match_result);
}

// --- VIDEO ANALYSIS RENDERING ---
function renderVideoAnalysis(videoAnalysis, responseAnalyses, applicationId, faceMatchResult) {
    // Find or create analysis section
    let analysisSection = document.getElementById('videoAnalysisSection');
    if (!analysisSection) {
        // Create the analysis section after the intro video section, before interview responses
        const introVideoSection = document.getElementById('introVideoSection');
        const analysisHtml = `
            <div class="profile-section" id="videoAnalysisSection" style="display: none;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin: 0;"><i class="fas fa-brain"></i> AI Video Analysis</h3>
                    <div style="display: flex; gap: 0.5rem;">
                        <button id="reanalyzeBtn" class="btn btn-primary" style="background: #4338ca; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-sync-alt"></i> Re-Analyze
                        </button>
                        <button id="downloadPdfBtn" class="btn btn-primary" style="background: #059669; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-download"></i> Download Report
                        </button>
                    </div>
                </div>
                <div id="faceMatchSection"></div>
                <div id="analysisContent">
                    <!-- Analysis will be rendered here -->
                </div>
            </div>
        `;
        
        if (introVideoSection) {
            // Place analysis right after intro video
            introVideoSection.insertAdjacentHTML('afterend', analysisHtml);
        } else {
            // Fallback: add to the right column (second column of profile-grid)
            const rightColumn = document.querySelector('.profile-grid > div:last-child');
            if (rightColumn) {
                rightColumn.insertAdjacentHTML('beforeend', analysisHtml);
            }
        }
        analysisSection = document.getElementById('videoAnalysisSection');
        
        // Wire up download button click handler
        const downloadBtn = document.getElementById('downloadPdfBtn');
        if (downloadBtn && applicationId) {
            downloadBtn.onclick = (event) => downloadPDF(applicationId, event);
        }
        
        // Wire up reanalyze button click handler
        const reanalyzeBtn = document.getElementById('reanalyzeBtn');
        if (reanalyzeBtn && applicationId) {
            reanalyzeBtn.onclick = (event) => reanalyzeApplication(applicationId, event);
        }
    }

    if (!analysisSection) return;

    const analysisContent = document.getElementById('analysisContent');
    const faceMatchSection = document.getElementById('faceMatchSection');
    if (!analysisContent) return;

    // Render face match section first
    if (faceMatchSection && faceMatchResult) {
        const isMismatch = !faceMatchResult.overall_match;
        const avgSimilarity = faceMatchResult.avg_similarity || 0;
        const matchCount = faceMatchResult.match_count || 0;
        const mismatchCount = faceMatchResult.mismatch_count || 0;
        const note = faceMatchResult.note || "";
        const isTechnicalFailure = note.includes("No face detected") || note.includes("Face matching error");
        
        if (isMismatch) {
            // ANY face verification failure shows RED warning and NO analysis
            const isTechnical = isTechnicalFailure;
            const warningTitle = isTechnical ? "Face Verification Failed" : "Face Mismatch Detected";
            const warningDetail = isTechnical 
                ? (note.includes("No face detected") 
                    ? "No face detected in the intro video. Face verification is required." 
                    : "Face verification error: " + note)
                : "Different persons appear in intro video and interview responses";
            
            faceMatchSection.innerHTML = `
                <div style="margin-bottom: 1.5rem; padding: 1.5rem; background: #fef2f2; border-radius: 12px; border: 2px solid #dc2626;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1rem;">
                        <div style="width: 48px; height: 48px; background: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem; color: white;"></i>
                        </div>
                        <div>
                            <h4 style="margin: 0; color: #dc2626; font-size: 1.1rem;">${warningTitle}</h4>
                            <p style="margin: 4px 0 0 0; color: #7f1d1d; font-size: 0.875rem;">${warningDetail}</p>
                        </div>
                    </div>
                    ${!isTechnical ? `
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1rem;">
                        <div style="text-align: center; padding: 0.75rem; background: white; border-radius: 8px;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: #dc2626;">${avgSimilarity}%</div>
                            <div style="font-size: 0.75rem; color: #64748b;">Avg Similarity</div>
                        </div>
                        <div style="text-align: center; padding: 0.75rem; background: white; border-radius: 8px;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: #059669;">${matchCount}</div>
                            <div style="font-size: 0.75rem; color: #64748b;">Matched</div>
                        </div>
                        <div style="text-align: center; padding: 0.75rem; background: white; border-radius: 8px;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: #dc2626;">${mismatchCount}</div>
                            <div style="font-size: 0.75rem; color: #64748b;">Mismatched</div>
                        </div>
                    </div>
                    ` : ''}
                    <p style="margin: 1rem 0 0 0; color: #991b1b; font-size: 0.875rem;">
                        <i class="fas fa-info-circle me-1"></i>
                        <strong>Analysis Blocked:</strong> Detailed analysis withheld due to identity verification failure.
                    </p>
                </div>
            `;
            
            // HIDE analysis section - NO analysis shown for face verification failures
            if (analysisContent) {
                analysisContent.innerHTML = `
                    <div style="text-align: center; padding: 3rem; color: #64748b;">
                        <i class="fas fa-user-slash" style="font-size: 3rem; color: #dc2626; margin-bottom: 1rem;"></i>
                        <p style="font-size: 1.1rem; font-weight: 500; color: #374151;">Analysis Not Available</p>
                        <p style="font-size: 0.875rem;">Candidate identity could not be verified. Please check the intro video and try again.</p>
                    </div>
                `;
            }
            analysisSection.style.display = 'block';
            return; // STOP - don't render any analysis
        } else {
            // Show verified badge
            faceMatchSection.innerHTML = `
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f0fdf4; border-radius: 8px; border: 1px solid #059669; display: flex; align-items: center; gap: 12px;">
                    <div style="width: 32px; height: 32px; background: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-check" style="font-size: 1rem; color: white;"></i>
                    </div>
                    <div>
                        <span style="color: #059669; font-weight: 600;">Identity Verified</span>
                        <span style="color: #64748b; font-size: 0.875rem; margin-left: 8px;">Face match: ${avgSimilarity}% similarity across ${matchCount} videos</span>
                    </div>
                </div>
            `;
        }
    }

    // Show section if we have any analysis data
    if (videoAnalysis || (responseAnalyses && responseAnalyses.length > 0)) {
        analysisSection.style.display = 'block';
        
        let html = '';
        
        // Render intro video analysis
        if (videoAnalysis) {
            html += renderIntroVideoAnalysis(videoAnalysis);
        }
        
        // Render response analyses
        if (responseAnalyses && responseAnalyses.length > 0) {
            html += renderResponseAnalyses(responseAnalyses);
        }
        
        analysisContent.innerHTML = html;
    } else if (!faceMatchResult) {
        analysisSection.style.display = 'none';
    }
}

function renderIntroVideoAnalysis(analysis) {
    const summary = analysis.summary || {};
    const transcription = analysis.transcription || {};
    const visual = analysis.visual_analysis || {};
    const nlp = analysis.nlp_analysis || {};
    const comm = nlp.communication_skills || {};
    const grammar = nlp.grammar || {};
    const vocab = nlp.vocabulary || {};
    const sentences = nlp.sentence_formation || {};
    
    return `
        <div style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h6 style="margin: 0 0 1rem 0; color: #334155; font-size: 1rem; font-weight: 600;">
                <i class="fas fa-video text-primary me-2"></i> Intro Video Analysis
            </h6>
            
            <!-- Overall Score -->
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="font-weight: 600; color: #1e293b;">Overall Score</span>
                    <span style="font-size: 1.25rem; font-weight: bold; color: ${getScoreColor(summary.overall_score || 0)};">
                        ${summary.overall_score || 0}/100 <span style="font-size: 0.9rem;">(${scoreToGrade(summary.overall_score || 0).grade})</span>
                    </span>
                </div>
                <div style="background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
                    <div style="background: ${getScoreColor(summary.overall_score || 0)}; height: 100%; width: ${summary.overall_score || 0}%; transition: width 0.3s ease;"></div>
                </div>
            </div>
            
            <!-- Key Metrics Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="text-align: center; padding: 1rem; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #4338ca;">${summary.speaking_pace || 0}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">Words per Minute</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #059669;">${summary.face_presence || 0}%</div>
                    <div style="font-size: 0.85rem; color: #64748b;">Face Presence</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #7c3aed;">${summary.confidence_score || 0}%</div>
                    <div style="font-size: 0.85rem; color: #64748b;">Confidence</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #dc2626;">${summary.filler_words || 0}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">Filler Words</div>
                </div>
            </div>
            
            <!-- Communication Skills Section -->
            ${comm.score > 0 ? `
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border-radius: 8px; border: 1px solid #e0e7ff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <strong style="color: #1e40af;"><i class="fas fa-comments me-1"></i>Communication Skills</strong>
                        <span style="background: ${getScoreColor(comm.score)}; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold;">
                            ${comm.score}/100 (${scoreToGrade(comm.score).grade})
                        </span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 0.5rem;">
                        <div style="text-align: center; padding: 0.5rem; background: white; border-radius: 4px;">
                            <div style="font-weight: bold; color: ${getScoreColor(grammar.score || 0)};">${grammar.score || 0} <small>(${scoreToGrade(grammar.score || 0).grade})</small></div>
                            <small style="color: #64748b; font-size: 0.7rem;">Grammar</small>
                        </div>
                        <div style="text-align: center; padding: 0.5rem; background: white; border-radius: 4px;">
                            <div style="font-weight: bold; color: ${getScoreColor(sentences.score || 0)};">${sentences.score || 0} <small>(${scoreToGrade(sentences.score || 0).grade})</small></div>
                            <small style="color: #64748b; font-size: 0.7rem;">Sentences</small>
                        </div>
                        <div style="text-align: center; padding: 0.5rem; background: white; border-radius: 4px;">
                            <div style="font-weight: bold; color: ${getScoreColor(vocab.score || 0)};">${vocab.score || 0} <small>(${scoreToGrade(vocab.score || 0).grade})</small></div>
                            <small style="color: #64748b; font-size: 0.7rem;">Vocabulary</small>
                        </div>
                        <div style="text-align: center; padding: 0.5rem; background: white; border-radius: 4px;">
                            <div style="font-weight: bold; color: #7c3aed;">${comm.level || 'N/A'}</div>
                            <small style="color: #64748b; font-size: 0.7rem;">Level</small>
                        </div>
                    </div>
                    ${comm.strengths && comm.strengths.length > 0 ? `
                        <div style="margin-bottom: 0.25rem;">
                            <small style="color: #059669;"><i class="fas fa-check-circle me-1"></i><strong>Strengths:</strong> ${comm.strengths.join(', ')}</small>
                        </div>
                    ` : ''}
                    ${comm.areas_for_improvement && comm.areas_for_improvement.length > 0 ? `
                        <div>
                            <small style="color: #d97706;"><i class="fas fa-lightbulb me-1"></i><strong>Improve:</strong> ${comm.areas_for_improvement.join(', ')}</small>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- Transcription -->
            ${transcription.transcript ? `
                <div style="margin-bottom: 1.5rem;">
                    <h6 style="margin: 0 0 0.75rem 0; color: #334155; font-size: 0.9rem; font-weight: 600;">
                        <i class="fas fa-closed-captioning me-1"></i> Transcription
                    </h6>
                    <div style="padding: 1rem; background: white; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.9rem; line-height: 1.6; max-height: 200px; overflow-y: auto;">
                        ${transcription.transcript}
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #64748b;">
                        ${transcription.word_count || 0} words • ${Math.round((transcription.duration_seconds || 0) / 60)}:${((transcription.duration_seconds || 0) % 60).toString().padStart(2, '0')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Emotion Analysis -->
            ${visual.emotion_distribution && Object.keys(visual.emotion_distribution).length > 0 ? `
                <div>
                    <h6 style="margin: 0 0 0.75rem 0; color: #334155; font-size: 0.9rem; font-weight: 600;">
                        <i class="fas fa-smile me-1"></i> Emotion Analysis
                    </h6>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem;">
                        ${Object.entries(visual.emotion_distribution).map(([emotion, percentage]) => `
                            <div style="text-align: center; padding: 0.5rem; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                                <div style="font-size: 0.8rem; font-weight: 600; color: #334155;">${emotion}</div>
                                <div style="font-size: 0.9rem; color: ${getEmotionColor(emotion)};">${percentage}%</div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #64748b;">
                        Dominant: <strong>${visual.dominant_emotion || 'unknown'}</strong>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function renderResponseAnalyses(responseAnalyses) {
    return `
        <div style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h6 style="margin: 0 0 1rem 0; color: #334155; font-size: 1rem; font-weight: 600;">
                <i class="fas fa-comments text-primary me-2"></i> Interview Response Analyses
            </h6>
            
            ${responseAnalyses.map((ra, index) => {
                if (!ra.analysis) return '';
                
                const summary = ra.analysis.summary || {};
                const transcription = ra.analysis.transcription || {};
                
                return `
                    <div style="margin-bottom: 1.5rem; padding: 1rem; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <h6 style="margin: 0 0 0.75rem 0; color: #334155; font-size: 0.9rem; font-weight: 600;">
                            <span style="background: #4338ca; color: white; padding: 2px 8px; border-radius: 4px; margin-right: 8px; font-size: 0.75rem;">Q${ra.question_index + 1}</span>
                            ${ra.question || `Question ${ra.question_index + 1}`}
                        </h6>
                        
                        <!-- Response Score -->
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                                    <span style="font-size: 0.85rem; font-weight: 600; color: #1e293b;">Score</span>
                                    <span style="font-weight: bold; color: ${getScoreColor(summary.overall_score || 0)};">
                                        ${summary.overall_score || 0}/100 (${scoreToGrade(summary.overall_score || 0).grade})
                                    </span>
                                </div>
                                <div style="background: #e2e8f0; border-radius: 4px; height: 6px; overflow: hidden;">
                                    <div style="background: ${getScoreColor(summary.overall_score || 0)}; height: 100%; width: ${summary.overall_score || 0}%;"></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Key Metrics -->
                        <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem; font-size: 0.8rem;">
                            <span><i class="fas fa-tachometer-alt me-1"></i> ${summary.speaking_pace || 0} WPM</span>
                            <span><i class="fas fa-user me-1"></i> ${summary.face_presence || 0}% face</span>
                            <span><i class="fas fa-brain me-1"></i> ${summary.confidence_score || 0}% confidence</span>
                        </div>
                        
                        <!-- Transcription snippet -->
                        ${transcription.transcript ? `
                            <div style="padding: 0.75rem; background: #f8fafc; border-radius: 6px; font-size: 0.85rem; line-height: 1.5; color: #475569;">
                                "${transcription.transcript.length > 150 ? transcription.transcript.substring(0, 150) + '...' : transcription.transcript}"
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Shared grade calculation - single source of truth
// Matches backend/utils/grading.py GradeCalculator
function scoreToGrade(score) {
    score = Math.max(0, Math.min(100, Math.round(score)));
    if (score >= 90) return { grade: 'A+', label: 'Exceptional', color: '#059669' };
    if (score >= 80) return { grade: 'A', label: 'Excellent', color: '#10b981' };
    if (score >= 70) return { grade: 'B+', label: 'Very Good', color: '#22c55e' };
    if (score >= 60) return { grade: 'B', label: 'Good', color: '#84cc16' };
    if (score >= 50) return { grade: 'C', label: 'Average', color: '#eab308' };
    if (score >= 40) return { grade: 'D', label: 'Below Average', color: '#f97316' };
    return { grade: 'F', label: 'Poor', color: '#dc2626' };
}

function getScoreColor(score) {
    return scoreToGrade(score).color;
}

function getEmotionColor(emotion) {
    const colors = {
        'happy': '#10b981',
        'neutral': '#6b7280',
        'sad': '#3b82f6',
        'angry': '#ef4444',
        'fear': '#8b5cf6',
        'surprise': '#f59e0b',
        'disgust': '#84cc16'
    };
    return colors[emotion.toLowerCase()] || '#6b7280';
}

// --- STATUS UPDATE & MODAL WIRING ---
function setupStatusUpdate(appId) {
    console.log('DEBUG: Setting up status update for appId:', appId);
    const updateBtn = document.getElementById('updateStatusBtn');
    const statusDropdown = document.getElementById('statusSelect');
    
    console.log('DEBUG: updateBtn found:', !!updateBtn);
    console.log('DEBUG: statusSelect found:', !!statusDropdown);
    
    if(!updateBtn || !statusDropdown) {
        console.log('DEBUG: Missing elements, skipping setup');
        return;
    }

    updateBtn.addEventListener('click', async () => {
        console.log('DEBUG: Update button clicked!');
        const newStatus = statusDropdown.value;
        console.log('DEBUG: Selected status:', newStatus);
        if (newStatus === 'interviewing') {
            openInterviewModal((questionsArray) => {
                performStatusUpdate(appId, newStatus, questionsArray);
            });
        } else if (newStatus === 'rejected') {
            openRejectionModal((rejectionReason) => {
                performStatusUpdate(appId, newStatus, [], rejectionReason);
            });
        } else {
            openCommentModal(newStatus, (comment) => {
                performStatusUpdate(appId, newStatus, [], comment);
            });
        }
    });
}

console.log('DEBUG: Status update event listener attached');

async function performStatusUpdate(appId, newStatus, questions, rejectionReason = null, comment = null) {
    const btn = document.getElementById('updateStatusBtn');
    if(!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const payload = { status: newStatus, questions: questions };
    if (rejectionReason) {
        payload.rejection_reason = rejectionReason;
    }
    if (comment) {
        payload.comment = comment;
    }
    console.log('DEBUG: Sending status update request:', payload);
    console.log('DEBUG: Application ID:', appId);

    try {
        console.log('DEBUG: About to send PUT request to:', `${CONFIG.API_BASE}/recruiter/applications/${appId}/status`);
        console.log('DEBUG: Payload:', payload);
        
        // Debug: Check what tokens are available and how backendGet works
        console.log('DEBUG: Available tokens:');
        console.log('  - customAuth.token:', localStorage.getItem('customAuth.token'));
        console.log('  - token:', localStorage.getItem('token'));
        console.log('  - auth_token:', localStorage.getItem('auth_token'));
        
        // Debug: Let's see what's in the session
        console.log('DEBUG: Session data:', await customAuth.getSession());
        
        // Use backendPut instead of manual fetch - it should handle auth properly
        const response = await backendPut(`/recruiter/applications/${appId}/status`, payload);
        console.log('DEBUG: Status update response:', response);
        console.log('DEBUG: Response status:', response.status);
        console.log('DEBUG: Response ok:', response.ok);

        if (response.ok) {
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.style.backgroundColor = "#10b981";
            
            // Update local data immediately before reload
            if (currentApplicationData) {
                currentApplicationData.status = newStatus;
            }
            
            setTimeout(() => location.reload(), 1000);
        } else {
            // Try to get error details from the response
            let errorDetails = 'Failed to update status';
            try {
                const errorData = await response.json();
                errorDetails = errorData.detail || errorData.message || errorData.error || 'Failed to update status';
                console.log('DEBUG: Backend error details:', errorData);
            } catch (e) {
                console.log('DEBUG: Could not parse error response:', e);
            }
            throw new Error(errorDetails);
        }
        
    } catch (err) {
        console.error("DEBUG: Update failed:", err);
        console.error("DEBUG: Full error details:", err.message);
        console.error("DEBUG: Error stack:", err.stack);
        alert(`Failed to update status: ${err.message}`);
        btn.disabled = false;
        btn.textContent = "Update Status";
    }
}

// --- SHARED MODAL LOGIC ---
function openInterviewModal(onConfirmCallback) {
    const modal = document.getElementById('interviewModal');
    const container = document.getElementById('modalQuestionsContainer');
    const addBtn = document.getElementById('addQuestionBtn');
    const confirmBtn = document.getElementById('confirmInterviewBtn');

    if(!modal) return;

    // Set specific title for interview modal
    const modalTitle = modal.querySelector('h3');
    if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-video text-primary me-2"></i> Interview Questions';

    container.innerHTML = `
        <input type="text" class="form-control mb-3 interview-q-input" placeholder="1. e.g. Tell me about yourself." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
        <input type="text" class="form-control mb-3 interview-q-input" placeholder="2. e.g. Walk me through your resume." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
    `;

    addBtn.onclick = () => {
        const count = container.querySelectorAll('.interview-q-input').length + 1;
        container.insertAdjacentHTML('beforeend', `
            <input type="text" class="form-control mb-3 interview-q-input" placeholder="${count}. Next question..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
        `);
    };

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.textContent = 'Send to Candidate';

    newConfirmBtn.onclick = () => {
        const inputs = document.querySelectorAll('.interview-q-input');
        const questions = Array.from(inputs).map(i => i.value.trim()).filter(v => v !== '');
        
        if(questions.length === 0) { 
            alert("Please enter at least one question."); 
            return; 
        }

        onConfirmCallback(questions);
        modal.classList.remove('active');
    };

    modal.classList.add('active');
}

function openRejectionModal(onConfirmCallback) {
    const modal = document.getElementById('interviewModal');
    const container = document.getElementById('modalQuestionsContainer');
    const addBtn = document.getElementById('addQuestionBtn');
    const confirmBtn = document.getElementById('confirmInterviewBtn');

    if(!modal) return;

    // Change modal title and content for rejection
    const modalTitle = modal.querySelector('h3');
    if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-times-circle text-danger me-2"></i> Rejection Reason';
    
    container.innerHTML = `
        <textarea class="form-control mb-3 rejection-reason-input" placeholder="Please provide a reason for rejection (optional)..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; min-height: 100px; resize: vertical;"></textarea>
    `;

    // Hide add button since we don't need it for rejection
    if (addBtn) addBtn.style.display = 'none';

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.textContent = 'Save';

    newConfirmBtn.onclick = () => {
        const textarea = container.querySelector('.rejection-reason-input');
        const rejectionReason = textarea ? textarea.value.trim() : '';
        
        onConfirmCallback(rejectionReason);
        modal.classList.remove('active');
        
        // Reset modal for next use
        if (addBtn) addBtn.style.display = 'block';
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-video text-primary me-2"></i> Set Interview Questions';
        if (confirmBtn) confirmBtn.textContent = 'Save & Request Interview';
    };

    modal.classList.add('active');
}

function openCommentModal(status, onConfirmCallback) {
    const modal = document.getElementById('interviewModal');
    const container = document.getElementById('modalQuestionsContainer');
    const addBtn = document.getElementById('addQuestionBtn');
    const confirmBtn = document.getElementById('confirmInterviewBtn');

    if(!modal) return;

    // Change modal title and content for status comment
    const modalTitle = modal.querySelector('h3');
    if (modalTitle) {
        const statusCapitalized = status.charAt(0).toUpperCase() + status.slice(1);
        let icon = '';
        switch(status) {
            case 'pending':
                icon = '<i class="fas fa-clock text-warning me-2"></i>';
                break;
            case 'reviewed':
                icon = '<i class="fas fa-eye text-info me-2"></i>';
                break;
            case 'hired':
                icon = '<i class="fas fa-check-circle text-success me-2"></i>';
                break;
            default:
                icon = '<i class="fas fa-comment text-secondary me-2"></i>';
        }
        modalTitle.innerHTML = `${icon} ${statusCapitalized} - Add Comment`;
    }
    
    // Get placeholder text based on status
    let placeholder = '';
    switch(status) {
        case 'pending':
            placeholder = 'Add any notes about why this application is pending...';
            break;
        case 'reviewed':
            placeholder = 'Add review notes or feedback...';
            break;
        case 'hired':
            placeholder = 'Add onboarding details or welcome notes...';
            break;
        default:
            placeholder = 'Add any additional comments...';
    }
    
    container.innerHTML = `
        <textarea class="form-control mb-3 status-comment-input" placeholder="${placeholder} (optional)..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; min-height: 100px; resize: vertical;"></textarea>
    `;

    // Hide add button since we don't need it for comments
    if (addBtn) addBtn.style.display = 'none';

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.textContent = 'Save';

    newConfirmBtn.onclick = () => {
        const textarea = container.querySelector('.status-comment-input');
        const comment = textarea ? textarea.value.trim() : '';
        
        onConfirmCallback(comment);
        modal.classList.remove('active');
        
        // Reset modal for next use
        if (addBtn) addBtn.style.display = 'block';
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-video text-primary me-2"></i> Set Interview Questions';
        if (confirmBtn) confirmBtn.textContent = 'Save & Request Interview';
    };

    modal.classList.add('active');
}
// --- PDF DOWNLOAD FUNCTION ---
window.downloadPDF = async function(applicationId, event) {
    try {
        const session = await customAuth.getSession();
        const token = session?.data?.session?.access_token;
        
        if (!token) {
            alert('Please log in to download reports.');
            return;
        }
        
        // Show loading state
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        btn.disabled = true;
        
        const response = await fetch(`${CONFIG.API_BASE}/analytics/download-report/${applicationId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to generate report (${response.status})`);
        }
        
        // Get the PDF blob
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'analysis_report.pdf';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch) filename = filenameMatch[1];
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Reset button
        btn.innerHTML = originalText;
        btn.disabled = false;
        
    } catch (err) {
        console.error('PDF download failed:', err);
        alert(`Failed to download PDF: ${err.message}`);
        
        // Reset button on error
        const btn = event.target.closest('button');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-download"></i> Download Report';
            btn.disabled = false;
        }
    }
};

// Re-analyze Application (force fresh analysis)
window.reanalyzeApplication = async function(applicationId, event) {
    try {
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        
        // Show immediate feedback
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
        btn.disabled = true;
        
        // Show immediate toast notification
        showToast('Starting re-analysis... This may take a few minutes.', 'info');
        
        const response = await backendPost(`/analytics/reanalyze/${applicationId}`, null, { timeout: 0 });
        const result = await handleResponse(response);
        
        if (result.ok) {
            btn.innerHTML = '<i class="fas fa-check"></i> Analysis Started';
            btn.style.background = '#059669';
            
            // Show success notification
            showToast('Re-analysis started! Page will refresh when complete.', 'success');
            
            // Reload page after a delay to show updated analysis
            setTimeout(() => {
                location.reload();
            }, 5000);
        } else {
            throw new Error(result.detail || 'Failed to start re-analysis');
        }
        
    } catch (error) {
        console.error('Re-analysis failed:', error);
        showToast('Failed to start re-analysis: ' + error.message, 'error');
        
        const btn = event.target.closest('button');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Re-Analyze';
            btn.disabled = false;
            btn.style.background = '#4338ca';
        }
    }
};

// Toast notification helper
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.getElementById('analysisToast');
    if (existingToast) existingToast.remove();
    
    // Add animation styles if not already present
    if (!document.getElementById('toastAnimations')) {
        const style = document.createElement('style');
        style.id = 'toastAnimations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    const colors = {
        info: '#3b82f6',
        success: '#059669',
        error: '#dc2626',
        warning: '#f59e0b'
    };
    
    const toast = document.createElement('div');
    toast.id = 'analysisToast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>${message}`;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}
