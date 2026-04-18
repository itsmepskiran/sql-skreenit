// assets/assets/js/config.js

// 1. Detect Environment
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 2. Define Configuration
export const CONFIG = {
    IS_LOCAL: isLocal,
    //Subdomain Configuration
    // NOTE: Currently not used - all services run on single monolithic server
    // Future: Will be used when migrating to microservices architecture
    /*
    SUBDOMAIN: {
        APPLICANTS: isLocal ? 'http://127.0.0.1:8083/api/v1' : 'https://applicant.skreenit.com',
        RECRUITERS: isLocal ? 'http://127.0.0.1:8083/api/v1' : 'https://recruiter.skreenit.com',
        DASHBOARD: isLocal ? 'http://127.0.0.1:8083/api/v1' : 'https://dashboard.skreenit.com',
        LOGIN: isLocal ? 'http://127.0.0.1:8083/api/v1' : 'https://login.skreenit.com',
        HRMS: isLocal ? 'http://127.0.0.1:8083/api/v1' : 'https://hrms.skreenit.com',
        APP: isLocal ? 'http://127.0.0.1:8083/api/v1' : 'https://app.skreenit.com',
        IN: isLocal ? 'http://127.0.0.1:8083/api/v1' : 'https://in.skreenit.com',
        JOBS: isLocal ? 'http://127.0.0.1:8083/api/v1' : 'https://jobs.skreenit.com',
        LEGAL: isLocal ? 'http://127.0.0.1:8083/api/v1' : 'https://legal.skreenit.com',
        SUPPORT: isLocal ? 'http://127.0.0.1:8083/api/v1' : 'https://support.skreenit.com',
        STORAGE: isLocal ? 'http://127.0.0.1:8083/api/v1' : 'https://storage.skreenit.com',
        ASSETS: isLocal ? 'http://127.0.0.1:8083/api/v1' : 'https://assets.skreenit.com',
        BACKEND: isLocal ? 'http://127.0.0.1:8083/api/v1' : 'https://backend.skreenit.com',
    },
    */    

    // API Configuration
    // Backend runs on port 8080 for local development
    API_BASE: isLocal ? 'http://127.0.0.1:8080/api/v1' : 'https://backend.skreenit.com/api/v1',

    // Centralized Page Paths
    PAGES: {
        // --- Landing & Main ---
        INDEX: isLocal ? '/index.html' : 'https://www.skreenit.com',
        APP: isLocal ? '/app/index.html' : 'https://app.skreenit.com/index.html',
        HRMS: isLocal ? '/hrms/index.html' : 'https://hrms.skreenit.com/index.html',
        IN: isLocal ? '/in/index.html' : 'https://in.skreenit.com/index.html',

        // --- Authentication ---
        LOGIN: isLocal ? '/login/login.html' : 'https://login.skreenit.com/login.html',
        REGISTER: isLocal ? '/login/registration.html' : 'https://login.skreenit.com/registration.html',
        FORGOT_PASSWORD: isLocal ? '/login/forgot-password.html' : 'https://login.skreenit.com/forgot-password.html',
        CONFIRM_EMAIL: isLocal ? '/login/confirm-email.html' : 'https://login.skreenit.com/confirm-email.html',
        UPDATE_PASSWORD: isLocal ? '/login/update-password.html' : 'https://login.skreenit.com/update-password.html',

        // --- Dashboard ---
        DASHBOARD_RECRUITER: isLocal ? '/dashboard/recruiter-dashboard.html' : 'https://dashboard.skreenit.com/recruiter-dashboard.html',
        DASHBOARD_CANDIDATE: isLocal ? '/dashboard/candidate-dashboard.html' : 'https://dashboard.skreenit.com/candidate-dashboard.html',
        JOB_DETAILS: isLocal ? '/dashboard/job-details.html' : 'https://dashboard.skreenit.com/job-details.html',
        APPLICATION_DETAILS: isLocal ? '/dashboard/application-details.html' : 'https://dashboard.skreenit.com/application-details.html',
        MY_JOBS: isLocal ? '/dashboard/my-jobs.html' : 'https://dashboard.skreenit.com/my-jobs.html',
        APPLICATION_LIST: isLocal ? '/dashboard/application-list.html' : 'https://dashboard.skreenit.com/application-list.html',
        INTERVIEW_ROOM: isLocal ? '/dashboard/interview-room.html' : 'https://dashboard.skreenit.com/interview-room.html',
        ANALYSIS: isLocal ? '/dashboard/analysis.html' : 'https://dashboard.skreenit.com/analysis.html',

        // --- Recruiter Features ---
        RECRUITER_PROFILE: isLocal ? '/recruiter/recruiter-profile.html' : 'https://recruiter.skreenit.com/recruiter-profile.html',
        JOB_CREATE: isLocal ? '/recruiter/job-create.html' : 'https://recruiter.skreenit.com/job-create.html',
        JOB_EDIT: isLocal ? '/recruiter/job-edit.html' : 'https://recruiter.skreenit.com/job-edit.html',

        // --- Shared / Public ---
        APPLY_FORM: isLocal ? '/applicant/detailed-application-form.html' : 'https://applicant.skreenit.com/detailed-application-form.html',

        // --- Candidate Features ---
        CANDIDATE_PROFILE: isLocal ? '/applicant/candidate-profile.html' : 'https://applicant.skreenit.com/candidate-profile.html',
        MY_APPLICATIONS: isLocal ? '/applicant/my-applications.html' : 'https://applicant.skreenit.com/my-applications.html',

        // --- Jobs ---
        JOBS: isLocal ? '/jobs/jobs.html' : 'https://jobs.skreenit.com/jobs.html',

        // --- Support / Legal ---
        PRIVACY: isLocal ? '/legal/privacy-policy.html' : 'https://legal.skreenit.com/privacy-policy.html',
        TERMS: isLocal ? '/legal/terms-conditions.html' : 'https://legal.skreenit.com/terms-conditions.html',

        // --- Assets ---
        ASSETS_INDEX: isLocal ? '/assets/index.html' : 'https://assets.skreenit.com/index.html',
    },

    // --- Navigation Helper ---
    // Usage: CONFIG.navigateTo('DASHBOARD_RECRUITER') or CONFIG.navigateTo('JOB_DETAILS', {job_id: 123})
    navigateTo(pageKey, params = {}) {
        let url = this.PAGES[pageKey];
        if (!url) {
            console.error(`[CONFIG] Page key not found: ${pageKey}`);
            return;
        }
        // Append query params if provided
        if (Object.keys(params).length > 0) {
            const urlObj = new URL(url, window.location.origin);
            Object.entries(params).forEach(([key, value]) => {
                urlObj.searchParams.set(key, value);
            });
            url = urlObj.toString();
        }
        window.location.href = url;
    },

    // Get URL without navigating (useful for links, QR codes, etc)
    // Usage: CONFIG.getPageUrl('JOB_DETAILS', {job_id: 123})
    getPageUrl(pageKey, params = {}) {
        let url = this.PAGES[pageKey];
        if (!url) {
            console.error(`[CONFIG] Page key not found: ${pageKey}`);
            return '#';
        }
        if (Object.keys(params).length > 0) {
            const urlObj = new URL(url, window.location.origin);
            Object.entries(params).forEach(([key, value]) => {
                urlObj.searchParams.set(key, value);
            });
            url = urlObj.toString();
        }
        return url;
    },

    // --- Auto-Navigation for data-nav attributes ---
    // Usage in HTML: <li data-nav="DASHBOARD_RECRUITER">Overview</li>
    // With params: <a data-nav="JOB_DETAILS" data-nav-params='{"job_id":"123"}'>View</a>
    initNavigation() {
        const navElements = document.querySelectorAll('[data-nav]');
        navElements.forEach(el => {
            if (el.dataset.navInitialized) return;
            el.dataset.navInitialized = 'true';

            const pageKey = el.dataset.nav;
            const paramsStr = el.dataset.navParams;
            const params = paramsStr ? JSON.parse(paramsStr) : {};

            el.style.cursor = 'pointer';
            el.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') return;
                if (e.ctrlKey || e.metaKey || e.button === 1) {
                    window.open(this.getPageUrl(pageKey, params), '_blank');
                    return;
                }
                this.navigateTo(pageKey, params);
            });
        });
    },

    // Common Locations for Job Posting
    LOCATIONS: [
        "Remote",
        "Bangalore, Karnataka",
        "Mumbai, Maharashtra", 
        "Delhi, NCR",
        "Hyderabad, Telangana",
        "Pune, Maharashtra",
        "Chennai, Tamil Nadu",
        "Kolkata, West Bengal",
        "Ahmedabad, Gujarat",
        "Jaipur, Rajasthan",
        "Chandigarh",
        "Indore, Madhya Pradesh",
        "Nagpur, Maharashtra",
        "Kochi, Kerala",
        "Coimbatore, Tamil Nadu",
        "Visakhapatnam, Andhra Pradesh",
        "Thiruvananthapuram, Kerala",
        "Goa",
        "Lucknow, Uttar Pradesh",
        "Gurgaon, Haryana",
        "Noida, Uttar Pradesh"
    ]
};