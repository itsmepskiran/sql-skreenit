import { customAuth } from '@shared/js/auth-config.js';
import { backendGet, backendPost, backendPut, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

let allApplications = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    setupEventListeners();
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

    // Initialize sidebar quickly and refresh using backend profile data
    updateSidebarProfile({}, user);
    await updateUserInfo();
    loadApplications();
    loadNotifications(); // ✅ NEW: Load notifications
}

function updateSidebarProfile(profile, user) {
    const nameEl = document.getElementById('recruiterName');
    const companyEl = document.getElementById('companyId');
    const avatarEl = document.getElementById('userAvatar');

    const displayName = profile?.contact_name || profile?.full_name || user?.email?.split('@')[0] || 'Recruiter';
    if (nameEl) nameEl.textContent = displayName;

    const displayId = profile?.company_display_id || profile?.company_id || profile?.company_name || 'Pending';
    if (companyEl) companyEl.textContent = `Company ID: ${displayId}`;

    const logoUrl = profile?.company_logo_url || profile?.avatar_url || user?.avatar_url;
    if (avatarEl) {
        if (logoUrl && !logoUrl.includes('yourdomain.com')) {
            avatarEl.innerHTML = `<img src="${logoUrl}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
        } else {
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

        // Ensure the sidebar uses the latest profile data
        updateSidebarProfile(profile || {}, user);

        // Display pending status until the recruiter completes onboarding
        const onboardedFlag = user?.onboarded ?? user?.user_metadata?.onboarded;
        const isOnboarded = onboardedFlag === true || onboardedFlag === 'true';
        const companyIdEl = document.getElementById('companyId');
        if (companyIdEl) {
            const displayId = profile?.company_display_id || profile?.company_id || profile?.company_name;
            const nameIsPlaceholder = (profile?.company_name || '').toLowerCase().includes('unknown');
            companyIdEl.textContent = (isOnboarded && displayId && !nameIsPlaceholder) ? `Company ID: ${displayId}` : 'Company ID: Pending';
        }
    } catch (error) {}
}

function setupEventListeners() {
    const origin = window.location.origin;

    // Navigation
    document.getElementById('navDashboard')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    document.getElementById('navJobs')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);
    document.getElementById('navApplications')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    document.getElementById('navProfile')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.RECRUITER_PROFILE);
    document.getElementById('backBtn')?.addEventListener("click", () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await customAuth.signOut();
        window.location.href = CONFIG.PAGES.JOBS;
    });

    // ✅ Unified Search & Filter Events (Triggers applyFilters on any change)
    document.getElementById('appSearch')?.addEventListener('input', applyFilters);
    document.getElementById('jobFilter')?.addEventListener('change', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);

    // Select All
    document.getElementById('selectAll')?.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.app-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        updateToolbar();
    });

    // Bulk Action Button Wired Up to the Modal
    document.getElementById('bulkInterviewBtn')?.addEventListener('click', () => {
        const selectedCheckboxes = document.querySelectorAll('.app-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-id'));
        
        if (selectedIds.length === 0) {
            alert("Please select at least one candidate.");
            return;
        }
        
        openInterviewModal(async (questionsArray) => {
            await performBulkStatusUpdate(selectedIds, 'interviewing', questionsArray);
        });
    });
}
async function loadApplications() {
    const container = document.getElementById('applicationListContainer');
    if (container) container.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const res = await backendGet('/recruiter/applications'); 
        const json = await handleResponse(res);
        
        let fetchedApps = Array.isArray(json) ? json : (json.data || []);
        allApplications = fetchedApps;
        
        // DEBUG: Log what we actually received from backend
        console.log('=== FRONTEND RECEIVED DATA ===');
        if(fetchedApps.length > 0) {
            const firstApp = fetchedApps[0];
            console.log('First app interview_responses:', firstApp.interview_responses);
            console.log('First app interview_video_urls:', firstApp.interview_video_urls);
            console.log('First app interview_video_count:', firstApp.interview_video_count);
            console.log('Full first app object:', firstApp);
        }
        console.log('==============================');
        
        // Populate the dropdown filter with all available jobs
        populateJobFilter(fetchedApps);

        // ✅ URL Parameter Handling
        const urlParams = new URLSearchParams(window.location.search);
        const targetJobId = urlParams.get('job_id');
        const targetStatus = (urlParams.get('status') || 'all').toLowerCase();

        // 1. Set the Status Dropdown based on URL
        const statusDropdown = document.getElementById('statusFilter');
        if (statusDropdown) {
            const validOptions = ['all', 'submitted', 'pending', 'interviewing', 'hired', 'rejected'];
            statusDropdown.value = validOptions.includes(targetStatus) ? targetStatus : 'all';
        }

        // 2. Set the Job Dropdown based on URL job_id
        if (targetJobId) {
            const jobAppMatch = fetchedApps.find(app => String(app.job_id) === String(targetJobId));
            if (jobAppMatch) {
                const jobDropdown = document.getElementById('jobFilter');
                if (jobDropdown) jobDropdown.value = jobAppMatch.job_title;
            }
        }

        // 3. Render the initial list based on the dropdowns we just set
        applyFilters();

    } catch (err) {
        if (container) container.innerHTML = `<div class="alert alert-danger w-100 text-center">Error: ${err.message}</div>`;
        console.error("Failed to load applications:", err);
    }
}

// ✅ Auto-refresh applications every 30 seconds to catch status updates
setInterval(() => {
    console.log('Auto-refreshing applications...');
    loadApplications();
}, 30000);

// ✅ NEW: Load and display notifications
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
        
        // Update notification badge in sidebar if element exists
        const notifBadge = document.getElementById('notificationBadge');
        if (notifBadge) {
            if (unreadCount > 0) {
                notifBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                notifBadge.style.display = 'inline-block';
            } else {
                notifBadge.style.display = 'none';
            }
        }
        
        // Log for debugging
        console.log(`Loaded ${notifications.length} notifications, ${unreadCount} unread`);
        
        // Show recent notifications as toast (optional)
        if (unreadCount > 0) {
            const interviewNotifications = unreadNotifications.filter(
                n => n.category === 'interview_submitted' || n.message?.includes('interview')
            );
            
            if (interviewNotifications.length > 0) {
                console.log('New interview submissions:', interviewNotifications);
            }
        }
        
    } catch (err) {
        console.error('Failed to load notifications:', err);
    }
}

// ✅ Auto-refresh notifications every 60 seconds
setInterval(() => {
    console.log('Auto-refreshing notifications...');
    loadNotifications();
}, 60000);

// ✅ Master Filter Function
function applyFilters() {
    const term = (document.getElementById('appSearch')?.value || '').toLowerCase().trim();
    const jobValue = document.getElementById('jobFilter')?.value || 'all';
    const statusValue = document.getElementById('statusFilter')?.value || 'all';

    const header = document.getElementById('pageHeaderTitle');
    if (header) {
        header.textContent = jobValue === 'all' ? "Received Applications" : `Applications for ${jobValue}`;
    }

    const filtered = allApplications.filter(app => {
        // 1. Search Match
        const nameMatch = (app.candidate_name || '').toLowerCase().includes(term);
        const emailMatch = (app.candidate_email || '').toLowerCase().includes(term);
        
        // 2. Job Match
        const jobMatch = jobValue === 'all' || app.job_title === jobValue;
        
        // 3. Status Match
        let statusMatch = false;
        const appStatus = (app.status || 'pending').toLowerCase();
        
        if (statusValue === 'all') {
            statusMatch = true; // Show everyone
        } else if (statusValue === 'interviewing') {
            // Keep completed/submitted interviews in the interviewing pipeline view
            statusMatch = ['interviewing', 'interview_submitted', 'responses ready', 'completed'].includes(appStatus);
        } else {
            statusMatch = appStatus === statusValue;
        }

        return (nameMatch || emailMatch) && jobMatch && statusMatch;
    });

    renderList(filtered);
}

function renderList(apps) {
    const container = document.getElementById('applicationListContainer');
    if (!container) return;
    if(apps.length>0) {
        console.log("CANDIDATE DATA FROM BACKEND:", apps[0]);
        console.log("ALL AVAILABLE FIELDS:", Object.keys(apps[0]));
        console.log("COMPLETE APPLICATION OBJECT:", JSON.stringify(apps[0], null, 2));
    }
    if (apps.length === 0) {
        container.innerHTML = `<div class="text-center py-5 text-muted">No applications found.</div>`;
        return;
    }

    container.innerHTML = apps.map(app => {
        // 1. Status Capitalization & Formatting
        const status = (app.status || 'pending').toLowerCase();
        
        // More comprehensive check for submitted interviews
        const isSubmitted = status === 'interviewing' ||  // Updated to match database
                           status === 'completed' || 
                           status === 'responses ready' || 
                           status === 'submitted' ||
                           status.includes('submitted') ||
                           status.includes('completed') ||
                           (app.interview_video_urls && app.interview_video_urls.length > 0) ||
                           (app.interview_responses && app.interview_responses.length > 0);
        
        // TEMP FIX: Also show button if interview videos exist (regardless of status)
        const hasInterviewVideos = app.interview_video_urls && app.interview_video_urls.length > 0;
        const hasInterviewResponses = app.interview_responses && app.interview_responses.length > 0;
        const showWatchButton = isSubmitted || hasInterviewVideos || hasInterviewResponses;
        
        // DEBUG: Log status detection for all apps
        console.log(`DEBUG: App ${app.id} - status: "${status}", isSubmitted: ${isSubmitted}`);
        console.log(`DEBUG: App ${app.id} - raw status: "${app.status}", lowercase: "${status}"`);
        console.log(`DEBUG: App ${app.id} - hasInterviewVideos: ${hasInterviewVideos}, hasInterviewResponses: ${hasInterviewResponses}, showWatchButton: ${showWatchButton}`);
        
        // Additional debug for interview-related statuses
        if (app.status && (app.status.toLowerCase().includes('interview') || app.status.toLowerCase().includes('submit') || app.status.toLowerCase().includes('complete'))) {
            console.log(`DEBUG: App ${app.id} - INTERVIEW RELATED - Full app object:`, app);
        }
        
        // Better display status logic
        let displayStatus;
        if (status === 'interviewing' || status === 'interview_submitted' || status.includes('submitted')) {
            displayStatus = 'Responses Ready';
        } else if (status === 'completed' || status.includes('completed')) {
            displayStatus = 'Responses Submitted';
        } else if (status === 'responses ready') {
            displayStatus = 'Responses Ready';
        } else {
            displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
        }
        
        // Dynamic Badge Colors based on status
        let badgeBg = '#f1f5f9'; let badgeColor = '#475569'; // Default Gray (Pending)
        if (isSubmitted) { badgeBg = '#dcfce7'; badgeColor = '#166534'; } // Green
        else if (status === 'rejected') { badgeBg = '#fee2e2'; badgeColor = '#991b1b'; } // Red
        else if (status === 'hired') { badgeBg = '#dbeafe'; badgeColor = '#1e40af'; } // Blue
        else if (status === 'reviewed') { badgeBg = '#fef3c7'; badgeColor = '#92400e'; } // Yellow

        // 2. Robust Data Fallbacks (Checks multiple possible backend keys)
        const name = app.candidate_name || app.full_name || 'Candidate';
        const email = app.candidate_email || app.email || app.user_email || 'No email provided';
        const phone = app.candidate_phone || app.phone || app.mobile || 'No phone provided';
        
        // Initials Generator
        const initialsMatch = name.trim().match(/\b\w/g) || [];
        const initials = ((initialsMatch.shift() || '') + (initialsMatch.pop() || '')).toUpperCase() || 'C';

        // 3. Render 6-Column Grid Row (Matching the HTML Header perfectly)
        // 3. Render 6-Column Grid Row
// 3. Render 6-Column Grid Row (Clean Left-Flush Alignment)
        return `
        <div class="talent-card-row" style="display: grid; grid-template-columns: 40px 2.5fr 1.5fr 1fr 1fr 120px; align-items: center; padding: 15px 20px; border-bottom: 1px solid #e2e8f0; transition: background 0.2s; cursor: pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            
            <div class="card-selection" onclick="event.stopPropagation();">
                <input type="checkbox" class="app-checkbox" data-id="${app.id}">
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px;" onclick="window.location.href='application-details.html?id=${app.id}'">
                <div style="width: 42px; height: 42px; border-radius: 50%; background: #e0e7ff; color: #4338ca; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; flex-shrink: 0;">${initials}</div>
                <div style="display: flex; flex-direction: column; overflow: hidden;">
                    <span style="font-weight: 600; color: #1e293b; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</span>
                    <span style="color: #64748b; font-size: 0.8rem;"><i class="fas fa-envelope me-1" style="opacity: 0.7;"></i>${email}</span>
                    ${phone !== 'No phone provided' ? `<span style="color: #64748b; font-size: 0.8rem; margin-top: 2px;"><i class="fas fa-phone-alt me-1" style="opacity: 0.7;"></i>${phone}</span>` : ''}
                </div>
            </div>

            <div style="padding-right: 15px;" onclick="window.location.href='application-details.html?id=${app.id}'">
                <span style="font-weight: 500; color: #334155;">${app.job_title || 'General Application'}</span>
            </div>

            <div onclick="window.location.href='application-details.html?id=${app.id}'">
                <span style="color: #64748b; font-size: 0.9rem;">${new Date(app.applied_at).toLocaleDateString()}</span>
            </div>

            <div onclick="window.location.href='application-details.html?id=${app.id}'">
                <span style="display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBg};">
                    ${displayStatus}
                </span>
            </div>

            <div style="display: flex; gap: 8px; justify-content: flex-end;" onclick="event.stopPropagation();">
                <button onclick="showProfileModal('${app.id}')" class="btn btn-sm btn-outline-secondary" title="View Profile" style="padding: 0.35rem 0.5rem;">
                    <i class="fas fa-id-card"></i>
                </button>
                
                <button onclick="showResumeModal('${app.id}')" class="btn btn-sm btn-outline-secondary" title="View Resume" style="padding: 0.35rem 0.5rem;">
                    <i class="fas fa-file-pdf"></i>
                </button>

                ${app.intro_video_url && app.intro_video_url !== '' ? `
                    <button onclick="showVideoModal('${app.id}')" class="btn btn-sm btn-primary" title="View Intro Video" style="padding: 0.35rem 0.5rem;">
                        <i class="fas fa-play-circle"></i>
                    </button>
                ` : ''}

                ${showWatchButton ? `
                    <button onclick="viewInterviewResponses('${app.id}')" class="btn btn-sm btn-success" title="Watch Responses" style="padding: 0.35rem 0.5rem;">
                        <i class="fas fa-video"></i>
                    </button>
                ` : ''}
            </div>
        </div>`;
    }).join('');

    document.querySelectorAll('.app-checkbox').forEach(cb => cb.addEventListener('change', updateToolbar));
}

function updateToolbar() {
    const selected = document.querySelectorAll('.app-checkbox:checked').length;
    const toolbar = document.getElementById('selectionToolbar');
    const countLabel = document.getElementById('selectedCount');
    if (toolbar) toolbar.style.display = selected > 0 ? 'flex' : 'none';
    if (countLabel) countLabel.textContent = `${selected} selected`;
}

function populateJobFilter(apps) {
    const select = document.getElementById('jobFilter');
    if (!select) return;

    const jobTitles = [...new Set(apps.map(a => a.job_title))].filter(Boolean);
    
    select.innerHTML = '<option value="all">All Jobs</option>';
    
    jobTitles.sort().forEach(title => {
        const option = document.createElement('option');
        option.value = title;
        option.textContent = title;
        select.appendChild(option);
    });
}

// --- BULK STATUS UPDATE ---
async function performBulkStatusUpdate(ids, newStatus, questions) {
    const btn = document.getElementById('bulkInterviewBtn');
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    try {
        console.log('DEBUG: Bulk update starting for IDs:', ids);
        console.log('DEBUG: Questions:', questions);
        
        const payload = { status: newStatus, questions: questions };
        const promises = ids.map(async (id) => {
            try {
                console.log(`DEBUG: Updating application ${id}`);
                const response = await backendPut(`/recruiter/applications/${id}/status`, payload);
                const result = await handleResponse(response);
                console.log(`DEBUG: Application ${id} update result:`, result);
                return { id, success: true, result };
            } catch (error) {
                console.error(`DEBUG: Application ${id} update failed:`, error);
                return { id, success: false, error };
            }
        });
        
        const results = await Promise.all(promises);
        console.log('DEBUG: All bulk update results:', results);
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        if (failed.length > 0) {
            console.error('DEBUG: Failed updates:', failed);
            alert(`Warning: ${failed.length} of ${ids.length} updates failed. Check console for details.`);
        } else {
            alert(`Successfully sent interviews to ${successful.length} candidates!`);
        }
        
        // Only reload if at least some succeeded
        if (successful.length > 0) {
            location.reload();
        }
    } catch (err) {
        console.error("Bulk process error", err);
        alert("An error occurred during bulk processing.");
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-video"></i> Schedule Video Interview';
        }
    }
}

// --- SHARED MODAL LOGIC ---
function openInterviewModal(onConfirmCallback) {
    const modal = document.getElementById('interviewModal');
    const container = document.getElementById('modalQuestionsContainer');
    const addBtn = document.getElementById('addQuestionBtn');
    const confirmBtn = document.getElementById('confirmInterviewBtn');

    if(!modal) return;

    // 1. Reset inputs to default 2 questions
    container.innerHTML = `
        <input type="text" class="form-control mb-3 interview-q-input" placeholder="1. e.g. Tell me about yourself." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
        <input type="text" class="form-control mb-3 interview-q-input" placeholder="2. e.g. Walk me through your resume." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
    `;

    // 2. Add Question Button Logic
    addBtn.onclick = () => {
        const count = container.querySelectorAll('.interview-q-input').length + 1;
        container.insertAdjacentHTML('beforeend', `
            <input type="text" class="form-control mb-3 interview-q-input" placeholder="${count}. Next question..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
        `);
    };

    // 3. Clear old event listeners from Confirm button
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    // 4. Handle Confirm Action
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

    // 5. Open Modal
    modal.classList.add('active');
}


// --- POPUP MODAL FUNCTIONS ---
window.showProfileModal = async function(appId) {
    const modal = document.getElementById('profileModal');
    const content = document.getElementById('profileModalContent');
    
    if (!modal || !content) return;
    
    try {
        // Find the application data
        const app = allApplications.find(a => a.id === appId);
        if (!app) {
            content.innerHTML = '<p class="text-center text-danger">Application not found</p>';
            modal.classList.add('active');
            return;
        }
        
        console.log('Profile modal data:', app);
        
        // Populate profile content with all available data
        content.innerHTML = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: #e0e7ff; color: #4338ca; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.5rem; margin: 0 auto 1rem;">
                    ${app.candidate_name ? app.candidate_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'C'}
                </div>
                <h4 style="margin: 0; color: #1e293b;">${app.candidate_name || 'Candidate'}</h4>
                <p style="margin: 0.5rem 0; color: #64748b;">${app.job_title || 'General Application'}</p>
            </div>
            
            <div style="display: grid; gap: 1rem;">
                <div style="padding: 1rem; background: #f8fafc; border-radius: 8px;">
                    <h5 style="margin: 0 0 0.5rem 0; color: #334155; font-size: 0.9rem;">Contact Information</h5>
                    <p style="margin: 0.25rem 0; font-size: 0.85rem;"><i class="fas fa-envelope me-2" style="color: #64748b;"></i> ${app.candidate_email || 'No email'}</p>
                    ${app.candidate_phone ? `<p style="margin: 0.25rem 0; font-size: 0.85rem;"><i class="fas fa-phone me-2" style="color: #64748b;"></i> ${app.candidate_phone}</p>` : ''}
                    ${app.linkedin ? `<p style="margin: 0.25rem 0; font-size: 0.85rem;"><i class="fab fa-linkedin me-2" style="color: #64748b;"></i> <a href="${app.linkedin}" target="_blank" style="color: var(--primary-color);">LinkedIn Profile</a></p>` : ''}
                </div>
                
                <div style="padding: 1rem; background: #f8fafc; border-radius: 8px;">
                    <h5 style="margin: 0 0 0.5rem 0; color: #334155; font-size: 0.9rem;">Application Details</h5>
                    <p style="margin: 0.25rem 0; font-size: 0.85rem;"><i class="fas fa-calendar me-2" style="color: #64748b;"></i> Applied: ${new Date(app.applied_at).toLocaleDateString()}</p>
                    <p style="margin: 0.25rem 0; font-size: 0.85rem;"><i class="fas fa-briefcase me-2" style="color: #64748b;"></i> Status: <span style="font-weight: 600;">${app.status || 'Pending'}</span></p>
                    <p style="margin: 0.25rem 0; font-size: 0.85rem;"><i class="fas fa-id-badge me-2" style="color: #64748b;"></i> Application ID: ${app.id || 'N/A'}</p>
                    <p style="margin: 0.25rem 0; font-size: 0.85rem;"><i class="fas fa-user me-2" style="color: #64748b;"></i> Candidate ID: ${app.candidate_id || 'N/A'}</p>
                    <p style="margin: 0.25rem 0; font-size: 0.85rem;"><i class="fas fa-briefcase me-2" style="color: #64748b;"></i> Job ID: ${app.job_id || 'N/A'}</p>
                    ${app.ai_score ? `<p style="margin: 0.25rem 0; font-size: 0.85rem;"><i class="fas fa-star me-2" style="color: #64748b;"></i> AI Score: ${app.ai_score}</p>` : ''}
                </div>
                
                ${app.skills && app.skills.length > 0 ? `
                <div style="padding: 1rem; background: #f8fafc; border-radius: 8px;">
                    <h5 style="margin: 0 0 0.5rem 0; color: #334155; font-size: 0.9rem;">Skills</h5>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${app.skills.map(skill => `<span style="padding: 0.25rem 0.75rem; background: #e0e7ff; color: #4338ca; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">${skill}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${app.cover_letter ? `
                <div style="padding: 1rem; background: #f8fafc; border-radius: 8px;">
                    <h5 style="margin: 0 0 0.5rem 0; color: #334155; font-size: 0.9rem;">Cover Letter</h5>
                    <p style="margin: 0; font-size: 0.85rem; line-height: 1.6; white-space: pre-wrap; max-height: 150px; overflow-y: auto;">${app.cover_letter}</p>
                </div>
                ` : ''}
                
                ${app.custom_answers && app.custom_answers.length > 0 ? `
                <div style="padding: 1rem; background: #f8fafc; border-radius: 8px;">
                    <h5 style="margin: 0 0 0.5rem 0; color: #334155; font-size: 0.9rem;">Custom Answers</h5>
                    <div style="font-size: 0.85rem; line-height: 1.6;">
                        ${app.custom_answers.map((answer, index) => `
                            <div style="margin-bottom: 0.5rem;">
                                <strong>Q${index + 1}:</strong> ${answer.question || 'N/A'}<br>
                                <strong>A:</strong> ${answer.answer || 'N/A'}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${app.interview_questions && app.interview_questions.length > 0 ? `
                <div style="padding: 1rem; background: #f8fafc; border-radius: 8px;">
                    <h5 style="margin: 0 0 0.5rem 0; color: #334155; font-size: 0.9rem;">Interview Questions</h5>
                    <div style="font-size: 0.85rem; line-height: 1.6;">
                        ${app.interview_questions.map((q, index) => `
                            <div style="margin-bottom: 0.5rem;">
                                <strong>Q${index + 1}:</strong> ${q}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div style="padding: 1rem; background: #f8fafc; border-radius: 8px;">
                    <h5 style="margin: 0 0 0.5rem 0; color: #334155; font-size: 0.9rem;">Media Files</h5>
                    <p style="margin: 0.25rem 0; font-size: 0.85rem;"><i class="fas fa-file-pdf me-2" style="color: #64748b;"></i> Resume: ${app.resume_url ? 'Available' : 'Not attached'}</p>
                    <p style="margin: 0.25rem 0; font-size: 0.85rem;"><i class="fas fa-video me-2" style="color: #64748b;"></i> Intro Video: ${app.intro_video_url ? 'Available' : 'Not provided'}</p>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
    } catch (error) {
        console.error('Error loading profile:', error);
        content.innerHTML = '<p class="text-center text-danger">Error loading profile</p>';
        modal.classList.add('active');
    }
};

window.showResumeModal = async function(appId) {
    const modal = document.getElementById('resumeModal');
    const content = document.getElementById('resumeModalContent');
    const downloadLink = document.getElementById('resumeDownloadLink');
    
    if (!modal || !content) return;
    
    try {
        // Find the application data
        const app = allApplications.find(a => a.id === appId);
        if (!app) {
            content.innerHTML = '<p class="text-center text-danger">Application not found</p>';
            modal.classList.add('active');
            return;
        }
        
        console.log('Resume modal data:', app);
        
        // Check multiple possible resume field names
        const resumeUrl = app.resume_url || app.resume_link || app.resume || app.cv_url;
        
        if (!resumeUrl) {
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-file-circle-exclamation fa-3x" style="color: #cbd5e0; margin-bottom: 1rem;"></i>
                    <p class="text-muted">No resume attached to this application.</p>
                    <div style="margin-top: 1rem; font-size: 0.8rem; color: #94a3b8;">
                        Checked fields: resume_url, resume_link, resume, cv_url
                    </div>
                </div>
            `;
            if (downloadLink) downloadLink.style.display = 'none';
            modal.classList.add('active');
            return;
        }
        
        // Set download link
        if (downloadLink) {
            downloadLink.href = resumeUrl;
            downloadLink.style.display = 'inline-flex';
        }
        
        // Display resume
        const isGoogleViewer = !resumeUrl.endsWith('.pdf');
        const src = isGoogleViewer 
            ? `https://docs.google.com/gview?url=${encodeURIComponent(resumeUrl)}&embedded=true` 
            : resumeUrl;
            
        content.innerHTML = `
            <iframe src="${src}" width="100%" height="500px" style="border: none; border-radius: 8px;"></iframe>
        `;
        
        modal.classList.add('active');
        
    } catch (error) {
        console.error('Error loading resume:', error);
        content.innerHTML = '<p class="text-center text-danger">Error loading resume</p>';
        modal.classList.add('active');
    }
};

window.showVideoModal = async function(appId) {
    const modal = document.getElementById('videoModal');
    const content = document.getElementById('videoModalContent');
    
    if (!modal || !content) return;
    
    try {
        // Find the application data
        const app = allApplications.find(a => a.id === appId);
        if (!app) {
            content.innerHTML = '<p class="text-center text-danger">Application not found</p>';
            modal.classList.add('active');
            return;
        }
        
        if (!app.intro_video_url) {
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-video-slash fa-3x" style="color: #cbd5e0; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p class="text-muted">No intro video provided.</p>
                </div>
            `;
            modal.classList.add('active');
            return;
        }
        
        // Display video
        content.innerHTML = `
            <video controls width="100%" style="max-height: 400px; border-radius: 8px;" preload="metadata">
                <source src="${app.intro_video_url}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <div style="margin-top: 1rem; text-align: center;">
                <p style="margin: 0; color: #64748b; font-size: 0.85rem;">
                    <i class="fas fa-user me-1"></i> ${app.candidate_name || 'Candidate'}
                </p>
            </div>
        `;
        
        modal.classList.add('active');
        
    } catch (error) {
        console.error('Error loading video:', error);
        content.innerHTML = '<p class="text-center text-danger">Error loading video</p>';
        modal.classList.add('active');
    }
};

// ✅ NEW: View Interview Responses Modal
window.viewInterviewResponses = async function(appId) {
    const modal = document.getElementById('videoModal');
    const content = document.getElementById('videoModalContent');
    
    if (!modal || !content) {
        // Fallback to alert if modal not found
        const app = allApplications.find(a => a.id === appId);
        if (app && app.interview_video_urls && app.interview_video_urls.length > 0) {
            alert(`Interview Videos:\n\n${app.interview_video_urls.join('\n')}`);
        } else {
            alert('No interview videos found for this application.');
        }
        return;
    }
    
    try {
        // Find the application data
        const app = allApplications.find(a => a.id === appId);
        if (!app) {
            content.innerHTML = '<p class="text-center text-danger">Application not found</p>';
            modal.classList.add('active');
            return;
        }
        
        // Check for interview responses
        const responses = app.interview_responses || [];
        const videoUrls = app.interview_video_urls || [];
        
        // DEBUG: Log response structure
        console.log(`DEBUG: App ${appId} - Total responses: ${responses.length}`);
        console.log(`DEBUG: App ${appId} - Response data:`, responses);
        
        if (responses.length > 0) {
            // Group responses by question and get latest for each
            const latestResponses = {};
            responses.forEach(response => {
                const questionKey = response.question || `Question ${response.question_index || 0}`;
                if (!latestResponses[questionKey] || 
                    new Date(response.created_at) > new Date(latestResponses[questionKey].created_at)) {
                    latestResponses[questionKey] = response;
                }
            });
            
            const finalResponses = Object.values(latestResponses);
            console.log(`DEBUG: App ${appId} - Latest responses per question: ${finalResponses.length}`);
            console.log(`DEBUG: App ${appId} - Final responses:`, finalResponses);
            
            // Use finalResponses instead of original responses
            responses.length = 0;
            responses.push(...finalResponses);
        }
        
        if (responses.length === 0 && videoUrls.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-video-slash fa-3x" style="color: #cbd5e0; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p class="text-muted">No interview responses recorded yet.</p>
                </div>
            `;
            modal.classList.add('active');
            return;
        }
        
        // Build video player HTML for each response
        let videosHtml = responses.map((response, index) => {
            console.log(`DEBUG: Video ${index + 1} - URL: ${response.video_url}`);
            console.log(`DEBUG: Video ${index + 1} - Full response:`, response);
            
            return `
            <div style="margin-bottom: 2rem; padding: 1rem; background: #f8fafc; border-radius: 8px;">
                <h5 style="margin: 0 0 1rem 0; color: #334155; font-size: 0.95rem;">
                    <span style="background: #4338ca; color: white; padding: 2px 8px; border-radius: 4px; margin-right: 8px;">Q${index + 1}</span>
                    ${response.question || `Question ${index + 1}`}
                </h5>
                <video controls width="100%" style="max-height: 300px; border-radius: 8px;" preload="metadata">
                    <source src="${response.video_url}" type="video/webm">
                    <source src="${response.video_url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #64748b;">
                    ${response.duration ? `<i class="fas fa-clock me-1"></i> ${Math.round(response.duration / 60)}:${(response.duration % 60).toString().padStart(2, '0')}` : ''}
                    ${response.created_at ? `<i class="fas fa-calendar ms-3 me-1"></i> ${new Date(response.created_at).toLocaleString()}` : ''}
                    <br>
                    <small style="color: #94a3b8;">
                        <i class="fas fa-link me-1"></i> 
                        Video URL: <a href="${response.video_url}" target="_blank" style="color: #4338ca;">Open in new tab</a>
                    </small>
                </div>
            </div>
        `;
        }).join('');
        
        content.innerHTML = `
            <div style="max-height: 70vh; overflow-y: auto; padding-right: 1rem;">
                <h4 style="margin: 0 0 1rem 0; color: #1e293b;">
                    <i class="fas fa-video me-2" style="color: #4338ca;"></i>
                    Interview Responses - ${app.candidate_name || 'Candidate'}
                </h4>
                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem;">
                    ${responses.length} question${responses.length > 1 ? 's' : ''} answered
                </p>
                ${videosHtml}
            </div>
        `;
        
        modal.classList.add('active');
        
    } catch (error) {
        console.error('Error loading interview responses:', error);
        content.innerHTML = '<p class="text-center text-danger">Error loading interview responses</p>';
        modal.classList.add('active');
    }
};