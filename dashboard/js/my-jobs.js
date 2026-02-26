import { customAuth } from '@shared/js/auth-config.js';;
import { backendGet, backendDelete, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

let allJobs = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    setupNavigation();
});

async function checkAuth() {
    const { data: { session }, error } = await customAuth.getSession();
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
    const backToDashboardBtn = document.getElementById('backToDashboardBtn');
    if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    if(navJobs) navJobs.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY-JOBS);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    if(navProfile) navProfile.addEventListener('click', () => window.location.href = CONFIG.PAGES.RECRUITER_PROFILE);
    if(postBtn) postBtn.addEventListener('click', () => window.location.href = CONFIG.PAGES.JOB_CREATE);

    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await customAuth.signOut();
            window.location.href = CONFIG.PAGES.LOGIN;
        });
    }

    document.getElementById('jobSearch').addEventListener('input', (e) => {
        filterJobs(e.target.value);
    });
}

async function loadJobs(userId) {
    const container = document.getElementById('myJobsList');
    // Ensure we also check for your other container ID just in case
    const targetContainer = container || document.getElementById('jobsContainer');
    
    if (targetContainer) {
        targetContainer.innerHTML = '<div class="loading-spinner"></div>';
    }

    try {
        const res = await backendGet(`/recruiter/jobs?user_id=${userId}`);
        const json = await handleResponse(res);
        
        allJobs = json.data?.jobs || json.data || [];
        if(!Array.isArray(allJobs)) allJobs = [];

        const activeCount = allJobs.filter(j => {
            const s = (j.status || 'active').toLowerCase();
            return s === 'active' || s === 'published' || s === 'live';
        }).length;

        const countEl = document.getElementById('activeJobCount');
        if (countEl) countEl.textContent = activeCount;

        renderJobs(allJobs);

    } catch (err) {
        if (targetContainer) {
            targetContainer.innerHTML = `<div class="alert alert-danger w-100 text-center">Failed to load jobs. ${err.message}</div>`;
        }
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
    // 1. Identify the correct container from your HTML
    const container = document.getElementById('jobsContainer') || document.getElementById('myJobsList');
    if (!container) return;

    // 2. Clear container and set the grid class
    container.innerHTML = "";
    container.className = 'grid-cards'; 

    // 3. Handle Empty State
    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem; background: white; border-radius: 12px; border: 2px dashed #e2e8f0;">
                <i class="fas fa-briefcase fa-3x" style="color: #cbd5e0; margin-bottom: 1rem;"></i>
                <p class="text-muted">You haven't posted any jobs yet.</p>
                <button class="btn btn-primary" onclick="window.location.href='${CONFIG.PAGES.JOB_CREATE}'" style="margin-top:1rem;">Post Your First Job</button>
            </div>`;
        return;
    }

    // 4. Generate the Grid HTML
    container.innerHTML = jobs.map(job => {
        const status = (job.status || 'active').toLowerCase();
        
        return `
<div class="job-card-premium" onclick="window.location.href='${CONFIG.PAGES.JOB_DETAILS}?job_id=${job.id}'" style="cursor: pointer; transition: transform 0.2s ease, border-color 0.2s ease;" onmouseover="this.style.borderColor='var(--primary-color)'; this.style.transform='translateY(-3px)';" onmouseout="this.style.borderColor='transparent'; this.style.transform='translateY(0)';">
    
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <span class="job-status-badge status-${status}">${status}</span>
        <small class="text-muted"><i class="far fa-calendar-alt"></i> ${new Date(job.created_at).toLocaleDateString()}</small>
    </div>
    
    <div style="display: flex; gap: 15px; margin-bottom: 1.5rem;">
        <div id="qr-container-${job.id}" class="qr-grid-box" style="background: white; padding: 5px; border-radius: 8px; border: 1px solid #e2e8f0; height: 70px; width: 70px; display: flex; align-items: center; justify-content: center;"></div>
        
        <div style="flex: 1;">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--text-dark); font-weight: 700;">${job.title}</h3>
            <p style="color: var(--text-light); font-size: 0.85rem; margin: 0;">
                <i class="fas fa-map-marker-alt" style="margin-right: 5px;"></i> ${job.location || 'Remote'}
            </p>
        </div>
    </div>

    <div style="margin-top: auto; display: flex; flex-direction: column; gap: 0.75rem;" onclick="event.stopPropagation();" style="cursor: default;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
            <a href="${CONFIG.PAGES.APPLICATION_LIST}?job_id=${job.id}" class="btn btn-primary" onclick="event.stopPropagation();">Applicants</a>
            <a href="${CONFIG.PAGES.JOB_EDIT}?job_id=${job.id}" class="btn btn-secondary" onclick="event.stopPropagation();">Edit</a>
        </div>
        <div style="display: grid; grid-template-columns: 1fr; gap: 0.5rem;">
            <button onclick="event.stopPropagation(); deleteJob('${job.id}')" class="btn btn-outline-danger" style="font-size: 0.85rem;">Delete Job</button>
        </div>
    </div>
</div>`;
    }).join('');

    // 5. Generate the actual QR codes for each card
    jobs.forEach(job => {
        const qrBox = document.getElementById(`qr-container-${job.id}`);
        const jobUrl = `${CONFIG.PAGES.JOB_DETAILS}?job_id=${job.id}`;
        
        if (qrBox) {
            const canvas = document.createElement('canvas');
            QRCode.toCanvas(canvas, jobUrl, {
                width: 60,
                margin: 0,
                color: {
                    dark: '#1e293b',
                    light: '#ffffff'
                }
            }, function (error) {
                if (error) console.error("QR Grid Error:", error);
                qrBox.appendChild(canvas);
            });
        }
    });
}
window.deleteJob = async function(jobId) {
    if(!confirm("Are you sure you want to delete this job? This action cannot be undone.")) return;

    try {
        await backendDelete(`/recruiter/jobs/${jobId}`);
        
        // Remove from the local array
        allJobs = allJobs.filter(j => j.id !== jobId);
        
        // ✅ RE-COUNT: Use the standard "Live" statuses only
        const activeCount = allJobs.filter(j => {
            const s = (j.status || 'active').toLowerCase();
            // Removed 'archived' to match standard dashboard logic
            return s === 'active' || s === 'published' || s === 'live';
        }).length;

        const countEl = document.getElementById('activeJobCount');
        if (countEl) countEl.textContent = activeCount;
        
        // Refresh the grid
        renderJobs(allJobs);
    } catch (err) {
        alert("Failed to delete job: " + err.message);
    }
};
window.showJobQR = async function(jobId, title) {
    const modal = document.getElementById('qrModal');
    const container = document.getElementById('qrcodeDisplay');
    const jobUrl = `${CONFIG.PAGES.JOB_DETAILS}?job_id=${jobId}`;

    container.innerHTML = ""; // Clear old QR
    
    try {
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, jobUrl, { width: 250, margin: 2 });
        container.appendChild(canvas);
        
        document.getElementById('qrModalTitle').textContent = title;
        modal.classList.add('active');
        modal.style.display = 'flex';

        // Setup Download
        document.getElementById('downloadQrBtn').onclick = () => {
            const link = document.createElement('a');
            link.download = `QR_${title.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL();
            link.click();
        };

        // Setup Close
        document.getElementById('closeQrModal').onclick = () => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        };
    } catch (err) {
        console.error(err);
    }
};