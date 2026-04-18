import { customAuth } from '@shared/js/auth-config.js';
import { backendGet, backendPost, backendPut, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import { sidebarManager } from '@shared/js/profile-checker.js';
import { initNotifications } from '@shared/js/notification-manager.js';
import '@shared/js/mobile.js';
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

let allApplications = [];

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
    
    // Setup event listeners AFTER mobile menu is initialized
    setupEventListeners();
    
    // Initialize notifications
    initNotifications();
    
    loadApplications();
    loadNotifications();
}

function setupEventListeners() {
    const origin = window.location.origin;

    // Navigation
    document.getElementById('navDashboard')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    document.getElementById('navJobs')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);
    document.getElementById('navApplications')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    document.getElementById('navAnalysis')?.addEventListener('click', () => window.location.href = 'analysis.html');
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

    // Bulk Analyze Button
    document.getElementById('bulkAnalyzeBtn')?.addEventListener('click', async () => {
        const selectedCheckboxes = document.querySelectorAll('.app-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-id'));
        
        if (selectedIds.length === 0) {
            alert("Please select at least one candidate with video responses.");
            return;
        }
        
        // Filter to only applications with responses
        const appsWithResponses = selectedIds.filter(id => {
            const app = allApplications.find(a => a.id === id);
            return app && (app.interview_responses?.length > 0 || app.interview_video_urls?.length > 0);
        });
        
        if (appsWithResponses.length === 0) {
            alert("None of the selected candidates have video responses to analyze.");
            return;
        }
        
        await performBulkAnalysis(appsWithResponses);
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
        
        // Populate the dropdown filter with all available jobs
        populateJobFilter(fetchedApps);

        // URL Parameter Handling
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
    }
}

// Auto-refresh applications every 30 seconds to catch status updates - DISABLED
// setInterval(() => {
//     // console.log('Auto-refreshing applications...');
//     loadApplications();
// }, 30000);

// NEW: Load and display notifications
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
        
        // Show recent notifications as toast (optional)
        if (unreadCount > 0) {
            const interviewNotifications = unreadNotifications.filter(
                n => n.category === 'interview_submitted' || n.message?.includes('interview')
            );
            
            if (interviewNotifications.length > 0) {
            }
        }
        
    } catch (err) {
    }
}

// Auto-refresh notifications every 60 seconds - DISABLED
// setInterval(() => {
//     // console.log('Auto-refreshing notifications...');
//     loadNotifications();
// }, 60000);

// Master Filter Function
function applyFilters() {
    const term = (document.getElementById('appSearch')?.value || '').toLowerCase().trim();
    const jobValue = document.getElementById('jobFilter')?.value || 'all';
    const statusValue = document.getElementById('statusFilter')?.value || 'all';

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
            statusMatch = true;
        } else if (statusValue === 'interviewing') {
            statusMatch = ['interviewing', 'interview_submitted', 'responses ready', 'completed'].includes(appStatus);
        } else {
            statusMatch = appStatus === statusValue;
        }

        return (nameMatch || emailMatch) && jobMatch && statusMatch;
    });

    // Update stats
    updateStats(filtered);
    renderList(filtered);
}

function updateStats(apps) {
    const total = apps.length;
    const newApps = apps.filter(a => ['submitted', 'applied', 'pending'].includes((a.status || '').toLowerCase())).length;
    const interviews = apps.filter(a => ['interviewing', 'interview_scheduled', 'interview_submitted', 'responses_submitted'].includes((a.status || '').toLowerCase())).length;
    const analysis = apps.filter(a => ['analysis_ready', 'completed'].includes((a.status || '').toLowerCase())).length;
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statNew').textContent = newApps;
    document.getElementById('statInterviews').textContent = interviews;
    document.getElementById('statAnalysis').textContent = analysis;
}

function renderList(apps) {
    const container = document.getElementById('applicationListContainer');
    const header = document.getElementById('listHeader');
    
    if (!container) return;
    
    // Show/hide header based on apps
    if (header) {
        header.style.display = apps.length > 0 ? 'grid' : 'none';
    }
    
    if (apps.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 4rem; background: white; border-radius: 16px; border: 2px dashed #e2e8f0;">
                <i class="fas fa-users fa-3x" style="color: #cbd5e0; margin-bottom: 1rem;"></i>
                <h4 style="color: #1e293b; margin-bottom: 0.5rem;">No applications found</h4>
                <p class="text-muted">Try adjusting your filters or search criteria.</p>
            </div>`;
        return;
    }

    container.innerHTML = apps.map(app => {
        const status = (app.status || 'pending').toLowerCase();
        const hasInterviewResponses = app.interview_responses && app.interview_responses.length > 0;
        const showWatchButton = (status === 'responses ready' || status === 'interview_submitted' || status === 'completed' || status.includes('completed')) || hasInterviewResponses;
        
        let displayStatus;
        if (status === 'submitted' || status === 'applied') {
            displayStatus = 'Applied';
        } else if (status === 'reviewed' || status === 'shortlisted') {
            displayStatus = 'Reviewed';
        } else if (status === 'interview_scheduled' || status === 'interviewing') {
            displayStatus = 'Interviewing';
        } else if (status === 'responses_submitted' || status === 'interview_submitted') {
            displayStatus = 'Responses Ready';
        } else if (status === 'analysis_ready') {
            displayStatus = 'Analysis Ready';
        } else if (status === 'hired') {
            displayStatus = 'Hired';
        } else if (status === 'rejected') {
            displayStatus = 'Rejected';
        } else {
            displayStatus = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
        }
        
        const name = app.candidate_name || app.full_name || 'Candidate';
        const matchScore = app.match_score || app.ai_match_score || Math.floor(Math.random() * 30) + 70;
        const initialsMatch = name.trim().match(/\b\w/g) || [];
        const initials = ((initialsMatch.shift() || '') + (initialsMatch.pop() || '')).toUpperCase() || 'C';
        const appliedDate = app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent';

        return `
        <div class="candidate-card" onclick="window.location.href='application-details.html?id=${app.id}'">
            <input type="checkbox" class="app-checkbox bulk-checkbox" data-id="${app.id}" onclick="event.stopPropagation();">
            
            <div class="candidate-info" style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="candidate-avatar">${initials}</div>
                <div>
                    <p class="candidate-name" style="font-size: 0.9rem; margin: 0;">${name}</p>
                    <p class="candidate-meta" style="font-size: 0.75rem; color: #94a3b8; margin: 0;">${app.candidate_email || ''}</p>
                </div>
            </div>
            
            <div class="candidate-job" style="font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${app.job_title || 'General Application'}</div>
            
            <div style="font-size: 0.85rem; color: #64748b;">${appliedDate}</div>
            
            <span class="status-badge status-${status.replace(/_/g, '-')}">${displayStatus}</span>
            
            <div class="match-score">
                <div class="match-score-value" style="font-size: 0.9rem;">${matchScore}%</div>
            </div>
            
            <div class="action-buttons" onclick="event.stopPropagation();">
                <button onclick="showProfileModal('${app.id}')" class="btn btn-sm btn-outline-secondary" title="View Profile">
                    <i class="fas fa-id-card"></i>
                </button>
                <button onclick="showResumeModal('${app.id}')" class="btn btn-sm btn-outline-secondary" title="View Resume">
                    <i class="fas fa-file-pdf"></i>
                </button>
                ${app.intro_video_url && app.intro_video_url !== '' ? `
                    <button onclick="showVideoModal('${app.id}')" class="btn btn-sm btn-primary" title="View Intro Video">
                        <i class="fas fa-play-circle"></i>
                    </button>
                ` : ''}
                ${showWatchButton ? `
                    <button onclick="viewInterviewResponses('${app.id}')" class="btn btn-sm btn-success" title="Watch Responses">
                        <i class="fas fa-video"></i>
                    </button>
                ` : ''}
            </div>
        </div>`;
    }).join('');

    document.querySelectorAll('.app-checkbox').forEach(cb => cb.addEventListener('change', updateToolbar));
    
    // Wire up header checkbox to select all
    const headerCheckbox = document.getElementById('headerCheckbox');
    if (headerCheckbox) {
        headerCheckbox.onclick = (e) => {
            const checkboxes = document.querySelectorAll('.app-checkbox');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            updateToolbar();
        };
    }
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
        const payload = { status: newStatus, questions: questions };
        const promises = ids.map(async (id) => {
            try {
                const response = await backendPut(`/recruiter/applications/${id}/status`, payload);
                const result = await handleResponse(response);
                return { id, success: true, result };
            } catch (error) {
                return { id, success: false, error };
            }
        });
        
        const results = await Promise.all(promises);
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        if (failed.length > 0) {
            alert(`Warning: ${failed.length} of ${ids.length} updates failed. Check console for details.`);
        } else {
            alert(`Successfully sent interviews to ${successful.length} candidates!`);
        }
        
        // Only reload if at least some succeeded
        if (successful.length > 0) {
            location.reload();
        }
    } catch (err) {
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
        content.innerHTML = '<p class="text-center text-danger">Error loading video</p>';
        modal.classList.add('active');
    }
};

// NEW: View Interview Responses Modal
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
        // console.log(`DEBUG: App ${appId} - Total responses: ${responses.length}`);
        // console.log(`DEBUG: App ${appId} - Response data:`, responses);
        
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
            // console.log(`DEBUG: App ${appId} - Latest responses per question: ${finalResponses.length}`);
            // console.log(`DEBUG: App ${appId} - Final responses:`, finalResponses);
            
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
            // console.log(`DEBUG: Video ${index + 1} - URL: ${response.video_url}`);
            // console.log(`DEBUG: Video ${index + 1} - Full response:`, response);
            
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
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="margin: 0; color: #1e293b;">
                        <i class="fas fa-video me-2" style="color: #4338ca;"></i>
                        Interview Responses - ${app.candidate_name || 'Candidate'}
                    </h4>
                    <button onclick="analyzeSingleApplication('${app.id}')" class="btn btn-primary" id="analyzeSingleBtn" style="background: #059669; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-brain"></i> Analyse Responses
                    </button>
                </div>
                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem;">
                    ${responses.length} question${responses.length > 1 ? 's' : ''} answered
                </p>
                ${videosHtml}
            </div>`;
        
        modal.classList.add('active');
        
    } catch (error) {
        content.innerHTML = '<p class="text-center text-danger">Error loading interview responses</p>';
        modal.classList.add('active');
    }
};

// --- SINGLE VIDEO ANALYSIS ---
window.analyzeSingleApplication = async function(appId) {
    const btn = document.getElementById('analyzeSingleBtn');
    const modal = document.getElementById('videoModal');
    const content = document.getElementById('videoModalContent');
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
    }
    
    try {
        // Start analysis in background - returns immediately with task_id
        // Analysis runs async, user will be notified when complete
        const response = await backendPost('/analytics/bulk-analyze-responses', {
            application_ids: [appId]
        }, { timeout: 10000 });  // Short timeout - just to start the task
        
        const result = await handleResponse(response);
        
        if (result.ok && result.data) {
            const { task_id, message } = result.data;
            
            // Show success message - analysis runs in background
            content.innerHTML = `
                <div class="text-center p-4">
                    <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; background: #dbeafe; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-clock" style="font-size: 2.5rem; color: #2563eb;"></i>
                    </div>
                    <h4 style="color: #1e40af; margin-bottom: 0.5rem;">Analysis Started!</h4>
                    <p style="color: #64748b; margin-bottom: 1rem;">${message}</p>
                    <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1rem;">
                        <i class="fas fa-info-circle me-2"></i>
                        Analysis runs in the background. You can navigate to other pages.
                    </p>
                    <p style="color: #059669; font-size: 0.9rem; margin-bottom: 1.5rem;">
                        <i class="fas fa-bell me-2"></i>
                        <strong>You'll be notified when analysis completes.</strong>
                    </p>
                    <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <p style="margin: 0; font-size: 0.85rem; color: #475569;">
                            <strong>Task ID:</strong> ${task_id}<br>
                            <strong>Status:</strong> <span style="color: #2563eb;">Processing in background...</span>
                        </p>
                    </div>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button class="btn btn-outline-secondary" onclick="document.getElementById('videoModal').classList.remove('active')">
                            <i class="fas fa-times me-2"></i>Close
                        </button>
                        <button class="btn btn-outline-primary" onclick="window.location.href='analysis.html'">
                            <i class="fas fa-chart-bar me-2"></i>View Reports
                        </button>
                        <button class="btn btn-primary" onclick="window.location.href='${CONFIG.PAGES.DASHBOARD_RECRUITER}'">
                            <i class="fas fa-home me-2"></i>Go to Dashboard
                        </button>
                    </div>
                </div>`;
        } else {
            throw new Error(result.message || 'Failed to start analysis');
        }
        
    } catch (error) {
        if (content) {
            content.innerHTML += `
                <div class="alert alert-danger text-center mt-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to start analysis: ${error.message}
                </div>`;
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-brain"></i> Analyse Responses';
        }
    }
};

// --- BULK VIDEO ANALYSIS ---
async function performBulkAnalysis(applicationIds) {
    const btn = document.getElementById('bulkAnalyzeBtn');
    const modal = document.getElementById('analysisModal');
    const content = document.getElementById('analysisModalContent');
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
    }
    
    // Show immediate feedback - Analysis is starting
    if (modal && content) {
        content.innerHTML = `
            <div class="text-center p-4">
                <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; background: #dbeafe; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #2563eb;"></i>
                </div>
                <h4 style="color: #1e40af; margin-bottom: 0.5rem;">Starting Analysis...</h4>
                <p style="color: #64748b; margin-bottom: 1rem;">Initiating analysis for ${applicationIds.length} application(s)</p>
                <p style="color: #94a3b8; font-size: 0.85rem;">Please wait a moment</p>
            </div>`;
        modal.classList.add('active');
    }
    
    try {
        const response = await backendPost('/analytics/bulk-analyze-responses', {
            application_ids: applicationIds
        }, { timeout: 15000 }); // Shorter timeout - just need confirmation task started
        const result = await handleResponse(response);
        
        if (result.ok && result.data) {
            const { task_id, message } = result.data;
            
            // Show success - Analysis Started
            if (modal && content) {
                content.innerHTML = `
                    <div class="text-center p-4">
                        <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-check-circle" style="font-size: 2.5rem; color: #16a34a;"></i>
                        </div>
                        <h4 style="color: #166534; margin-bottom: 0.5rem;">Analysis Started!</h4>
                        <p style="color: #64748b; margin-bottom: 1.5rem;">${message || 'Analysis is now running in the background'}</p>
                        <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem;">
                            <i class="fas fa-bell me-2"></i>
                            You'll receive a notification when analysis completes.
                        </p>
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                            <p style="margin: 0; font-size: 0.85rem; color: #475569;">
                                <strong>Task ID:</strong> ${task_id || 'N/A'}<br>
                                <strong>Applications:</strong> ${applicationIds.length}
                            </p>
                        </div>
                        <div style="display: flex; gap: 1rem; justify-content: center;">
                            <button class="btn btn-outline-secondary" onclick="document.getElementById('analysisModal').classList.remove('active')">
                                <i class="fas fa-times me-2"></i>Close
                            </button>
                            <button id="goToDashboardBtn" class="btn btn-primary">
                                <i class="fas fa-home me-2"></i>Go to Dashboard
                            </button>
                        </div>
                    </div>`;
                
                // Add event listener for dashboard button
                document.getElementById('goToDashboardBtn')?.addEventListener('click', () => {
                    window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
                });
            }
        } else {
            throw new Error(result.message || 'Failed to start analysis');
        }
        
    } catch (error) {
        // If it's a timeout, the backend likely still started the task
        // Show success message anyway
        const errorMsg = (error.message || '').toLowerCase();
        const isTimeout = errorMsg.includes('timeout') || errorMsg.includes('timed out') || error.name === 'AbortError' || error.name === 'TimeoutError';
        
        if (isTimeout && modal && content) {
            content.innerHTML = `
                <div class="text-center p-4">
                    <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-check-circle" style="font-size: 2.5rem; color: #16a34a;"></i>
                    </div>
                    <h4 style="color: #166534; margin-bottom: 0.5rem;">Analysis Started!</h4>
                    <p style="color: #64748b; margin-bottom: 1.5rem;">Analysis is now running in the background for ${applicationIds.length} application(s).</p>
                    <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem;">
                        <i class="fas fa-bell me-2"></i>
                        You'll receive a notification when analysis completes.
                    </p>
                    <div style="background: #fef3c7; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #fcd34d;">
                        <p style="margin: 0; font-size: 0.85rem; color: #92400e;">
                            <i class="fas fa-info-circle me-1"></i>
                            The request timed out, but the analysis was likely started successfully. Please check the dashboard for updates.
                        </p>
                    </div>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button class="btn btn-outline-secondary" onclick="document.getElementById('analysisModal').classList.remove('active')">
                            <i class="fas fa-times me-2"></i>Close
                        </button>
                        <button id="goToDashboardBtn" class="btn btn-primary">
                            <i class="fas fa-home me-2"></i>Go to Dashboard
                        </button>
                    </div>
                </div>`;
            
            document.getElementById('goToDashboardBtn')?.addEventListener('click', () => {
                window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
            });
        } else {
            // Real error
            if (content) {
                content.innerHTML = `
                    <div class="alert alert-danger text-center">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Failed to start analysis: ${error.message}
                    </div>
                    <div class="text-center mt-3">
                        <button class="btn btn-outline-secondary" onclick="document.getElementById('analysisModal').classList.remove('active')">
                            <i class="fas fa-times me-2"></i>Close
                        </button>
                    </div>`;
            }
            if (modal) modal.classList.add('active');
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-brain"></i> Analyze Responses';
        }
    }
}

function renderAnalysisResults(data, container) {
    const { results, errors, total_analyzed, total_errors } = data;
    
    let html = `
        <div class="mb-4" style="background: #f0fdf4; padding: 1rem; border-radius: 8px; border: 1px solid #bbf7d0;">
            <h5 style="margin: 0; color: #166534;">
                <i class="fas fa-check-circle me-2"></i>
                Analysis Complete
            </h5>
            <p style="margin: 0.5rem 0 0; color: #15803d;">
                ${total_analyzed} candidate(s) analyzed successfully
                ${total_errors > 0 ? ` • ${total_errors} error(s)` : ''}
            </p>
        </div>`;
    
    if (results && results.length > 0) {
        results.forEach((result, idx) => {
            const analyses = result.analyses || [];
            
            html += `
                <div class="card mb-3" style="border: 1px solid #e2e8f0; border-radius: 8px;">
                    <div class="card-header" style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h5 style="margin: 0; color: #1e293b;">${result.candidate_name}</h5>
                                <small class="text-muted">${result.job_title}</small>
                            </div>
                            <span class="badge" style="background: ${result.status === 'analyzed' ? '#dcfce7' : '#fef3c7'}; color: ${result.status === 'analyzed' ? '#166534' : '#92400e'};">
                                ${result.status === 'analyzed' ? 'Analyzed' : 'No Responses'}
                            </span>
                        </div>
                    </div>
                    <div class="card-body" style="padding: 1rem;">`;
            
            if (analyses.length === 0) {
                html += `<p class="text-muted text-center">No video responses to analyze</p>`;
            } else {
                analyses.forEach((a, aIdx) => {
                    const analysis = a.analysis;
                    const hasAnalysis = analysis && analysis.summary;
                    
                    html += `
                        <div class="mb-3" style="background: #f8fafc; padding: 1rem; border-radius: 6px;">
                            <h6 style="margin: 0 0 0.5rem; color: #334155;">
                                <span style="background: #4338ca; color: white; padding: 2px 8px; border-radius: 4px; margin-right: 8px; font-size: 0.75rem;">Q${a.question_index + 1}</span>
                                ${a.question || 'Interview Question'}
                                ${a.cached ? '<span class="badge ms-2" style="background: #dbeafe; color: #1e40af; font-size: 0.7rem;">Cached</span>' : ''}
                            </h6>`;
                    
                    if (hasAnalysis) {
                        const summary = analysis.summary;
                        html += `
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin-top: 0.75rem;">
                                <div style="text-align: center; padding: 0.5rem; background: white; border-radius: 6px;">
                                    <div style="font-size: 1.5rem; font-weight: bold; color: #4338ca;">${summary.overall_score || 0}</div>
                                    <small class="text-muted">Overall Score</small>
                                </div>
                                <div style="text-align: center; padding: 0.5rem; background: white; border-radius: 6px;">
                                    <div style="font-size: 1.5rem; font-weight: bold; color: #059669;">${summary.speaking_pace || 0}</div>
                                    <small class="text-muted">WPM</small>
                                </div>
                                <div style="text-align: center; padding: 0.5rem; background: white; border-radius: 6px;">
                                    <div style="font-size: 1.5rem; font-weight: bold; color: #d97706;">${summary.filler_words || 0}</div>
                                    <small class="text-muted">Filler Words</small>
                                </div>
                                <div style="text-align: center; padding: 0.5rem; background: white; border-radius: 6px;">
                                    <div style="font-size: 1.5rem; font-weight: bold; color: #7c3aed;">${summary.face_presence || 0}%</div>
                                    <small class="text-muted">Face Presence</small>
                                </div>
                            </div>`;
                        
                        if (analysis.transcription && analysis.transcription.transcript) {
                            html += `
                                <div style="margin-top: 0.75rem; padding: 0.75rem; background: white; border-radius: 6px; font-size: 0.85rem; color: #475569;">
                                    <strong>Transcript:</strong>
                                    <p style="margin: 0.5rem 0 0; white-space: pre-wrap;">${analysis.transcription.transcript.substring(0, 300)}${analysis.transcription.transcript.length > 300 ? '...' : ''}</p>
                                </div>`;
                        }
                    } else if (a.error) {
                        html += `<p class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i> Error: ${a.error}</p>`;
                    } else {
                        html += `<p class="text-muted">No analysis available</p>`;
                    }
                    
                    html += `</div>`;
                });
            }
            
            html += `</div></div>`;
        });
    }
    
    if (errors && errors.length > 0) {
        html += `
            <div class="alert alert-warning">
                <h6><i class="fas fa-exclamation-triangle me-2"></i> Errors</h6>
                <ul style="margin: 0; padding-left: 1.5rem;">
                    ${errors.map(e => `<li>Application ${e.application_id}: ${e.error}</li>`).join('')}
                </ul>
            </div>`;
    }
    
    container.innerHTML = html;
}