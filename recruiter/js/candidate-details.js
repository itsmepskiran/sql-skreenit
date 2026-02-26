import { customAuth } from '@shared/js/auth-config.js';;
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';

// Setup Logo
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

document.addEventListener("DOMContentLoaded", async () => {
    await checkAuth();
});

// --- AUTH & SIDEBAR SYNC ---
async function checkAuth() {
    const { data: { session }, error } = await customAuth.getSession();
    if (error || !session || !session.user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    const user = session.user;
    if ((user.user_metadata?.role || '').toLowerCase() !== 'recruiter') {
        window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE; 
        return;
    }

    updateSidebarProfile(user.user_metadata, user.email);
    updateUserInfo(); 
    setupNavigation();
    initCandidateDetails();
}

function updateSidebarProfile(meta, email) {
    const nameEl = document.getElementById('recruiterName');
    if(nameEl) nameEl.textContent = meta.full_name || email.split('@')[0];

    const companyIdEl = document.getElementById('companyId');
    if(companyIdEl) companyIdEl.textContent = 'Loading...';
}

async function updateUserInfo() {
    try {
        const res = await backendGet('/recruiter/profile');
        const data = await handleResponse(res);
        const profile = data.data || data; 
        
        if (profile) {
            if (profile.contact_name) {
                const el = document.getElementById('recruiterName');
                if (el) el.textContent = profile.contact_name;
            }
            if (profile.company_id || profile.company_name) {
                const companyIdEl = document.getElementById('companyId');
                if (companyIdEl) companyIdEl.textContent = profile.company_id || profile.company_name;
            }
        }
    } catch (error) { 
        const companyIdEl = document.getElementById('companyId');
        if (companyIdEl) companyIdEl.textContent = '---';
    }
}

// --- DATA FETCHING & RENDERING ---
function getIds() {
    const params = new URLSearchParams(window.location.search);
    return {
        candidateId: params.get("candidate_id"),
        jobId: params.get("job_id")
    };
}

async function fetchCandidateDetails(candidateId, jobId) {
    const query = `?candidate_id=${encodeURIComponent(candidateId)}` +
                  (jobId ? `&job_id=${encodeURIComponent(jobId)}` : "");
    const res = await backendGet(`/recruiter/candidate-details${query}`);
    return await handleResponse(res);
}

function renderCandidateDetails(container, data) {
    const profile = data.profile || {};
    const app = data.application || {};
    const skills = data.skills || [];
    const experience = data.experience || [];

    const name = profile.full_name || "Unknown Candidate";
    const email = profile.email || "Not provided";
    const phone = profile.phone || "Not provided";
    const status = app.status || "In Review";
    const resumeUrl = profile.resume_url || null;
    const appliedDate = app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'Unknown';

    // Generate Avatar Initials
    const initials = name.match(/\b\w/g) || [];
    const textInitials = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();

    // Map Experience
    let expHtml = '<div class="text-muted">No experience details added.</div>';
    if (experience.length > 0) {
        expHtml = experience.map(exp => `
            <div class="list-group-item">
                <span class="list-title">${exp.title}</span>
                <span class="list-subtitle"><i class="fas fa-building me-1"></i> ${exp.company} &nbsp;|&nbsp; <i class="far fa-calendar-alt me-1"></i> ${exp.start_date || ''} - ${exp.end_date || 'Present'}</span>
            </div>
        `).join("");
    }

    // Map Skills
    let skillsHtml = '<div class="text-muted">No skills added.</div>';
    if (skills.length > 0) {
        skillsHtml = skills.map(s => `<span class="skill-tag">${s.skill_name || s}</span>`).join("");
    }

    container.innerHTML = `
        <div class="profile-card">
            <div class="profile-avatar">${textInitials || 'C'}</div>
            <div class="profile-info">
                <h2 class="profile-name">${name}</h2>
                <div class="profile-role">Applied for: <span style="color:var(--text-dark);">${app.job_title || 'General Submission'}</span></div>
                
                <div class="profile-meta">
                    <span><i class="fas fa-envelope"></i> ${email}</span>
                    <span><i class="fas fa-phone"></i> ${phone}</span>
                    <span class="badge" style="background:#e0e7ff; color:#3730a3; margin-left:10px;">Status: ${status}</span>
                </div>
            </div>
        </div>

        <div class="profile-grid">
            <div class="profile-section">
                <h3><i class="fas fa-briefcase"></i> Experience</h3>
                <div>${expHtml}</div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                <div class="profile-section">
                    <h3><i class="fas fa-tools"></i> Skills</h3>
                    <div>${skillsHtml}</div>
                </div>

                <div class="profile-section">
                    <h3><i class="fas fa-file-alt"></i> Documents</h3>
                    <p class="text-muted mb-3"><i class="far fa-clock me-1"></i> Applied: ${appliedDate}</p>
                    ${resumeUrl 
                        ? `<a href="${resumeUrl}" class="btn-outline-primary" style="display:inline-flex;" target="_blank"><i class="fas fa-download me-1"></i> View Resume</a>` 
                        : '<span class="text-muted">No resume uploaded.</span>'
                    }
                </div>
            </div>
        </div>
    `;
}

async function initCandidateDetails() {
    const container = document.getElementById("candidateDetails");
    const { candidateId, jobId } = getIds();

    if (!candidateId) {
        container.innerHTML = '<div class="alert alert-danger">Missing candidate ID.</div>';
        return;
    }

    try {
        const data = await fetchCandidateDetails(candidateId, jobId);
        // Handle varying backend response formats safely
        const candidateData = data.data || data; 
        renderCandidateDetails(container, candidateData);
    } catch (err) {
        console.error("Failed to load candidate details:", err);
        container.innerHTML = `
            <div class="card text-center py-5">
                <div class="card-body">
                    <i class="fas fa-exclamation-triangle text-danger mb-3" style="font-size: 2.5rem;"></i>
                    <h4 class="text-dark">Failed to load candidate</h4>
                    <p class="text-muted">Please try again or return to the applications list.</p>
                </div>
            </div>`;
    }
}

// --- ABSOLUTE NAVIGATION ---
function setupNavigation() {
    const origin = window.location.origin;

    const navDashboard = document.getElementById('navDashboard');
    const navJobs = document.getElementById('navJobs');
    const navApplications = document.getElementById('navApplications');
    const navProfile = document.getElementById('navProfile');
    const logoutBtn = document.getElementById('logoutBtn');

    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    if(navJobs) navJobs.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    if(navProfile) navProfile.addEventListener('click', () => window.location.href = CONFIG.PAGES.RECRUITER_PROFILE);

    if(logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await customAuth.signOut();
            window.location.href = CONFIG.PAGES.LOGIN;
        });
    }
}