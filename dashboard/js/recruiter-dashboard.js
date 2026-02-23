import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    const user = session.user;

    // Load fast initial data from Supabase Auth
    updateSidebarProfile(user.user_metadata, user.email);
    
    // Load deep data from your Backend Database
    updateUserInfo(); 
    loadDashboardData(user.id);
}

function updateSidebarProfile(meta, email) {
    // 1. Update Name
    const nameEl = document.getElementById('userName');
    if(nameEl) nameEl.textContent = meta.full_name || email.split('@')[0];

    // 2. Set default loading state (Just "Loading..." without prefixes)
    const companyIdEl = document.getElementById('companyId');
    if(companyIdEl) {
        companyIdEl.textContent = 'Loading...';
    }
}

async function updateUserInfo() {
  try {
    const res = await backendGet('/recruiter/profile');
    const data = await handleResponse(res);
    const profile = data.data || data; 
    
    if (profile) {
        // Update Name if contact_name exists
        if (profile.contact_name) {
            const el = document.getElementById('userName');
            if (el) el.textContent = profile.contact_name;
        }

        // Target the 'companyId' element and inject ONLY the raw value
        if (profile.company_id || profile.company_name) {
            const companyIdEl = document.getElementById('companyId');
            if (companyIdEl) {
                companyIdEl.textContent = profile.company_id || profile.company_name;
            }
        }
    }
  } catch (error) { 
      console.warn('Error loading user info:', error); 
      // Clean fallback if it fails
      const companyIdEl = document.getElementById('companyId');
      if (companyIdEl) companyIdEl.textContent = '---';
  }
}

function setupEventListeners() {
    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => { 
            await supabase.auth.signOut(); 
            window.location.href = CONFIG.PAGES.LOGIN; 
        });
    }

    // --- BANNER CLICK EVENTS ---
    const btnJobs = document.getElementById('btnActiveJobs');
    if(btnJobs) btnJobs.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);

    const btnCands = document.getElementById('btnCandidates');
    if(btnCands) btnCands.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);

    const btnApps = document.getElementById('btnNewApps');
    if(btnApps) btnApps.addEventListener('click', () => window.location.href = `${CONFIG.PAGES.APPLICATION_LIST}?status=pending`);
}

async function loadDashboardData(userId) {
    try {
        // A. Fetch Jobs
        const jobsRes = await backendGet(`/recruiter/jobs?user_id=${userId}`);
        const jobsData = await handleResponse(jobsRes);
        let jobsList = jobsData?.data?.jobs || jobsData?.data || [];
        if(!Array.isArray(jobsList)) jobsList = [];
        
        // Update Stats
        const activeJobsCount = jobsList.filter(j => (j.status || '').toLowerCase() === 'active').length;
        setText("statActiveJobs", activeJobsCount);

        renderJobs(jobsList.slice(0, 5));

        // B. Fetch Applications
        let appsList = [];
        try {
            const appsRes = await backendGet(`/recruiter/applications`); 
            const appsData = await handleResponse(appsRes);
            appsList = appsData?.data || appsData || [];
        } catch (e) { console.warn("Apps fetch error", e); }

        if (Array.isArray(appsList)) {
            renderApplications(appsList.slice(0, 6)); 
            
            // Update Stats
            const totalCandidates = new Set(appsList.map(a => a.candidate_id)).size;
            
            const newStatuses = ['pending', 'applied', 'submitted', 'new'];
            const newAppsCount = appsList.filter(a => 
                newStatuses.includes((a.status || '').toLowerCase())
            ).length;
            
            setText("statTotalCandidates", totalCandidates);
            setText("statNewApplications", newAppsCount);
        }

    } catch (err) { console.error("Dashboard load error:", err); }
}

// Inside your renderApplications or loadRecentApplications function:
function renderApplications(apps) {
    const container = document.getElementById("recentApplicationsList"); // Ensure this matches your HTML ID
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

        // ✅ LOGIC UPDATED: Check for submitted interviews
        if (status === 'interview_submitted' || status === 'completed') {
            displayStatus = 'Responses Received';
            badgeClass = "badge-success"; 
            actionButton = `
                <button onclick="viewInterviewResponses('${app.id}')" class="btn btn-sm btn-primary w-100 mt-2">
                    <i class="fas fa-play-circle me-1"></i> View Responses
                </button>`;
        } else if (status === 'interviewing') {
            displayStatus = 'Interviewing';
            badgeClass = "badge-interviewing";
            actionButton = `<a href "${CONFIG.PAGES.APPLICATION_DETAILS}?id=${app.id}" class="btn btn-sm btn-outline-primary w-100 mt-2">Manage Interview</a>`;
        } else {
            actionButton = `<a href"${CONFIG.PAGES.APPLICATION_DETAILS}?id=${app.id}" class="btn btn-sm btn-secondary w-100 mt-2">View Details</a>`;
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
// ✅ NEW HELPER FUNCTION: Handle viewing responses in a modal
window.viewInterviewResponses = async function(applicationId) {
    const modalEl = document.getElementById('responseModal');
    const modalBody = document.getElementById('responseModalBody');
    
    if (!modalEl || !modalBody) {
        console.error("Response modal elements not found in HTML");
        return;
    }

    const modal = new bootstrap.Modal(modalEl);
    modalBody.innerHTML = `<div class="text-center p-4"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Loading responses...</p></div>`;
    modal.show();

    try {
        // Fetch responses using the recruiter-secured endpoint
        const res = await backendGet(`/recruiter/applications/${applicationId}/responses`);
        const data = await handleResponse(res);
        const responses = data.responses || [];

        if (responses.length === 0) {
            modalBody.innerHTML = `<div class="alert alert-warning">No video responses found for this candidate.</div>`;
            return;
        }

        modalBody.innerHTML = responses.map((resp, i) => `
            <div class="card mb-3 bg-light border-0">
                <div class="card-header bg-transparent border-0 pt-3">
                    <strong>Question ${i + 1}:</strong> ${resp.question}
                </div>
                <div class="card-body">
                    <div class="ratio ratio-16x9">
                        <video controls style="border-radius: 8px; background: #000;">
                            <source src="${resp.video_url}" type="video/webm">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Failed to load interview responses:", err);
        modalBody.innerHTML = `<div class="alert alert-danger">Error loading video responses.</div>`;
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
        <div class="card" onclick="window.location.href=${CONFIG.PAGES.JOB_DETAILS}?job_id=${job.id}'" style="cursor:pointer;">
            <div class="card-body">
                <h4 style="margin:0 0 4px 0; font-size:1.1rem; color: var(--text-dark, #1e293b);">${job.title}</h4>
                <p class="text-muted" style="margin:0 0 12px 0; font-size:0.9rem;">
                    <i class="fas fa-map-marker-alt me-1"></i> ${job.location || 'Remote'}
                </p>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="badge" style="background:#f1f5f9; color:#475569;">
                        ${job.job_type || 'Full Time'}
                    </span>
                    <small class="text-muted">Posted: ${new Date(job.created_at).toLocaleDateString()}</small>
                </div>
            </div>
        </div>
    `).join("");
}

function setText(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
}