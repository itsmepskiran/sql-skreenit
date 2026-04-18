// jobs/js/jobs.js
import { customAuth } from '@shared/js/auth-config.js';
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import { showError, showSuccess, hideWarning } from '@shared/js/notification-manager.js';
import '@shared/js/mobile.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../assets' : 'https://assets.skreenit.com';

// Auth page links (fix: ensure variables exist)
const LOGIN_PAGE = CONFIG.PAGES.LOGIN;
const REGISTER_PAGE = CONFIG.PAGES.REGISTER;

// Update logo
const logoImg = document.getElementById('logoImg');
const logoLink = document.querySelector('.logo-link');
if (logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;
if (logoLink) logoLink.href = CONFIG.PAGES.INDEX;

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
const filterEducation = document.getElementById('filterEducation');
const filterType = document.getElementById('filterType');
const filterSalary = document.getElementById('filterSalary');

// Global Elements for Inline Login
const inlineLoginContainer = document.getElementById('inlineLoginContainer');
const closeInlineLogin = document.getElementById('closeInlineLogin');
const inlineLoginEmail = document.getElementById('inlineLoginEmail');
const inlineLoginPassword = document.getElementById('inlineLoginPassword');
const inlineLoginBtn = document.getElementById('inlineLoginBtn');
const inlineRegisterLink = document.getElementById('inlineRegisterLink');

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
let pendingJobId = null; // Store job ID for inline login

// ===============================
// AUTHENTICATION
// ===============================

/**
 * Check if user is authenticated and update UI accordingly
 */
async function checkAuth() {
    const { data: { session } } = await customAuth.getSession();
    currentUser = session?.user || null;
    await updateHeaderForAuth();
    return currentUser;
}

/**
 * Update header based on authentication status
 */
async function updateHeaderForAuth() {
    if (!headerActions) return;

    if (currentUser) {
        // Fetch profile for full name
        let displayName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
        try {
            const response = await backendGet('/applicant/profile');
            const profile = await handleResponse(response);
            if (profile.data?.full_name) {
                displayName = profile.data.full_name;
            }
        } catch (err) {
            // console.warn('Could not fetch profile for header:', err);
        }
        
        const initial = displayName.charAt(0).toUpperCase();
        
        // Fetch Skreenit ID from profile
        let skreenitId = '';
        try {
            const profileResponse = await backendGet('/applicant/profile');
            const profile = await handleResponse(profileResponse);
            if (profile.data?.candidate_display_id) {
                skreenitId = profile.data.candidate_display_id;
            }
        } catch (err) {
            // console.warn('Could not fetch Skreenit ID:', err);
        }

        headerActions.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div class="user-info" style="cursor: pointer;" id="userInfoHeader">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="user-avatar" style="flex-shrink: 0;">${initial}</div>
                        <div style="display: flex; flex-direction: column;">
                            <span class="user-name" style="font-weight: 600; font-size: 1rem;">${displayName}</span>
                            ${skreenitId ? `<span style="font-size: 0.75rem; color: #64748b;">Skreenit ID: ${skreenitId}</span>` : ''}
                        </div>
                    </div>
                </div>
                <button id="logoutBtn" class="btn btn-outline" style="flex-shrink: 0; margin-left: 20px;">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        `;
        
        // Attach click handler to redirect to dashboard
        const userInfoHeader = document.getElementById('userInfoHeader');
        if (userInfoHeader) {
            userInfoHeader.addEventListener('click', () => {
                window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
            });
        }
        
        // Attach logout listener
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    } else {
        // User is not logged in - show login/register buttons
        headerActions.innerHTML = `
            <a href="${CONFIG.PAGES.LOGIN}" class="btn btn-outline">Sign In</a>
            <a href="${CONFIG.PAGES.REGISTER}" class="btn btn-primary">Get Started</a>
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
 * Fetch all active jobs from Database
 */
async function fetchJobs() {
    showLoading();

    try {
        const response = await backendGet('/dashboard/jobs');
        const data = await handleResponse(response);
        
        if (data.error) {
            // console.error("Error fetching jobs:", data.error);
            showError("errorBox", "Failed to load jobs. Please try again.", "Loading Failed");
            return [];
        }

        allJobs = data.data?.jobs || data.jobs || [];
        // console.log('[DEBUG] fetchJobs - data keys:', Object.keys(data));
        // console.log('[DEBUG] fetchJobs - data.data keys:', data.data ? Object.keys(data.data) : 'N/A');
        // console.log('[DEBUG] fetchJobs - jobs count:', allJobs.length);
        return allJobs;
    } catch (err) {
        // console.error("Unexpected error:", err);
        showError("errorBox", "An unexpected error occurred.", "Error");
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
    const skills = job.skills || job.job_skills || [];
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
        : `<a href="${LOGIN_PAGE}" class="btn btn-login-prompt" data-job-id="${job.id}">
             <i class="fas fa-lock"></i> Sign in to Apply
           </a>`;
    return `
        <div class="job-card">
            <div class="job-card-header">
                <div class="job-card-title-section">
                    <h3 class="job-card-title">${escapeHtml(job.job_title)}</h3>
                    <p class="job-card-company">${escapeHtml(job.company_name || 'Unknown Company')}</p>
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
function initAdSlider() {
    const wrapper = document.getElementById('adWrapper');
    if (!wrapper) return;
    const items = wrapper.querySelectorAll('.ad-item');
    if (!items || items.length === 0) return;
    
    let index = 0;
    const itemHeight = 50; // Fixed height to match CSS
    
    setInterval(() => {
        index = (index + 1) % items.length;
        // Apply transform to the inner wrapper, not the container
        wrapper.style.transform = `translateY(-${index * itemHeight}px)`;
    }, 3000);
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

    // Login prompt buttons for unauthenticated users - show inline login
    document.querySelectorAll('.btn-login-prompt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const jobId = e.currentTarget.dataset.jobId;
            showInlineLogin(jobId);
        });
    });
    
    // Inline login event listeners
    if (closeInlineLogin) {
        closeInlineLogin.addEventListener('click', hideInlineLogin);
    }
    
    if (inlineLoginBtn) {
        inlineLoginBtn.addEventListener('click', handleInlineLogin);
    }
    
    if (inlineRegisterLink) {
        inlineRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = CONFIG.PAGES.REGISTER;
        });
    }
}

// ===============================
// INLINE LOGIN FUNCTIONS
// ===============================

/**
 * Show inline login container
 */
function showInlineLogin(jobId) {
    pendingJobId = jobId;
    
    // Hide jobs grid temporarily
    if (jobsContainer) {
        jobsContainer.style.display = 'none';
    }
    
    // Show inline login container
    if (inlineLoginContainer) {
        inlineLoginContainer.style.display = 'block';
        
        // Focus on email field
        setTimeout(() => {
            if (inlineLoginEmail) {
                inlineLoginEmail.focus();
            }
        }, 100);
    }
    
    // Scroll to login form
    if (inlineLoginContainer) {
        inlineLoginContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Hide inline login container
 */
function hideInlineLogin() {
    if (inlineLoginContainer) {
        inlineLoginContainer.style.display = 'none';
    }
    
    // Show jobs grid again
    if (jobsContainer) {
        jobsContainer.style.display = 'block';
    }
    
    // Clear form
    if (inlineLoginEmail) inlineLoginEmail.value = '';
    if (inlineLoginPassword) inlineLoginPassword.value = '';
    
    pendingJobId = null;
}

/**
 * Handle inline login submission
 */
async function handleInlineLogin() {
    const email = inlineLoginEmail?.value;
    const password = inlineLoginPassword?.value;
    
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    // Disable login button
    if (inlineLoginBtn) {
        inlineLoginBtn.disabled = true;
        inlineLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    }
    
    try {
        // Attempt login
        const result = await customAuth.signInWithPassword({ login_id: email, password });
        
        if (result.error) {
            throw result.error;
        }
        
        // Update current user
        currentUser = result.data?.user || null;
        updateHeaderForAuth();
        
        // Hide login container
        hideInlineLogin();
        
        // Show success message
        showToast('Login successful!', 'success');
        
        // Re-render jobs to update apply buttons
        renderJobs(allJobs);
        
        // If there was a pending job ID, apply for it after a short delay
        if (pendingJobId) {
            setTimeout(() => {
                handleApply(pendingJobId);
            }, 1000);
        }
        
    } catch (error) {
        // console.error('Login error:', error);
        let errorMessage = 'Login failed. Please try again.';
        
        // Check for specific error types from backend
        const errorDetail = error.message || error.detail || '';
        const errorLower = errorDetail.toLowerCase();
        
        if (errorLower.includes('user not found') || errorLower.includes('not registered') || errorLower.includes('no user')) {
            errorMessage = 'User not found. Please register to create an account.';
        } else if (errorLower.includes('invalid password') || errorLower.includes('wrong password') || errorLower.includes('incorrect password')) {
            errorMessage = 'Incorrect password. Please try again or click "Forgot Password" to reset.';
        } else if (errorLower.includes('invalid credentials')) {
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (errorLower.includes('account locked') || errorLower.includes('too many attempts')) {
            errorMessage = 'Account temporarily locked due to too many failed attempts. Please try again later.';
        } else if (errorLower.includes('email not verified') || errorLower.includes('not verified')) {
            errorMessage = 'Please verify your email address before logging in. Check your inbox for the verification link.';
        } else if (errorDetail) {
            // Use backend error message if available
            errorMessage = errorDetail;
        }
        
        showToast(errorMessage, 'error');
    } finally {
        // Re-enable login button
        if (inlineLoginBtn) {
            inlineLoginBtn.disabled = false;
            inlineLoginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    }
}

// ===============================
// APPLY LOGIC
// ===============================

/**
 * Handle job application - redirect to job-details to maintain session
 */
async function handleApply(jobId) {
    if (!currentUser) {
        showAuthModal(jobId);
        return;
    }

    // Check role from multiple possible sources
    const role = (currentUser.user_metadata?.role || currentUser.role || currentUser.app_metadata?.role || '').toLowerCase();
    
    // If not candidate, show message but still redirect to job-details where proper auth is handled
    if (role && role !== 'candidate') {
        showToast('Redirecting to job details...', 'info');
    }

    // Always redirect to job details page with job_id - session will be maintained there
    const detailsUrl = new URL(CONFIG.PAGES.JOB_DETAILS, window.location.origin);
    detailsUrl.searchParams.set('job_id', jobId);
    window.location.href = detailsUrl.toString();
}

/**
 * Check if user already applied for this job
 */
async function checkExistingApplication(jobId, userId) {
    try {
        const response = await backendGet('/applicant/applications');
        const result = await handleResponse(response);
        
        const applications = result.data || [];
        const existingApplication = applications.find(app => 
            app.job_id === jobId && app.candidate_id === userId
        );

        return existingApplication;
    } catch (err) {
        // console.error("Error:", err);
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

    // Set redirect URLs to job-details with job_id so session continues after login
    const targetUrl = new URL(CONFIG.PAGES.JOB_DETAILS, window.location.origin);
    targetUrl.searchParams.set('job_id', jobId);
    const returnUrl = encodeURIComponent(targetUrl.toString());

    const loginUrl = new URL(CONFIG.PAGES.LOGIN);
    loginUrl.searchParams.set('redirect', returnUrl);

    const registerUrl = new URL(CONFIG.PAGES.REGISTER);
    registerUrl.searchParams.set('redirect', returnUrl);

    loginRedirectBtn.href = loginUrl.toString();
    registerRedirectBtn.href = registerUrl.toString();

    authModal.classList.add('active');
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
        const response = await backendGet('/applicant/profile');
        const profile = await handleResponse(response);
        
        if (profile.data?.intro_video_url) {
            existingVideoUrl = profile.data.intro_video_url;
            useExistingVideoBtn.style.display = 'block';
            existingVideoInfo.style.display = 'block';
        } else {
            useExistingVideoBtn.style.display = 'none';
            existingVideoInfo.style.display = 'none';
        }
    } catch (err) {
        // console.warn('Could not fetch existing video:', err);
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
        // Get candidate profile to include resume URL
        const profileResponse = await backendGet('/applicant/profile');
        const profile = await handleResponse(profileResponse);
        
        const response = await backendPost('/applicant/apply', {
            job_id: currentApplicationJobId,
            candidate_id: currentUser.id,
            intro_video_url: existingVideoUrl || null,
            resume_url: profile.data?.resume_url || null
        });
        
        const result = await handleResponse(response);
        
        if (result.error) {
            if (result.error.message?.includes('duplicate')) {
                showToast('You have already applied for this job!', 'info');
            } else {
                throw new Error(result.error.message || 'Application failed');
            }
        } else {
            updateVideoProgress(100, 'Application submitted!');
            showToast('Application submitted successfully!', 'success');
        }
        
        setTimeout(() => {
            closeIntroVideoModal();
        }, 500);
        
    } catch (err) {
        // console.error('Application submission failed:', err);
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
    const education = filterEducation?.value || '';
    const type = filterType?.value || '';
    const salary = filterSalary?.value || '';

    if (position) {
        filtered = filtered.filter(j => j.job_title?.toLowerCase().includes(position));
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

    if (education) {
        filtered = filtered.filter(j => j.education_requirement === education || j.required_education === education);
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
    if (filterEducation) filterEducation.value = '';
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
        job.job_title?.toLowerCase().includes(query) ||
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
    // console.log('[DEBUG] init() started');
    // Check authentication status
    await checkAuth();
    // console.log('[DEBUG] checkAuth completed');

    // Fetch jobs
    // console.log('[DEBUG] About to call fetchJobs');
    await fetchJobs();
    // console.log('[DEBUG] fetchJobs completed, allJobs count:', allJobs.length);
    // console.log('[DEBUG] About to call renderJobs');
    renderJobs(allJobs);
    initAdSlider();
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
    [filterPosition, filterSkills, filterCompany, filterLocation, filterEducation].forEach(input => {
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyFilters();
        });
    });
}

// Start the app
init();
