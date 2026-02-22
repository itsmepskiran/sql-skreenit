import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

let allApplications = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    setupEventListeners();
});

async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
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
    document.getElementById('navDashboard')?.addEventListener('click', () => window.location.href = `${origin}/dashboard/recruiter-dashboard.html`);
    document.getElementById('navJobs')?.addEventListener('click', () => window.location.href = `${origin}/dashboard/my-jobs.html`);
    document.getElementById('navApplications')?.addEventListener('click', () => window.location.href = `${origin}/dashboard/application-list.html`);
    document.getElementById('navProfile')?.addEventListener('click', () => window.location.href = `${origin}/recruiter/recruiter-profile.html`);
    document.getElementById('backBtn')?.addEventListener("click", () => window.history.back());

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = CONFIG.PAGES.LOGIN;
    });

    // Search & Filter
    document.getElementById('appSearch')?.addEventListener('input', (e) => {
        filterApplications(e.target.value, document.getElementById('jobFilter').value);
    });

    document.getElementById('jobFilter')?.addEventListener('change', (e) => {
        filterApplications(document.getElementById('appSearch').value, e.target.value);
    });

    // Select All
    document.getElementById('selectAll')?.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.app-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        updateToolbar();
    });

    // ✅ Bulk Action Button Wired Up to the New Modal
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
    container.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const targetJobId = urlParams.get('job_id');
        
        const res = await backendGet('/recruiter/applications'); 
        const json = await handleResponse(res);
        
        let fetchedApps = Array.isArray(json) ? json : (json.data || []);
        allApplications= fetchedApps;
        populateJobFilter(fetchedApps);
        let displayApps = fetchedApps;

        if (targetJobId) {
            displayApps = allApplications.filter(app => String(app.job_id) === String(targetJobId));
        }
        if (displayApps.length > 0) {
            const title = displayApps[0].job_title;
            const header = document.getElementById('pageHeaderTitle');
            if (header) header.textContent = `Applications for ${title}`;
            const dropdown = document.getElementById('jobFilter');
            if (dropdown) dropdown.value = title;
            document.getElementById('jobFilter').value = title;
        }

        renderList(displayApps);

    } catch (err) {
        if (container) container.innerHTML = `<div class="alert alert-danger w-100 text-center">Error: ${err.message}</div>`;
    }
}

function renderList(apps) {
    const container = document.getElementById('applicationListContainer');
    if (!container) return;

    if (apps.length === 0) {
        container.innerHTML = `<div class="text-center py-5 text-muted">No applications found.</div>`;
        return;
    }

    container.innerHTML = apps.map(app => {
        const status = (app.status || 'pending').toLowerCase();
        const isSubmitted = status === 'interview_submitted' || status === 'completed';
        const name = app.candidate_name || 'Candidate';
        
        const initialsMatch = name.trim().match(/\b\w/g) || [];
        const initials = ((initialsMatch.shift() || '') + (initialsMatch.pop() || '')).toUpperCase() || 'C';

        return `
        <div class="talent-card-row">
            <div class="card-selection">
                <input type="checkbox" class="app-checkbox" data-id="${app.id}">
            </div>
            
            <div class="card-main-info" onclick="window.location.href='application-details.html?id=${app.id}'">
                <div class="avatar-box">${initials}</div>
                <div class="name-box">
                    <span class="full-name">${name}</span>
                    <span class="sub-text">${app.candidate_email || 'No email provided'}</span>
                </div>
            </div>

            <div class="card-job-info">
                <span class="job-name">${app.job_title || 'General Application'}</span>
                <span class="sub-text"><i class="far fa-clock"></i> Applied ${new Date(app.applied_at).toLocaleDateString()}</span>
            </div>

            <div class="card-status-info">
                <span class="badge ${isSubmitted ? 'badge-success' : 'badge-pending'}">
                    ${isSubmitted ? 'Responses Ready' : app.status}
                </span>
            </div>

            <div class="card-actions-toolbar">
                <a href="application-details.html?id=${app.id}" class="action-btn" title="View Profile">
                    <i class="fas fa-id-card"></i>
                </a>
                
                <button onclick="window.location.href='application-details.html?id=${app.id}#resume'" class="action-btn" title="View Resume">
                    <i class="fas fa-file-pdf"></i>
                </button>

                ${isSubmitted ? `
                    <button onclick="viewInterviewResponses('${app.id}')" class="action-btn primary" title="Watch Interview">
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

function filterApplications(searchTerm, jobFilterValue) {
    const term = (searchTerm || '').toLowerCase().trim();
    
    const header = document.getElementById('pageHeaderTitle');
    if (header) {
        header.textContent = jobFilterValue === 'all' ? "Received Applications" : `Applications for ${jobFilterValue}`;
    }

    const filtered = allApplications.filter(app => {
        const nameMatch = (app.candidate_name || '').toLowerCase().includes(term);
        const emailMatch = (app.candidate_email || '').toLowerCase().includes(term);
        const jobMatch = jobFilterValue === 'all' || app.job_title === jobFilterValue;
        
        return (nameMatch || emailMatch) && jobMatch;
    });

    renderList(filtered);
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