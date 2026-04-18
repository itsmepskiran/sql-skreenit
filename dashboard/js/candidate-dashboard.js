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

let appliedJobIds = new Set(); // Track applied job IDs

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
});

async function checkAuth() {
    const user = await customAuth.getUserData();
    if (!user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    // Use centralized sidebar manager instead of custom logic
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
    
    await loadData(user.id);
}

// --- DATA LOADING ---
async function loadData(userId) {
    try {
        // 1. Load Applications to get Stats and Status
        const appsRes = await backendGet('/applicant/applications');
        const appsResponse = await handleResponse(appsRes);
        
        // Handle different response structures
        let apps = [];
        if (appsResponse && appsResponse.data) {
            apps = Array.isArray(appsResponse.data) ? appsResponse.data : [];
        } else if (Array.isArray(appsResponse)) {
            apps = appsResponse;
        }
        
        // Ensure apps is an array
        if (!Array.isArray(apps)) {
            console.warn('Applications API returned non-array data:', appsResponse);
            apps = [];
        }
        
        appliedJobIds = new Set(apps.map(a => a.job_id));
        
        // Update Stats
        const totalApps = apps.length;
        if(document.getElementById("statTotalApplications")) {
            document.getElementById("statTotalApplications").textContent = totalApps;
        }

        renderApplications(apps);

        // 2. Load Recommended Jobs (excluding applied)
        await fetchJobs();

    } catch (err) {
        const appList = document.getElementById("myApplicationsList");
        if(appList) appList.innerHTML = "<p class='text-danger'>Error loading data. Please refresh.</p>";
    }
}

// Load and display notifications
async function loadNotifications() {
    try {
        const res = await backendGet('/notifications/');
        const json = await handleResponse(res);
        
        let notifications = [];
        if (Array.isArray(json)) {
            notifications = json;
        } else if (json.data && Array.isArray(json.data.notifications)) {
            notifications = json.data.notifications;
        } else if (json.data && Array.isArray(json.data)) {
            notifications = json.data;
        }
        
        // Filter unread notifications
        const unreadNotifications = notifications.filter(n => !n.read && !n.is_read);
        const unreadCount = unreadNotifications.length;
        
        // Update notification badge if element exists
        const notifBadge = document.getElementById('notificationBadge');
        if (notifBadge) {
            if (unreadCount > 0) {
                notifBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                notifBadge.style.display = 'inline-block';
            } else {
                notifBadge.style.display = 'none';
            }
        }
        
        // console.log(`Loaded ${notifications.length} notifications, ${unreadCount} unread`);
        
    } catch (err) {
        // console.error('Failed to load notifications:', err);
    }
}

// Auto-refresh notifications every 60 seconds - DISABLED
// setInterval(() => {
//     // console.log('Auto-refreshing notifications...');
//     loadNotifications();
// }, 60000);

// Auto-refresh applications every 30 seconds to catch status updates - DISABLED
// setInterval(() => {
//     // console.log('Auto-refreshing applications...');
//     const user = customAuth.getUserData();
//     if (user) {
//         loadData(user.id);
//     }
// }, 30000);
async function fetchJobs(query = '') {
    const container = document.getElementById("recommendedJobsList");
    if (!container) return;

    try {
        const url = query ? `/dashboard/jobs?q=${encodeURIComponent(query)}` : '/dashboard/jobs';
        const jobsRes = await backendGet(url);
        const jobsData = await handleResponse(jobsRes);
        
        // Safely extract the array depending on how your Python backend wraps it
        let jobs = jobsData?.data?.jobs || jobsData?.data || jobsData || [];
        if (!Array.isArray(jobs)) jobs = [];
        
        const filteredJobs = jobs.filter(job => !appliedJobIds.has(job.id));
        
        renderJobs(filteredJobs);
        
        if(document.getElementById("statActiveJobs")) {
            document.getElementById("statActiveJobs").textContent = filteredJobs.length;
        }

    } catch (err) {
        // Graceful, beautiful fallback card instead of red error text
        container.innerHTML = `
            <div class="card" style="width: 100%; grid-column: 1 / -1;">
                <div class="card-body text-center py-5">
                    <div style="color: #cbd5e0; font-size: 2.5rem; margin-bottom: 1rem;">
                        <i class="fas fa-search"></i>
                    </div>
                    <h5 style="color: var(--text-dark); font-weight: 600;">No recommended jobs right now</h5>
                    <p class="text-muted mb-0">Check back later or try adjusting your search terms!</p>
                </div>
            </div>`;
    }
}
// --- RENDERING UI ---

function renderApplications(apps) {
    const container = document.getElementById("myApplicationsList");
    if (!container) {
        return;
    }

    if (!apps.length) {
        container.innerHTML = "<p class='text-muted text-center py-3'>You haven't applied to any jobs yet.</p>";
        return;
    }

    const sortedApps = apps.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));

    container.innerHTML = sortedApps.map(app => {
        const status = (app.status || 'pending').toLowerCase();
        let displayStatus = app.status || 'Applied';
        let badgeColor = "background:#ebf8ff; color:#2b6cb0;"; 

        if (status === 'interviewing' && !(app.interview_responses && app.interview_responses.length > 0)) {
            displayStatus = 'Pending Interview';
            badgeColor = "background:#fffaf0; color:#c05621;"; 
        } else if (status === 'interviewing' || status === 'interview_submitted' || status === 'responses_submitted' || status === 'analysis_ready' || status.includes('submitted') || status.includes('ready')) {
            displayStatus = 'Interview Submitted';
            badgeColor = "background:#e6fffa; color:#2c7a7b;"; 
        } else if (status === 'hired') {
            displayStatus = 'Offer Received';
            badgeColor = "background:#f0fff4; color:#2f855a;"; 
        } else if (status === 'rejected') {
            displayStatus = 'Not Selected';
            badgeColor = "background:#fff5f5; color:#c53030;"; 
        }

        let actionButton = '';
        if (status === 'interviewing' && !(app.interview_responses && app.interview_responses.length > 0)) {
            actionButton = `
                <a href="interview-room.html?application_id=${app.id}" class="btn btn-primary" style="display:block; text-align:center; margin-top:1rem;">
                   <i class="fas fa-video me-1"></i> Start Interview
                </a>`;
        } else if (status === 'interviewing' || status === 'interview_submitted' || status === 'responses_submitted' || status === 'analysis_ready' || status.includes('submitted') || status.includes('ready')) {
            actionButton = `
                <button data-application-id="${app.id}" class="btn view-response-btn" style="display:block; width:100%; margin-top:1rem; background:transparent; border:1px solid var(--primary-color); color:var(--primary-color);">
                    <i class="fas fa-play-circle me-1"></i> Review Responses
                </button>`;
        } else if (status === 'hired') {
            actionButton = `
                <button data-application-id="${app.id}" class="btn view-response-btn" style="display:block; width:100%; margin-top:1rem; background:transparent; border:1px solid var(--primary-color); color:var(--primary-color);">
                    <i class="fas fa-play-circle me-1"></i> View Offer
                </button>`;
        } else if (status === 'rejected') {
            actionButton = `
                <button data-application-id="${app.id}" data-status="${status}" data-feedback="${app.feedback || ''}" class="btn view-response-btn" style="display:block; width:100%; margin-top:1rem; background:transparent; border:1px solid var(--primary-color); color:var(--primary-color);">
                    <i class="fas fa-play-circle me-1"></i> View Feedback
                </button>`;
        }

        return `
            <div class="card">
                <div class="card-body">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <h4 style="margin:0 0 4px 0; font-size:1.1rem; color: var(--text-dark, #1e293b);">${app.job_title || 'Unknown Role'}</h4>
                            <p class="text-muted" style="margin:0 0 12px 0; font-size:0.9rem;">${app.company_name || 'Skreenit'}</p>
                        </div>
                        <span class="badge" style="${badgeColor}">
                            ${displayStatus}
                        </span>
                    </div>
                    <small class="text-muted" style="display:block; margin-bottom: 0.5rem;">
                        <i class="far fa-clock me-1"></i> Applied: ${app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date not available'}
                    </small>
                    ${actionButton}
                </div>
            </div>`;
    }).join('');
}

function renderJobs(jobs) {
    const container = document.getElementById("recommendedJobsList");
    if (!container) {
        return;
    }

    if (!jobs.length) {
        container.innerHTML = "<div class='text-center py-3 text-muted'>No new jobs found matching your criteria.</div>";
        return;
    }

    container.innerHTML = jobs.map(job => `
        <div class="card">
            <div class="card-body">
                <h4 style="margin:0 0 4px 0; font-size:1.1rem; color: var(--text-dark, #1e293b);">${job.title}</h4>
                <p class="text-muted" style="margin:0 0 12px 0; font-size:0.9rem;">${job.company_name || 'Hiring Company'}</p>
                
                <p class="text-muted" style="font-size:0.85rem; margin:0 0 1rem 0;">
                    <i class="fas fa-map-marker-alt me-1"></i> ${job.location || 'Location not specified'}
                    <span style="margin: 0 8px;">|</span>
                    <span class="badge" style="background:#f1f5f9; color:#475569; font-weight:500;">${job.job_type}</span>
                </p>
                <a href="job-details.html?job_id=${job.id}" class="btn btn-primary" style="display:block; text-align:center; margin-bottom:0.5rem;">
                    View Details
                </a>
                <button onclick="applyForJob('${job.id}')" class="btn btn-success" style="display:block; text-align:center; width:100%; background:#22c55e; border:none; color:white; padding:0.5rem; border-radius:6px; cursor:pointer;">
                    <i class="fas fa-paper-plane"></i> Apply Now
                </button>
            </div>
        </div>
    `).join('');
}

// Apply for job function - redirects to job-details with apply flow
window.applyForJob = function(jobId) {
    window.location.href = `job-details.html?job_id=${jobId}`;
}
async function viewMyResponse(applicationId) {
    const modalEl = document.getElementById('responseModal');
    const modalBody = document.getElementById('responseModalBody');
    const modal = new bootstrap.Modal(modalEl);
    
    modalBody.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Loading your interview videos...</p>
        </div>`;
    modal.show();

    try {
        const response = await backendGet(`/applicant/applications/${applicationId}/responses`);
        const data = await handleResponse(response);
        
        const rawVideoList = data.responses || data.data || [];

        // ✅ THE FIX: Force JavaScript to remove duplicate questions!
        const uniqueVideos = [];
        const seenQuestions = new Set();
        
        for (const video of rawVideoList) {
            // Use the question text as a unique identifier
            const questionText = video.question || 'Unknown';
            if (!seenQuestions.has(questionText)) {
                seenQuestions.add(questionText);
                uniqueVideos.push(video);
            }
        }

        if (!uniqueVideos.length) {
            modalBody.innerHTML = '<div class="alert alert-warning text-center border-0">No video responses found for this application.</div>';
            return;
        }

        modalBody.innerHTML = uniqueVideos.map((resp, i) => `
            <div class="card mb-3 border-0 bg-light">
                <div class="card-header bg-white border-bottom-0 pt-3">
                    <strong class="text-primary">Question ${i + 1}:</strong> ${resp.question || 'Interview Question'}
                    <div class="small text-muted float-end">${resp.created_at ? new Date(resp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date not available'}</div>
                </div>
                <div class="card-body p-0">
                    <div class="ratio ratio-16x9">
                        <video controls style="width: 100%; height: 100%;" id="video-${i}">
                            <source src="${resp.video_url}" type="video/webm">
                        </video>
                    </div>
                </div>
            </div>
        `).join('');

        // Initialize videos after modal is shown
        setTimeout(() => {
            uniqueVideos.forEach((resp, i) => {
                const video = document.getElementById(`video-${i}`);
                if (video) {
                    console.log(`Loading video ${i}:`, `${CONFIG.API_BASE}/applicant/video-proxy/${resp.video_path}`);
                    video.load(); // Force reload video
                    
                    // Add event listeners for debugging
                    video.addEventListener('loadstart', () => console.log(`Video ${i}: Load start`));
                    video.addEventListener('loadeddata', () => console.log(`Video ${i}: Data loaded`));
                    video.addEventListener('canplay', () => console.log(`Video ${i}: Can play`));
                    video.addEventListener('error', (e) => console.error(`Video ${i}: Error`, e));
                }
            });
        }, 500);

    } catch (error) {
        modalBody.innerHTML = '<div class="alert alert-danger text-center border-0">Failed to load videos. Please try again.</div>';
    }
}

function showFeedbackModal(feedback) {
    const modalEl = document.getElementById('responseModal');
    const modalBody = document.getElementById('responseModalBody');
    const modal = new bootstrap.Modal(modalEl);
    
    modalBody.innerHTML = `
        <div class="text-center p-4">
            <div style="width: 60px; height: 60px; background: #fef2f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                <i class="fas fa-info-circle" style="font-size: 1.5rem; color: #dc2626;"></i>
            </div>
            <h5 class="mb-3" style="color: #1e293b;">Application Feedback</h5>
            <div class="alert" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: left; padding: 1rem;">
                <p style="margin: 0; color: #475569; line-height: 1.6;">${feedback || 'No feedback was provided by the recruiter.'}</p>
            </div>
            <p class="text-muted mt-3" style="font-size: 0.85rem;">
                <i class="fas fa-lightbulb me-1"></i> 
                Keep applying! Your perfect opportunity is out there.
            </p>
        </div>`;
    modal.show();
}

function setupEventListeners() {
    const navDashboard = document.getElementById('navDashboard');
    const navJobs = document.getElementById('navJobs');
    const navProfile = document.getElementById('navProfile');
    const navApplications = document.getElementById('navApplications');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const origin = window.location.origin;
    // 1. Sidebar Navigation
    if (navApplications) {
        navApplications.onclick = () => {
            window.location.href = CONFIG.PAGES.MY_APPLICATIONS;
        };
    }
    
    if (navJobs) {
        navJobs.onclick = () => {
            window.location.href = CONFIG.PAGES.JOBS;
        };
    }
    
    if (navDashboard) {
        navDashboard.onclick = () => {
            window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
        };
    }
    
    if (navProfile) {
        navProfile.onclick = async () => {
            try {
                const u = await customAuth.getUserData();
                
                // Check if user has profile data (onboarded means profile exists)
                if (u && (u.onboarded === true || u.onboarded === 'true')) {
                    window.location.href = CONFIG.PAGES.CANDIDATE_PROFILE;
                } else {
                    window.location.href = CONFIG.PAGES.APPLY_FORM;
                }
            } catch (err) {
                // Fallback to apply form if there's an error
                window.location.href = CONFIG.PAGES.APPLY_FORM;
            }
        };
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await customAuth.signOut();
                window.location.href = CONFIG.PAGES.JOBS;
            } catch (err) {
                // Silent fail
            }
        });
    }

    // 2. Dashboard Cards Navigation
    // Applications Sent card - always redirect to My Applications page
    const appsSentCard = document.getElementById('btnAppSent') || document.getElementById('totalApplied')?.closest('.stat-card');
    if (appsSentCard) {
        appsSentCard.style.cursor = 'pointer';
        appsSentCard.addEventListener('click', () => {
            window.location.href = CONFIG.PAGES.MY_APPLICATIONS;
        });
    }

    // Active Jobs card - redirect to Public Jobs listing page
    const activeJobsCard = document.getElementById('btnActiveJobs');
    if (activeJobsCard) {
        activeJobsCard.style.cursor = 'pointer';
        activeJobsCard.addEventListener('click', () => {
            window.location.href = CONFIG.PAGES.JOBS;
        });
    }

    // 3. Search Functionality (FIXED ID mismatches)
    const searchBtn = document.getElementById('jobSearchBtn');
    const searchInput = document.getElementById('jobSearchInput');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => fetchJobs(searchInput.value));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') fetchJobs(searchInput.value);
        });
    }

    // 4. View Response Button Click Delegation
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.view-response-btn');
        if (btn) {
            e.preventDefault(); 
            const appId = btn.dataset.applicationId;
            const status = btn.dataset.status;
            const feedback = btn.dataset.feedback;
            if (appId) {
                if (status === 'rejected') {
                    showFeedbackModal(feedback);
                } else {
                    await viewMyResponse(appId);
                }
            }
        }
    });
}
