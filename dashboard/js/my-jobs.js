import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, backendDelete, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

let allJobs = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    setupNavigation();
});

async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) { window.location.href = CONFIG.PAGES.LOGIN; return; }
    
    const user = session.user;
    if ((user.user_metadata?.role || '').toLowerCase() !== 'recruiter') {
        window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
        return;
    }

    updateSidebarProfile(user.user_metadata, user.email);
    updateUserInfo();
    loadJobs(user.id);
}

function updateSidebarProfile(meta, email) {
    const nameEl = document.getElementById('recruiterName');
    const avatarEl = document.getElementById('userAvatar'); 
    
    if(nameEl) nameEl.textContent = meta.full_name || meta.contact_name || email.split('@')[0];
    
    if(avatarEl) {
        if (meta.avatar_url) {
            avatarEl.innerHTML = `<img src="${meta.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
        } else {
            const initials = (meta.full_name || email).match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.innerHTML = text; 
        }
    }
}

async function updateUserInfo() {
    try {
        const res = await backendGet('/recruiter/profile');
        const data = await handleResponse(res);
        const profile = data.data || data; 
        
        if (profile && (profile.company_id || profile.company_name)) {
            const companyIdEl = document.getElementById('companyId');
            if (companyIdEl) companyIdEl.textContent = profile.company_id || profile.company_name;
        }
    } catch (error) { 
        // Silent fail
    }
}

function setupNavigation() {
    const origin = window.location.origin;

    const navDashboard = document.getElementById('navDashboard');
    const navJobs = document.getElementById('navJobs');
    const navApplications = document.getElementById('navApplications');
    const navProfile = document.getElementById('navProfile');
    const logoutBtn = document.getElementById('logoutBtn');
    const postBtn = document.getElementById('postJobBtn');

    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    if(navJobs) navJobs.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY-JOBS);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    if(navProfile) navProfile.addEventListener('click', () => window.location.href = CONFIG.PAGES.RECRUITER_PROFILE);
    if(postBtn) postBtn.addEventListener('click', () => window.location.href = CONFIG.PAGES.JOB_CREATE);

    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = CONFIG.PAGES.LOGIN;
        });
    }

    document.getElementById('jobSearch').addEventListener('input', (e) => {
        filterJobs(e.target.value);
    });
}

async function loadJobs(userId) {
    const container = document.getElementById('myJobsList');
    container.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const res = await backendGet(`/recruiter/jobs?user_id=${userId}`);
        const json = await handleResponse(res);
        
        allJobs = json.data?.jobs || json.data || [];
        if(!Array.isArray(allJobs)) allJobs = [];

        const activeCount = allJobs.filter(j => j.status === 'active').length;
        document.getElementById('activeJobCount').textContent = activeCount;

        renderJobs(allJobs);

    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger w-100 text-center">Failed to load jobs. ${err.message}</div>`;
    }
}
function filterJobs(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const filtered = allJobs.filter(job => 
        job.title.toLowerCase().includes(term) || 
        (job.location || '').toLowerCase().includes(term)
    );
    
    // If no results, show a polished "No Results" state instead of a blank screen
    if (filtered.length === 0 && term !== "") {
        const container = document.getElementById('myJobsList');
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #94a3b8;">
                <i class="fas fa-search fa-2x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No jobs found matching "${searchTerm}"</p>
            </div>`;
        return;
    }
    
    renderJobs(filtered);
}
function renderJobs(jobs) {
    const container = document.getElementById('myJobsList');
    
    if (jobs.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem; background: white; border-radius: 12px; border: 2px dashed #e2e8f0;">
                <i class="fas fa-briefcase fa-3x" style="color: #cbd5e0; margin-bottom: 1rem;"></i>
                <p class="text-muted">You haven't posted any jobs yet.</p>
                <button class="btn btn-primary" onclick="window.location.href='${CONFIG.PAGES.JOB_CREATE}'" style="margin-top:1rem;">Post Your First Job</button>
            </div>`;
        return;
    }

    // This uses the new .grid-cards architecture
    container.className = 'grid-cards'; 

    container.innerHTML = jobs.map(job => {
        const status = (job.status || 'active').toLowerCase();
        
        return `
        <div class="job-card-premium">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <span class="job-status-badge status-${status}">${status}</span>
                <small class="text-muted"><i class="far fa-calendar-alt"></i> ${new Date(job.created_at).toLocaleDateString()}</small>
            </div>
            
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; color: var(--text-dark); font-weight: 700;">${job.title}</h3>
            
            <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 1.5rem;">
                <i class="fas fa-map-marker-alt" style="margin-right: 5px;"></i> ${job.location || 'Remote'}
            </p>

            <div style="margin-top: auto; display: flex; flex-direction: column; gap: 0.75rem;">
                <a href="${CONFIG.PAGES.APPLICATION_LIST}?job_id=${job.id}" class="btn btn-primary w-100" style="text-align: center; justify-content: center;">
                    <i class="fas fa-users me-2"></i> View Applicants
                </a>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <a href="${CONFIG.PAGES.JOB_EDIT}?job_id=${job.id}" class="btn btn-secondary w-100" style="text-align: center; justify-content: center; font-size: 0.85rem;">
                        <i class="fas fa-edit me-1"></i> Edit
                    </a>
                    <button onclick="deleteJob('${job.id}')" class="btn btn-secondary w-100" style="text-align: center; justify-content: center; font-size: 0.85rem; color: #ef4444; border-color: #fee2e2;">
                        <i class="fas fa-trash me-1"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}
window.deleteJob = async function(jobId) {
    if(!confirm("Are you sure you want to delete this job? This action cannot be undone.")) return;

    try {
        await backendDelete(`/recruiter/jobs/${jobId}`);
        allJobs = allJobs.filter(j => j.id !== jobId);
        
        const activeCount = allJobs.filter(j => j.status === 'active').length;
        document.getElementById('activeJobCount').textContent = activeCount;
        
        renderJobs(allJobs);
    } catch (err) {
        alert("Failed to delete job: " + err.message);
    }
};