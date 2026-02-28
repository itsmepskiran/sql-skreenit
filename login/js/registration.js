// login/js/registration.js
import { backendPost, handleResponse } from '@shared/js/backend-client.js';
import { notify } from '@shared/js/auth-pages.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';

// 1. Setup Dynamic Assets
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';

// Update Logos using central assetsBase
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

const brandImg = document.getElementById('brandImg');
if(brandImg) brandImg.src = `${assetsBase}/assets/images/logobrand.png`;

/**
 * Get redirect URL parameter if present
 */
function getRedirectParam() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('redirect');
}

/**
 * Build login URL with redirect parameter preserved
 */
function getLoginUrl() {
    const redirect = getRedirectParam();
    let loginUrl = CONFIG.PAGES.LOGIN;
    if (redirect) {
        try {
            const url = new URL(loginUrl, window.location.origin);
            url.searchParams.set('redirect', redirect);
            return url.toString();
        } catch (e) {
            return loginUrl;
        }
    }
    return loginUrl;
}

// Set login link href for cross-subdomain awareness
const loginLink = document.getElementById('loginLink');
if (loginLink) loginLink.href = getLoginUrl();

/**
 * Toggle password visibility
 * FIXED: Uses parent container to find the correct input and button
 * @param {string} id - The ID of the input field to toggle
 */
window.togglePassword = function(id) {
    const input = document.getElementById(id);
    if (!input) return;
    
    // Find the button within the same input-group container
    const container = input.closest('.input-group') || input.parentElement;
    const button = container.querySelector('.toggle-password');
    if (!button) return;
    
    const icon = button.querySelector('i');
    const isPassword = input.type === "password";
    
    // Toggle input type
    input.type = isPassword ? "text" : "password";
    
    // Toggle icon classes (fa-eye vs fa-eye-slash)
    if (icon) {
        if (isPassword) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
};

/**
 * Handle registration form submission
 */
async function handleRegistrationSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    // 1. Password Match Validation
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        notify("Passwords do not match", "error");
        return;
    }

    // 2. UI Loading State
    if (btnText) btnText.classList.add('d-none');
    if (btnLoader) btnLoader.classList.remove('d-none');
    submitBtn.disabled = true;

    try {
        const formData = new FormData(form);
        const payload = {
            email: formData.get('email').trim(),
            password: password,
            full_name: formData.get('full_name').trim(),
            role: formData.get('role') || 'candidate',
            // Default metadata to ensure proper onboarding redirect on next login
            metadata: {
                onboarded: false,
                registration_source: 'web'
            }
        };

        // 3. API Call to Register
        const response = await backendPost('/register', payload);
        const result = await handleResponse(response);

        console.log("✅ Registration successful:", result);
        notify("Registration successful! Please check your email to confirm.", "success");
        notify("Please check your spam/junk folder after registration if you don't receive the confirmation email in your inbox.", "success");
        notify("Add noreply@skreenit.com to your contacts to ensure future emails reach your inbox.", "success");
        // 4. Delayed redirect to login page
        setTimeout(() => {
            window.location.href = getLoginUrl();
        }, 3000);

    } catch (err) {
        console.error("❌ Registration error:", err);
        notify(err.message || "Registration failed. Please try again.", "error");
    } finally {
        // Reset UI State
        if (btnText) btnText.classList.remove('d-none');
        if (btnLoader) btnLoader.classList.add('d-none');
        submitBtn.disabled = false;
    }
}

// ---------------------------------------------------------
// ✅ ATTACH LISTENERS
// ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    const regForm = document.getElementById("registrationForm");
    if (regForm) {
        console.log("✅ Registration form listener attached.");
        regForm.addEventListener("submit", handleRegistrationSubmit);
    }
});