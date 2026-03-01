// assets/assets/js/auth-pages.js
import { customAuth } from './auth-config.js';
import { CONFIG } from './config.js';

/**
 * Validates if the user is logged in.
 * If not, redirects to the login page.
 */
export async function requireAuth() {
    const user = await customAuth.getUserData();
    if (!user) {
        // Clear local storage just in case
        localStorage.removeItem('skreenit_role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('onboarded');
        window.location.href = CONFIG.PAGES.LOGIN;
        return null;
    }
    return user;
}

/**
 * HELPER: Stores key user data in LocalStorage for fast synchronous access.
 * This prevents UI flickering on dashboards.
 */
export async function persistSessionToLocalStorage() {
    try {
        const { data: { session }, error } = await customAuth.getSession();
        if (error || !session?.user) return;

        const user = session.user;

        // 1. Store Role (Force Lowercase for consistency)
        if (user.role) {
            localStorage.setItem("skreenit_role", user.role.toLowerCase());
        }

        // 2. Store User ID
        if (user.user_id) {
            localStorage.setItem("user_id", user.user_id);
        }

        // 3. Store Onboarded Status
        if (user.onboarded !== undefined) {
            localStorage.setItem("onboarded", user.onboarded.toString());
        }
        
        console.log(" Session persisted to LocalStorage");
    } catch (e) {
        console.warn("Persist failed", e);
    }
}

/**
 * Redirects the user based on their Role and Onboarding Status.
 */
export async function redirectByRole() {
    // 1. Get user data directly (MySQL compatible)
    const user = await customAuth.getUserData();
    
    // Support both nested (Supabase style) and flat (MySQL style) objects
    const finalUser = user?.data?.user || user?.user || user?.data || user;

    if (!finalUser) {
        console.error("❌ No user object found during redirect check");
        window.location.href = CONFIG.PAGES.LOGIN;
        return;
    }

    // Step 1: Cache data for next page
    await persistSessionToLocalStorage();

    // Step 2: Normalize Role and Onboarding Status for MySQL
    const role = (finalUser.role || "").toLowerCase().trim(); 
    
    // MySQL Fix: check for true (boolean), "true" (string), or 1 (integer)
    const isOnboarded = (finalUser.onboarded === true || finalUser.onboarded === "true" || finalUser.onboarded === 1);

    console.log(`🔍 REDIRECT EVALUATION:`);
    console.log(`   - Detected Role: "${role}"`);
    console.log(`   - Raw Onboarded Value:`, finalUser.onboarded);
    console.log(`   - Calculated isOnboarded:`, isOnboarded);

    // Step 3: Directional Logic
    if (role === 'candidate') {
        if (isOnboarded) {
            console.log("→ Candidate Dashboard");
            window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
        } else {
            console.log("→ NEW Candidate: Application Form");
            // Points to ../applicant/detailed-application-form.html
            window.location.href = CONFIG.PAGES.APPLY_FORM;
        }
    } 
    else if (role === 'recruiter') {
        if (isOnboarded) {
            console.log("→ Recruiter Dashboard");
            window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
        } else {
            console.log("→ NEW Recruiter: Profile Setup");
            window.location.href = CONFIG.PAGES.RECRUITER_PROFILE;
        }
    } 
    else {
        console.warn(`⚠️ Unknown role "${role}", showing profile completion message.`);
        
        // Show user-friendly message instead of redirecting
        const message = `
            <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                <h2 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Account Setup Required</h2>
                <p style="color: #666; margin-bottom: 30px; line-height: 1.6;">
                    Your account has been created but your profile is not completed. 
                    Please complete your profile to continue.
                </p>
                <div style="display: flex; gap: 20px; justify-content: center;">
                    <button onclick="window.location.href='${CONFIG.PAGES.LOGIN}'" 
                            style="background: #007bff; color: white; padding: 12px 24px; 
                                   border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                        Back to Login
                    </button>
                    <button onclick="window.location.href='${CONFIG.PAGES.INDEX}'" 
                            style="background: #6c757d; color: white; padding: 12px 24px; 
                                   border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                        Home Page
                    </button>
                </div>
            </div>
        `;
        
        document.body.innerHTML = message;
        document.title = "Complete Your Profile - Skreenit";
    }
}

/**
 * Universal Notification Helper
 * Usage: notify("Message", "success" | "error")
 */
export function notify(message, type = 'success') {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove after 3 seconds with a smooth animation
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        // Wait for the slideOut animation to finish before removing from DOM
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createNotificationContainer() {
    const div = document.createElement('div');
    div.id = 'notification-container';
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;
    document.body.appendChild(div);
    return div;
}