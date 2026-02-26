// assets/assets/js/config.js

// 1. Detect Environment
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 2. Define Configuration
export const CONFIG = {
    IS_LOCAL: isLocal,

    // API Configuration
    // Backend runs on port 8080
    API_BASE: isLocal ? 'http://127.0.0.1:8080/api/v1' : 'https://backend.skreenit.com/api/v1',

    // Centralized Page Paths
    PAGES: {
        // --- Landing & Main ---
        INDEX: isLocal ? '/index.html' : 'https://www.skreenit.com',

        // --- Authentication ---
        LOGIN: isLocal ? '/login/login.html' : 'https://login.skreenit.com/login.html',
        REGISTER: isLocal ? '/login/registration.html' : 'https://login.skreenit.com/registration.html',
        FORGOT_PASSWORD: isLocal ? '/login/forgot-password.html' : 'https://login.skreenit.com/forgot-password.html',
        UPDATE_PASSWORD: isLocal ? '/login/update-password.html' : 'https://login.skreenit.com/update-password.html',
        CONFIRM_EMAIL: isLocal ? '/login/confirm-email.html' : 'https://login.skreenit.com/confirm-email.html',

        // --- Dashboard ---
        DASHBOARD_RECRUITER: isLocal ? '/dashboard/recruiter-dashboard.html' : 'https://dashboard.skreenit.com/recruiter-dashboard.html',
        DASHBOARD_CANDIDATE: isLocal ? '/dashboard/candidate-dashboard.html' : 'https://dashboard.skreenit.com/candidate-dashboard.html',
        JOB_DETAILS: isLocal ? '/dashboard/job-details.html' : 'https://dashboard.skreenit.com/job-details.html',
        APPLICATION_DETAILS: isLocal ? '/dashboard/application-details.html' : 'https://dashboard.skreenit.com/application-details.html',
        MY_JOBS: isLocal ? '/dashboard/my-jobs.html' : 'https://dashboard.skreenit.com/my-jobs.html',
        APPLICATION_LIST: isLocal ? '/dashboard/application-list.html' : 'https://dashboard.skreenit.com/application-list.html',
        INTERVIEW_ROOM: isLocal ? '/dashboard/interview-room.html' : 'https://dashboard.skreenit.com/interview-room.html',
        // --- Recruiter Features ---
        RECRUITER_PROFILE: isLocal ? '/recruiter/recruiter-profile.html' : 'https://recruiter.skreenit.com/recruiter-profile.html',
        JOB_CREATE: isLocal ? '/recruiter/job-create.html' : 'https://recruiter.skreenit.com/job-create.html',
        JOB_EDIT: isLocal ? '/recruiter/job-edit.html' : 'https://recruiter.skreenit.com/job-edit.html',
        CANDIDATE_DETAILS: isLocal ? '/recruiter/candidate-details.html' : 'https://recruiter.skreenit.com/candidate-details.html',

        // --- Shared / Public ---
        APPLY_FORM: isLocal ? '/applicant/detailed-application-form.html' : 'https://applicant.skreenit.com/detailed-application-form.html',
        // --- Candidate Features ---
        CANDIDATE_PROFILE: isLocal ? '/applicant/candidate-profile.html' : 'https://applicant.skreenit.com/candidate-profile.html',
        MY_APPLICATIONS: isLocal ? '/applicant/my-applications.html' : 'https://applicant.skreenit.com/my-applications.html',
        // --- Support / Legal ---
        PRIVACY: isLocal ? '/legal/privacy-policy.html' : 'https://legal.skreenit.com/privacy-policy.html',
        TERMS: isLocal ? '/legal/terms-conditions.html' : 'https://legal.skreenit.com/terms-conditions.html',
        // HRMS AND APP
        HRMS: isLocal ? '/hrms/index.html' : 'https://hrms.skreenit.com/index.html',
        APP: isLocal ? '/app/index.html' : 'https://app.skreenit.com/index.html',
        IN: isLocal ? '/in/index.html' : 'https://in.skreenit.com/index.html',
        JOBS: isLocal ? '/jobs/index.html' : 'https://jobs.skreenit.com/index.html'
    }
};