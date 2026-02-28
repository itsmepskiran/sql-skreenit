// login/js/confirm-email.js
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';

// Setup Assets
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
document.getElementById('brandImg').src = `${assetsBase}/assets/images/logobrand.png`;

document.addEventListener("DOMContentLoaded", () => {
    const messageEl = document.getElementById("message");
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');

    // If we have token and email, confirm the email
    if (token && email) {
        // Call backend to confirm email
        confirmEmail(token, email);
    } else {
        // Show error message
        messageEl.textContent = "Invalid confirmation link. Please try again.";
        messageEl.className = "message error";
        
        setTimeout(() => {
            window.location.href = CONFIG.PAGES.LOGIN;
        }, 3000);
    }
});

async function confirmEmail(token, email) {
    try {
        const formData = new FormData();
        formData.append('token', token);
        formData.append('email', email);

        const response = await fetch(`${CONFIG.API_BASE}/confirm-email`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.ok) {
            messageEl.textContent = result.message || "Email confirmed successfully! Redirecting to login...";
            messageEl.className = "message success";
            
            setTimeout(() => {
                window.location.href = `${CONFIG.PAGES.LOGIN}?confirmed=true`;
            }, 2000);
        } else {
            messageEl.textContent = result.message || "Confirmation failed. Please try again.";
            messageEl.className = "message error";
            
            setTimeout(() => {
                window.location.href = CONFIG.PAGES.LOGIN;
            }, 3000);
        }
    } catch (error) {
        console.error('Email confirmation error:', error);
        messageEl.textContent = "Something went wrong. Please try again.";
        messageEl.className = "message error";
        
        setTimeout(() => {
            window.location.href = CONFIG.PAGES.LOGIN;
        }, 3000);
    }
}