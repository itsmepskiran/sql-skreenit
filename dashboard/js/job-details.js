import { customAuth } from '@shared/js/auth-config.js';;
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';

const urlParams = new URLSearchParams(window.location.search);
const jobId = urlParams.get('job_id');

// Intro Video Modal Elements
let introVideoModal, useExistingVideoBtn, recordNewVideoBtn, skipVideoBtn, closeVideoModalBtn;
let existingVideoInfo, videoActionButtons, videoUploadProgress, videoProgressBar, videoProgressText;
let existingVideoUrl = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
    const { data: { session } } = await customAuth.getSession();
    if (!session?.user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }

    const user = session.user;
    const role = (user.user_metadata?.role || '').toLowerCase();
    const isRecruiter = role === 'recruiter';

    // 1. Initial Sidebar & Nav Setup
    updateSidebarProfile(user, role);
    setupNavigation(role);

    // 2. Fetch Backend Profile for Recruiter (To get Company ID)
    if (isRecruiter) {
        fetchRecruiterProfile();
    }

    // 3. Ensure we have a Job ID
    if (!jobId || jobId === "null" || jobId === "undefined") { 
        window.location.href = isRecruiter ? CONFIG.PAGES.DASHBOARD_RECRUITER : CONFIG.PAGES.CANDIDATE_DASHBOARD; 
        return; 
    }

    // 4. Fetch Job Data (Using public endpoint accessible to both roles)
    try {
        const endpoint = isRecruiter ? `/recruiter/jobs/${jobId}` : `/dashboard/jobs/${jobId}`;
        const res = await backendGet(endpoint);
        const json = await handleResponse(res);
        const jobData = json.data || json;
        
        if (!jobData) throw new Error("No job data returned");

        renderJob(jobData);

        // 5. UI Polishing: Toggle Action Buttons based on Role
        const applyBtn = document.getElementById('applyBtn');
        const quickApplyBtn = document.getElementById('quickApplyBtn');

        if (isRecruiter) {
            // Hide Apply buttons for recruiters viewing their own jobs
            if(applyBtn) applyBtn.style.display = 'none';
            if(quickApplyBtn) quickApplyBtn.style.display = 'none';
        } else {
            // Show Apply buttons for candidates
            if(applyBtn) applyBtn.style.display = 'block';
            if(quickApplyBtn) quickApplyBtn.style.display = 'block';
            checkApplicationStatus();
        }

    } catch (err) {
        console.error("Job load error:", err);
        document.querySelector(".dashboard-content").innerHTML = `
            <div class="card w-100 text-center py-5 mt-4">
                <div class="card-body">
                    <i class="fas fa-exclamation-triangle text-danger" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3 class="text-dark fw-bold">Job Not Found</h3>
                    <p class="text-muted">Could not load job details. (ID: ${jobId})</p>
                    <button onclick="window.location.href='${isRecruiter ? CONFIG.PAGES.DASHBOARD_RECRUITER : CONFIG.PAGES.CANDIDATE_DASHBOARD}'" class="btn btn-primary px-4 py-2">Return to Dashboard</button>
                </div>
            </div>`;
    }
}

// Fetches exact Recruiter Profile to fill in missing Sidebar gaps (like Company ID)
async function fetchRecruiterProfile() {
    try {
        const res = await backendGet('/recruiter/profile');
        const data = await handleResponse(res);
        const profile = data.data || data;

        if (profile) {
            const recName = document.getElementById('recruiterName');
            if (recName && profile.contact_name) recName.textContent = profile.contact_name;

            const companyIdEl = document.getElementById('companyId');
            if (companyIdEl && (profile.company_id || profile.company_name)) {
                companyIdEl.textContent = profile.company_id || profile.company_name;
            }
        }
    } catch (err) {
        console.warn("Could not load recruiter profile for sidebar:", err);
        const companyIdEl = document.getElementById('companyId');
        if (companyIdEl) companyIdEl.textContent = "---";
    }
}

async function checkApplicationStatus() {
    try {
        const statusRes = await backendGet(`/applicant/check-status?job_id=${jobId}`);
        const statusJson = await handleResponse(statusRes);
        if (statusJson.applied) {
            markAsApplied();
        } else {
            setupApplyButtons();
        }
    } catch(e) { 
        setupApplyButtons();
    }
}

function setupApplyButtons() {
    const applyBtn = document.getElementById("applyBtn");
    const quickApplyBtn = document.getElementById("quickApplyBtn");
    
    // Initialize modal elements
    introVideoModal = document.getElementById('introVideoModal');
    useExistingVideoBtn = document.getElementById('useExistingVideoBtn');
    recordNewVideoBtn = document.getElementById('recordNewVideoBtn');
    skipVideoBtn = document.getElementById('skipVideoBtn');
    closeVideoModalBtn = document.getElementById('closeVideoModalBtn');
    existingVideoInfo = document.getElementById('existingVideoInfo');
    videoActionButtons = document.getElementById('videoActionButtons');
    videoUploadProgress = document.getElementById('videoUploadProgress');
    videoProgressBar = document.getElementById('videoProgressBar');
    videoProgressText = document.getElementById('videoProgressText');
    
    // Setup event listeners
    if(useExistingVideoBtn) useExistingVideoBtn.addEventListener('click', submitApplicationWithVideo);
    if(recordNewVideoBtn) recordNewVideoBtn.addEventListener('click', redirectToRecordVideo);
    if(skipVideoBtn) skipVideoBtn.addEventListener('click', submitApplicationWithVideo);
    if(closeVideoModalBtn) closeVideoModalBtn.addEventListener('click', closeIntroVideoModal);
    if(introVideoModal) {
        introVideoModal.addEventListener('click', (e) => {
            if (e.target === introVideoModal) closeIntroVideoModal();
        });
    }
    
    // Apply button handlers
    if(applyBtn) applyBtn.onclick = () => showIntroVideoModal();
    if(quickApplyBtn) quickApplyBtn.onclick = () => showIntroVideoModal();
}

/**
 * Show intro video modal and check for existing video
 */
async function showIntroVideoModal() {
    if (!introVideoModal) return;
    
    // Reset modal state
    existingVideoInfo.style.display = 'none';
    videoActionButtons.style.display = 'flex';
    videoUploadProgress.style.display = 'none';
    existingVideoUrl = null;
    
    // Check if user has an existing intro video
    try {
        const { data: { session } } = await customAuth.getSession();
        const { data: profile } = await supabase
            .from('candidate_profiles')
            .select('intro_video_url')
            .eq('user_id', session.user.id)
            .single();
        
        if (profile?.intro_video_url) {
            existingVideoUrl = profile.intro_video_url;
            useExistingVideoBtn.style.display = 'block';
            existingVideoInfo.style.display = 'block';
        } else {
            useExistingVideoBtn.style.display = 'none';
            existingVideoInfo.style.display = 'none';
        }
    } catch (err) {
        console.warn('Could not fetch existing video:', err);
        useExistingVideoBtn.style.display = 'none';
    }
    
    introVideoModal.style.display = 'flex';
    introVideoModal.classList.add('active');
}

/**
 * Close intro video modal
 */
function closeIntroVideoModal() {
    if (introVideoModal) {
        introVideoModal.style.display = 'none';
        introVideoModal.classList.remove('active');
    }
}

/**
 * Redirect to profile page to record new video
 */
function redirectToRecordVideo() {
    // Store job_id in sessionStorage to redirect back after recording
    sessionStorage.setItem('pendingJobApplication', jobId);
    window.location.href = CONFIG.PAGES.CANDIDATE_PROFILE;
}

/**
 * Submit application with video
 */
async function submitApplicationWithVideo() {
    if (!jobId) return;
    
    videoUploadProgress.style.display = 'block';
    videoActionButtons.style.display = 'none';
    updateVideoProgress(50, 'Submitting application...');
    
    try {
        const { data: { session } } = await customAuth.getSession();
        
        // TODO: Replace with backendPost("/api/v1/job_applications", data) call{
                job_id: jobId,
                candidate_id: session.user.id,
                status: 'submitted',
                intro_video_url: existingVideoUrl || null
            })
            .select()
            .single();
        
        if (error) {
            if (error.message?.includes('duplicate')) {
                alert('You have already applied for this job!');
            } else {
                throw error;
            }
        } else {
            updateVideoProgress(100, 'Application submitted!');
            markAsApplied();
            setTimeout(() => {
                closeIntroVideoModal();
            }, 500);
        }
        
    } catch (err) {
        console.error('Application submission failed:', err);
        alert('Failed to submit application. Please try again.');
        videoUploadProgress.style.display = 'none';
        videoActionButtons.style.display = 'flex';
    }
}

/**
 * Update video upload progress UI
 */
function updateVideoProgress(percent, text) {
    if(videoProgressBar) videoProgressBar.style.width = percent + '%';
    if(videoProgressText) videoProgressText.textContent = text || `Processing... ${percent}%`;
}

function markAsApplied() {
    const applyBtn = document.getElementById("applyBtn");
    if(applyBtn) {
        applyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Already Applied';
        applyBtn.disabled = true;
        applyBtn.classList.add('btn-secondary');
        applyBtn.classList.remove('btn-apply-massive');
    }
    const quickApplyBtn = document.getElementById('quickApplyBtn');
    if(quickApplyBtn) quickApplyBtn.style.display = 'none';
}

function renderJob(job) {
    // Add fallback for recruiter company name if available in their metadata
    const recruiterComp = document.getElementById('companyId')?.textContent;
    const displayCompany = job.company_name || job.company || (recruiterComp !== "---" ? recruiterComp : "Hiring Company");

    setText("jobTitle", job.title || job.job_title);
    setText("companyName", displayCompany); //
    setText("jobLocation", job.location || 'Remote');
    setText("jobType", job.job_type || 'Full Time');
    setText("postedDate", job.created_at ? new Date(job.created_at).toLocaleDateString() : '-');
    setText("salaryRange", job.salary || job.salary_range || "Not Specified");   
    const desc = document.getElementById("jobDescription");
    if(desc) desc.innerHTML = (job.description || "No description provided.").replace(/\n/g, "<br>");
    
    const req = document.getElementById("jobRequirements");
    if(req) req.innerHTML = (job.requirements || "No requirements listed.").replace(/\n/g, "<br>");
}

function updateSidebarProfile(user, role) {
    const isRecruiter = role === 'recruiter';
    
    // Sidebar Elements
    const recName = document.getElementById('recruiterName');
    const candName = document.getElementById('userName');
    const companyIdEl = document.getElementById('companyId');
    const userDesig = document.getElementById('userDesignation');
    const navJobs = document.getElementById('navJobs');

    if (isRecruiter) {
        // Toggle Recruiter blocks ON, Candidate blocks OFF
        if(recName) {
            recName.style.display = 'block'; 
            recName.textContent = user.user_metadata.full_name || user.user_metadata.contact_name || user.email.split('@')[0];
        }
        if(candName) candName.style.display = 'none';
        if(companyIdEl) companyIdEl.style.display = 'block';
        if(userDesig) userDesig.style.display = 'none';
        if(navJobs) navJobs.style.display = 'block';
    } else {
        // Toggle Candidate blocks ON, Recruiter blocks OFF
        if(candName) {
            candName.style.display = 'block'; 
            candName.textContent = user.user_metadata.full_name || user.email.split('@')[0];
        }
        if(recName) recName.style.display = 'none';
        if(companyIdEl) companyIdEl.style.display = 'none';
        if(userDesig) userDesig.style.display = 'block';
        if(navJobs) navJobs.style.display = 'none';
    }

    // Avatar Logic
    const avatarEl = document.getElementById("userAvatar");
    if (avatarEl) {
        if (user.user_metadata.avatar_url) {
            avatarEl.innerHTML = `<img src="${user.user_metadata.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
        } else {
            const initials = (user.user_metadata.full_name || user.user_metadata.contact_name || user.email).match(/\b\w/g) || [];
            avatarEl.innerHTML = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
        }
    }
}

function setupNavigation(role) {
    const isRecruiter = role === 'recruiter';
    
    document.getElementById("navDashboard").onclick = () => 
        window.location.href = isRecruiter ? CONFIG.PAGES.DASHBOARD_RECRUITER : CONFIG.PAGES.CANDIDATE_DASHBOARD;
    
    document.getElementById("navProfile").onclick = () => 
        window.location.href = isRecruiter ? CONFIG.PAGES.RECRUITER_PROFILE : CONFIG.PAGES.CANDIDATE_PROFILE;
    
    document.getElementById("navApplications").onclick = () => 
        window.location.href = isRecruiter ? CONFIG.PAGES.APPLICATION_LIST : CONFIG.PAGES.MY_APPLICATIONS;

    if (isRecruiter) {
        const navJobs = document.getElementById("navJobs");
        if(navJobs) navJobs.onclick = () => window.location.href = CONFIG.PAGES.MY_JOBS;
    }

    const backBtn = document.getElementById("backBtn");
    if(backBtn) backBtn.onclick = () => window.location.href = CONFIG.PAGES.MY_JOBS;

    const logoutBtn = document.getElementById("logoutBtn");
    if(logoutBtn) logoutBtn.onclick = async () => {
        await customAuth.signOut();
        window.location.href = CONFIG.PAGES.LOGIN;
    };
}

function setText(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = val || "";
}