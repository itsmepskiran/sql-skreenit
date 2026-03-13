import { customAuth } from '@shared/js/auth-config.js';;
import { backendGet, backendPost, backendPut, handleResponse } from '@shared/js/backend-client.js';
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

    if (app.resume_url) {
        const isGoogleViewer = !app.resume_url.endsWith('.pdf'); 
        const src = isGoogleViewer 
            ? `https://docs.google.com/gview?url=${encodeURIComponent(app.resume_url)}&embedded=true` 
            : app.resume_url;
        if(viewer) viewer.src = src;
        if(noResume) noResume.style.display = 'none';
        if(downloadBtn) {
            downloadBtn.href = app.resume_url;
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

    // ✅ NEW: INTERVIEW VIDEO RESPONSES SECTION
    const interviewVideosSection = document.getElementById('interviewVideosSection');
    const interviewVideosContainer = document.getElementById('interviewVideosContainer');
    const noInterviewVideos = document.getElementById('noInterviewVideos');
    const interviewVideoCount = document.getElementById('interviewVideoCount');
    
    if (interviewVideosSection) {
        const responses = app.interview_responses || [];
        const videoUrls = app.interview_video_urls || [];
        
        // Update count in header
        if (interviewVideoCount) {
            interviewVideoCount.textContent = responses.length > 0 ? `(${responses.length})` : '';
        }
        
        if (responses.length > 0 || videoUrls.length > 0) {
            interviewVideosSection.style.display = 'block';
            if(noInterviewVideos) noInterviewVideos.style.display = 'none';
            
            if (interviewVideosContainer) {
                // Build video player HTML for each response
                const videosHtml = responses.map((response, index) => `
                    <div style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                        <h6 style="margin: 0 0 1rem 0; color: #334155; font-size: 1rem; font-weight: 600;">
                            <span style="background: #4338ca; color: white; padding: 4px 12px; border-radius: 6px; margin-right: 10px; font-size: 0.85rem;">Q${index + 1}</span>
                            ${response.question || `Question ${index + 1}`}
                        </h6>
                        <video controls width="100%" style="max-height: 350px; border-radius: 8px; background: #000;" preload="metadata">
                            <source src="${response.video_url}" type="video/webm">
                            <source src="${response.video_url}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                        <div style="margin-top: 0.75rem; font-size: 0.85rem; color: #64748b; display: flex; gap: 1.5rem;">
                            ${response.duration ? `<span><i class="fas fa-clock me-1"></i> ${Math.round(response.duration / 60)}:${(response.duration % 60).toString().padStart(2, '0')}</span>` : ''}
                            ${response.created_at ? `<span><i class="fas fa-calendar me-1"></i> ${new Date(response.created_at).toLocaleString()}</span>` : ''}
                        </div>
                    </div>
                `).join('');
                
                interviewVideosContainer.innerHTML = videosHtml;
                console.log(`Loaded ${responses.length} interview videos for application ${app.id}`);
            }
        } else {
            interviewVideosSection.style.display = 'block'; // Show section but with "no videos" message
            if(interviewVideosContainer) interviewVideosContainer.innerHTML = '';
            if(noInterviewVideos) noInterviewVideos.style.display = 'flex';
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
    console.log('DEBUG: Setting up status update for appId:', appId);
    const updateBtn = document.getElementById('updateStatusBtn');
    const statusSelect = document.getElementById('statusSelect');
    
    console.log('DEBUG: updateBtn found:', !!updateBtn);
    console.log('DEBUG: statusSelect found:', !!statusSelect);
    
    if(!updateBtn || !statusSelect) {
        console.log('DEBUG: Missing elements, skipping setup');
        return;
    }

    updateBtn.addEventListener('click', async () => {
        console.log('DEBUG: Update button clicked!');
        const newStatus = statusSelect.value;
        console.log('DEBUG: Selected status:', newStatus);
        if (newStatus === 'interviewing') {
            openInterviewModal((questionsArray) => {
                performStatusUpdate(appId, newStatus, questionsArray);
            });
        } else if (newStatus === 'rejected') {
            openRejectionModal((rejectionReason) => {
                performStatusUpdate(appId, newStatus, [], rejectionReason);
            });
        } else {
            openCommentModal(newStatus, (comment) => {
                performStatusUpdate(appId, newStatus, [], comment);
            });
        }
    });
}

console.log('DEBUG: Status update event listener attached');

async function performStatusUpdate(appId, newStatus, questions, rejectionReason = null, comment = null) {
    const btn = document.getElementById('updateStatusBtn');
    if(!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const payload = { status: newStatus, questions: questions };
    if (rejectionReason) {
        payload.rejection_reason = rejectionReason;
    }
    if (comment) {
        payload.comment = comment;
    }
    console.log('DEBUG: Sending status update request:', payload);
    console.log('DEBUG: Application ID:', appId);

    try {
        console.log('DEBUG: About to send PUT request to:', `${CONFIG.API_BASE}/recruiter/applications/${appId}/status`);
        console.log('DEBUG: Payload:', payload);
        
        // Debug: Check what tokens are available and how backendGet works
        console.log('DEBUG: Available tokens:');
        console.log('  - customAuth.token:', localStorage.getItem('customAuth.token'));
        console.log('  - token:', localStorage.getItem('token'));
        console.log('  - auth_token:', localStorage.getItem('auth_token'));
        
        // Debug: Let's see what's in the session
        console.log('DEBUG: Session data:', await customAuth.getSession());
        
        // Use backendPut instead of manual fetch - it should handle auth properly
        const response = await backendPut(`/recruiter/applications/${appId}/status`, payload);
        console.log('DEBUG: Status update response:', response);
        console.log('DEBUG: Response status:', response.status);
        console.log('DEBUG: Response ok:', response.ok);

        if (response.ok) {
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.style.backgroundColor = "#10b981";
            
            // Update local data immediately before reload
            if (currentApplicationData) {
                currentApplicationData.status = newStatus;
            }
            
            setTimeout(() => location.reload(), 1000);
        } else {
            // Try to get error details from the response
            let errorDetails = 'Failed to update status';
            try {
                const errorData = await response.json();
                errorDetails = errorData.detail || errorData.message || errorData.error || 'Failed to update status';
                console.log('DEBUG: Backend error details:', errorData);
            } catch (e) {
                console.log('DEBUG: Could not parse error response:', e);
            }
            throw new Error(errorDetails);
        }
        
    } catch (err) {
        console.error("DEBUG: Update failed:", err);
        console.error("DEBUG: Full error details:", err.message);
        console.error("DEBUG: Error stack:", err.stack);
        alert(`Failed to update status: ${err.message}`);
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

    // Set specific title for interview modal
    const modalTitle = modal.querySelector('h3');
    if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-video text-primary me-2"></i> Interview Questions';

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
    newConfirmBtn.textContent = 'Send to Candidate';

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

function openRejectionModal(onConfirmCallback) {
    const modal = document.getElementById('interviewModal');
    const container = document.getElementById('modalQuestionsContainer');
    const addBtn = document.getElementById('addQuestionBtn');
    const confirmBtn = document.getElementById('confirmInterviewBtn');

    if(!modal) return;

    // Change modal title and content for rejection
    const modalTitle = modal.querySelector('h3');
    if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-times-circle text-danger me-2"></i> Rejection Reason';
    
    container.innerHTML = `
        <textarea class="form-control mb-3 rejection-reason-input" placeholder="Please provide a reason for rejection (optional)..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; min-height: 100px; resize: vertical;"></textarea>
    `;

    // Hide add button since we don't need it for rejection
    if (addBtn) addBtn.style.display = 'none';

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.textContent = 'Save';

    newConfirmBtn.onclick = () => {
        const textarea = container.querySelector('.rejection-reason-input');
        const rejectionReason = textarea ? textarea.value.trim() : '';
        
        onConfirmCallback(rejectionReason);
        modal.classList.remove('active');
        
        // Reset modal for next use
        if (addBtn) addBtn.style.display = 'block';
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-video text-primary me-2"></i> Set Interview Questions';
        if (confirmBtn) confirmBtn.textContent = 'Save & Request Interview';
    };

    modal.classList.add('active');
}

function openCommentModal(status, onConfirmCallback) {
    const modal = document.getElementById('interviewModal');
    const container = document.getElementById('modalQuestionsContainer');
    const addBtn = document.getElementById('addQuestionBtn');
    const confirmBtn = document.getElementById('confirmInterviewBtn');

    if(!modal) return;

    // Change modal title and content for status comment
    const modalTitle = modal.querySelector('h3');
    if (modalTitle) {
        const statusCapitalized = status.charAt(0).toUpperCase() + status.slice(1);
        let icon = '';
        switch(status) {
            case 'pending':
                icon = '<i class="fas fa-clock text-warning me-2"></i>';
                break;
            case 'reviewed':
                icon = '<i class="fas fa-eye text-info me-2"></i>';
                break;
            case 'hired':
                icon = '<i class="fas fa-check-circle text-success me-2"></i>';
                break;
            default:
                icon = '<i class="fas fa-comment text-secondary me-2"></i>';
        }
        modalTitle.innerHTML = `${icon} ${statusCapitalized} - Add Comment`;
    }
    
    // Get placeholder text based on status
    let placeholder = '';
    switch(status) {
        case 'pending':
            placeholder = 'Add any notes about why this application is pending...';
            break;
        case 'reviewed':
            placeholder = 'Add review notes or feedback...';
            break;
        case 'hired':
            placeholder = 'Add onboarding details or welcome notes...';
            break;
        default:
            placeholder = 'Add any additional comments...';
    }
    
    container.innerHTML = `
        <textarea class="form-control mb-3 status-comment-input" placeholder="${placeholder} (optional)..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; min-height: 100px; resize: vertical;"></textarea>
    `;

    // Hide add button since we don't need it for comments
    if (addBtn) addBtn.style.display = 'none';

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.textContent = 'Save';

    newConfirmBtn.onclick = () => {
        const textarea = container.querySelector('.status-comment-input');
        const comment = textarea ? textarea.value.trim() : '';
        
        onConfirmCallback(comment);
        modal.classList.remove('active');
        
        // Reset modal for next use
        if (addBtn) addBtn.style.display = 'block';
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-video text-primary me-2"></i> Set Interview Questions';
        if (confirmBtn) confirmBtn.textContent = 'Save & Request Interview';
    };

    modal.classList.add('active');
}