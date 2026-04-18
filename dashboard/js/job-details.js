import { customAuth } from '@shared/js/auth-config.js';
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import { sidebarManager } from '@shared/js/profile-checker.js';
import '@shared/js/mobile.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

// Global state for current user
let currentUser = null;

// Intro Video Modal Elements
let introVideoModal, useExistingVideoBtn, recordNewVideoBtn, skipVideoBtn, closeVideoModalBtn;
let existingVideoInfo, videoActionButtons, videoUploadProgress, videoProgressBar, videoProgressText;
let existingVideoUrl = null;

// Video Recording Modal Elements and State
let videoRecordingModal, startRecordBtn, stopRecordBtn, retakeRecordBtn, acceptRecordBtn, closeRecordModalBtn;
let recordCameraFeed, recordPlaybackFeed, recordRecordingIndicator, recordTimerDisplay;
let recordRecordingControls, recordStopControls, recordReviewControls, recordUploadProgress, recordProgressBar, recordProgressText;
let recordVideoStream = null;
let recordVideoRecorder = null;
let recordVideoChunks = [];
let recordVideoBlob = null;
let recordRecordingSeconds = 0;
let recordTimerInterval = null;

// Get job_id from URL (global so all functions can access it)
function getJobId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('job_id');
}

document.addEventListener("DOMContentLoaded", init);

// Retry session retrieval with delay - needed after login redirect
async function getUserWithRetry(maxRetries = 15, delay = 400) {
    // Log cookie state
    // console.log('[DEBUG] All cookies:', document.cookie);
    // console.log('[DEBUG] Hostname:', window.location.hostname);
    
    // Initial delay to let auth system initialize after redirect
    await new Promise(resolve => setTimeout(resolve, 500));
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const user = await customAuth.getUserData();
            // console.log(`[DEBUG] Retry ${i + 1}: user =`, user);
            if (user) {
                // console.log('[DEBUG] User found on retry', i + 1);
                return user;
            }
        } catch (err) {
            // console.warn(`[DEBUG] getUserData error on retry ${i + 1}:`, err.message);
        }
        
        // Log cookies on each retry
        // console.log(`[DEBUG] Retry ${i + 1}: cookies =`, document.cookie.substring(0, 100));
        
        if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    // console.warn('[DEBUG] User not found after all retries');
    return null;
}

async function init() {
    try {
        // Check authentication - allow public access for viewing jobs
        const user = await getUserWithRetry();
        currentUser = user;
        
        // Get role from multiple possible sources
        const role = (user?.user_metadata?.role || user?.role || user?.app_metadata?.role || '').toLowerCase();
        const isRecruiter = role === 'recruiter';

        // 1. Initial Sidebar & Nav Setup (only for authenticated users)
        if (user) {
            await sidebarManager.initSidebar();
            // Initialize mobile menu after sidebar is ready
            if (window.initMobileMenu) window.initMobileMenu();
            // Setup navigation AFTER mobile menu is initialized
            setupNavigation(role, isRecruiter);
        } else {
            // For unauthenticated users - hide sidebar elements that require auth
            // Initialize mobile menu for public view
            if (window.initMobileMenu) window.initMobileMenu();
            // Setup public navigation AFTER mobile menu is initialized
            setupPublicNavigation();
        }

        // 2. Fetch Backend Profile for Recruiter (To get Company ID) - only if authenticated
        if (isRecruiter && user) {
            await fetchRecruiterProfile(); // Wait for profile to load
        }

        // 3. Ensure we have a Job ID
        const jobId = getJobId();
        if (!jobId || jobId === "null" || jobId === "undefined") { 
            // Redirect based on auth status
            if (isRecruiter) {
                window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER; 
            } else if (user) {
                window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE; 
            } else {
                // Public user - redirect to jobs listing
                window.location.href = CONFIG.PAGES.JOBS;
            }
            return; 
        }

        // 4. Fetch Job Data (Using public endpoint that doesn't require auth)
        try {
            const endpoint = isRecruiter && user ? `/recruiter/jobs/${jobId}` : `/dashboard/jobs/${jobId}`;
            console.log('Fetching from endpoint:', endpoint);
            const res = await backendGet(endpoint);
            const json = await handleResponse(res);
            console.log('API Response:', JSON.stringify(json, null, 2));
            const jobData = json.data || json;
            console.log('jobData:', jobData);
            
            if (!jobData) throw new Error("No job data returned");

            await renderJob(jobData);

            // 5. UI Polishing: Toggle Action Buttons based on Auth & Role
            const applyBtn = document.getElementById('applyBtn');
            const quickApplyBtn = document.getElementById('quickApplyBtn');

            if (isRecruiter && user) {
                // Hide Apply buttons for recruiters viewing their own jobs
                if(applyBtn) applyBtn.style.display = 'none';
                if(quickApplyBtn) quickApplyBtn.style.display = 'none';
            } else if (user) {
                // Show Apply buttons for authenticated candidates
                if(applyBtn) applyBtn.style.display = 'inline-flex';
                if(quickApplyBtn) quickApplyBtn.style.display = 'inline-block';
                checkApplicationStatus();
            } else {
                // For unauthenticated users - show "Sign in to Apply" button
                setupPublicApplyButtons();
            }

        } catch (err) {
            // console.error("Job load error:", err);
            document.querySelector(".dashboard-content").innerHTML = `
                <div class="card w-100 text-center py-5 mt-4">
                    <div class="card-body">
                        <i class="fas fa-exclamation-triangle text-danger" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <h3 class="text-dark fw-bold">Job Not Found</h3>
                        <p class="text-muted">Could not load job details. (ID: ${jobId})</p>
                        <button onclick="window.location.href='${CONFIG.PAGES.JOBS}'" class="btn btn-primary px-4 py-2">Browse All Jobs</button>
                    </div>
                </div>`;
        }
    } catch (authErr) {
        // console.error("Auth error:", authErr);
        // On auth error, still allow public viewing - just don't crash
        const jobId = getJobId();
        if (jobId) {
            // Try to load job anyway as public user
            try {
                const res = await backendGet(`/dashboard/jobs/${jobId}`);
                const json = await handleResponse(res);
                const jobData = json.data || json;
                if (jobData) {
                    await renderJob(jobData);
                    setupPublicNavigation();
                    setupPublicApplyButtons();
                }
            } catch (e) {
                window.location.href = CONFIG.PAGES.JOBS;
            }
        } else {
            window.location.href = CONFIG.PAGES.JOBS;
        }
    }
}

// Global variable to store recruiter profile data
let recruiterProfileData = null;

// Fetches exact Recruiter Profile to fill in missing Sidebar gaps (like Company ID)
async function fetchRecruiterProfile() {
    try {
        // console.log('Fetching recruiter profile...');
        const res = await backendGet('/recruiter/profile');
        const data = await handleResponse(res);
        const profile = data.data || data;
        
        // console.log('Recruiter profile data:', profile);
        
        // Store profile data globally
        recruiterProfileData = profile;

        if (profile) {
            const recName = document.getElementById('recruiterName');
            if (recName && profile.contact_name) {
                recName.textContent = profile.contact_name;
                // console.log('Set recruiter name to:', profile.contact_name);
            }

            const companyIdEl = document.getElementById('companyId');
            if (companyIdEl) {
                // Use the company_display_id if available, otherwise fallback
                let companyDisplay = '---';
                if (profile.company_display_id) {
                    companyDisplay = profile.company_display_id;
                } else if (profile.company_id) {
                    // Fallback: take first 8 characters of UUID and make it uppercase
                    companyDisplay = profile.company_id.substring(0, 8).toUpperCase();
                } else if (profile.company_name) {
                    companyDisplay = profile.company_name;
                }
                companyIdEl.textContent = `Company ID: ${companyDisplay}`;
                // console.log('Set company ID to:', `Company ID: ${companyDisplay}`);
            }
        }
    } catch (err) {
        // console.warn("Could not load recruiter profile for sidebar:", err);
        const companyIdEl = document.getElementById('companyId');
        if (companyIdEl) {
            companyIdEl.textContent = "---";
        }
    }
}

async function checkApplicationStatus() {
    const jobId = getJobId();
    try {
        // console.log('[DEBUG] Checking application status for job:', jobId);
        const statusRes = await backendGet(`/applicant/applications`);
        const statusJson = await handleResponse(statusRes);
        
        // Handle different response structures
        let apps = [];
        if (Array.isArray(statusJson)) {
            apps = statusJson;
        } else if (statusJson.data && Array.isArray(statusJson.data)) {
            apps = statusJson.data;
        } else if (statusJson.applications && Array.isArray(statusJson.applications)) {
            apps = statusJson.applications;
        }
        
        // console.log('[DEBUG] Applications:', apps);
        
        // Check if this job is in the applications list
        const hasApplied = apps.some(app => app.job_id === jobId);
        // console.log('[DEBUG] Has applied for this job:', hasApplied);
        
        if (hasApplied) {
            markAsApplied();
        } else {
            setupApplyButtons();
        }
    } catch(e) { 
        // console.log('[DEBUG] Error checking application status:', e);
        setupApplyButtons();
    }
}

function setupApplyButtons() {
    const applyBtn = document.getElementById("applyBtn");
    const quickApplyBtn = document.getElementById("quickApplyBtn");
    
    // Initialize intro video modal elements
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
    
    // Initialize video recording modal elements
    videoRecordingModal = document.getElementById('videoRecordingModal');
    startRecordBtn = document.getElementById('startRecordBtn');
    stopRecordBtn = document.getElementById('stopRecordBtn');
    retakeRecordBtn = document.getElementById('retakeRecordBtn');
    acceptRecordBtn = document.getElementById('acceptRecordBtn');
    closeRecordModalBtn = document.getElementById('closeRecordModalBtn');
    recordCameraFeed = document.getElementById('recordCameraFeed');
    recordPlaybackFeed = document.getElementById('recordPlaybackFeed');
    recordRecordingIndicator = document.getElementById('recordRecordingIndicator');
    recordTimerDisplay = document.getElementById('recordTimerDisplay');
    recordRecordingControls = document.getElementById('recordRecordingControls');
    recordStopControls = document.getElementById('recordStopControls');
    recordReviewControls = document.getElementById('recordReviewControls');
    recordUploadProgress = document.getElementById('recordUploadProgress');
    recordProgressBar = document.getElementById('recordProgressBar');
    recordProgressText = document.getElementById('recordProgressText');
    
    // Setup intro video modal event listeners
    if(useExistingVideoBtn) useExistingVideoBtn.addEventListener('click', submitApplicationWithVideo);
    if(recordNewVideoBtn) recordNewVideoBtn.addEventListener('click', showVideoRecordingModal);
    if(skipVideoBtn) skipVideoBtn.addEventListener('click', submitApplicationWithVideo);
    if(closeVideoModalBtn) closeVideoModalBtn.addEventListener('click', closeIntroVideoModal);
    if(introVideoModal) {
        introVideoModal.addEventListener('click', (e) => {
            if (e.target === introVideoModal) closeIntroVideoModal();
        });
    }
    
    // Setup video recording modal event listeners
    if(startRecordBtn) startRecordBtn.addEventListener('click', startRecordRecording);
    if(stopRecordBtn) stopRecordBtn.addEventListener('click', stopRecordRecording);
    if(retakeRecordBtn) retakeRecordBtn.addEventListener('click', resetRecordRecording);
    if(acceptRecordBtn) acceptRecordBtn.addEventListener('click', acceptAndUploadRecordVideo);
    if(closeRecordModalBtn) closeRecordModalBtn.addEventListener('click', closeVideoRecordingModal);
    if(videoRecordingModal) {
        videoRecordingModal.addEventListener('click', (e) => {
            if (e.target === videoRecordingModal) closeVideoRecordingModal();
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
        const user = await customAuth.getUserData();
        const response = await backendGet('/applicant/profile');
        const profile = await handleResponse(response);
        
        if (profile.data?.intro_video_url) {
            existingVideoUrl = profile.data.intro_video_url;
            useExistingVideoBtn.style.display = 'block';
            existingVideoInfo.style.display = 'block';
        } else {
            useExistingVideoBtn.style.display = 'none';
            existingVideoInfo.style.display = 'none';
        }
    } catch (err) {
        // console.warn('Could not fetch existing video:', err);
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
 * Redirect to profile page to record new video - NOW opens modal instead
 */
function redirectToRecordVideo() {
    // Instead of redirecting, show the video recording modal
    showVideoRecordingModal();
}

/**
 * Submit application with video
 */
async function submitApplicationWithVideo() {
    const jobId = getJobId();
    if (!jobId) return;
    
    videoUploadProgress.style.display = 'block';
    videoActionButtons.style.display = 'none';
    updateVideoProgress(50, 'Submitting application...');
    
    try {
        const user = await customAuth.getUserData();
        if (!user) throw new Error('Not authenticated');
        
        const response = await backendPost('/applicant/apply', {
            job_id: jobId,
            candidate_id: user.id,
            status: 'submitted',
            intro_video_url: existingVideoUrl || null
        });
        
        const result = await handleResponse(response);
        
        if (result.error) {
            if (result.error.message?.includes('duplicate')) {
                alert('You have already applied for this job!');
            } else {
                throw new Error(result.error.message || 'Application failed');
            }
        } else {
            updateVideoProgress(100, 'Application submitted!');
            markAsApplied();
            setTimeout(() => {
                closeIntroVideoModal();
            }, 500);
        }
        
    } catch (err) {
        // console.error('Application submission failed:', err);
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
    const quickApplyBtn = document.getElementById('quickApplyBtn');
    
    if(applyBtn) {
        applyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Already Applied';
        applyBtn.disabled = true;
        applyBtn.classList.add('btn-success');
        applyBtn.classList.remove('btn-apply-massive');
        applyBtn.classList.remove('btn-primary');
        applyBtn.classList.remove('btn-outline-primary');
        applyBtn.style.cursor = 'default';
    }
    
    if(quickApplyBtn) {
        quickApplyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Already Applied';
        quickApplyBtn.disabled = true;
        quickApplyBtn.classList.add('btn-success');
        quickApplyBtn.classList.remove('btn-outline-primary');
        quickApplyBtn.classList.remove('btn-primary');
        quickApplyBtn.style.cursor = 'default';
    }
}

async function renderJob(job) {
    console.log('Job data received:', job);
    console.log('Department:', job.department, 'Role:', job.role, 'Employment Type:', job.employment_type);
    
    // Helper function to check if value is a UUID
    const isUUID = (val) => {
        if (!val || typeof val !== 'string') return false;
        return val.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) !== null;
    };
    
    // Helper function to get display value (returns '-' if UUID or empty)
    const getDisplayValue = (val, fallback = '-') => {
        if (!val) return fallback;
        if (isUUID(val)) return fallback;
        return val;
    };
    
    // Start with default
    let displayCompany = "Hiring Company";
    
    // Use recruiter profile data if available
    if (recruiterProfileData) {
        if (recruiterProfileData.company_name && !isUUID(recruiterProfileData.company_name)) {
            displayCompany = recruiterProfileData.company_name;
        } else if (recruiterProfileData.contact_name && !isUUID(recruiterProfileData.contact_name)) {
            displayCompany = recruiterProfileData.contact_name;
        }
    }
    
    // Check other possible fields in job data
    if (displayCompany === "Hiring Company") {
        const companyFields = [
            'company_name', 'company', 'employer', 'organization', 
            'recruiter_company', 'business_name', 'firm_name'
        ];
        
        for (const field of companyFields) {
            if (job[field] && !isUUID(job[field])) {
                displayCompany = job[field];
                break;
            }
        }
    }

    // Basic Info
    setText("jobTitle", job.title || job.job_title || 'Job Title');
    setText("companyName", displayCompany);
    setText("jobLocation", getDisplayValue(job.location, 'Location not specified'));
    setText("jobType", getDisplayValue(job.job_type, 'Full Time'));
    setText("postedDate", job.created_at ? new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date not available');
    
    // Format salary from salary_min and salary_max
    const salaryMin = parseFloat(job.salary_min) || null;
    const salaryMax = parseFloat(job.salary_max) || null;
    const formatNum = (n) => n >= 100000 ? `${(n / 100000).toFixed(1)} LPA` : `₹${n.toLocaleString()}`;
    const salaryText = (salaryMin && salaryMax) ? `${formatNum(salaryMin)} - ${formatNum(salaryMax)}` 
                      : salaryMin ? `From ${formatNum(salaryMin)}` 
                      : "Not Specified";
    setText("salaryRange", salaryText);
    
    // Job Highlights - filter out UUIDs
    setText("jobDepartment", getDisplayValue(job.department));
    setText("jobRole", getDisplayValue(job.role));
    setText("employmentType", getDisplayValue(job.employment_type));
    setText("noOfOpenings", job.no_of_openings || '1');
    
    // Experience Range
    const expMin = job.experience_min;
    const expMax = job.experience_max;
    const expText = (expMin && expMax) ? `${expMin} - ${expMax} years` 
                   : expMin ? `Min ${expMin} years` 
                   : expMax ? `Max ${expMax} years`
                   : 'Fresher/All Levels';
    setText("experienceRange", expText);
    
    // Notice Period
    const noticeDays = job.notice_period_days;
    const noticeText = noticeDays == 0 ? 'Immediate' 
                     : noticeDays ? `${noticeDays} Days` 
                     : 'Not Specified';
    setText("noticePeriod", noticeText);
    
    // Industry & Education - filter out UUIDs
    setText("jobIndustry", getDisplayValue(job.industry));
    setText("educationQualification", getDisplayValue(job.education_qualification));
    
    // Skills Section
    const skillsSection = document.getElementById('skillsSection');
    const jobSkills = document.getElementById('jobSkills');
    if (job.skills && job.skills.length > 0) {
        let skillsArray = job.skills;
        if (typeof job.skills === 'string') {
            try {
                skillsArray = JSON.parse(job.skills);
            } catch (e) {
                skillsArray = job.skills.split(',').map(s => s.trim());
            }
        }
        // Filter out UUIDs from skills array
        skillsArray = skillsArray.filter(skill => !isUUID(skill));
        if (skillsArray.length > 0) {
            skillsSection.style.display = 'block';
            jobSkills.innerHTML = skillsArray.map(skill => 
                `<span class="skill-tag" style="display: inline-flex; align-items: center; gap: 4px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 500;">
                    ${skill}
                </span>`
            ).join('');
        }
    }
    
    // Job Description
    const desc = document.getElementById("jobDescription");
    if(desc) desc.innerHTML = getDisplayValue(job.description, "No description provided.").replace(/\n/g, "<br>");
    
    // Responsibilities
    const resp = document.getElementById("jobResponsibilities");
    if(resp) {
        const respText = getDisplayValue(job.responsibilities, "No specific responsibilities listed.");
        resp.innerHTML = respText.replace(/\n/g, "<br>");
    }
    
    // Requirements
    const req = document.getElementById("jobRequirements");
    if(req) req.innerHTML = getDisplayValue(job.requirements, "No requirements listed.").replace(/\n/g, "<br>");
    
    // Contact Information - filter out UUIDs
    const contactSection = document.getElementById('contactSection');
    const contactName = document.getElementById('contactName');
    const contactEmailDiv = document.getElementById('contactEmailDiv');
    
    const contactPersonName = getDisplayValue(job.contact_person_name);
    const contactPersonEmail = getDisplayValue(job.contact_person_email);
    
    if (contactPersonName !== '-' || contactPersonEmail !== '-') {
        contactSection.style.display = 'block';
        
        if (contactPersonName !== '-') {
            contactName.style.display = 'block';
            setText("contactPersonName", contactPersonName);
        }
        
        if (contactPersonEmail !== '-') {
            contactEmailDiv.style.display = 'block';
            const emailLink = document.getElementById('contactPersonEmail');
            if (emailLink) {
                emailLink.href = `mailto:${contactPersonEmail}`;
                emailLink.textContent = contactPersonEmail;
            }
        }
    }
}

function setupNavigation(role, isRecruiter) {
    // Update sidebar for candidates
    if (!isRecruiter && currentUser) {
        setupCandidateNavigation();
    }
    
    document.getElementById("navDashboard").onclick = () => 
        window.location.href = isRecruiter ? CONFIG.PAGES.DASHBOARD_RECRUITER : CONFIG.PAGES.DASHBOARD_CANDIDATE;
    
    document.getElementById("navProfile").onclick = () => 
        window.location.href = isRecruiter ? CONFIG.PAGES.RECRUITER_PROFILE : CONFIG.PAGES.CANDIDATE_PROFILE;
    
    document.getElementById("navApplications").onclick = () => 
        window.location.href = isRecruiter ? CONFIG.PAGES.APPLICATION_LIST : CONFIG.PAGES.MY_APPLICATIONS;

    if (isRecruiter) {
        const navJobs = document.getElementById("navJobs");
        if(navJobs) navJobs.onclick = () => window.location.href = CONFIG.PAGES.MY_JOBS;
        
        const navAnalysis = document.getElementById("navAnalysis");
        if(navAnalysis) navAnalysis.onclick = () => window.location.href = 'analysis.html';
    }

    const backBtn = document.getElementById("backBtn");
    if(backBtn) {
        backBtn.onclick = () => {
            if (isRecruiter) {
                window.location.href = CONFIG.PAGES.MY_JOBS;
            } else {
                window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
            }
        };
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if(logoutBtn) logoutBtn.onclick = async () => {
        await customAuth.signOut();
        window.location.href = CONFIG.PAGES.JOBS;
    };
}

/**
 * Setup navigation for candidate users viewing job-details page
 */
function setupCandidateNavigation() {
    // Update sidebar nav items for candidate view
    const navDashboard = document.getElementById("navDashboard");
    if(navDashboard) {
        navDashboard.innerHTML = '<i class="fas fa-home"></i><span>Dashboard</span>';
    }
    
    const navJobs = document.getElementById("navJobs");
    if(navJobs) {
        navJobs.innerHTML = '<i class="fas fa-briefcase"></i><span>Browse Jobs</span>';
    }
    
    const navApplications = document.getElementById("navApplications");
    if(navApplications) {
        navApplications.innerHTML = '<i class="fas fa-file-alt"></i><span>My Applications</span>';
    }
    
    const navProfile = document.getElementById("navProfile");
    if(navProfile) {
        navProfile.innerHTML = '<i class="fas fa-user"></i><span>My Profile</span>';
    }
    
    // Hide Analysis nav for candidates
    const navAnalysis = document.getElementById("navAnalysis");
    if(navAnalysis) {
        navAnalysis.style.display = 'none';
    }
    
    // Update sidebar footer user info for candidate
    const recruiterName = document.getElementById('recruiterName');
    if(recruiterName) recruiterName.id = 'userName';
    
    const companyId = document.getElementById('companyId');
    if(companyId) {
        companyId.id = 'userDesignation';
        companyId.textContent = 'Candidate';
    }
    
    // Update user avatar icon
    const userAvatar = document.getElementById('userAvatar');
    if(userAvatar) {
        userAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }
}

/**
 * Setup navigation for public (unauthenticated) users
 */
function setupPublicNavigation() {
    // For public users, show simplified sidebar with just Jobs navigation
    const navDashboard = document.getElementById("navDashboard");
    const navJobs = document.getElementById("navJobs");
    const navApplications = document.getElementById("navApplications");
    const navProfile = document.getElementById("navProfile");
    
    // Update nav items for public view
    if(navDashboard) {
        navDashboard.innerHTML = '<i class="fas fa-briefcase"></i><span>Browse Jobs</span>';
        navDashboard.onclick = () => window.location.href = 'https://jobs.skreenit.com';
    }
    
    if(navJobs) {
        navJobs.innerHTML = '<i class="fas fa-home"></i><span>Home</span>';
        navJobs.onclick = () => window.location.href = 'https://jobs.skreenit.com';
    }
    
    // Hide profile and applications nav items for public users
    if(navApplications) navApplications.style.display = 'none';
    if(navProfile) navProfile.style.display = 'none';
    
    // Update sidebar footer for public view - show login prompt instead of user info
    const sidebarFooter = document.querySelector('.sidebar-footer');
    if (sidebarFooter) {
        sidebarFooter.innerHTML = `
            <div style="padding: 1rem; text-align: center;">
                <p style="margin-bottom: 1rem; color: #666; font-size: 0.9rem;">Sign in to apply for jobs and track your applications</p>
                <button id="publicLoginBtn" class="btn btn-primary" style="width: 100%;">
                    <i class="fas fa-sign-in-alt"></i> Sign In / Register
                </button>
            </div>
        `;
        
        const jobId = getJobId();
        const returnUrl = new URL(window.location.href);
        if (jobId) returnUrl.searchParams.set('job_id', jobId);
        const loginUrl = new URL(CONFIG.PAGES.LOGIN, window.location.origin);
        loginUrl.searchParams.set('redirect', encodeURIComponent(returnUrl.toString()));
        
        const publicLoginBtn = document.getElementById('publicLoginBtn');
        if (publicLoginBtn) {
            publicLoginBtn.onclick = () => window.location.href = loginUrl.toString();
        }
    }
    
    // Back button always goes to public jobs page
    const backBtn = document.getElementById("backBtn");
    if(backBtn) {
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Jobs';
        backBtn.onclick = () => window.location.href = 'https://jobs.skreenit.com';
    }
}

/**
 * Setup "Sign in to Apply" buttons for public (unauthenticated) users
 */
function setupPublicApplyButtons() {
    const applyBtn = document.getElementById('applyBtn');
    const quickApplyBtn = document.getElementById('quickApplyBtn');
    const jobId = getJobId();
    
    // Build login URL with redirect back to this job
    const returnUrl = new URL(window.location.href);
    if (jobId) returnUrl.searchParams.set('job_id', jobId);
    const loginUrl = new URL(CONFIG.PAGES.LOGIN, window.location.origin);
    loginUrl.searchParams.set('redirect', encodeURIComponent(returnUrl.toString()));
    
    if (applyBtn) {
        applyBtn.innerHTML = '<i class="fas fa-lock"></i> Sign in to Apply';
        applyBtn.style.display = 'inline-flex';
        applyBtn.onclick = () => window.location.href = loginUrl.toString();
    }
    
    if (quickApplyBtn) {
        quickApplyBtn.innerHTML = '<i class="fas fa-lock"></i> Sign in to Apply';
        quickApplyBtn.style.display = 'inline-block';
        quickApplyBtn.onclick = () => window.location.href = loginUrl.toString();
    }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = val || "";
}

// ============================================
// VIDEO RECORDING MODAL FUNCTIONS
// ============================================

/**
 * Show video recording modal and initialize camera
 */
async function showVideoRecordingModal() {
    // console.log('[DEBUG] showVideoRecordingModal called');
    // console.log('[DEBUG] videoRecordingModal element:', videoRecordingModal);
    
    if (!videoRecordingModal) {
        // console.error('[DEBUG] Video recording modal element not found!');
        alert('Error: Video recording modal not found. Please refresh the page.');
        return;
    }
    
    // Close the intro video modal first
    closeIntroVideoModal();
    
    // Reset recording state
    resetRecordRecording();
    
    // Show the recording modal
    videoRecordingModal.style.display = 'flex';
    videoRecordingModal.classList.add('active');
    // console.log('[DEBUG] Recording modal displayed');
    
    // Initialize camera
    try {
        await initRecordCamera();
        // console.log('[DEBUG] Camera initialized successfully');
    } catch (err) {
        // console.error('[DEBUG] Camera initialization failed:', err);
    }
}

/**
 * Close video recording modal
 */
function closeVideoRecordingModal() {
    if (videoRecordingModal) {
        videoRecordingModal.style.display = 'none';
        videoRecordingModal.classList.remove('active');
    }
    
    // Stop camera stream
    if (recordVideoStream) {
        recordVideoStream.getTracks().forEach(track => track.stop());
        recordVideoStream = null;
    }
    
    // Stop timer if running
    if (recordTimerInterval) {
        clearInterval(recordTimerInterval);
        recordTimerInterval = null;
    }
}

/**
 * Initialize camera for recording
 */
async function initRecordCamera() {
    if (!recordCameraFeed) return;
    
    try {
        // Stop any existing stream
        if (recordVideoStream) {
            recordVideoStream.getTracks().forEach(track => track.stop());
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }, 
            audio: true 
        });
        
        recordCameraFeed.srcObject = stream;
        recordVideoStream = stream;
    } catch (err) {
        // console.error('Camera access error:', err);
        alert('Camera access denied. Please allow camera access to record video.');
    }
}

/**
 * Start video recording
 */
function startRecordRecording() {
    if (!recordCameraFeed || !recordVideoStream) {
        alert('Camera not ready. Please wait...');
        return;
    }
    
    recordVideoChunks = [];
    
    const mediaRecorder = new MediaRecorder(recordVideoStream);
    
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordVideoChunks.push(event.data);
        }
    };
    
    mediaRecorder.onstop = () => {
        recordVideoBlob = new Blob(recordVideoChunks, { type: 'video/webm' });
        const videoURL = URL.createObjectURL(recordVideoBlob);
        
        // Show playback
        if (recordPlaybackFeed) {
            recordPlaybackFeed.src = videoURL;
            recordPlaybackFeed.style.display = 'block';
        }
        if (recordCameraFeed) {
            recordCameraFeed.style.display = 'none';
        }
        
        // Show review controls
        if (recordRecordingControls) recordRecordingControls.style.display = 'none';
        if (recordStopControls) recordStopControls.style.display = 'none';
        if (recordReviewControls) recordReviewControls.style.display = 'flex';
        if (recordRecordingIndicator) recordRecordingIndicator.style.display = 'none';
    };
    
    mediaRecorder.start();
    recordVideoRecorder = mediaRecorder;
    
    // Update UI
    if (recordRecordingControls) recordRecordingControls.style.display = 'none';
    if (recordStopControls) recordStopControls.style.display = 'flex';
    if (recordRecordingIndicator) recordRecordingIndicator.style.display = 'block';
    
    // Start timer
    startRecordTimer();
}

/**
 * Stop video recording
 */
function stopRecordRecording() {
    if (recordVideoRecorder && recordVideoRecorder.state !== 'inactive') {
        recordVideoRecorder.stop();
        stopRecordTimer();
    }
}

/**
 * Reset recording state
 */
function resetRecordRecording() {
    recordVideoBlob = null;
    recordVideoChunks = [];
    recordRecordingSeconds = 0;
    
    // Reset UI
    if (recordPlaybackFeed) {
        recordPlaybackFeed.src = '';
        recordPlaybackFeed.style.display = 'none';
    }
    if (recordCameraFeed) {
        recordCameraFeed.style.display = 'block';
    }
    
    if (recordRecordingControls) recordRecordingControls.style.display = 'flex';
    if (recordStopControls) recordStopControls.style.display = 'none';
    if (recordReviewControls) recordReviewControls.style.display = 'none';
    if (recordRecordingIndicator) recordRecordingIndicator.style.display = 'none';
    if (recordUploadProgress) recordUploadProgress.style.display = 'none';
    
    // Reset timer
    stopRecordTimer();
    if (recordTimerDisplay) recordTimerDisplay.textContent = '00:00';
    
    // Re-initialize camera
    initRecordCamera();
}

/**
 * Accept recorded video and upload it
 */
async function acceptAndUploadRecordVideo() {
    if (!recordVideoBlob) return;
    
    // Show upload progress
    if (recordUploadProgress) recordUploadProgress.style.display = 'block';
    if (recordReviewControls) recordReviewControls.style.display = 'none';
    
    try {
        // Update progress
        updateRecordProgress(30, 'Uploading video...');
        
        // Upload the video
        const videoPayload = new FormData();
        videoPayload.append('file', recordVideoBlob, 'intro-video.webm');
        
        const response = await backendPost('/applicant/upload-intro-video', videoPayload);
        await handleResponse(response);
        
        updateRecordProgress(100, 'Video uploaded successfully!');
        
        // Wait a moment then close modal and submit application
        setTimeout(() => {
            closeVideoRecordingModal();
            // Update existingVideoUrl to indicate we now have a video
            existingVideoUrl = 'recorded'; // This will trigger using the newly uploaded video
            submitApplicationWithVideo();
        }, 1000);
        
    } catch (err) {
        // console.error('Video upload failed:', err);
        alert('Failed to upload video. Please try again.');
        if (recordUploadProgress) recordUploadProgress.style.display = 'none';
        if (recordReviewControls) recordReviewControls.style.display = 'flex';
    }
}

/**
 * Update record progress bar
 */
function updateRecordProgress(percent, text) {
    if (recordProgressBar) recordProgressBar.style.width = percent + '%';
    if (recordProgressText) recordProgressText.textContent = text || `Processing... ${percent}%`;
}

/**
 * Start recording timer
 */
function startRecordTimer() {
    recordRecordingSeconds = 0;
    if (recordTimerDisplay) recordTimerDisplay.textContent = '00:00';
    
    recordTimerInterval = setInterval(() => {
        recordRecordingSeconds++;
        const mins = Math.floor(recordRecordingSeconds / 60).toString().padStart(2, '0');
        const secs = (recordRecordingSeconds % 60).toString().padStart(2, '0');
        if (recordTimerDisplay) recordTimerDisplay.textContent = `${mins}:${secs}`;
    }, 1000);
}

/**
 * Stop recording timer
 */
function stopRecordTimer() {
    if (recordTimerInterval) {
        clearInterval(recordTimerInterval);
        recordTimerInterval = null;
    }
}
