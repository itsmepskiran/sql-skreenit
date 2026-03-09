import { customAuth } from '@shared/js/auth-config.js';;
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';

// Configuration & Global State
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
let currentApplicationData = null; 

// Initialize Logo
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
});

// --- AUTH & SIDEBAR SYNC ---
async function checkAuth() {
    const user = await customAuth.getUserData();
    if (!user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    // Initialize sidebar quickly
    updateSidebarProfile({}, user);
    // Fetch recruiter profile for complete data
    await updateUserInfo();

    const urlParams = new URLSearchParams(window.location.search);
    const appId = urlParams.get('id');
    
    if(!appId) {
        alert("Invalid Application ID");
        window.location.href = CONFIG.PAGES.APPLICATION_LIST;
        return;
    }

    loadApplicationDetails(appId);
}

function updateSidebarProfile(profile, user) {
    const nameEl = document.getElementById('recruiterName');
    const companyEl = document.getElementById('companyId');
    const avatarEl = document.getElementById('userAvatar');
    
    // Handle both profile data and user data
    const displayName = profile?.contact_name || profile?.full_name || user?.full_name || user?.name || (user?.email ? user.email.split('@')[0] : 'Recruiter');
    if(nameEl) nameEl.textContent = displayName;
    
    const displayId = profile?.company_display_id || profile?.company_id || profile?.company_name || 'Pending';
    if(companyEl) companyEl.textContent = `Company ID: ${displayId}`;
    
    if(avatarEl) {
        const logoUrl = profile?.company_logo_url || profile?.avatar_url || user?.avatar_url;
        if (logoUrl) {
            avatarEl.innerHTML = `<img src="${logoUrl}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
        } else {
            // Fallback to Initials
            const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            avatarEl.innerHTML = `<div class="avatar-initials">${initials}</div>`;
        }
    }
}

async function updateUserInfo() {
    try {
        const user = await customAuth.getUserData();
        const res = await backendGet('/recruiter/profile');
        const data = await handleResponse(res);
        const profile = data.data || data; 
        
        // Update sidebar with complete profile data
        updateSidebarProfile(profile || {}, user);
        
        // Display company ID with proper format
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
    }
}

// --- ABSOLUTE NAVIGATION ---
function setupNavigation() {
    const navDashboard = document.getElementById('navDashboard');
    const navJobs = document.getElementById('navJobs');
    const navApplications = document.getElementById('navApplications');
    const navProfile = document.getElementById('navProfile');
    const logoutBtn = document.getElementById('logoutBtn');
    const backBtn = document.getElementById('backBtn');

    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    if(navJobs) navJobs.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    if(navProfile) navProfile.addEventListener('click', () => window.location.href = CONFIG.PAGES.RECRUITER_PROFILE);
    
    // ✅ FIX: "Back to List" now explicitly passes status=all to bypass the Pending filter
    if(backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = `${CONFIG.PAGES.APPLICATION_LIST}?status=all`;
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await customAuth.signOut();
            window.location.href = CONFIG.PAGES.JOBS;
        });
    }
}

// --- CORE LOGIC ---
async function loadApplicationDetails(appId) {
    console.log('Loading application details for ID:', appId);
    try {
        // Workaround: Backend /recruiter/applications/{id} only returns application_id
        // So we fetch all applications and find the specific one
        console.log('Fetching all applications to find the specific one...');
        const listRes = await backendGet('/recruiter/applications');
        const listJson = await handleResponse(listRes);
        
        let allApps = [];
        if (Array.isArray(listJson)) {
            allApps = listJson;
        } else if (listJson.data && Array.isArray(listJson.data)) {
            allApps = listJson.data;
        } else if (listJson.applications && Array.isArray(listJson.applications)) {
            allApps = listJson.applications;
        }
        
        console.log('Total applications found:', allApps.length);
        
        // Find the specific application
        const app = allApps.find(a => a.id === appId || a.application_id === appId);
        console.log('Found application:', app);
        
        if (!app) {
            throw new Error(`Application with ID ${appId} not found in list`);
        }

        currentApplicationData = app;
        renderDetails(app);
        setupStatusUpdate(appId);

    } catch (err) {
        console.error("Load failed:", err);
        const state = document.getElementById('loadingState');
        if(state) state.innerHTML = `<p class="text-danger text-center w-100">Failed to load details. ${err.message}</p>`;
    }
}

function renderDetails(app) {
    const loadingState = document.getElementById('loadingState');
    const content = document.getElementById('detailsContent');
    if(loadingState) loadingState.style.display = 'none';
    if(content) content.style.display = 'block';

    // ✅ FIX: Sync the dropdown with the actual candidate status
    const statusSelect = document.getElementById('statusSelect');
    if (statusSelect) {
        let dbStatus = (app.status || 'pending').toLowerCase();
        
        // Map all interview sub-statuses to the "interviewing" dropdown option
        if (['interview_submitted', 'responses ready', 'completed'].includes(dbStatus)) {
            dbStatus = 'interviewing';
        }
        
        // Ensure the status exists in the dropdown, otherwise fallback to pending
        const validOptions = ['pending', 'reviewed', 'interviewing', 'hired', 'rejected'];
        statusSelect.value = validOptions.includes(dbStatus) ? dbStatus : 'pending';
    }

    // Basic Info
    document.getElementById('candidateName').textContent = app.candidate_name || "Candidate";
    document.getElementById('jobTitle').textContent = app.job_title || "Unknown Job";
    document.getElementById('candidateEmail').textContent = app.candidate_email || "-";
    document.getElementById('appliedDate').textContent = new Date(app.applied_at).toLocaleDateString();

    // RESUME EMBED LOGIC
    const viewer = document.getElementById('resumeViewer');
    const noResume = document.getElementById('noResumeState');
    const downloadBtn = document.getElementById('resumeDownloadBtn');

    if (app.resume_link) {
        const isGoogleViewer = !app.resume_link.endsWith('.pdf'); 
        const src = isGoogleViewer 
            ? `https://docs.google.com/gview?url=${encodeURIComponent(app.resume_link)}&embedded=true` 
            : app.resume_link;
        if(viewer) viewer.src = src;
        if(noResume) noResume.style.display = 'none';
        if(downloadBtn) {
            downloadBtn.href = app.resume_link;
            downloadBtn.style.display = 'inline-flex';
        }
    } else {
        if(viewer) viewer.style.display = 'none';
        if(noResume) noResume.style.display = 'flex';
    }

    // INTRO VIDEO SECTION
    const introVideoSection = document.getElementById('introVideoSection');
    const introVideoPlayer = document.getElementById('introVideoPlayer');
    const noIntroVideo = document.getElementById('noIntroVideo');
    
    if (introVideoSection) {
        if (app.intro_video_url) {
            introVideoSection.style.display = 'block';
            if(noIntroVideo) noIntroVideo.style.display = 'none';
            
            // Set video source directly
            if (introVideoPlayer) {
                introVideoPlayer.src = app.intro_video_url;
                introVideoPlayer.style.display = 'block';
                console.log('Loading intro video:', app.intro_video_url);
            }
        } else {
            introVideoSection.style.display = 'none';
            if(noIntroVideo) noIntroVideo.style.display = 'block';
        }
    }

    const skillsContainer = document.getElementById('skillsContainer');
    if (skillsContainer) {
        if (app.skills && app.skills.length > 0) {
            skillsContainer.innerHTML = app.skills.map(s => `<span class="skill-tag">${s}</span>`).join(' ');
        } else {
            skillsContainer.innerHTML = '<span class="text-muted">No specific skills listed.</span>';
        }
    }

    const linkedinGroup = document.getElementById('linkedinGroup');
    const linkedinLink = document.getElementById('linkedinLink');
    if (app.linkedin && linkedinGroup && linkedinLink) {
        linkedinGroup.style.display = 'block';
        linkedinLink.href = app.linkedin;
    }

    const coverLetter = document.getElementById('coverLetter');
    if (coverLetter) {
        coverLetter.textContent = app.cover_letter || "No cover letter provided.";
    }
}

// --- STATUS UPDATE & MODAL WIRING ---
function setupStatusUpdate(appId) {
    const updateBtn = document.getElementById('updateStatusBtn');
    const statusSelect = document.getElementById('statusSelect');
    
    if(!updateBtn || !statusSelect) return;

    updateBtn.addEventListener('click', async () => {
        const newStatus = statusSelect.value;
        if (newStatus === 'interviewing') {
            openInterviewModal((questionsArray) => {
                performStatusUpdate(appId, newStatus, questionsArray);
            });
        } else {
            performStatusUpdate(appId, newStatus, []);
        }
    });
}

async function performStatusUpdate(appId, newStatus, questions) {
    const btn = document.getElementById('updateStatusBtn');
    if(!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const payload = { status: newStatus, questions: questions };

    try {
        await backendPost(`/recruiter/applications/${appId}/status`, payload);
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.style.backgroundColor = "#10b981";
        setTimeout(() => location.reload(), 1000); 
    } catch (err) {
        console.error("Update failed", err);
        alert("Failed to update status.");
        btn.disabled = false;
        btn.textContent = "Update Status";
    }
}

// --- SHARED MODAL LOGIC ---
function openInterviewModal(onConfirmCallback) {
    const modal = document.getElementById('interviewModal');
    const container = document.getElementById('modalQuestionsContainer');
    const addBtn = document.getElementById('addQuestionBtn');
    const confirmBtn = document.getElementById('confirmInterviewBtn');

    if(!modal) return;

    container.innerHTML = `
        <input type="text" class="form-control mb-3 interview-q-input" placeholder="1. e.g. Tell me about yourself." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
        <input type="text" class="form-control mb-3 interview-q-input" placeholder="2. e.g. Walk me through your resume." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
    `;

    addBtn.onclick = () => {
        const count = container.querySelectorAll('.interview-q-input').length + 1;
        container.insertAdjacentHTML('beforeend', `
            <input type="text" class="form-control mb-3 interview-q-input" placeholder="${count}. Next question..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
        `);
    };

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.onclick = () => {
        const inputs = document.querySelectorAll('.interview-q-input');
        const questions = Array.from(inputs).map(i => i.value.trim()).filter(v => v !== '');
        
        if(questions.length === 0) { 
            alert("Please enter at least one question."); 
            return; 
        }

        onConfirmCallback(questions);
        modal.classList.remove('active');
    };

    modal.classList.add('active');
}
async function sendInterviewInvite(appId, status, questions) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/recruiter/applications/${appId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('customAuth.token')}`
            },
            body: JSON.stringify({
                status: status,
                questions: questions
            })
        });

        const result = await response.json();

        if (result.ok) {
            // --- ADD THIS ALERT ---
            alert("✅ Interview questions posted successfully! The candidate can now see the 'Start Interview' button.");
            
            // Optionally close the modal if you are using one
            if (window.inviteModal) window.inviteModal.hide(); 
            
            // Refresh the page to show updated status
            window.location.reload();
        } else {
            alert("❌ Failed to post questions: " + result.error);
        }
    } catch (error) {
        console.error("Error posting questions:", error);
        alert("An error occurred while sending the invite.");
    }
}