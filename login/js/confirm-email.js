// login/js/confirm-email.js
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';

// Setup Assets
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
document.getElementById('brandImg').src = `${assetsBase}/assets/images/logobrand.png`;

document.addEventListener("DOMContentLoaded", () => {
    const messageEl = document.getElementById("message");
    const pageTitleEl = document.getElementById("pageTitle");
    const loginBtnEl = document.getElementById("loginBtn");
    const loadingIconEl = document.getElementById("loadingIcon");
    const successIconEl = document.getElementById("successIcon");
    const errorIconEl = document.getElementById("errorIcon");
    const successFooterEl = document.getElementById("successFooter");
    const errorFooterEl = document.getElementById("errorFooter");
    const loadingFooterEl = document.getElementById("loadingFooter");

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');

    // If we have token and email, confirm the email
    if (token && email) {
        // Call backend to confirm email
        confirmEmail(token, email);
    } else {
        // Show error message
        showConfirmationState('error', 'Invalid confirmation link. Please try again.', 'Confirmation Issue');
        
        setTimeout(() => {
            window.location.href = CONFIG.PAGES.LOGIN;
        }, 5000);
    }
});

function showConfirmationState(state, message, title = '') {
    const messageEl = document.getElementById("message");
    const pageTitleEl = document.getElementById("pageTitle");
    const loginBtnEl = document.getElementById("loginBtn");
    const loadingIconEl = document.getElementById("loadingIcon");
    const successIconEl = document.getElementById("successIcon");
    const errorIconEl = document.getElementById("errorIcon");
    const successFooterEl = document.getElementById("successFooter");
    const errorFooterEl = document.getElementById("errorFooter");
    const loadingFooterEl = document.getElementById("loadingFooter");

    // Hide all icons and footers first
    loadingIconEl.style.display = 'none';
    successIconEl.style.display = 'none';
    errorIconEl.style.display = 'none';
    successFooterEl.style.display = 'none';
    errorFooterEl.style.display = 'none';
    loadingFooterEl.style.display = 'none';

    // Reset classes
    messageEl.className = "confirmation-message";

    switch(state) {
        case 'loading':
            pageTitleEl.textContent = 'Confirming Your Email...';
            messageEl.textContent = message;
            messageEl.classList.add('loading');
            loadingIconEl.style.display = 'block';
            loadingFooterEl.style.display = 'block';
            loginBtnEl.style.display = 'none';
            break;
            
        case 'success':
            pageTitleEl.textContent = 'Email Successfully Confirmed!';
            messageEl.textContent = message;
            messageEl.classList.add('success');
            successIconEl.style.display = 'block';
            successFooterEl.style.display = 'block';
            loginBtnEl.style.display = 'inline-block';
            break;
            
        case 'error':
            pageTitleEl.textContent = title || 'Confirmation Failed';
            messageEl.textContent = message;
            messageEl.classList.add('error');
            errorIconEl.style.display = 'block';
            errorFooterEl.style.display = 'block';
            loginBtnEl.style.display = 'inline-block';
            break;
    }
}

async function confirmEmail(token, email) {
    try {
        // Show loading state
        showConfirmationState('loading', 'Please wait while we confirm your email address...');

        const formData = new FormData();
        formData.append('token', token);
        formData.append('email', email);

        const response = await fetch(`${CONFIG.API_BASE}/confirm-email`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.ok) {
            showConfirmationState('success', result.message || "Email confirmed successfully! Your account has been activated.");
            
            setTimeout(() => {
                window.location.href = `${CONFIG.PAGES.LOGIN}?confirmed=true`;
            }, 3000);
        } else {
            showConfirmationState('error', result.message || "Confirmation failed. Please try again or contact support.");
            
            setTimeout(() => {
                window.location.href = CONFIG.PAGES.LOGIN;
            }, 5000);
        }
    } catch (error) {
        console.error('Email confirmation error:', error);
        showConfirmationState('error', "Something went wrong. Please check your internet connection and try again.");
        
        setTimeout(() => {
            window.location.href = CONFIG.PAGES.LOGIN;
        }, 5000);
    }
}