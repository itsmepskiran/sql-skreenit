import { customAuth } from '@shared/js/auth-config.js';;
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
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

    updateSidebarProfile(user.user_metadata || {}, user.email);
    updateUserInfo();
    loadApplications();
}

function updateSidebarProfile(meta, email) {
    const nameEl = document.getElementById('recruiterName');
    if(nameEl) nameEl.textContent = meta.full_name || meta.contact_name || email.split('@')[0];
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
        window.location.href = CONFIG.PAGES.LOGIN;
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
        
        // Populate the dropdown filter with all available jobs
        populateJobFilter(fetchedApps);

        // ✅ URL Parameter Handling
        const urlParams = new URLSearchParams(window.location.search);
        const targetJobId = urlParams.get('job_id');
        const targetStatus = (urlParams.get('status') || 'pending').toLowerCase();

        // 1. Set the Status Dropdown based on URL
        const statusDropdown = document.getElementById('statusFilter');
        if (statusDropdown) {
            const validOptions = ['all', 'pending', 'interviewing', 'hired', 'rejected'];
            statusDropdown.value = validOptions.includes(targetStatus) ? targetStatus : 'pending';
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
    if(apps.length>0) console.log("CANDIDATE DATA FROM BACKEND:", apps[0]);
    if (apps.length === 0) {
        container.innerHTML = `<div class="text-center py-5 text-muted">No applications found.</div>`;
        return;
    }

    container.innerHTML = apps.map(app => {
        // 1. Status Capitalization & Formatting
        const status = (app.status || 'pending').toLowerCase();
        const isSubmitted = status === 'interview_submitted' || status === 'completed' || status === 'responses ready';
        const displayStatus = isSubmitted ? 'Responses Ready' : (status.charAt(0).toUpperCase() + status.slice(1));
        
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
                <a href="application-details.html?id=${app.id}" class="btn btn-sm btn-outline-secondary" title="View Profile" style="padding: 0.35rem 0.5rem;">
                    <i class="fas fa-id-card"></i>
                </a>
                
                <button onclick="window.location.href='application-details.html?id=${app.id}#resume'" class="btn btn-sm btn-outline-secondary" title="View Resume" style="padding: 0.35rem 0.5rem;">
                    <i class="fas fa-file-pdf"></i>
                </button>

                ${isSubmitted ? `
                    <button onclick="viewInterviewResponses('${app.id}')" class="btn btn-sm btn-primary" title="Watch Interview" style="padding: 0.35rem 0.5rem;">
                        <i class="fas fa-play-circle"></i>
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
        const payload = { status: newStatus, questions: questions };
        const promises = ids.map(id => backendPost(`/recruiter/applications/${id}/status`, payload));
        await Promise.all(promises);
        
        alert(`Successfully sent interviews to ${ids.length} candidates!`);
        location.reload();
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