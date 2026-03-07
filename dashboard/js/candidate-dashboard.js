import { customAuth } from '@shared/js/auth-config.js';;
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

let appliedJobIds = new Set(); // Track applied job IDs

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    setupEventListeners();
});

async function checkAuth() {
    const user = await customAuth.getUserData();
    if (!user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    updateSidebarProfile(user);
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
        console.error("Load failed", err);
        const appList = document.getElementById("myApplicationsList");
        if(appList) appList.innerHTML = "<p class='text-danger'>Error loading data. Please refresh.</p>";
    }
}
async function fetchJobs(query = '') {
    const container = document.getElementById("recommendedJobsList");
    if (!container) return;

    try {
        const url = query ? `/jobs/jobs?q=${encodeURIComponent(query)}` : '/jobs/jobs';
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
        console.warn("Jobs fetch issue (Backend might be empty):", err);
        
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
    if (!container) return;

    if (!apps.length) {
        container.innerHTML = "<p class='text-muted text-center py-3'>You haven't applied to any jobs yet.</p>";
        return;
    }

    const sortedApps = apps.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));

    container.innerHTML = sortedApps.map(app => {
        const status = (app.status || 'pending').toLowerCase();
        let displayStatus = app.status || 'Applied';
        let badgeColor = "background:#ebf8ff; color:#2b6cb0;"; 

        if (status === 'interviewing') {
            displayStatus = 'Pending Interview';
            badgeColor = "background:#fffaf0; color:#c05621;"; 
        } else if (status === 'interview_submitted' || status === 'completed') {
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
        if (status === 'interviewing') {
            actionButton = `
                <a href="interview-room.html?application_id=${app.id}" class="btn btn-primary" style="display:block; text-align:center; margin-top:1rem;">
                   <i class="fas fa-video me-1"></i> Start Interview
                </a>`;
        } else if (status === 'interview_submitted' || status === 'completed') {
            actionButton = `
                <button data-application-id="${app.id}" class="btn view-response-btn" style="display:block; width:100%; margin-top:1rem; background:transparent; border:1px solid var(--primary-color); color:var(--primary-color);">
                    <i class="fas fa-play-circle me-1"></i> Review Responses
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
                        <i class="far fa-clock me-1"></i> Applied: ${new Date(app.applied_at).toLocaleDateString()}
                    </small>
                    ${actionButton}
                </div>
            </div>`;
    }).join('');
}

function renderJobs(jobs) {
    const container = document.getElementById("recommendedJobsList");
    if (!container) return;

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
                    <i class="fas fa-map-marker-alt me-1"></i> ${job.location || 'Remote'}
                    <span style="margin: 0 8px;">|</span>
                    <span class="badge" style="background:#f1f5f9; color:#475569; font-weight:500;">${job.job_type}</span>
                </p>
                <a href="job-details.html?job_id=${job.id}" class="btn btn-primary" style="display:block; text-align:center;">
                    View Details
                </a>
            </div>
        </div>
    `).join('');
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
                    <div class="small text-muted float-end">${new Date(resp.recorded_at || Date.now()).toLocaleDateString()}</div>
                </div>
                <div class="card-body p-0">
                    <div class="ratio ratio-16x9">
                        <video controls style="background-color: #000;">
                            <source src="${resp.video_url}" type="video/webm">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error fetching interview responses:', error);
        modalBody.innerHTML = '<div class="alert alert-danger text-center border-0">Failed to load videos. Please try again.</div>';
    }
}
async function updateSidebarProfile(user) {
    const nameEl = document.getElementById("userName");
    const roleEl = document.getElementById("candidateRole"); // Sidebar Role ID
    const avatarEl = document.getElementById("userAvatar"); 

    // 1. Set Name - use full_name from user object or fallback to email
    if(nameEl) nameEl.textContent = user.full_name || (user.email ? user.email.split('@')[0] : 'User');

    // 2. Set Default Role
    const defaultTitle = "Fresher";
    if(roleEl) roleEl.textContent = defaultTitle;

    try {
        const res = await backendGet('/applicant/profile');
        const json = await handleResponse(res);
        const profile = json.data || {};

        if (profile.experience && profile.experience.length > 0) {
            const sortedExperience = [...profile.experience].sort((a, b) => {
                return new Date(b.start_date || 0) - new Date(a.start_date || 0);
            });
            const latestJob = sortedExperience[0];
            const expTitle = latestJob.job_title || defaultTitle;
            if (roleEl) roleEl.textContent = expTitle;
        } else {
            if (roleEl) roleEl.textContent = defaultTitle;
        }
        
        // Update name with profile data if available
        if (profile.full_name && nameEl) {
            nameEl.textContent = profile.full_name;
        }
    } catch (err) {
        console.warn("Profile fetch failed, using defaults");
    }

    // 3. Avatar logic - use profile avatar_url since user object doesn't have user_metadata
    if(avatarEl) {
        // Get avatar from profile or use initials
        const getAvatarFromProfile = async () => {
            try {
                const res = await backendGet('/applicant/profile');
                const json = await handleResponse(res);
                const profile = json.data || {};
                
                if (profile.avatar_url) {
                    const initialsSrc = (profile.full_name || user.full_name || user.email || 'User');
                    const initialsSeq = initialsSrc.match(/\b\w/g) || [];
                    const initials = ((initialsSeq.shift() || '') + (initialsSeq.pop() || '')).toUpperCase();
                    avatarEl.innerHTML = `<img src="${profile.avatar_url}" onerror="this.style.display='none'; this.parentElement.textContent='${initials}';" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
                } else {
                    const initials = (profile.full_name || user.full_name || user.email || 'User').match(/\b\w/g) || [];
                    const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
                    avatarEl.innerHTML = text; 
                }
            } catch (err) {
                // Fallback to email or name initials
                const initials = (user.full_name || user.email || 'User').match(/\b\w/g) || [];
                const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
                avatarEl.innerHTML = text;
            }
        };
        
        getAvatarFromProfile();
    }
}
function setupEventListeners() {
    const navDashboard = document.getElementById('navDashboard');
    const navProfile = document.getElementById('navProfile');
    const navApplications = document.getElementById('navApplications');
    const logoutBtn = document.getElementById('logoutBtn'); // Added Logout
    const origin = window.location.origin;
    // 1. Sidebar Navigation
    if (navApplications) {
        navApplications.onclick = () => window.location.href = CONFIG.PAGES.MY_APPLICATIONS;
    }
    if (navProfile) {
        navProfile.onclick = async () => {
            const u = await customAuth.getUserData();
            if (u && u.onboarded) {
                window.location.href = CONFIG.PAGES.CANDIDATE_PROFILE;
            } else {
                window.location.href = CONFIG.PAGES.APPLY_FORM;
            }
        };
    }
    if (navDashboard) {
        navDashboard.onclick = () => window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await customAuth.signOut();
            window.location.href = CONFIG.PAGES.JOBS;
        });
    }

    // 2. Dashboard Cards Navigation (FIXED ID mismatch)
    // Applications card - scroll to the applications list section
    const appsSentCard = document.getElementById('btnAppSent') || document.getElementById('totalApplied')?.closest('.stat-card');
    if (appsSentCard) {
        appsSentCard.style.cursor = 'pointer';

        appsSentCard.addEventListener('click', () => {
            const appsSection = document.getElementById('myApplicationsList');
            if (appsSection) {
                appsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.location.href = CONFIG.PAGES.MY_APPLICATIONS;
            }
        });
    }

    // Active Jobs card - redirect to public jobs page
    const activeJobsCard = document.getElementById('btnActiveJobs');
    if (activeJobsCard) {
        activeJobsCard.style.cursor = 'pointer';
        activeJobsCard.addEventListener('click', () => {
            // Redirect to public jobs page - auth status will be maintained via cookies
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
            if (appId) await viewMyResponse(appId);
        }
    });
}
