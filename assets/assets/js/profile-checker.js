// Shared utility for profile completion checking
import { customAuth } from './auth-config.js';
import { backendGet, handleResponse } from './backend-client.js';
import { CONFIG } from './config.js';

/**
 * Check if recruiter profile is complete
 * Returns { isComplete: boolean, profile: object, missingFields: array }
 */
export async function checkRecruiterProfileComplete() {
    try {
        const user = await customAuth.getUserData();
        
        if (!user || (user.role || "").toLowerCase() !== "recruiter") {
            return { isComplete: false, profile: null, missingFields: ['Not a recruiter'] };
        }

        // Check if onboarded flag is set
        const onboardedFlag = user?.onboarded ?? user?.user_metadata?.onboarded;
        const isOnboarded = onboardedFlag === true || onboardedFlag === 'true';
        
        // Fetch full profile from backend
        const res = await backendGet('/recruiter/profile');
        const result = await handleResponse(res);
        const profile = result?.data?.data || result?.data || result;
        
        if (!profile || Object.keys(profile).length === 0) {
            return { 
                isComplete: false, 
                profile: null, 
                missingFields: ['company_name', 'contact_name', 'contact_email'],
                companyId: null
            };
        }
        
        // Check required fields
        const requiredFields = ['company_name', 'contact_name', 'contact_email'];
        const missingFields = requiredFields.filter(field => !profile[field]);
        
        // Profile is complete if onboarded and no missing required fields
        const isComplete = isOnboarded && missingFields.length === 0;
        
        return { 
            isComplete, 
            profile, 
            missingFields,
            companyId: profile.company_display_id || profile.company_id || profile.company_name || 'Pending'
        };
        
    } catch (err) {
        // console.warn("Profile check error:", err);
        return { isComplete: false, profile: null, missingFields: ['Error checking profile'], companyId: null };
    }
}

/**
 * Check if candidate profile is complete
 * Returns { isComplete: boolean, profile: object, missingFields: array }
 */
export async function checkCandidateProfileComplete() {
    try {
        const user = await customAuth.getUserData();
        
        if (!user || (user.role || "").toLowerCase() !== "candidate") {
            return { isComplete: false, profile: null, missingFields: ['Not a candidate'] };
        }

        // Check if onboarded flag is set
        const onboardedFlag = user?.onboarded ?? user?.user_metadata?.onboarded;
        const isOnboarded = onboardedFlag === true || onboardedFlag === 'true';
        
        // For candidates, check if they have basic profile info
        const hasBasicInfo = user.full_name && user.email;
        
        // Fetch candidate profile from backend
        try {
            const res = await backendGet('/applicant/profile');
            const result = await handleResponse(res);
            const profile = result?.data?.data || result?.data || result;
            
            // Check required fields for candidate
            const requiredFields = ['full_name', 'email', 'phone'];
            const missingFields = requiredFields.filter(field => !profile[field] && !user[field]);
            
            const isComplete = isOnboarded && hasBasicInfo && missingFields.length === 0;
            
            return { 
                isComplete, 
                profile, 
                missingFields,
                candidateId: profile?.candidate_display_id || 'Pending'
            };
        } catch (e) {
            // If API fails, check basic user data
            const missingFields = [];
            if (!user.full_name) missingFields.push('full_name');
            if (!user.phone) missingFields.push('phone');
            
            return { 
                isComplete: isOnboarded && hasBasicInfo && missingFields.length === 0, 
                profile: user, 
                missingFields,
                candidateId: 'Pending'
            };
        }
        
    } catch (err) {
        // console.warn("Candidate profile check error:", err);
        return { isComplete: false, profile: null, missingFields: ['Error checking profile'], candidateId: null };
    }
}

/**
 * Unified Sidebar Manager - Handles sidebar updates for both Recruiters and Candidates
 * This centralizes all sidebar logic to ensure consistency across all pages
 */
export class SidebarManager {
    constructor() {
        this.cache = null;
        this.cacheTimestamp = null;
        this.cacheExpiry = 60000; // 1 minute cache
    }

    /**
     * Initialize sidebar with user data
     * Call this on every page load
     */
    async initSidebar() {
        try {
            const user = await customAuth.getUserData();
            if (!user) return false;

            // Check multiple sources for role (same as job-details.js)
            const role = (user?.user_metadata?.role || user?.role || user?.app_metadata?.role || "").toLowerCase();
            
            if (role === "recruiter") {
                await this._initRecruiterSidebar(user);
            } else {
                // For candidates and any other role, use candidate sidebar (hides Analysis nav)
                await this._initCandidateSidebar(user);
            }
            
            return true;
        } catch (err) {
            // console.warn("Sidebar init error:", err);
            return false;
        }
    }

    /**
     * Initialize Recruiter Sidebar
     */
    async _initRecruiterSidebar(user) {
        // Set name - check all possible name element IDs
        const nameEl = document.getElementById('recruiterName') || document.getElementById('userName') || document.getElementById('candidateName');
        if (nameEl) {
            const displayName = user.full_name || user.email?.split('@')[0] || 'Recruiter';
            nameEl.textContent = displayName;
        }

        // Set avatar
        const avatarEl = document.getElementById('userAvatar');
        if (avatarEl) {
            const displayAvatar = user.avatar_url;
            if (displayAvatar && !displayAvatar.includes('yourdomain.com')) {
                avatarEl.innerHTML = `<img src="${displayAvatar}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
            } else {
                const initials = (user.full_name || 'Recruiter').match(/\b\w/g) || [];
                const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
                avatarEl.innerHTML = text || 'R';
            }
        }

        // Set Company ID display (if element exists) - Shows full format: "Company ID: SKR12345"
        const idDisplayEl = document.getElementById('userIdDisplay');
        if (idDisplayEl) {
            try {
                const { companyId } = await checkRecruiterProfileComplete();
                // Always show the element, display "Pending" if no companyId
                idDisplayEl.textContent = companyId ? `Company ID: ${companyId}` : 'Company ID: Pending';
                idDisplayEl.style.display = 'inline';
            } catch (e) {
                idDisplayEl.textContent = 'Company ID: Pending';
                idDisplayEl.style.display = 'inline';
            }
        }
        
        // Hide the old companyId element since we use userIdDisplay for full format
        const legacyIdEl = document.getElementById('companyId');
        if (legacyIdEl) {
            legacyIdEl.style.display = 'none';
        }
        
        // Also hide userDesignation/candidateRole if they exist on recruiter pages
        const roleEl = document.getElementById('userDesignation') || document.getElementById('candidateRole');
        if (roleEl) {
            roleEl.style.display = 'none';
        }
    }

    /**
     * Initialize Candidate Sidebar
     */
    async _initCandidateSidebar(user) {
        // Set name - check all possible name element IDs
        const nameEl = document.getElementById('userName') || document.getElementById('candidateName') || document.getElementById('recruiterName');
        if (nameEl) {
            const displayName = user.full_name || user.email?.split('@')[0] || 'Candidate';
            nameEl.textContent = displayName;
        }

        // Set avatar
        const avatarEl = document.getElementById('userAvatar');
        if (avatarEl) {
            const displayAvatar = user.avatar_url;
            if (displayAvatar && !displayAvatar.includes('yourdomain.com')) {
                avatarEl.innerHTML = `<img src="${displayAvatar}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
            } else {
                const initials = (user.full_name || 'Candidate').match(/\b\w/g) || [];
                const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
                avatarEl.innerHTML = text || 'C';
            }
        }

        // Update ID display (if element exists) - Shows full format: "Skreenit ID: HYD1234567"
        const idDisplayEl = document.getElementById('userIdDisplay');
        if (idDisplayEl) {
            try {
                const { candidateId } = await checkCandidateProfileComplete();
                idDisplayEl.textContent = candidateId ? `Skreenit ID: ${candidateId}` : '';
                idDisplayEl.style.display = candidateId ? 'inline' : 'none';
            } catch (e) {
                idDisplayEl.style.display = 'none';
            }
        }
        
        // Hide userDesignation/candidateRole - we only want: Avatar, Name, Skreenit ID
        const designationEl = document.getElementById('userDesignation') || document.getElementById('candidateRole');
        if (designationEl) {
            designationEl.style.display = 'none';
        }
        
        // Hide companyId if it exists (shouldn't be on candidate pages, but just in case)
        const companyIdEl = document.getElementById('companyId');
        if (companyIdEl) {
            companyIdEl.style.display = 'none';
        }
        
        // Update sidebar navigation labels for candidate view
        this._updateSidebarLabelsForCandidate();
    }
    
    /**
     * Update sidebar navigation labels for candidate users
     */
    _updateSidebarLabelsForCandidate() {
        // Update navDashboard label
        const navDashboard = document.getElementById('navDashboard');
        if (navDashboard) {
            const spanEl = navDashboard.querySelector('span');
            if (spanEl) {
                spanEl.textContent = 'Dashboard';
            }
            navDashboard.title = 'Dashboard';
        }
        
        // Update navJobs - change to "Browse Jobs" for candidates
        const navJobs = document.getElementById('navJobs');
        if (navJobs) {
            const spanEl = navJobs.querySelector('span');
            if (spanEl) {
                spanEl.textContent = 'Browse Jobs';
            }
            navJobs.title = 'Browse Jobs';
        }
        
        // Update navApplications - change to "My Applications" for candidates
        const navApplications = document.getElementById('navApplications');
        if (navApplications) {
            const spanEl = navApplications.querySelector('span');
            if (spanEl) {
                spanEl.textContent = 'My Applications';
            }
            navApplications.title = 'My Applications';
        }
        
        // Update navProfile label
        const navProfile = document.getElementById('navProfile');
        if (navProfile) {
            const spanEl = navProfile.querySelector('span');
            if (spanEl) {
                spanEl.textContent = 'My Profile';
            }
            navProfile.title = 'My Profile';
        }
        
        // Hide Analysis nav for candidates (recruiter-only feature)
        const navAnalysis = document.getElementById('navAnalysis');
        if (navAnalysis) {
            navAnalysis.classList.add('hidden');
        }
    }
}

// Global sidebar manager instance
export const sidebarManager = new SidebarManager();

/**
 * Auto-initialize sidebar on page load
 * Call this from any page that needs sidebar
 */
export async function initSidebarOnPageLoad() {
    document.addEventListener("DOMContentLoaded", async () => {
        await sidebarManager.initSidebar();
    });
}

/**
 * Show profile completion popup for recruiters
 * Redirects to recruiter profile page if profile is incomplete
 */
export async function requireRecruiterProfile() {
    const { isComplete, companyId, missingFields } = await checkRecruiterProfileComplete();
    
    if (!isComplete) {
        // Show popup
        const missingText = missingFields.length > 0 
            ? `Missing: ${missingFields.join(', ')}` 
            : 'Company profile not completed';
            
        const confirmed = confirm(
            `⚠️ Profile Incomplete\n\n` +
            `Your recruiter profile is not complete. ${missingText}\n\n` +
            `Company ID: ${companyId || 'Not generated yet'}\n\n` +
            `You must complete your profile before performing this action.\n\n` +
            `Click OK to go to your profile page.`
        );
        
        if (confirmed) {
            window.location.href = CONFIG.PAGES.RECRUITER_PROFILE || '/recruiter/recruiter-profile.html';
        }
        
        return false;
    }
    
    return true;
}

/**
 * Show profile completion popup for candidates
 * Redirects to candidate profile page if profile is incomplete
 */
export async function requireCandidateProfile() {
    const { isComplete, missingFields, candidateId } = await checkCandidateProfileComplete();
    
    if (!isComplete) {
        // Show popup
        const missingText = missingFields.length > 0 
            ? `Missing: ${missingFields.join(', ')}` 
            : 'Profile not completed';
            
        const confirmed = confirm(
            `⚠️ Profile Incomplete\n\n` +
            `Your profile is not complete. ${missingText}\n\n` +
            `Candidate ID: ${candidateId || 'Not generated yet'}\n\n` +
            `You must complete your profile before performing this action.\n\n` +
            `Click OK to go to your profile page.`
        );
        
        if (confirmed) {
            window.location.href = CONFIG.PAGES.CANDIDATE_PROFILE || '/applicant/profile.html';
        }
        
        return false;
    }
    
    return true;
}

/**
 * Update sidebar Company ID display
 * Call this on every recruiter page load
 */
export async function updateSidebarCompanyId() {
    const companyIdEl = document.getElementById('companyId');
    if (!companyIdEl) return;
    
    const { companyId } = await checkRecruiterProfileComplete();
    if (companyId) {
        companyIdEl.textContent = companyId;
    }
}
