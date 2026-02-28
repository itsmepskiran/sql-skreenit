// login/js/login.js
import { customAuth } from '@shared/js/auth-config.js';
import { redirectByRole } from '@shared/js/auth-pages.js';
import { CONFIG } from '@shared/js/config.js';
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
                'applicant.skreenit.com'
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

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("d-none"); 
}

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
    const email = fd.get("email").trim();
    const password = fd.get("password").trim();

    // 1. Authenticate with backend
    const { data, error } = await customAuth.signInWithPassword({ email, password });
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
          // If profile is not complete, send to applicant subdomain form
          window.location.href = CONFIG.PAGES.APPLY_FORM;
        } else {
          window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
        }
      } else if (role === 'recruiter') {
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
      } else {
        // Fallback for admin or undefined roles
        await redirectByRole();
      }
    }

  } catch (err) {
    console.error("Login error:", err);
    showError(err.message || "Login failed. Please try again.");
  } finally {
    btnText.classList.remove("d-none");
    btnLoader.classList.add("d-none");
    submitBtn.disabled = false;
  }
});