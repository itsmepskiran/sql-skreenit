// login/js/update-password.js
import { CONFIG } from '@shared/js/config.js';
import { showError, showSuccess, hideWarning } from '@shared/js/warning-ribbon.js';
import '@shared/js/mobile.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';

// Update Logo
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

// Update Brand Logo
const brandImg = document.getElementById('brandImg');
if(brandImg) brandImg.src = `${assetsBase}/assets/images/logobrand.png`;

// Update links - handle elements that may not exist
const loginLink = document.getElementById('loginLink');
if(loginLink) loginLink.href = CONFIG.PAGES.LOGIN;
const termsLink = document.getElementById('termsLink');
if(termsLink) termsLink.href = CONFIG.PAGES.TERMS;
const privacyLink = document.getElementById('privacyLink');
if(privacyLink) privacyLink.href = CONFIG.PAGES.PRIVACY;
const logoLink = document.querySelector('.logo-link');
if(logoLink) logoLink.href = CONFIG.PAGES.INDEX;

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("passwordForm");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const submitBtn = document.getElementById("submitBtn");

  // Get token from URL query params (not hash)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  // Validate token on page load
  if (!token) {
    showError("errorBox", "Invalid or missing reset token. Please request a new password reset link.", "Invalid Token");
    form.classList.add("d-none");
    return;
  }

  try {
    // Verify token is valid
    const response = await fetch(`${CONFIG.API_BASE}/verify-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      const result = await response.json();
      showError("errorBox", result.detail || "Invalid or expired reset link. Please request a new one.", "Expired Link");
      form.classList.add("d-none");
      return;
    }
  } catch (err) {
    showError("errorBox", "Failed to verify reset link. Please try again later.", "Verification Failed");
    form.classList.add("d-none");
    return;
  }

  // Password strength checker
  function checkPasswordStrength(password) {
    const strength = {
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    return {
      score: Object.values(strength).filter(Boolean).length * 20,
      strength,
      isStrong: Object.values(strength).every(Boolean)
    };
  }

  function updatePasswordStrength(password) {
    const strength = checkPasswordStrength(password);
    const strengthFill = document.getElementById("password-strength-fill");
    const requirements = {
      "req-length": strength.strength.hasMinLength,
      "req-uppercase": strength.strength.hasUppercase,
      "req-lowercase": strength.strength.hasLowercase,
      "req-number": strength.strength.hasNumber,
      "req-special": strength.strength.hasSpecialChar
    };

    Object.entries(requirements).forEach(([id, isValid]) => {
      const el = document.getElementById(id);
      if(el) el.classList.toggle("valid", isValid);
    });

    let color = "#ef4444";
    if (strength.score >= 80) color = "#10B981";
    else if (strength.score >= 60) color = "#F59E0B";
    else if (strength.score >= 40) color = "#3B82F6";

    strengthFill.style.width = `${strength.score}%`;
    strengthFill.style.backgroundColor = color;
  }

  passwordInput.addEventListener("input", (e) => updatePasswordStrength(e.target.value));

  // Global toggle password function for onclick handlers
  window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    if (input.type === "password") {
      input.type = "text";
      button.querySelector("i").classList.remove("fa-eye");
      button.querySelector("i").classList.add("fa-eye-slash");
    } else {
      input.type = "password";
      button.querySelector("i").classList.remove("fa-eye-slash");
      button.querySelector("i").classList.add("fa-eye");
    }
  };

  // Submit handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    hideWarning("errorBox");

    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    if (password !== confirmPassword) {
      showError("errorBox", "Passwords do not match.", "Password Mismatch");
      return;
    }

    const strength = checkPasswordStrength(password);
    if (!strength.isStrong) {
      showError("errorBox", "Please ensure your password meets all requirements.", "Weak Password");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

      // Reset password using token
      const response = await fetch(`${CONFIG.API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.detail || 'Failed to reset password');
      }

      showSuccess("errorBox", "Password updated successfully! Redirecting to login...", "Success");
      setTimeout(() => {
        window.location.href = `${CONFIG.PAGES.LOGIN}?reset=success`;
      }, 2000);

    } catch (err) {
      showError("errorBox", err.message || "An error occurred. Please try again.", "Reset Failed");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Set Password';
    }
  });
});