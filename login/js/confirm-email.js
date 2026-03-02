// login/js/confirm-email.js
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';

// Setup Assets
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../assets' : 'https://assets.skreenit.com';
document.getElementById('brandImg').src = `${assetsBase}/assets/images/logobrand.png`;
document.getElementById('logoImg').src = `${assetsBase}/assets/images/logo.png`;

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
    const redirectTimerEl = document.getElementById("redirectTimer");

    // Hide all icons and footers first
    loadingIconEl.style.display = 'none';
    successIconEl.style.display = 'none';
    errorIconEl.style.display = 'none';
    successFooterEl.style.display = 'none';
    errorFooterEl.style.display = 'none';
    loadingFooterEl.style.display = 'none';
    redirectTimerEl.style.display = 'none';

    // Reset classes
    messageEl.className = "text-center mb-4";

    switch(state) {
        case 'loading':
            pageTitleEl.textContent = 'Confirming Your Email...';
            const subtitleEl = document.getElementById('subtitle');
            if (subtitleEl) subtitleEl.textContent = message;
            messageEl.innerHTML = `<p class="text-muted">${message}</p>`;
            loadingIconEl.style.display = 'block';
            loadingFooterEl.style.display = 'block';
            loginBtnEl.style.display = 'none';
            break;
            
        case 'success':
            pageTitleEl.textContent = 'Email Successfully Confirmed!';
            const successSubtitleEl = document.getElementById('subtitle');
            if (successSubtitleEl) successSubtitleEl.textContent = message;
            messageEl.innerHTML = `<p class="text-muted">${message}</p>`;
            successIconEl.style.display = 'block';
            successFooterEl.style.display = 'block';
            loginBtnEl.style.display = 'inline-block';
            redirectTimerEl.style.display = 'block';
            startRedirectTimer();
            break;
            
        case 'error':
            pageTitleEl.textContent = title || 'Confirmation Failed';
            const errorSubtitleEl = document.getElementById('subtitle');
            if (errorSubtitleEl) errorSubtitleEl.textContent = message;
            messageEl.innerHTML = `<p class="text-muted">${message}</p>`;
            errorIconEl.style.display = 'block';
            errorFooterEl.style.display = 'block';
            loginBtnEl.style.display = 'inline-block';
            redirectTimerEl.style.display = 'block';
            startRedirectTimer();
            break;
    }
}

function startRedirectTimer() {
    let countdown = 5;
    const countdownEl = document.getElementById("countdown");
    
    const timer = setInterval(() => {
        countdown--;
        if (countdownEl) countdownEl.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(timer);
            window.location.href = CONFIG.PAGES.LOGIN;
        }
    }, 1000);
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
        } else {
            showConfirmationState('error', result.message || "Confirmation failed. Please try again or contact support.");
        }
    } catch (error) {
        console.error('Email confirmation error:', error);
        showConfirmationState('error', "Something went wrong. Please check your internet connection and try again.");
    }
}