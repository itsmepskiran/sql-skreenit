// assets/assets/js/auth-pages.js
import { supabase } from './supabase-config.js';
import { CONFIG } from './config.js';

/**
 * Validates if the user is logged in.
 * If not, redirects to the login page.
 */
export async function requireAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // Clear local storage just in case
        localStorage.removeItem('skreenit_role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('onboarded');
        window.location.href = CONFIG.PAGES.LOGIN;
        return null;
    }
    return session;
}

/**
 * ✅ HELPER: Stores key user data in LocalStorage for fast synchronous access.
 * This prevents UI flickering on dashboards.
 */
export async function persistSessionToLocalStorage() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) return;

        const user = session.user;
        const meta = user.user_metadata || {};

        // 1. Store Role (Force Lowercase for consistency)
        if (meta.role) {
            localStorage.setItem("skreenit_role", meta.role.toLowerCase());
        }

        // 2. Store User ID
        if (user.id) {
            localStorage.setItem("user_id", user.id);
        }

        // 3. Store Onboarded Status
        if (meta.onboarded !== undefined) {
            localStorage.setItem("onboarded", meta.onboarded.toString());
        }
        
        console.log("💾 Session persisted to LocalStorage");
    } catch (e) {
        console.warn("Persist failed", e);
    }
}

/**
 * Redirects the user based on their Role and Onboarding Status.
 */
export async function redirectByRole() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = CONFIG.PAGES.LOGIN;
        return;
    }

    // ✅ Step 1: Cache data for the next page
    await persistSessionToLocalStorage();

    const metadata = user.user_metadata || {};
    
    // ✅ Step 2: Handle Case Sensitivity
    const role = (metadata.role || "").toLowerCase(); 
    const isOnboarded = metadata.onboarded === true || metadata.onboarded === "true";

    console.log(`🔄 Redirecting... Role: ${role}, Onboarded: ${isOnboarded}`);

    if (role === 'recruiter') {
        if (isOnboarded) {
            window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
        } else {
            // New Recruiter -> Go to Profile Setup
            window.location.href = CONFIG.PAGES.RECRUITER_PROFILE;
        }
    } 
    else if (role === 'candidate') {
        if (isOnboarded) {
            window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
        } else {
            // New Candidate -> Go to Application Form
            window.location.href = CONFIG.PAGES.APPLY_FORM;
        }
    } 
    else {
        console.warn("⚠️ Unknown role:", role);
        window.location.href = CONFIG.PAGES.INDEX;
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