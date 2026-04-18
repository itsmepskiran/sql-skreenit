// login/js/confirm-email.js
import { CONFIG } from '@shared/js/config.js';
import { showError, showSuccess, hideWarning } from '@shared/js/notification-manager.js';
import '@shared/js/mobile.js';

// Setup Assets
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../assets' : 'https://assets.skreenit.com';
document.getElementById('brandImg').src = `${assetsBase}/assets/images/logobrand.png`;
document.getElementById('logoImg').src = `${assetsBase}/assets/images/logo.png`;

// Store email from URL for resend functionality
let userEmail = '';

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');

    // If we have token and email, confirm the email
    if (token && email) {
        userEmail = email;
        // Pre-fill resend email input
        const resendEmailEl = document.getElementById('resendEmail');
        if (resendEmailEl) resendEmailEl.value = email;
        
        // Call backend to confirm email
        confirmEmail(token, email);
    } else {
        // Show resend section if no token/email
        showResendSection();
        showConfirmationState('error', 'Invalid confirmation link. Please enter your email to request a new confirmation link.', 'Invalid Link');
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
    const errorFooterMessageEl = document.getElementById("errorFooterMessage");
    const resendSectionEl = document.getElementById("resendSection");

    // Hide all icons and footers first
    loadingIconEl.style.display = 'none';
    successIconEl.style.display = 'none';
    errorIconEl.style.display = 'none';
    successFooterEl.style.display = 'none';
    errorFooterEl.style.display = 'none';
    loadingFooterEl.style.display = 'none';

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
            if (resendSectionEl) resendSectionEl.style.display = 'none';
            break;
            
        case 'success':
            pageTitleEl.textContent = 'Email Successfully Confirmed!';
            const successSubtitleEl = document.getElementById('subtitle');
            if (successSubtitleEl) successSubtitleEl.textContent = message;
            messageEl.innerHTML = `<p class="text-muted">${message}</p>`;
            successIconEl.style.display = 'block';
            successFooterEl.style.display = 'block';
            loginBtnEl.style.display = 'inline-block';
            if (resendSectionEl) resendSectionEl.style.display = 'none';
            break;
            
        case 'error':
            pageTitleEl.textContent = title || 'Confirmation Failed';
            const errorSubtitleEl = document.getElementById('subtitle');
            if (errorSubtitleEl) errorSubtitleEl.textContent = message;
            messageEl.innerHTML = `<p class="text-muted">${message}</p>`;
            errorIconEl.style.display = 'block';
            errorFooterEl.style.display = 'block';
            loginBtnEl.style.display = 'inline-block';
            
            // Update error footer message
            if (errorFooterMessageEl) {
                errorFooterMessageEl.textContent = message || 'If you continue to experience issues, please contact support.';
            }
            
            // Show resend section for expired/invalid links
            if (resendSectionEl && (message.includes('expired') || message.includes('Invalid') || title === 'Link Expired')) {
                resendSectionEl.style.display = 'block';
            }
            
            showError("errorBox", message, title || 'Confirmation Failed');
            break;
    }
}

// Show resend section manually
function showResendSection() {
    const resendSectionEl = document.getElementById('resendSection');
    const messageEl = document.getElementById("message");
    const pageTitleEl = document.getElementById("pageTitle");
    const loadingIconEl = document.getElementById("loadingIcon");
    const errorIconEl = document.getElementById("errorIcon");
    const loadingFooterEl = document.getElementById("loadingFooter");
    const errorFooterEl = document.getElementById("errorFooter");
    
    // Hide loading elements
    loadingIconEl.style.display = 'none';
    loadingFooterEl.style.display = 'none';
    errorFooterEl.style.display = 'none';
    errorIconEl.style.display = 'none';
    
    // Update title
    pageTitleEl.textContent = 'Resend Confirmation Email';
    messageEl.innerHTML = '<p class="text-muted">Enter your email address below to receive a new confirmation link.</p>';
    
    // Show resend section
    if (resendSectionEl) {
        resendSectionEl.style.display = 'block';
    }
}

// Handle resend confirmation
async function handleResendConfirmation() {
    const emailInput = document.getElementById('resendEmail');
    const resendBtn = document.getElementById('resendBtn');
    const resendStatus = document.getElementById('resendStatus');
    
    const email = emailInput?.value?.trim();
    
    if (!email) {
        resendStatus.innerHTML = '<div class="alert alert-warning">Please enter your email address.</div>';
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        resendStatus.innerHTML = '<div class="alert alert-warning">Please enter a valid email address.</div>';
        return;
    }
    
    // Show loading state
    const originalBtnText = resendBtn.innerHTML;
    resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    resendBtn.disabled = true;
    resendStatus.innerHTML = '';
    
    try {
        const response = await fetch(`${CONFIG.API_BASE}/resend-confirmation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ login_id: email })
        });
        
        const result = await response.json();
        
        if (result.ok || result.status === 'success') {
            resendStatus.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i> 
                    Confirmation email sent! Please check your inbox and spam folder.
                </div>
            `;
            emailInput.value = '';
        } else {
            resendStatus.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> 
                    ${result.message || 'Failed to send confirmation email. Please try again.'}
                </div>
            `;
        }
    } catch (error) {
        console.error('Resend confirmation error:', error);
        resendStatus.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-times-circle"></i> 
                Something went wrong. Please check your internet connection and try again.
            </div>
        `;
    } finally {
        resendBtn.innerHTML = originalBtnText;
        resendBtn.disabled = false;
    }
}

// Export functions for use in HTML onclick handlers
window.showResendSection = showResendSection;
window.handleResendConfirmation = handleResendConfirmation;
window.hideWarning = hideWarning;

async function confirmEmail(token, email) {
    try {
        // Show loading state
        showConfirmationState('loading', 'Please wait while we confirm your email address...');

        const response = await fetch(`${CONFIG.API_BASE}/confirm-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                email: email
            })
        });

        const result = await response.json();

        if (result.ok) {
            showConfirmationState('success', result.message || "Email confirmed successfully! Your account has been activated.");
        } else {
            // Check if the error is due to expired link
            const isExpired = result.message && (
                result.message.toLowerCase().includes('expired') ||
                result.message.toLowerCase().includes('invalid') ||
                result.message.toLowerCase().includes('token')
            );
            
            if (isExpired) {
                showConfirmationState('error', 'Your confirmation link has expired. Please request a new one below.', 'Link Expired');
            } else {
                showConfirmationState('error', result.message || "Confirmation failed. Please try again or contact support.");
            }
        }
    } catch (error) {
        console.error('Email confirmation error:', error);
        showConfirmationState('error', "Something went wrong. Please check your internet connection and try again.");
    }
}