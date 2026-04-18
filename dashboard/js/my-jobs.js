import { customAuth } from '@shared/js/auth-config.js';
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import { sidebarManager } from '@shared/js/profile-checker.js';
import { initNotifications } from '@shared/js/notification-manager.js';
import '@shared/js/mobile.js';

// Cache busting - force reload
console.log('my-jobs.js loaded at:', new Date().toISOString());

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

let allJobs = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
});

async function checkAuth() {
    const user = await customAuth.getUserData();
    if (!user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }

    if ((user.role || '').toLowerCase() !== 'recruiter') {
        window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE; 
        return;
    }

    // Use centralized sidebar manager
    await sidebarManager.initSidebar();
    
    // Initialize mobile menu after sidebar is ready
    if (window.initMobileMenu) window.initMobileMenu();
    
    // Setup navigation AFTER mobile menu is initialized
    setupNavigation();
    
    // Initialize notifications
    initNotifications();

    loadJobs();
}

function setupNavigation() {
    const origin = window.location.origin;

    const navDashboard = document.getElementById('navDashboard');
    const navJobs = document.getElementById('navJobs');
    const navApplications = document.getElementById('navApplications');
    const navAnalysis = document.getElementById('navAnalysis');
    const navProfile = document.getElementById('navProfile');
    const logoutBtn = document.getElementById('logoutBtn');
    const postBtn = document.getElementById('postJobBtn');
    const backToDashboardBtn = document.getElementById('backToDashboardBtn');
    if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    if(navJobs) navJobs.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    if(navAnalysis) navAnalysis.addEventListener('click', () => window.location.href = 'analysis.html');
    if(navProfile) navProfile.addEventListener('click', () => window.location.href = CONFIG.PAGES.RECRUITER_PROFILE);
    if(postBtn) postBtn.addEventListener('click', () => window.location.href = CONFIG.PAGES.JOB_CREATE);

    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await customAuth.signOut();
            window.location.href = CONFIG.PAGES.JOBS;
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
        
        console.log('API Response:', JSON.stringify(json, null, 2).substring(0, 2000));
        
        // Normalize the response payload from the backend
        if (Array.isArray(json?.data?.data)) {
            allJobs = json.data.data;
        } else if (Array.isArray(json?.data?.jobs)) {
            allJobs = json.data.jobs;
        } else if (Array.isArray(json?.data)) {
            allJobs = json.data;
        } else if (Array.isArray(json)) {
            allJobs = json;
        } else {
            allJobs = [];
        }
        
        console.log('First job data:', allJobs[0]);

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
        (job.job_title || job.title || '').toLowerCase().includes(term) || 
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
    if (!container) return;

    container.innerHTML = "";

    // Update stats
    const activeCount = allJobs.filter(j => {
        const s = (j.status || 'active').toLowerCase();
        return s === 'active' || s === 'published' || s === 'live';
    }).length;
    
    const totalApplicants = allJobs.reduce((sum, j) => sum + (j.applications_count || 0), 0);
    const totalViews = allJobs.reduce((sum, j) => sum + (j.views || 0), 0);
    
    document.getElementById('activeJobCount').textContent = activeCount;
    document.getElementById('totalApplicants').textContent = totalApplicants;
    document.getElementById('totalViews').textContent = totalViews;

    // Handle Empty State
    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 4rem; background: white; border-radius: 16px; border: 2px dashed #e2e8f0;">
                <i class="fas fa-briefcase fa-3x" style="color: #cbd5e0; margin-bottom: 1rem;"></i>
                <h4 style="color: #1e293b; margin-bottom: 0.5rem;">No jobs found</h4>
                <p class="text-muted">You haven't posted any jobs yet.</p>
                <button class="btn btn-primary" onclick="window.location.href='${CONFIG.PAGES.JOB_CREATE}'" style="margin-top:1rem;">
                    <i class="fas fa-plus me-1"></i> Post Your First Job
                </button>
            </div>`;
        return;
    }

    const formatSalary = (min, max) => {
        // Convert to numbers (handle Decimal from backend)
        const minNum = parseFloat(min) || null;
        const maxNum = parseFloat(max) || null;
        
        const formatNum = (n) => {
            if (n >= 100000) return `${(n / 100000).toFixed(1)} LPA`;
            return `₹${n.toLocaleString()}`;
        };
        if (minNum && maxNum) return `${formatNum(minNum)} - ${formatNum(maxNum)}`;
        if (minNum) return `From ${formatNum(minNum)}`;
        return 'Not specified';
    };
    
    const formatExperience = (min, max) => {
        const minNum = parseInt(min) || null;
        const maxNum = parseInt(max) || null;
        if (minNum !== null && maxNum !== null) return `${minNum}-${maxNum} yrs`;
        if (minNum !== null) return `${minNum}+ yrs`;
        return 'Not specified';
    };

    container.innerHTML = jobs.map(job => {
        const status = (job.status || 'active').toLowerCase();
        // Handle skills - could be array, string, or null
        let skills = job.skills || [];
        if (typeof skills === 'string') {
            try { skills = JSON.parse(skills); } catch(e) { skills = []; }
        }
        const skillsHtml = Array.isArray(skills) ? skills.slice(0, 4).map(s => `<span class="skill-tag">${s}</span>`).join('') : '';
        
        // Debug: log job data to see what's coming through
        console.log('Job data:', job.job_title, 'salary_min:', job.salary_min, 'salary_max:', job.salary_max, 'exp_min:', job.experience_min, 'exp_max:', job.experience_max);
        
        return `
        <div class="job-card" onclick="window.location.href='${CONFIG.PAGES.JOB_DETAILS}?job_id=${job.id}'" style="cursor: pointer;">
            <div class="job-card-header">
                <div>
                    <h3 class="job-card-title">${job.job_title || job.title || 'Untitled Position'}</h3>
                    <p class="job-card-meta">
                        <i class="fas fa-map-marker-alt"></i> ${job.location || 'Remote'}
                        <span style="margin: 0 0.5rem; color: #e2e8f0;">|</span>
                        <i class="fas fa-briefcase"></i> ${job.job_type || 'Full-time'}
                        <span style="margin: 0 0.5rem; color: #e2e8f0;">|</span>
                        <i class="fas fa-building"></i> ${job.work_mode || 'On-site'}
                    </p>
                </div>
                <span class="status-badge status-${status}">${status}</span>
            </div>
            
            <div class="job-stats">
                <div class="job-stat">
                    <div class="job-stat-value">${job.applications_count || 0}</div>
                    <div class="job-stat-label">Applicants</div>
                </div>
                <div class="job-stat">
                    <div class="job-stat-value">${job.views || 0}</div>
                    <div class="job-stat-label">Views</div>
                </div>
                <div class="job-stat">
                    <div class="job-stat-value">${formatSalary(job.salary_min, job.salary_max)}</div>
                    <div class="job-stat-label">Salary</div>
                </div>
                <div class="job-stat">
                    <div class="job-stat-value">${formatExperience(job.experience_min, job.experience_max)}</div>
                    <div class="job-stat-label">Experience</div>
                </div>
            </div>
            
            ${skillsHtml ? `<div class="job-skills">${skillsHtml}</div>` : ''}
            
            <div style="display: flex; gap: 1.5rem; align-items: flex-start;" onclick="event.stopPropagation()">
                <div style="flex: 1;">
                    <div class="job-card-actions">
                        <a href="${CONFIG.PAGES.APPLICATION_LIST}?job_id=${job.id}" class="btn btn-primary">
                            <i class="fas fa-users me-1"></i> View Applicants
                        </a>
                        <a href="${CONFIG.PAGES.JOB_EDIT}?job_id=${job.id}" class="btn btn-outline-primary">
                            <i class="fas fa-edit me-1"></i> Edit
                        </a>
                        <button onclick="event.stopPropagation(); showJobQR('${job.id}', '${(job.job_title || job.title || 'Job').replace(/'/g, "\\'")}')" class="btn btn-outline-secondary">
                            <i class="fas fa-qrcode me-1"></i> QR
                        </button>
                        <button onclick="event.stopPropagation(); deleteJob('${job.id}')" class="btn btn-outline-danger">
                            <i class="fas fa-trash me-1"></i> Delete
                        </button>
                    </div>
                </div>
                <div class="qr-box" id="qr-container-${job.id}" style="width: 70px; height: 70px;"></div>
            </div>
        </div>`;
    }).join('');

    // Generate QR codes
    jobs.forEach(job => {
        const qrBox = document.getElementById(`qr-container-${job.id}`);
        const jobUrl = `${CONFIG.PAGES.JOB_DETAILS}?job_id=${job.id}`;
        
        if (qrBox) {
            const canvas = document.createElement('canvas');
            QRCode.toCanvas(canvas, jobUrl, {
                width: 54,
                margin: 0,
                color: { dark: '#1e293b', light: '#ffffff' }
            }, function (error) {
                if (error) console.error("QR Error:", error);
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