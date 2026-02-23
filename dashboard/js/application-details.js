import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

// Configuration & Global State
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
let currentApplicationData = null; // Stores data for smart "Back" navigation

// Initialize Logo
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
});

// --- AUTH & SIDEBAR SYNC ---
async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    updateSidebarProfile(session.user.user_metadata, session.user.email);
    updateUserInfo();

    const urlParams = new URLSearchParams(window.location.search);
    const appId = urlParams.get('id');
    
    if(!appId) {
        alert("Invalid Application ID");
        window.location.href = CONFIG.PAGES.APPLICATION_LIST;
        return;
    }

    loadApplicationDetails(appId);
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
    } catch (error) { 
        // Silent fail
    }
}

// --- ABSOLUTE NAVIGATION ---
function setupNavigation() {
    const origin = window.location.origin;

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
    
    if(backBtn) {
        backBtn.addEventListener('click', () => {
            // Smart Redirect: Return to the filtered list if we have the job_id
            if(currentApplicationData && currentApplicationData.job_id) {
                window.location.href = CONFIG.PAGES.APPLICATION_LIST + `?job_id=${currentApplicationData.job_id}`;
            } else {
                window.location.href = CONFIG.PAGES.APPLICATION_LIST;
            }
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = CONFIG.PAGES.LOGIN;
        });
    }
}

// --- CORE LOGIC ---
async function loadApplicationDetails(appId) {
    try {
        const res = await backendGet(`/recruiter/applications/${appId}`);
        const json = await handleResponse(res);
        const app = json.data || json;

        if (!app) throw new Error("Application not found");

        // Store data globally for the "Back" button and other functions
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

    // Basic Info
    document.getElementById('candidateName').textContent = app.candidate_name || "Candidate";
    document.getElementById('jobTitle').textContent = app.job_title || "Unknown Job";
    document.getElementById('candidateEmail').textContent = app.candidate_email || "-";
    document.getElementById('appliedDate').textContent = new Date(app.applied_at).toLocaleDateString();

    // ✅ RESUME EMBED LOGIC
    const viewer = document.getElementById('resumeViewer');
    const noResume = document.getElementById('noResumeState');
    const downloadBtn = document.getElementById('resumeDownloadBtn');

    if (app.resume_link) {
        // We use Google Docs viewer or direct iframe if the browser supports it
        const isGoogleViewer = !app.resume_link.endsWith('.pdf'); // Simple heuristic
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

    const payload = { 
        status: newStatus,
        questions: questions 
    };

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