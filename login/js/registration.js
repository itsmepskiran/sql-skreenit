// login/js/registration.js
import { backendPost, handleResponse } from '@shared/js/backend-client.js';
import { notify } from '@shared/js/auth-pages.js';
import { CONFIG } from '@shared/js/config.js';

// 1. Setup Dynamic Assets
const isLocal = CONFIG.IS_LOCAL;
// Points to the root assets folder
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';

// Update Logo
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

// Update Brand Logo (if you have an ID for it)
const brandImg = document.getElementById('brandImg');
if(brandImg) brandImg.src = `${assetsBase}/assets/images/logobrand.png`;
document.getElementById('homeLink').href = CONFIG.PAGES.INDEX;
document.getElementById('loginLink').href = CONFIG.PAGES.LOGIN;
document.getElementById('termsLink').href = CONFIG.PAGES.TERMS;
document.getElementById('privacyLink').href = CONFIG.PAGES.PRIVACY;

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
// Password Toggle Helper (FIXED to find the <i> inside the <button>)
window.togglePassword = function(id) {
    const input = document.getElementById(id);
    // Finds the button next to the input, then finds the icon inside it
    const icon = input.nextElementSibling.querySelector('i'); 
    
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
};

// 2. Form Logic
async function handleRegistrationSubmit(event) {
    event.preventDefault();
    console.log("🚀 Starting Registration (FormData Mode)...");

    const form = event.target;
    const rawFd = new FormData(form);
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Register';
    
    // Setup Error Box (FIXED to use our new CSS utility classes)
    const errorBox = document.getElementById("formError");
    if (errorBox) {
        errorBox.textContent = "";
        errorBox.classList.add("d-none"); // Hide it when a new attempt starts
    }

    // Client-side Password Check
    if (rawFd.get("password") !== rawFd.get("confirmPassword")) {
        notify("Passwords do not match", "error");
        if (errorBox) {
            errorBox.textContent = "Passwords do not match.";
            errorBox.classList.remove("d-none");
        }
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }

        // 2. Extract values for validation
        const full_name = rawFd.get('full_name')?.trim();
        const email = rawFd.get('email')?.trim().toLowerCase();
        const mobile = rawFd.get('mobile')?.trim();
        const location = rawFd.get('location')?.trim();
        const role = rawFd.get('role')?.trim();
        const password = rawFd.get('password')?.trim();

        if (!role) throw new Error('Please select a role');
        if (mobile.length < 10) throw new Error('Mobile number must be at least 10 digits');

        // 3. Create a NEW FormData object for the API
        const apiFormData = new FormData();
        
        apiFormData.append('full_name', full_name);
        apiFormData.append('email', email);
        apiFormData.append('password', password);
        apiFormData.append('location', location);
        
        // Send BOTH 'mobile' and 'phone' (Cover all bases)
        apiFormData.append('mobile', mobile);
        apiFormData.append('phone', mobile); 
        apiFormData.append('phone_number', mobile);

        // Capitalize Role
        const fixedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
        apiFormData.append('role', fixedRole);
        
        // Add Supabase Redirect URL
        const redirectUrl = window.location.origin + CONFIG.PAGES.CONFIRM_EMAIL;
        apiFormData.append('email_redirect_to', redirectUrl);

        console.log("🚀 Sending FormData...");

        // 4. Send as FormData (Backend expects this!)
        const response = await backendPost('/assets/register', apiFormData);
        const result = await handleResponse(response);

        console.log("✅ Success:", result);

        // Success UI
        const authBody = document.querySelector('.auth-body');
        if (authBody) {
            authBody.innerHTML = `
                <div class="text-center py-8">
                    <div style="color: #10b981; font-size: 3rem; margin-bottom: 1rem;"><i class="fas fa-check-circle"></i></div>
                    <h2 style="font-size: 1.5rem; font-weight: bold; color: var(--text-dark);">Registration Successful!</h2>
                    <p style="color: var(--text-light); margin-top: 0.5rem;">Please check your email for a confirmation link.</p>
                </div>
            `;
        }

        setTimeout(() => {
            window.location.href = `${CONFIG.PAGES.LOGIN}?registered=true`;
        }, 3000);

    } catch (err) {
        console.error("❌ Error:", err);
        notify(err.message || 'Registration failed.', 'error');
        
        // FIXED: Make sure the error box becomes visible on error!
        if (errorBox) {
            errorBox.textContent = err.message || 'Registration failed.';
            errorBox.classList.remove("d-none");
        }
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    }
}

// ---------------------------------------------------------
// ✅ ATTACH LISTENER
// ---------------------------------------------------------
function setupLinks() {
    const links = {
        loginLink: CONFIG.PAGES.LOGIN,
        termsLink: CONFIG.PAGES.TERMS,
        privacyLink: CONFIG.PAGES.PRIVACY,
        homeLink: CONFIG.PAGES.INDEX
    }

    Object.entries(links).forEach(([id, href]) => {
        const el = document.getElementById(id);
        if (el && href) {
            el.href = href};
            if(id==='loginLink') el.remove(target);
    })
}
document.addEventListener('DOMContentLoaded', () => setupLinks());
const regForm = document.getElementById("registrationForm");
if (regForm) {
    console.log("✅ Form listener attached.");
    regForm.addEventListener("submit", handleRegistrationSubmit);
} else {
    console.error("❌ form#registrationForm not found!");
}