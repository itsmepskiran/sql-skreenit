// jobs/js/jobs.js
import { customAuth } from '@shared/js/auth-config.js';;
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../assets' : 'https://assets.skreenit.com';

// Update logo
const logoImg = document.getElementById('logoImg');
if (logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

// ===============================
// GLOBAL ELEMENTS
// ===============================
const jobsContainer = document.getElementById('jobsContainer');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const authModal = document.getElementById('authModal');
const loginRedirectBtn = document.getElementById('loginRedirectBtn');
const registerRedirectBtn = document.getElementById('registerRedirectBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const headerActions = document.getElementById('headerActions');

// Filter elements
const filterPosition = document.getElementById('filterPosition');
const filterSkills = document.getElementById('filterSkills');
const filterCompany = document.getElementById('filterCompany');
const filterLocation = document.getElementById('filterLocation');
const filterType = document.getElementById('filterType');
const filterSalary = document.getElementById('filterSalary');

// Global Elements for Intro Video Modal
const introVideoModal = document.getElementById('introVideoModal');
const useExistingVideoBtn = document.getElementById('useExistingVideoBtn');
const recordNewVideoBtn = document.getElementById('recordNewVideoBtn');
const skipVideoBtn = document.getElementById('skipVideoBtn');
const closeVideoModalBtn = document.getElementById('closeVideoModalBtn');
const existingVideoInfo = document.getElementById('existingVideoInfo');
const videoActionButtons = document.getElementById('videoActionButtons');
const videoUploadProgress = document.getElementById('videoUploadProgress');
const videoProgressBar = document.getElementById('videoProgressBar');
const videoProgressText = document.getElementById('videoProgressText');

// ===============================
// STATE
// ===============================
let allJobs = [];
let currentUser = null;
let selectedJobId = null;
let currentApplicationJobId = null;
let existingVideoUrl = null;

// ===============================
// AUTHENTICATION
// ===============================

/**
 * Check if user is authenticated and update UI accordingly
 */
async function checkAuth() {
    const { data: { session } } = await customAuth.getSession();
    currentUser = session?.user || null;
    updateHeaderForAuth();
    return currentUser;
}

/**
 * Update header based on authentication status
 */
function updateHeaderForAuth() {
    if (!headerActions) return;

    if (currentUser) {
        // User is logged in - show user info
        const userName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
        const initial = userName.charAt(0).toUpperCase();

        headerActions.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${initial}</div>
                <span class="user-name">${userName}</span>
            </div>
            <a href="${CONFIG.PAGES.DASHBOARD_CANDIDATE}" class="btn btn-primary">
                <i class="fas fa-th-large"></i> Dashboard
            </a>
            <button class="btn btn-outline" id="logoutBtn">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        `;

        // Add logout handler
        document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    } else {
        // User is not logged in - show login/register buttons
        headerActions.innerHTML = `
            <a href="${CONFIG.PAGES.LOGIN}" class="btn btn-outline">
                <i class="fas fa-sign-in-alt"></i> Login
            </a>
            <a href="${CONFIG.PAGES.REGISTER}" class="btn btn-primary">
                <i class="fas fa-user-plus"></i> Register
            </a>
        `;
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    await customAuth.signOut();
    currentUser = null;
    updateHeaderForAuth();
    showToast('Logged out successfully', 'info');
}

// ===============================
// JOB FETCHING
// ===============================

/**
 * Fetch all active jobs from Supabase
 */
async function fetchJobs() {
    showLoading();

    try {
        // TODO: Replace with backendGet("/api/v1/jobs") call
            .in("status", ["active", "published", "live"])
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching jobs:", error);
            showError("Failed to load jobs. Please try again.");
            return [];
        }

        allJobs = data || [];
        return allJobs;
    } catch (err) {
        console.error("Unexpected error:", err);
        showError("An unexpected error occurred.");
        return [];
    }
}

// ===============================
// JOB RENDERING
// ===============================

/**
 * Render jobs grid
 */
function renderJobs(jobs) {
    if (!jobsContainer) return;

    if (jobs.length === 0) {
        jobsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No jobs found</h3>
                <p>Try adjusting your filters or search criteria</p>
            </div>
        `;
        return;
    }

    jobsContainer.innerHTML = `
        <div class="jobs-grid">
            ${jobs.map(job => createJobCard(job)).join('')}
        </div>
    `;

    // Attach event listeners to apply buttons
    attachApplyListeners();
}

/**
 * Create HTML for a single job card
 */
function createJobCard(job) {
    const skills = job.skills || [];
    const displaySkills = skills.slice(0, 4);
    const remainingSkills = skills.length > 4 ? skills.length - 4 : 0;

    const postedDate = job.created_at
        ? new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'Recently';

    const salaryDisplay = job.salary_range || (job.salary_min && job.salary_max
        ? `${job.salary_min}-${job.salary_max} LPA`
        : 'Salary not disclosed');

    const isAuthenticated = !!currentUser;
    const applyButton = isAuthenticated
        ? `<button class="btn btn-apply" data-job-id="${job.id}">
             <i class="fas fa-paper-plane"></i> Apply Now
           </button>`
        : `<button class="btn btn-login-prompt" data-job-id="${job.id}">
             <i class="fas fa-lock"></i> Sign in to Apply
           </button>`;

    return `
        <div class="job-card">
            <div class="job-card-header">
                <div class="job-card-title-section">
                    <h3 class="job-card-title">${escapeHtml(job.title)}</h3>
                    <p class="job-card-company">${escapeHtml(job.company)}</p>
                </div>
                ${job.job_type ? `<span class="job-card-badge">${formatJobType(job.job_type)}</span>` : ''}
            </div>

            <div class="job-card-details">
                ${job.location ? `
                    <div class="job-card-detail-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${escapeHtml(job.location)}</span>
                    </div>
                ` : ''}
                <div class="job-card-detail-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>${escapeHtml(salaryDisplay)}</span>
                </div>
                ${job.experience ? `
                    <div class="job-card-detail-item">
                        <i class="fas fa-briefcase"></i>
                        <span>${escapeHtml(job.experience)}</span>
                    </div>
                ` : ''}
            </div>

            ${job.description ? `
                <p class="job-card-description">${escapeHtml(truncateText(job.description, 120))}</p>
            ` : ''}

            ${displaySkills.length > 0 ? `
                <div class="job-card-skills">
                    ${displaySkills.map(skill => `<span class="job-skill-tag">${escapeHtml(skill)}</span>`).join('')}
                    ${remainingSkills > 0 ? `<span class="job-skill-tag">+${remainingSkills} more</span>` : ''}
                </div>
            ` : ''}

            <div class="job-card-footer">
                <span class="job-card-posted">
                    <i class="fas fa-clock"></i> Posted ${postedDate}
                </span>
            </div>

            <div style="margin-top: 1rem;">
                ${applyButton}
            </div>
        </div>
    `;
}

/**
 * Attach click listeners to apply buttons
 */
function attachApplyListeners() {
    // Apply buttons for authenticated users
    document.querySelectorAll('.btn-apply').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const jobId = e.currentTarget.dataset.jobId;
            await handleApply(jobId);
        });
    });

    // Login prompt buttons for unauthenticated users
    document.querySelectorAll('.btn-login-prompt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const jobId = e.currentTarget.dataset.jobId;
            showAuthModal(jobId);
        });
    });
}

// ===============================
// APPLY LOGIC
// ===============================

/**
 * Handle job application
 */
async function handleApply(jobId) {
    if (!currentUser) {
        showAuthModal(jobId);
        return;
    }

    // Check if user is a candidate
    const role = currentUser.user_metadata?.role?.toLowerCase();
    if (role !== 'candidate') {
        showToast('Only candidates can apply for jobs. Please login as a candidate.', 'error');
        return;
    }

    // Check if already applied
    const hasApplied = await checkExistingApplication(jobId, currentUser.id);
    if (hasApplied) {
        showToast('You have already applied for this job!', 'info');
        return;
    }

    // Redirect to application form with job_id
    const applyUrl = new URL(CONFIG.PAGES.APPLY_FORM, window.location.origin);
    applyUrl.searchParams.set('job_id', jobId);
    window.location.href = applyUrl.toString();
}

/**
 * Check if user already applied for this job
 */
async function checkExistingApplication(jobId, userId) {
    try {
        // TODO: Replace with backendGet("/api/v1/applications") call
            .eq('job_id', jobId)
            .eq('candidate_id', userId)
            .limit(1);

        if (error) {
            console.error("Error checking application:", error);
            return false;
        }

        return data && data.length > 0;
    } catch (err) {
        console.error("Error:", err);
        return false;
    }
}

// ===============================
// AUTH MODAL
// ===============================

/**
 * Show authentication modal
 */
function showAuthModal(jobId) {
    selectedJobId = jobId;

    // Set redirect URLs with return URL
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('job_id', jobId);
    const returnUrl = encodeURIComponent(currentUrl.toString());

    const loginUrl = new URL(CONFIG.PAGES.LOGIN, window.location.origin);
    loginUrl.searchParams.set('redirect', returnUrl);

    const registerUrl = new URL(CONFIG.PAGES.REGISTER, window.location.origin);
    registerUrl.searchParams.set('redirect', returnUrl);

    loginRedirectBtn.href = loginUrl.toString();
    registerRedirectBtn.href = registerUrl.toString();

    authModal.classList.add('active');
}

/**
 * Handle job application - Show intro video modal
 */
async function handleApply(jobId) {
    if (!currentUser) {
        showAuthModal(jobId);
        return;
    }

    // Check if user is a candidate
    const role = currentUser.user_metadata?.role?.toLowerCase();
    if (role !== 'candidate') {
        showToast('Only candidates can apply for jobs. Please login as a candidate.', 'error');
        return;
    }

    // Check if already applied
    const hasApplied = await checkExistingApplication(jobId, currentUser.id);
    if (hasApplied) {
        showToast('You have already applied for this job!', 'info');
        return;
    }

    // Store job ID for application
    currentApplicationJobId = jobId;
    
    // Show intro video modal
    showIntroVideoModal();
}

/**
 * Show intro video modal and check for existing video
 */
async function showIntroVideoModal() {
    // Reset modal state
    existingVideoInfo.style.display = 'none';
    videoActionButtons.style.display = 'flex';
    videoUploadProgress.style.display = 'none';
    existingVideoUrl = null;
    
    // Check if user has an existing intro video
    try {
        const { data: profile } = await supabase
            .from('candidate_profiles')
            .select('intro_video_url')
            .eq('user_id', currentUser.id)
            .single();
        
        if (profile?.intro_video_url) {
            existingVideoUrl = profile.intro_video_url;
            useExistingVideoBtn.style.display = 'block';
            existingVideoInfo.style.display = 'block';
        } else {
            useExistingVideoBtn.style.display = 'none';
            existingVideoInfo.style.display = 'none';
        }
    } catch (err) {
        console.warn('Could not fetch existing video:', err);
        useExistingVideoBtn.style.display = 'none';
    }
    
    introVideoModal.classList.add('active');
}

/**
 * Close intro video modal
 */
function closeIntroVideoModal() {
    introVideoModal.classList.remove('active');
    currentApplicationJobId = null;
}

/**
 * Redirect to profile page to record new video
 */
function redirectToRecordVideo() {
    // Store job_id in sessionStorage to redirect back after recording
    sessionStorage.setItem('pendingJobApplication', currentApplicationJobId);
    window.location.href = CONFIG.PAGES.CANDIDATE_PROFILE;
}

/**
 * Submit application with video
 */
async function submitApplicationWithVideo() {
    if (!currentApplicationJobId) return;
    
    videoUploadProgress.style.display = 'block';
    videoActionButtons.style.display = 'none';
    updateVideoProgress(50, 'Submitting application...');
    
    // Submit application
    try {
        // TODO: Replace with backendPost("/api/v1/job_applications", data) call{
                job_id: currentApplicationJobId,
                candidate_id: currentUser.id,
                status: 'submitted',
                intro_video_url: existingVideoUrl || null
            })
            .select()
            .single();
        
        if (error) {
            if (error.message?.includes('duplicate')) {
                showToast('You have already applied for this job!', 'info');
            } else {
                throw error;
            }
        } else {
            updateVideoProgress(100, 'Application submitted!');
            showToast('Application submitted successfully!', 'success');
        }
        
        setTimeout(() => {
            closeIntroVideoModal();
        }, 500);
        
    } catch (err) {
        console.error('Application submission failed:', err);
        showToast('Failed to submit application. Please try again.', 'error');
        videoUploadProgress.style.display = 'none';
        videoActionButtons.style.display = 'flex';
    }
}

/**
 * Update video upload progress UI
 */
function updateVideoProgress(percent, text) {
    videoProgressBar.style.width = percent + '%';
    videoProgressText.textContent = text || `Processing... ${percent}%`;
}

/**
 * Close auth modal
 */
function closeAuthModal() {
    authModal.classList.remove('active');
    selectedJobId = null;
}

// ===============================
// FILTERING & SEARCH
// ===============================

/**
 * Apply filters to jobs
 */
function applyFilters() {
    let filtered = [...allJobs];

    const position = filterPosition?.value.toLowerCase().trim() || '';
    const skills = filterSkills?.value.toLowerCase().trim() || '';
    const company = filterCompany?.value.toLowerCase().trim() || '';
    const location = filterLocation?.value.toLowerCase().trim() || '';
    const type = filterType?.value || '';
    const salary = filterSalary?.value || '';

    if (position) {
        filtered = filtered.filter(j => j.title?.toLowerCase().includes(position));
    }

    if (skills) {
        filtered = filtered.filter(j =>
            (j.skills || []).some(skill => skill.toLowerCase().includes(skills))
        );
    }

    if (company) {
        filtered = filtered.filter(j => j.company?.toLowerCase().includes(company));
    }

    if (location) {
        filtered = filtered.filter(j => j.location?.toLowerCase().includes(location));
    }

    if (type) {
        filtered = filtered.filter(j => j.job_type === type);
    }

    if (salary) {
        filtered = filtered.filter(j => {
            if (!j.salary_min && !j.salary_max) return false;

            const [min, max] = salary.split('-');
            const jobMin = j.salary_min || 0;

            if (max === '+') return jobMin >= parseInt(min);
            return jobMin >= parseInt(min) && jobMin <= parseInt(max);
        });
    }

    renderJobs(filtered);
}

/**
 * Clear all filters
 */
function clearFilters() {
    if (filterPosition) filterPosition.value = '';
    if (filterSkills) filterSkills.value = '';
    if (filterCompany) filterCompany.value = '';
    if (filterLocation) filterLocation.value = '';
    if (filterType) filterType.value = '';
    if (filterSalary) filterSalary.value = '';
    if (searchInput) searchInput.value = '';

    renderJobs(allJobs);
}

/**
 * Search jobs
 */
function searchJobs() {
    const query = searchInput?.value.toLowerCase().trim() || '';

    if (!query) {
        renderJobs(allJobs);
        return;
    }

    const filtered = allJobs.filter(job =>
        job.title?.toLowerCase().includes(query) ||
        job.company?.toLowerCase().includes(query) ||
        (job.skills || []).some(skill => skill.toLowerCase().includes(query))
    );

    renderJobs(filtered);
}

// ===============================
// UI HELPERS
// ===============================

function showLoading() {
    if (jobsContainer) {
        jobsContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading jobs...</p>
            </div>
        `;
    }
}

function showError(message) {
    if (jobsContainer) {
        jobsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle" style="color: var(--danger-color);"></i>
                <h3>Oops!</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? 'fa-check-circle'
        : type === 'error' ? 'fa-exclamation-circle'
        : 'fa-info-circle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===============================
// UTILITY FUNCTIONS
// ===============================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

function formatJobType(type) {
    const types = {
        'full-time': 'Full Time',
        'part-time': 'Part Time',
        'remote': 'Remote',
        'hybrid': 'Hybrid',
        'contract': 'Contract',
        'internship': 'Internship'
    };
    return types[type] || type;
}

// ===============================
// CHECK FOR REDIRECT AFTER LOGIN
// ===============================

/**
 * Check if user was redirected back after login and auto-apply
 */
async function checkPostLoginRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('job_id');

    if (jobId && currentUser) {
        // User was redirected back after login with a job_id
        // Remove job_id from URL without reloading
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('job_id');
        window.history.replaceState({}, '', newUrl.toString());

        // Show success message and prompt to apply
        showToast('Welcome back! You can now apply for jobs.', 'success');

        // Scroll to the job if it exists
        setTimeout(() => {
            const jobCard = document.querySelector(`[data-job-id="${jobId}"]`)?.closest('.job-card');
            if (jobCard) {
                jobCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                jobCard.style.animation = 'pulse 1s ease';
            }
        }, 500);
    }
}

// ===============================
// INITIALIZATION
// ===============================

async function init() {
    // Check authentication status
    await checkAuth();

    // Listen for auth state changes
    customAuth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            updateHeaderForAuth();
            // Refresh jobs to update apply buttons
            renderJobs(allJobs);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            updateHeaderForAuth();
            renderJobs(allJobs);
        }
    });

    // Fetch jobs
    await fetchJobs();
    renderJobs(allJobs);

    // Check for post-login redirect
    await checkPostLoginRedirect();

    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Search
    searchBtn?.addEventListener('click', searchJobs);
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchJobs();
    });

    // Filters
    applyFiltersBtn?.addEventListener('click', applyFilters);
    clearFiltersBtn?.addEventListener('click', clearFilters);

    // Auth Modal
    closeModalBtn?.addEventListener('click', closeAuthModal);
    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) closeAuthModal();
    });

    // Intro Video Modal
    closeVideoModalBtn?.addEventListener('click', closeIntroVideoModal);
    introVideoModal?.addEventListener('click', (e) => {
        if (e.target === introVideoModal) closeIntroVideoModal();
    });
    
    // Video action buttons
    useExistingVideoBtn?.addEventListener('click', submitApplicationWithVideo);
    recordNewVideoBtn?.addEventListener('click', redirectToRecordVideo);
    skipVideoBtn?.addEventListener('click', submitApplicationWithVideo);

    // Allow Enter key in filter inputs to apply filters
    [filterPosition, filterSkills, filterCompany, filterLocation].forEach(input => {
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyFilters();
        });
    });
}

// Start the app
init();
