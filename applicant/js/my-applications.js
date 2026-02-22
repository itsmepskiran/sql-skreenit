import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    setupNavigation();
});

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    updateSidebarProfile(session.user);
    loadApplications();
}

// --- SIDEBAR PROFILE ---
async function updateSidebarProfile(user) {
    const nameEl = document.getElementById("userName");
    const designationEl = document.getElementById("userDesignation");
    const avatarEl = document.getElementById("userAvatar"); 

    if(nameEl) nameEl.textContent = user.user_metadata.full_name || user.email.split('@')[0];

    if(designationEl) {
        designationEl.textContent = "Candidate"; // Default fallback
        try {
            const res = await backendGet('/applicant/profile');
            const json = await handleResponse(res);
            const profile = json.data || {};

            // ✅ Look for the correct database property: profile.experience[0].title
            if (profile.experience && profile.experience.length > 0) {
                designationEl.textContent = profile.experience[0].title || "Candidate";
            }
        } catch (err) {
            // Silent fail
        }
    }

    if(avatarEl) {
        if (user.user_metadata.avatar_url) {
            avatarEl.innerHTML = `<img src="${user.user_metadata.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
        } else {
            const initials = (user.user_metadata.full_name || user.email).match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.innerHTML = text; 
        }
    }
}

// --- LOAD APPLICATIONS ---
async function loadApplications() {
    const container = document.getElementById("applicationsList");
    container.innerHTML = '<div class="text-center p-5 w-100"><div class="spinner-border text-primary"></div></div>';

    try {
        const res = await backendGet(`/applicant/applications`); 
        const json = await handleResponse(res);
        const apps = json || []; 
        
        if(!apps.length) {
            container.innerHTML = "<div class='text-center py-5 text-muted w-100'>You haven't applied to any jobs yet.</div>";
            return;
        }

        // Sort applications by date (newest first)
        apps.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));

        // FIXED: Removed Bootstrap cols so layout.css grid-cards controls it
        container.innerHTML = apps.map(app => {
            const rawStatus = (app.status || 'pending').toLowerCase();
            let displayStatus = app.status || 'Applied';
            let badgeColor = "background:#ebf8ff; color:#2b6cb0;"; 

            if (rawStatus === 'interviewing') {
                displayStatus = 'Pending Interview';
                badgeColor = "background:#fffaf0; color:#c05621;"; 
            } else if (rawStatus === 'interview_submitted' || rawStatus === 'completed') {
                displayStatus = 'Interview Submitted';
                badgeColor = "background:#e6fffa; color:#2c7a7b;"; 
            } else if (rawStatus === 'hired') {
                displayStatus = 'Offer Received';
                badgeColor = "background:#f0fff4; color:#2f855a;"; 
            } else if (rawStatus === 'rejected') {
                displayStatus = 'Not Selected';
                badgeColor = "background:#fff5f5; color:#c53030;"; 
            }

            let actionButton = '';
            if (rawStatus === 'interviewing') {
                actionButton = `
                    <a href="../dashboard/interview-room.html?application_id=${app.id}" 
                       class="btn btn-primary" style="display:block; text-align:center; margin-top:1rem;">
                        <i class="fas fa-video me-1"></i> Start Interview
                    </a>`;
            } else if (rawStatus === 'interview_submitted' || rawStatus === 'completed') {
                actionButton = `
                    <button data-application-id="${app.id}" 
                            class="btn view-response-btn" style="display:block; width:100%; margin-top:1rem; background:transparent; border:1px solid var(--primary-color); color:var(--primary-color);">
                        <i class="fas fa-play-circle me-1"></i> Review Responses
                    </button>`;
            }

            return `
                <div class="card h-100">
                    <div class="card-body d-flex flex-column">
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
                        
                        <div class="mt-auto">
                            ${actionButton}
                            <a href="../dashboard/job-details.html?job_id=${app.job_id}" 
                               style="display:block; text-align:center; width:100%; margin-top:0.75rem; color:var(--text-light); text-decoration:underline; font-size:0.85rem;">
                               View Job Details
                            </a>
                        </div>
                    </div>
                </div>`;
        }).join("");

    } catch (err) {
        console.error("Load failed", err);
        container.innerHTML = "<div class='text-center py-5 text-danger w-100'>Error loading applications. Please refresh.</div>";
    }
}

// --- VIDEO REVIEW LOGIC ---
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

// --- NAVIGATION & EVENT LISTENERS ---
function setupNavigation() {
    const navDashboard = document.getElementById("navDashboard");
    const navProfile = document.getElementById("navProfile");
    const navApplications = document.getElementById("navApplications"); 
    const logoutBtn = document.getElementById("logoutBtn");

    const origin = window.location.origin;

    // Absolute Paths for Sidebar
    if (navDashboard) {
        navDashboard.addEventListener('click', () => {
            window.location.href = `${origin}/dashboard/candidate-dashboard.html`;
        });
    }
    if (navProfile) {
        navProfile.addEventListener('click', () => {
            window.location.href = `${origin}/applicant/candidate-profile.html`;
        });
    }
    if (navApplications) {
        navApplications.addEventListener('click', () => {
            window.location.href = `${origin}/applicant/my-applications.html`;
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = CONFIG.PAGES.LOGIN; // Uses the master config
        });
    }

    // Event Delegation for "Review My Responses" buttons
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.view-response-btn');
        if (btn) {
            e.preventDefault();
            const appId = btn.dataset.applicationId;
            if (appId) {
                await viewMyResponse(appId);
            }
        }
    });
}