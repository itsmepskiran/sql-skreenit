// login/js/login.js
import { customAuth } from '@shared/js/auth-config.js';
import { redirectByRole } from '@shared/js/auth-pages.js';
import { CONFIG } from '@shared/js/config.js';
import { showError, hideWarning } from '@shared/js/notification-manager.js';
import '@shared/js/mobile.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';

// Update Logo & Branding
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

const brandImg = document.getElementById('brandImg');
if(brandImg) brandImg.src = `${assetsBase}/assets/images/logobrand.png`;

// Setup Dynamic Links
document.getElementById('homeLink').href = CONFIG.PAGES.INDEX;
document.getElementById('registerLink').href = getRedirectUrl(CONFIG.PAGES.REGISTER);
document.getElementById('forgotLink').href = CONFIG.PAGES.FORGOT_PASSWORD;
document.getElementById('termsLink').href = CONFIG.PAGES.TERMS;
document.getElementById('privacyLink').href = CONFIG.PAGES.PRIVACY;

function getRedirectUrl(baseUrl) {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    if (redirect) {
        const url = new URL(baseUrl, window.location.origin);
        url.searchParams.set('redirect', redirect);
        return url.toString();
    }
    return baseUrl;
}

/**
 * Validates and handles explicit redirect parameters
 */
async function handlePostLoginRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');

    if (redirect) {
        try {
            const redirectUrl = new URL(decodeURIComponent(redirect));
            const allowedDomains = [
                'skreenit.com',
                'jobs.skreenit.com',
                'login.skreenit.com',
                'dashboard.skreenit.com',
                'applicant.skreenit.com',
                'recruiter.skreenit.com',
                'storage.skreenit.com',
                'assets.skreenit.com'
            ];

            if (allowedDomains.some(domain => redirectUrl.hostname.endsWith(domain))) {
                window.location.href = redirectUrl.toString();
                return true;
            }
        } catch (e) {
            console.warn("Invalid redirect URL:", redirect);
        }
    }
    return false;
}

// Password Toggle Logic
document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        const input = this.parentElement.querySelector('input');
        if (input && input.type === 'password') {
            input.type = 'text';
            this.classList.replace('fa-eye', 'fa-eye-slash');
        } else if (input) {
            input.type = 'password';
            this.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("errorBox");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.classList.add("d-none");

  const submitBtn = form.querySelector("button[type='submit']");
  const btnText = submitBtn.querySelector(".btn-text");
  const btnLoader = submitBtn.querySelector(".btn-loader");

  btnText.classList.add("d-none");
  btnLoader.classList.remove("d-none");
  submitBtn.disabled = true;

  try {
    const fd = new FormData(form);
    const login_id = fd.get("login_id").trim();
    const password = fd.get("password").trim();

    // 1. Authenticate with backend
    const { data, error } = await customAuth.signInWithPassword({ login_id, password });
    if (error) throw error;

    // 2. Immediate Data Extraction (Avoids waiting for cookie propagation)
    const user = data?.user;
    const metadata = user?.user_metadata || {};
    const role = user?.role || metadata.role || 'candidate';
    // 'onboarded' must be explicitly synced from your MySQL users table
    const isOnboarded = user?.onboarded || metadata.onboarded || false;

    console.log(`✅ Login successful as ${role}. Onboarded: ${isOnboarded}`);

    // 3. Handle Redirects with Subdomain awareness
    const wasRedirected = await handlePostLoginRedirect();
    
    if (!wasRedirected) {
      if (role === 'candidate') {
        if (!isOnboarded) {
          // If candidate profile is not complete, send to applicant subdomain form
          window.location.href = CONFIG.PAGES.APPLY_FORM;
        } else {
          // If candidate is onboarded, send to candidate dashboard
          window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
        }
      } else if (role === 'recruiter') {
        if (!isOnboarded) {
          // If recruiter profile is not complete, send to recruiter profile form
          window.location.href = CONFIG.PAGES.RECRUITER_PROFILE;
        } else {
          // If recruiter is onboarded, send to recruiter dashboard
          window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
        }
      } else {
        // Fallback for admin or undefined roles
        await redirectByRole();
      }
    }

  } catch (err) {
    console.error("Login error:", err);
    
    let errorMessage = err.message || "Login failed. Please try again.";
    let errorTitle = "Authentication Failed";
    
    // Check for specific error types from backend
    const errorDetail = (err.message || err.detail || '').toLowerCase();
    
    if (errorDetail.includes('user not found') || errorDetail.includes('not registered') || errorDetail.includes('no user')) {
        errorMessage = 'User not found. Please <a href="' + getRedirectUrl(CONFIG.PAGES.REGISTER) + '" style="color: #4f46e5; text-decoration: underline;">register</a> to create an account.';
        errorTitle = "User Not Found";
    } else if (errorDetail.includes('invalid password') || errorDetail.includes('wrong password') || errorDetail.includes('incorrect password')) {
        errorMessage = 'Incorrect password. Please try again or <a href="' + CONFIG.PAGES.FORGOT_PASSWORD + '" style="color: #4f46e5; text-decoration: underline;">click here to reset</a>.';
        errorTitle = "Incorrect Password";
    } else if (errorDetail.includes('invalid credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
    } else if (errorDetail.includes('account locked') || errorDetail.includes('too many attempts')) {
        errorMessage = 'Account temporarily locked due to too many failed attempts. Please try again later.';
        errorTitle = "Account Locked";
    } else if (errorDetail.includes('email not verified') || errorDetail.includes('not verified')) {
        errorMessage = 'Please verify your email address before logging in. Check your inbox for the verification link.';
        errorTitle = "Email Not Verified";
    }
    
    showError("errorBox", errorMessage, errorTitle);
  } finally {
    btnText.classList.remove("d-none");
    btnLoader.classList.add("d-none");
    submitBtn.disabled = false;
  }
});