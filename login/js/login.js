// login/js/login.js
import { supabase } from '@shared/js/supabase-config.js';
import { redirectByRole } from '@shared/js/auth-pages.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';

const isLocal = CONFIG.IS_LOCAL;
// Points to the root assets folder
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';

// Update Logo
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

// Update Brand Logo (if you have an ID for it)
const brandImg = document.getElementById('brandImg');
if(brandImg) brandImg.src = `${assetsBase}/assets/images/logobrand.png`;
// 1. Setup Dynamic Links (Images removed because HTML handles them now!)
document.getElementById('homeLink').href = CONFIG.PAGES.INDEX;
document.getElementById('registerLink').href = getRedirectUrl(CONFIG.PAGES.REGISTER);
document.getElementById('forgotLink').href = CONFIG.PAGES.FORGOT_PASSWORD;
document.getElementById('termsLink').href = CONFIG.PAGES.TERMS;
document.getElementById('privacyLink').href = CONFIG.PAGES.PRIVACY;

/**
 * Get redirect URL with preserved redirect parameter for registration
 */
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
 * Handle post-login redirect
 * Checks for redirect parameter and navigates accordingly
 */
async function handlePostLoginRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');

    if (redirect) {
        // Validate redirect URL to prevent open redirect vulnerabilities
        try {
            const redirectUrl = new URL(decodeURIComponent(redirect));
            // Only allow redirects to same origin or trusted domains
            const allowedDomains = [
                window.location.hostname,
                'skreenit.com',
                'www.skreenit.com',
                'jobs.skreenit.com',
                'login.skreenit.com',
                'dashboard.skreenit.com',
                'applicant.skreenit.com'
            ];

            if (allowedDomains.some(domain => redirectUrl.hostname.includes(domain))) {
                window.location.href = redirectUrl.toString();
                return true;
            }
        } catch (e) {
            console.warn("Invalid redirect URL:", redirect);
        }
    }
    return false;
}

// ✅ NEW: Setup Password Toggle Logic
document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        // Find the input field within the same parent container
        const input = this.parentElement.querySelector('input');
        if (input && input.type === 'password') {
            input.type = 'text';
            this.classList.remove('fa-eye');
            this.classList.add('fa-eye-slash');
        } else if (input) {
            input.type = 'password';
            this.classList.remove('fa-eye-slash');
            this.classList.add('fa-eye');
        }
    });
});

// 2. Form Logic
const form = document.getElementById("loginForm");
const errorBox = document.getElementById("errorBox");

function showError(msg) {
  errorBox.textContent = msg;
  // Using remove/add class instead of inline styles to match our new CSS system
  errorBox.classList.remove("d-none"); 
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.classList.add("d-none"); // Hide error box on new attempt

  const submitBtn = form.querySelector("button[type='submit']");
  const btnText = submitBtn.querySelector(".btn-text");
  const btnLoader = submitBtn.querySelector(".btn-loader");

  // Show Loader (Using our new utility classes!)
  btnText.classList.add("d-none");
  btnLoader.classList.remove("d-none");
  submitBtn.disabled = true;

  try {
    const fd = new FormData(form);
    const email = fd.get("email").trim();
    const password = fd.get("password").trim();

    // Sign In
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) throw error;

    console.log("✅ Login successful.");

    // Wait for cookie/session propagation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check for redirect parameter first
    const wasRedirected = await handlePostLoginRedirect();
    
    // If no redirect, use default role-based redirect
    if (!wasRedirected) {
      await redirectByRole();
    }

  } catch (err) {
    console.error("Login error:", err);
    showError(err.message || "Login failed. Please try again.");
  } finally {
    // Reset Button
    btnText.classList.remove("d-none");
    btnLoader.classList.add("d-none");
    submitBtn.disabled = false;
  }
});