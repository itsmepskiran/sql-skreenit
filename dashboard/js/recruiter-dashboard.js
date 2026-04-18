import { customAuth } from '@shared/js/auth-config.js';
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import { sidebarManager } from '@shared/js/profile-checker.js';
import { initNotifications } from '@shared/js/notification-manager.js';
import '@shared/js/mobile.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

// Since script is loaded at end of body, DOM is already ready
checkAuth();

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
    
    // Setup event listeners AFTER mobile menu is initialized
    setupEventListeners();
    
    // Initialize notifications
    const notificationManager = initNotifications();
    
    // Show onboarding notification if profile incomplete
    const onboarded = user.onboarded || user.user_metadata?.onboarded || false;
    if (!onboarded) {
        notificationManager.showOnboardingNotification(user);
    }
    
    // Load dashboard data
    loadDashboardData(user.id);
}

function setupEventListeners() {
    // Navigation
    document.getElementById('navDashboard')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    document.getElementById('navJobs')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);
    document.getElementById('navApplications')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    document.getElementById('navAnalysis')?.addEventListener('click', () => window.location.href = 'analysis.html');
    
    const navProfile = document.getElementById('navProfile');
    if (navProfile) {
        navProfile.addEventListener('click', async () => {
            const u = await customAuth.getUserData();
            const onboardedFlag = u?.onboarded ?? u?.user_metadata?.onboarded;
            const isOnboarded = onboardedFlag === true || onboardedFlag === 'true';

            if (isOnboarded) {
                window.location.href = CONFIG.PAGES.RECRUITER_PROFILE;
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

        // Load video analysis reports
        loadAnalysisReports();

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

// Load video analysis reports
async function loadAnalysisReports() {
    const container = document.getElementById("analysisReportsList");
    if (!container) return;
    
    try {
        const res = await backendGet('/analytics/analysis-tasks');
        const data = await handleResponse(res);
        const tasks = data?.data || [];
        
        // Filter to only completed tasks
        const completedTasks = tasks.filter(t => t.status === 'completed');
        
        // Count total analyzed candidates
        let totalAnalyzed = 0;
        completedTasks.forEach(task => {
            if (task.result?.total_analyzed) {
                totalAnalyzed += task.result.total_analyzed;
            }
        });
        
        // Update stat card
        setText("statAnalysis", totalAnalyzed);
        
        // Show only last 5 in the list
        const recentTasks = completedTasks.slice(0, 5);
        
        if (recentTasks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-brain fa-2x mb-2" style="opacity: 0.3;"></i>
                    <p style="font-size: 0.85rem;">No analysis reports yet.</p>
                    <a href="application-list.html" style="color: #4f46e5; font-size: 0.8rem;">Analyze video responses →</a>
                </div>`;
            return;
        }
        
        container.innerHTML = recentTasks.map(task => {
            const result = task.result || {};
            const totalAnalyzed = result.total_analyzed || 0;
            const completedAt = task.completed_at ? new Date(task.completed_at).toLocaleDateString() : 'Recently';
            
            return `
                <div class="card mb-2 shadow-sm border-0" style="cursor: pointer; padding: 1rem;" onclick="viewAnalysisReport('${task.task_id}')">
                    <div class="d-flex justify-content-between align-items-center">
                        <div style="flex: 1;">
                            <h4 class="mb-1" style="font-size: 0.95rem; font-weight: 600; color: var(--text-dark);">
                                <i class="fas fa-check-circle me-2" style="color: #16a34a;"></i>
                                ${totalAnalyzed} Candidate${totalAnalyzed !== 1 ? 's' : ''} Analyzed
                            </h4>
                            <div class="text-muted small">
                                <i class="far fa-clock me-1"></i> ${completedAt}
                            </div>
                        </div>
                        <span class="badge" style="background: #dcfce7; color: #166534;">Complete</span>
                    </div>
                </div>`;
        }).join('');
        
    } catch (err) {
        console.warn("Failed to load analysis reports:", err);
        container.innerHTML = `<p class="text-muted" style="padding: 1rem;">Unable to load reports.</p>`;
    }
}

// View analysis report details
window.viewAnalysisReport = async function(taskId) {
    const modalEl = document.getElementById('responseModal');
    const modalBody = document.getElementById('responseModalBody');
    
    if (!modalEl || !modalBody) return;
    
    const modal = new bootstrap.Modal(modalEl);
    
    try {
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-spinner fa-spin fa-3x" style="color: #3b82f6;"></i>
                <p class="text-muted mt-3">Loading analysis report...</p>
            </div>`;
        modal.show();
        
        const res = await backendGet(`/analytics/analysis-task/${taskId}`);
        const data = await handleResponse(res);
        const task = data?.data;
        
        if (!task || !task.result) {
            modalBody.innerHTML = `<p class="text-center text-danger">Report not found.</p>`;
            return;
        }
        
        const { results, errors, total_analyzed, total_errors } = task.result;
        
        let html = `
            <div class="mb-4" style="background: #f0fdf4; padding: 1rem; border-radius: 8px; border: 1px solid #bbf7d0;">
                <h5 style="margin: 0; color: #166534;">
                    <i class="fas fa-check-circle me-2"></i>Analysis Complete
                </h5>
                <p style="margin: 0.5rem 0 0; color: #15803d;">
                    ${total_analyzed} candidate(s) analyzed
                    ${total_errors > 0 ? ` • ${total_errors} error(s)` : ''}
                </p>
            </div>`;
        
        if (results && results.length > 0) {
            results.forEach(result => {
                const analyses = result.analyses || [];
                html += `
                    <div class="card mb-3" style="border: 1px solid #e2e8f0; border-radius: 8px;">
                        <div class="card-header" style="background: #f8fafc; padding: 1rem;">
                            <h5 style="margin: 0; color: #1e293b;">${result.candidate_name}</h5>
                            <small class="text-muted">${result.job_title}</small>
                        </div>
                        <div class="card-body" style="padding: 1rem;">`;
                
                if (analyses.length === 0) {
                    html += `<p class="text-muted text-center">No video responses</p>`;
                } else {
                    analyses.forEach(a => {
                        const analysis = a.analysis;
                        if (analysis && analysis.summary) {
                            const summary = analysis.summary;
                            html += `
                                <div class="mb-3" style="background: #f8fafc; padding: 1rem; border-radius: 6px;">
                                    <h6 style="margin: 0 0 0.5rem; color: #334155;">
                                        <span style="background: #4338ca; color: white; padding: 2px 8px; border-radius: 4px; margin-right: 8px; font-size: 0.75rem;">Q${a.question_index + 1}</span>
                                        ${a.question || 'Question'}
                                    </h6>
                                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-top: 0.5rem;">
                                        <div style="text-align: center; padding: 0.5rem; background: white; border-radius: 4px;">
                                            <div style="font-weight: bold; color: #4338ca;">${summary.overall_score || 0}</div>
                                            <small style="color: #64748b; font-size: 0.7rem;">Score</small>
                                        </div>
                                        <div style="text-align: center; padding: 0.5rem; background: white; border-radius: 4px;">
                                            <div style="font-weight: bold; color: #059669;">${summary.speaking_pace || 0}</div>
                                            <small style="color: #64748b; font-size: 0.7rem;">WPM</small>
                                        </div>
                                        <div style="text-align: center; padding: 0.5rem; background: white; border-radius: 4px;">
                                            <div style="font-weight: bold; color: #d97706;">${summary.filler_words || 0}</div>
                                            <small style="color: #64748b; font-size: 0.7rem;">Fillers</small>
                                        </div>
                                        <div style="text-align: center; padding: 0.5rem; background: white; border-radius: 4px;">
                                            <div style="font-weight: bold; color: #7c3aed;">${summary.face_presence || 0}%</div>
                                            <small style="color: #64748b; font-size: 0.7rem;">Face</small>
                                        </div>
                                    </div>
                                </div>`;
                        }
                    });
                }
                
                html += `</div></div>`;
            });
        }
        
        modalBody.innerHTML = `<div style="max-height: 60vh; overflow-y: auto;">${html}</div>`;
        
    } catch (err) {
        console.error("Failed to load analysis report:", err);
        modalBody.innerHTML = `<p class="text-center text-danger">Error loading report.</p>`;
    }
};
