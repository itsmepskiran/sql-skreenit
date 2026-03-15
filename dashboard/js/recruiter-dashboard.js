import { customAuth } from '@shared/js/auth-config.js';;
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

// Since script is loaded at end of body, DOM is already ready
checkAuth();
setupEventListeners();

async function checkAuth() {
    const user = await customAuth.getUserData();
    if (!user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    // Set username immediately
    const nameEl = document.getElementById('recruiterName');
    const companyIdEl = document.getElementById('companyId');
    
    if (nameEl) {
        const displayName = user?.user_metadata?.full_name || user?.user_metadata?.contact_name || user?.email?.split('@')[0] || 'Recruiter';
        nameEl.textContent = displayName;
    }
    
    if (companyIdEl) {
        companyIdEl.textContent = 'Loading profile...';
    }
    
    // Load fast initial data from custom auth
    updateSidebarProfile(user.user_metadata || {}, user);
    
    // Load deep data from your Backend Database
    updateUserInfo(); 
    loadDashboardData(user.id);
}

function updateSidebarProfile(profile, user) {
    const nameEl = document.getElementById('recruiterName');
    const avatarEl = document.getElementById('userAvatar');

    // Fix #4: Hide the camera icon if it exists in the HTML
    const cameraIcon = document.querySelector('.camera-icon');
    if (cameraIcon) cameraIcon.style.display = 'none';

    const displayName = (profile?.contact_name || profile?.full_name || user?.email?.split('@')[0] || 'Recruiter');
    if (nameEl) nameEl.textContent = displayName;

    const displayAvatar = profile?.company_logo_url || profile?.avatar_url || user?.avatar_url;

    // Fix #3: Handle Broken Images fallback gracefully
    if (avatarEl) {
        if (displayAvatar && !displayAvatar.includes('yourdomain.com')) {
            const initials = getInitials(displayName);
            avatarEl.innerHTML = `<img src="${displayAvatar}" onerror="this.style.display='none'; this.parentElement.innerHTML='${initials}';" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
        } else {
            avatarEl.innerHTML = getInitials(displayName);
        }
    }
}

function getInitials(name) {
    const initials = (name || 'R').match(/\b\w/g) || [];
    return ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
}

async function updateUserInfo() {
  try {
    const user = await customAuth.getUserData();
    
    // If API fails, at least show the username from auth data
    if (!document.getElementById('recruiterName').textContent || document.getElementById('recruiterName').textContent === 'Loading...') {
        const displayName = user?.user_metadata?.full_name || user?.user_metadata?.contact_name || user?.email?.split('@')[0] || 'Recruiter';
        document.getElementById('recruiterName').textContent = displayName;
    }
    
    const res = await backendGet('/recruiter/profile');
    const data = await handleResponse(res);
    const profile = data.data || data; 
    
    // Ensure sidebar always reflects latest profile data
    updateSidebarProfile(profile || {}, user);

    // Fix #1 & #5: Ensure correct Display ID is mapped
    const companyIdEl = document.getElementById('companyId');
    if (companyIdEl) {
        const onboardedFlag = user?.onboarded ?? user?.user_metadata?.onboarded;
        const isOnboarded = onboardedFlag === true || onboardedFlag === 'true';
        const displayId = profile?.company_display_id || profile?.company_id || profile?.company_name;
        const nameIsPlaceholder = (profile?.company_name || '').toLowerCase().includes('unknown');
        companyIdEl.textContent = (isOnboarded && displayId && !nameIsPlaceholder) ? `Company ID: ${displayId}` : 'Company ID: Pending';
    }
  } catch (error) { 
    const companyIdEl = document.getElementById('companyId');
    if (companyIdEl) companyIdEl.textContent = 'Company ID: ---';
    
    // Fallback: Show username from auth data even if API fails
    const user = await customAuth.getUserData();
    const displayName = user?.user_metadata?.full_name || user?.user_metadata?.contact_name || user?.email?.split('@')[0] || 'Recruiter';
    const nameEl = document.getElementById('recruiterName');
    if (nameEl && (!nameEl.textContent || nameEl.textContent === 'Loading...')) {
        nameEl.textContent = displayName;
    }
  }
}

function setupEventListeners() {
    const navProfile = document.getElementById('navProfile');
    if (navProfile) {
        navProfile.addEventListener('click', async () => {
            const u = await customAuth.getUserData();
            const onboardedFlag = u?.onboarded ?? u?.user_metadata?.onboarded;
            const isOnboarded = onboardedFlag === true || onboardedFlag === 'true';

            if (isOnboarded) {
                window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
            } else {
                window.location.href = CONFIG.PAGES.RECRUITER_PROFILE;
            }
        });
    }
    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => { 
            await customAuth.signOut(); 
            window.location.href = CONFIG.PAGES.JOBS; 
        });
    }

    // --- BANNER CLICK EVENTS ---
    const btnJobs = document.getElementById('btnActiveJobs');
    if(btnJobs) {
        btnJobs.style.cursor = 'pointer';
        btnJobs.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);
    }

    const btnCands = document.getElementById('btnCandidates');
    if(btnCands) {
        btnCands.style.cursor = 'pointer';
        btnCands.addEventListener('click', () => window.location.href = `${CONFIG.PAGES.APPLICATION_LIST}?status=all`);
    }

    const btnApps = document.getElementById('btnNewApps');
    if(btnApps) {
        btnApps.style.cursor = 'pointer';
        btnApps.addEventListener('click', () => window.location.href = `${CONFIG.PAGES.APPLICATION_LIST}?status=pending`);
    }

    // ✅ NEW: Interview Card Redirection
    const btnInterviews = document.getElementById('btnInterviews');
    if(btnInterviews) {
        btnInterviews.style.cursor = 'pointer';
        btnInterviews.addEventListener('click', () => window.location.href = `${CONFIG.PAGES.APPLICATION_LIST}?status=interviewing`);
    }
    // --- Mobile Menu Toggle Logic ---
    const menuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');

    // Create overlay dynamically if missing
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    menuToggle?.addEventListener('click', () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
}

async function loadDashboardData(userId) {
    try {
        // A. Fetch Jobs
        const jobsRes = await backendGet(`/recruiter/jobs`);
        const jobsData = await handleResponse(jobsRes);

        // The backend response shape can vary depending on the endpoint implementation.
        // Older versions returned {ok, data: {jobs: [...]}} while newer ones return {ok, data: {data: [...]}}
        let jobsList = [];
        if (Array.isArray(jobsData?.data?.data)) {
            jobsList = jobsData.data.data;
        } else if (Array.isArray(jobsData?.data?.jobs)) {
            jobsList = jobsData.data.jobs;
        } else if (Array.isArray(jobsData?.data)) {
            jobsList = jobsData.data;
        } else if (Array.isArray(jobsData)) {
            jobsList = jobsData;
        }

        // Update Stats
        const activeJobsCount = jobsList.filter(j => {
            const s = (j.status || 'active').toLowerCase();
            return s === 'active' || s === 'published' || s === 'live';
        }).length;
        setText("statActiveJobs", activeJobsCount);

        // ✅ Polish UI: Limit to 4 cards
        renderJobs(jobsList.slice(0, 4));

        // B. Fetch Applications
        let appsList = [];
        try {
            const appsRes = await backendGet(`/recruiter/applications`); 
            const appsData = await handleResponse(appsRes);
            appsList = appsData?.data || appsData || [];
        } catch (e) { console.warn("Apps fetch error", e); }

        if (Array.isArray(appsList)) {
            // ✅ Polish UI: Limit to 4 cards
            renderApplications(appsList.slice(0, 4)); 
            
            const totalCandidates = appsList.length;
            
            // ✅ FIX 2: Accurate New Applications Count
            // Defaults empty statuses to 'pending' to ensure they aren't missed
            const newStatuses = ['pending', 'applied', 'submitted', 'new'];
            const newAppsCount = appsList.filter(a => {
                return newStatuses.includes((a.status || 'pending').toLowerCase());
            }).length;
            const interviewCount = appsList.filter(a => {
                return a.status === 'interviewing' || a.status === 'interviewing';
            }).length;
            
            setText("statTotalCandidates", totalCandidates);
            setText("statNewApplications", newAppsCount);
            setText("statInterviews", interviewCount);
        }

    } catch (err) { 
        console.error("Dashboard load error:", err); 
    }
}

// Inside your renderApplications or loadRecentApplications function:
function renderApplications(apps) {
    const container = document.getElementById("recentAppsList");
    if (!container) return;

    if (!apps || apps.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-muted">No applications found.</div>`;
        return;
    }

    container.innerHTML = apps.map(app => {
        const status = (app.status || 'pending').toLowerCase();
        let displayStatus = app.status || 'Applied';
        let badgeClass = "badge-pending";
        let actionButton = '';

        if (status === 'interview_submitted' || status === 'completed' || status === 'responses ready') {
            displayStatus = 'Responses Received';
            badgeClass = "badge-success"; 
            actionButton = `
                <button onclick="watchInterviewResponses('${app.id}')" class="btn btn-sm btn-primary w-100 mt-2">
                    <i class="fas fa-play-circle me-1"></i> Watch Responses
                </button>`;
        } else if (status === 'interviewing') {
            displayStatus = 'Interviewing';
            badgeClass = "badge-interviewing";
            // ✅ Fixed: Added '=' after href
            actionButton = `<a href="${CONFIG.PAGES.APPLICATION_DETAILS}?id=${app.id}" class="btn btn-sm btn-outline-primary w-100 mt-2">Manage Interview</a>`;
        } else {
            // ✅ Fixed: Added '=' after href
            actionButton = `<a href="${CONFIG.PAGES.APPLICATION_DETAILS}?id=${app.id}" class="btn btn-sm btn-secondary w-100 mt-2">View Details</a>`;
        }

        return `
            <div class="card mb-3 shadow-sm border-0">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="card-title mb-1" style="font-weight:600;">${app.candidate_name || 'Candidate'}</h5>
                            <p class="text-muted small mb-0">${app.job_title}</p>
                        </div>
                        <span class="badge ${badgeClass}" style="padding: 5px 10px; border-radius: 6px;">${displayStatus}</span>
                    </div>
                    <div class="mt-2 text-muted small">
                        <i class="far fa-clock me-1"></i> Applied: ${new Date(app.applied_at).toLocaleDateString()}
                    </div>
                    ${actionButton}
                </div>
            </div>`;
    }).join('');
}
// ✅ NEW HELPER FUNCTION: Watch responses in a popup similar to intro video
window.watchInterviewResponses = async function(applicationId) {
    const modalEl = document.getElementById('responseModal');
    const modalBody = document.getElementById('responseModalBody');
    
    if (!modalEl || !modalBody) {
        console.error("Response modal elements not found in HTML");
        return;
    }

    const modal = new bootstrap.Modal(modalEl);
    
    try {
        // Show loading state
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-spinner fa-spin fa-3x" style="color: #3b82f6; margin-bottom: 1rem;"></i>
                <p class="text-muted">Loading interview responses...</p>
            </div>
        `;
        modal.show();

        // Fetch responses using the recruiter-secured endpoint
        const res = await backendGet(`/recruiter/applications/${applicationId}/responses`);
        const data = await handleResponse(res);
        const responses = data.responses || [];

        if (responses.length === 0) {
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-video-slash fa-3x" style="color: #cbd5e0; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p class="text-muted">No video responses found for this candidate.</p>
                </div>
            `;
            return;
        }

        // Display all responses in a scrollable container
        modalBody.innerHTML = `
            <div style="max-height: 60vh; overflow-y: auto;">
                <h5 class="mb-3 text-center">
                    <i class="fas fa-video me-2"></i>Interview Responses
                </h5>
                ${responses.map((resp, i) => `
                    <div class="card mb-3 bg-light border-0">
                        <div class="card-header bg-transparent border-0 pt-3">
                            <strong>Question ${i + 1}:</strong> ${resp.question || 'Interview Question'}
                            ${resp.recorded_at ? `<div class="small text-muted mt-1">${new Date(resp.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>` : ''}
                        </div>
                        <div class="card-body p-2">
                            <div class="ratio ratio-16x9">
                                <video controls style="border-radius: 8px; background: #000;" preload="metadata">
                                    <source src="${resp.video_url}" type="video/webm">
                                    <source src="${resp.video_url}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        console.error("Failed to load interview responses:", err);
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-exclamation-triangle fa-3x" style="color: #ef4444; margin-bottom: 1rem;"></i>
                <p class="text-danger">Error loading video responses. Please try again.</p>
            </div>
        `;
    }
};
function renderJobs(jobs) {
    const list = document.getElementById("recentJobsList");
    if(!list) return;

    if (!jobs || !jobs.length) { 
        list.innerHTML = "<p class='text-muted' style='padding:1rem'>No active jobs posted.</p>"; 
        return; 
    }
    
    list.innerHTML = jobs.map(job => `
        <div class="card mb-2 shadow-sm border-0" onclick="window.location.href='${CONFIG.PAGES.JOB_DETAILS}?job_id=${job.id}'" style="cursor:pointer; padding: 1rem;">
            <div class="d-flex justify-content-between align-items-center">
                <div style="flex: 1;">
                    <h4 class="mb-1" style="font-size:1rem; font-weight:600; color: var(--text-dark);">${job.job_title || job.title || 'No Title'}</h4>
                    <div class="text-muted small">
                        <i class="fas fa-map-marker-alt me-1"></i> ${job.location || 'Location not specified'} 
                        <span class="mx-2">|</span>
                        <i class="far fa-clock me-1"></i> ${job.created_at ? new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date not available'}
                    </div>
                </div>
                <i class="fas fa-chevron-right text-muted" style="font-size: 0.8rem;"></i>
            </div>
        </div>
    `).join("");
}
function setText(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
}
