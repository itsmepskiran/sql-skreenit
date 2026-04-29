import { customAuth } from '@shared/js/auth-config.js';;
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import { sidebarManager } from '@shared/js/profile-checker.js';
import '@shared/js/mobile.js';
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    // console.log('[DEBUG] My Applications page loaded');
    checkAuth();
    setupNavigation();
});

async function checkAuth() {
    // console.log('[DEBUG] Checking auth...');
    const user = await customAuth.getUserData();
    // console.log('[DEBUG] User data:', user);
    
    if (!user) { 
        // console.log('[DEBUG] No user, redirecting to login');
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    // console.log('[DEBUG] User authenticated, updating sidebar and loading applications');
    await sidebarManager.initSidebar();
    loadApplications();
}

// --- LOAD APPLICATIONS ---
async function loadApplications() {
    // console.log('[DEBUG] loadApplications called');
    const container = document.getElementById("applicationsList");
    // console.log('[DEBUG] Container element:', container);
    
    if (!container) {
        // console.error('[DEBUG] ERROR: applicationsList container not found!');
        return;
    }
    
    container.innerHTML = '<div class="text-center p-5 w-100"><div class="spinner-border text-primary"></div></div>';

    try {
        // console.log('[DEBUG] Fetching /applicant/applications...');
        const res = await backendGet(`/applicant/applications`); 
        // console.log('[DEBUG] Response status:', res.status);
        
        const json = await handleResponse(res);
        // console.log('[DEBUG] Response JSON:', json);
        
        // Handle different response structures
        let apps = [];
        if (Array.isArray(json)) {
            apps = json;
        } else if (json.data && Array.isArray(json.data)) {
            apps = json.data;
        } else if (json.applications && Array.isArray(json.applications)) {
            apps = json.applications;
        }
        
        // console.log('[DEBUG] Parsed applications:', apps.length, apps);
        
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

            if (rawStatus === 'interviewing' && !(app.interview_responses && app.interview_responses.length > 0)) {
                displayStatus = 'Pending Interview';
                badgeColor = "background:#fffaf0; color:#c05621;"; 
            } else if (rawStatus === 'interview_submitted' || rawStatus === 'responses ready' || rawStatus === 'completed' || rawStatus.includes('submitted') || rawStatus.includes('ready')) {
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
            if (rawStatus === 'interviewing' && !(app.interview_responses && app.interview_responses.length > 0)) {
                actionButton = `
                    <a href="${CONFIG.PAGES.INTERVIEW_ROOM}?application_id=${app.id}" 
                       class="btn btn-primary" style="display:block; text-align:center; margin-top:1rem;">
                        <i class="fas fa-video me-1"></i> Start Interview
                    </a>`;
            } else if (rawStatus === 'interview_submitted' || rawStatus === 'responses ready' || rawStatus === 'completed' || rawStatus.includes('submitted') || rawStatus.includes('ready')) {
                actionButton = `
                    <button data-application-id="${app.id}" 
                            class="btn view-response-btn" 
                            style="display:block; width:100%; margin-top:1rem; background:transparent; border:1px solid var(--primary-color); color:var(--primary-color);"
                            onclick="event.stopPropagation(); window.viewMyResponse('${app.id}');">
                        <i class="fas fa-play-circle me-1"></i> Review Responses
                    </button>`;
            }

            return `
                <div class="card h-100" style="cursor: pointer;" onclick="window.location.href='${CONFIG.PAGES.JOB_DETAILS}?job_id=${app.job_id}'">
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
                            <button class="btn btn-secondary" style="display:block; width:100%; margin-top:1rem; background:#22c55e; border:none; color:white; cursor:default;" disabled>
                                <i class="fas fa-check-circle me-1"></i> Already Applied
                            </button>
                            ${actionButton}
                            <button data-job-id="${app.job_id}" 
                                    class="sample-questions-btn" 
                                    style="display:block; width:100%; margin-top:0.75rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border:none; color:white; cursor:pointer; padding: 0.6rem; border-radius: 8px; font-weight: 500; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
                                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';"
                                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';"
                                    onclick="event.stopPropagation(); window.viewSampleQuestions('${app.job_id}', '${app.job_title || 'Unknown Role'}');">
                                <i class="fas fa-lightbulb me-1"></i> Refer to Sample Questions
                            </button>
                            <a href="${CONFIG.PAGES.JOB_DETAILS}?job_id=${app.job_id}" 
                               style="display:block; text-align:center; width:100%; margin-top:0.75rem; color:var(--text-light); text-decoration:underline; font-size:0.85rem;">
                               View Job Details
                            </a>
                        </div>
                    </div>
                </div>`;
        }).join("");

    } catch (err) {
        // console.error("Load failed", err);
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
        // console.error('Error fetching interview responses:', error);
        modalBody.innerHTML = '<div class="alert alert-danger text-center border-0">Failed to load videos. Please try again.</div>';
    }
}

// --- SAMPLE QUESTIONS LOGIC ---
async function viewSampleQuestions(jobId, jobTitle) {
    const modalEl = document.getElementById('sampleQuestionsModal');
    const modalLabel = document.getElementById('sampleQuestionsModalLabel');
    const modalBody = document.getElementById('sampleQuestionsModalBody');
    const modal = new bootstrap.Modal(modalEl);
    
    modalLabel.innerHTML = `<i class="fas fa-lightbulb me-2"></i>Sample Interview Questions - ${jobTitle}`;
    modalBody.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Generating sample questions based on job description...</p>
        </div>`;
    modal.show();

    try {
        const response = await backendPost('/applicant/job-sample-questions', { job_id: jobId }, { timeout: 120000 }); // 2 minutes timeout for AI generation
        const data = await handleResponse(response);
        
        const questions = data.questions || data.data || [];

        if (!questions.length) {
            modalBody.innerHTML = '<div class="alert alert-warning text-center border-0">No sample questions available for this job.</div>';
            return;
        }

        modalBody.innerHTML = questions.map((q, i) => {
            const priorityClass = q.priority === 'High' ? 'bg-danger' : q.priority === 'Medium' ? 'bg-warning' : 'bg-success';
            const priorityText = q.priority || 'Medium';
            
            return `
                <div class="card mb-3 border-0" style="background: #f8fafc;">
                    <div class="card-body">
                        <div class="d-flex align-items-start mb-2">
                            <span class="badge ${priorityClass} me-2">${priorityText}</span>
                            <h6 class="mb-0 flex-grow-1" style="color: #1e293b;">${i + 1}. ${q.question || 'Question'}</h6>
                        </div>
                        ${q.category ? `<small class="text-muted d-block mb-2"><i class="fas fa-tag me-1"></i>${q.category}</small>` : ''}
                        ${q.preparation_tip ? `
                            <div class="mt-2 p-2" style="background: #e0f2fe; border-radius: 6px; border-left: 3px solid #0284c7;">
                                <small style="color: #0c4a6e;"><i class="fas fa-lightbulb me-1"></i><strong>Tip:</strong> ${q.preparation_tip}</small>
                            </div>
                        ` : ''}
                        ${q.answer ? `
                            <div class="mt-2 p-2" style="background: #f0fdf4; border-radius: 6px; border-left: 3px solid #16a34a;">
                                <small style="color: #166534;"><i class="fas fa-check-circle me-1"></i><strong>Sample Answer:</strong> ${q.answer}</small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Setup copy button
        document.getElementById('copySampleQuestionsBtn').onclick = () => {
            const text = questions.map((q, i) => `${i + 1}. ${q.question}${q.answer ? `\nAnswer: ${q.answer}` : ''}`).join('\n\n');
            navigator.clipboard.writeText(text).then(() => {
                const btn = document.getElementById('copySampleQuestionsBtn');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check me-1"></i> Copied!';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                }, 2000);
            });
        };

    } catch (error) {
        console.error('Error fetching sample questions:', error);
        modalBody.innerHTML = '<div class="alert alert-danger text-center border-0">Failed to load sample questions. Please try again.</div>';
    }
}

// --- NAVIGATION & EVENT LISTENERS ---
function setupNavigation() {
    const navDashboard = document.getElementById("navDashboard");
    const navJobs = document.getElementById("navJobs");
    const navProfile = document.getElementById("navProfile");
    const navApplications = document.getElementById("navApplications"); 
    const logoutBtn = document.getElementById("logoutBtn");
    const activeJobsCard = document.getElementById('btnActiveJobs');
    if (activeJobsCard) {
        activeJobsCard.style.cursor = 'pointer';
        activeJobsCard.addEventListener('click', () => {
            // Redirect to My Jobs listing page (public jobs page with filter)
            window.location.href = CONFIG.PAGES.MY_JOBS;
        });
    }
    const origin = window.location.origin;

    // Absolute Paths for Sidebar
    if (navDashboard) {
        navDashboard.addEventListener('click', () => {
            window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
        });
    }
    if (navJobs) {
        navJobs.addEventListener('click', () => {
            window.location.href = CONFIG.PAGES.JOBS;
        });
    }
    if (navProfile) {
        navProfile.addEventListener('click', async () => {
            const u = await customAuth.getUserData();
            if (u && u.onboarded) {
                window.location.href = CONFIG.PAGES.CANDIDATE_PROFILE;
            } else {
                window.location.href = CONFIG.PAGES.APPLY_FORM;
            }
        });
    }
    if (navApplications) {
        navApplications.addEventListener('click', () => {
            window.location.href = CONFIG.PAGES.MY_APPLICATIONS;
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await customAuth.signOut();
            window.location.href = CONFIG.PAGES.JOBS;
        });
    }

    // Event Delegation for "Review My Responses" buttons
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.view-response-btn');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            const appId = btn.dataset.applicationId;
            if (appId) {
                await viewMyResponse(appId);
            }
        }
    });
}

// Make functions globally accessible for inline onclick handlers
window.viewMyResponse = viewMyResponse;
window.viewSampleQuestions = viewSampleQuestions;
