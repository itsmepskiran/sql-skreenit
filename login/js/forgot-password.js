// login/js/forgot-password.js
import { supabase } from '@shared/js/supabase-config.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';
// Setup Assets
const isLocal = CONFIG.IS_LOCAL;
// Points to the root assets folder
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';

// Update Logo
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

// Update Brand Logo (if you have an ID for it)
const brandImg = document.getElementById('brandImg');
if(brandImg) brandImg.src = `${assetsBase}/assets/images/logobrand.png`;
document.getElementById('homeLink').href = CONFIG.PAGES.INDEX;
document.getElementById('loginLink').href = CONFIG.PAGES.LOGIN;
document.getElementById('termsLink').href = CONFIG.PAGES.TERMS;
document.getElementById('privacyLink').href = CONFIG.PAGES.PRIVACY;

const form = document.getElementById("forgotPasswordForm");
const messageBox = document.getElementById("message");

// FIXED: Using standard alert classes and the d-none utility
function showMessage(text, type) {
    messageBox.textContent = text;
    // Clear old classes, then add the appropriate alert styles
    messageBox.className = `alert alert-${type} mt-1`; 
    messageBox.classList.remove("d-none"); // Make it visible
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const submitBtn = form.querySelector("button[type='submit']");
    const btnText = submitBtn.querySelector(".btn-text");
    const btnLoader = submitBtn.querySelector(".btn-loader");

    // Hide any previous messages when a new attempt starts
    messageBox.classList.add("d-none");

    try {
        submitBtn.disabled = true;
        
        // FIXED: Swapped inline styles for d-none utility class
        btnText.classList.add("d-none");
        btnLoader.classList.remove("d-none");

        // ✅ DYNAMIC REDIRECT LINK
        const redirectUrl = window.location.origin + CONFIG.PAGES.UPDATE_PASSWORD + CONFIG.PAGES.UPDATE_PASSWORD;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });

        if (error) throw error;

        showMessage("Reset link sent! Please check your inbox.", "success");

    } catch (err) {
        showMessage("Error: " + err.message, "error");
    } finally {
        submitBtn.disabled = false;
        
        // FIXED: Reset button states using d-none
        btnText.classList.remove("d-none");
        btnLoader.classList.add("d-none");
    }
});