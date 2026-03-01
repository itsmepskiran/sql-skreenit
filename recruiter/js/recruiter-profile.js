import { customAuth } from '@shared/js/auth-config.js';;
import { backendPut, backendGet, handleResponse } from '@shared/js/backend-client.js'; 
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';

// Setup Assets
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

// Store original data to revert if user clicks Cancel
let originalProfileData = {};

document.addEventListener("DOMContentLoaded", async () => {
    await ensureRecruiter();
    setupNavigation();
});

// --- AUTH & DATA LOADING ---
async function ensureRecruiter() {
  const user = await customAuth.getUserData();
  
  if (!user || (user.role || "").toLowerCase() !== "recruiter") {
    window.location.href = CONFIG.PAGES.LOGIN;
    return null;
  }

  // Fast UI update
  updateSidebarProfile(user.user_metadata || {}, user.email);

  // Fetch Full Profile Data from Backend
  await fetchProfileData(user);
}

function updateSidebarProfile(meta, email) {
    // ✅ FIX: Changed 'userName' to 'recruiterName' to match HTML
    const nameEl = document.getElementById("recruiterName"); 
    const avatarEl = document.getElementById("userAvatar"); 
    
    if(nameEl) {
        // Fallback: Custom metadata -> Email prefix -> 'Recruiter'
        nameEl.textContent = meta.full_name || meta.contact_name || email.split('@')[0] || 'Recruiter';
    }
    
    if(avatarEl) {
        if (meta.avatar_url) {
            avatarEl.innerHTML = `<img src="${meta.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
        } else {
            const initials = (meta.full_name || email).match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.innerHTML = text; 
        }
    }
}

async function fetchProfileData(user) {
  try {
    const res = await backendGet('/recruiter/profile');
    const result = await handleResponse(res);
    
    // Safely extract the data depending on backend wrapping
    const profile = result.data || result; 

    if (profile && Object.keys(profile).length > 0) {
        originalProfileData = profile; // Cache for cancel
        populateForm(originalProfileData);

        // Update Sidebar Company ID dynamically
        const companyIdEl = document.getElementById('companyId');
        if (companyIdEl && (profile.company_id || profile.company_name)) {
            companyIdEl.textContent = profile.company_id || profile.company_name;
        }

    } else {
        // Fallback for brand new users
        if (user) {
            document.getElementById("contact_name").value = user.user_metadata?.full_name || "";
            document.getElementById("contact_email").value = user.email || "";
        }
    }
  } catch (err) {
    console.warn("Profile fetch error:", err);
  }
}
// Call this after fetching the recruiter profile data
function updateSidebar(meta, profileData) {
    const nameEl = document.getElementById('recruiterName');
    const compEl = document.getElementById('companyId');
    
    if(nameEl) nameEl.textContent = meta.full_name || meta.contact_name || 'Recruiter';
    if(compEl) compEl.textContent = profileData.company_name || 'No Company Linked';
}

function populateForm(data) {
    if(!data) return;
    setValue("company_name", data.company_name);
    setValue("company_website", data.company_website);
    setValue("contact_name", data.contact_name);
    setValue("contact_email", data.contact_email);
    setValue("location", data.location);
    setValue("about", data.about_company || data.about); 
    
    const idEl = document.getElementById("company_id");
    if(idEl) idEl.value = data.company_display_id || "Pending (Save Profile First)";
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if(el) el.value = val || "";
}

// --- EDIT MODE LOGIC ---
function toggleEditMode(enable) {
    const form = document.getElementById("recruiterProfileForm");
    const inputs = form.querySelectorAll("input, textarea");
    const editBtn = document.getElementById("editBtn");
    const editActions = document.getElementById("editActions");

    inputs.forEach(input => {
        // Company ID is ALWAYS read-only
        if (input.id !== "company_id") {
            input.disabled = !enable;
            if (enable) {
                input.removeAttribute('readonly'); // Ensure readonly styles are removed
            } else {
                input.setAttribute('readonly', 'true');
            }
        }
    });

    // FIXED: Properly hiding/showing elements without Bootstrap
    if (enable) {
        editBtn.style.display = "none"; 
        editActions.style.display = "flex"; 
    } else {
        editBtn.style.display = "inline-flex"; 
        editActions.style.display = "none"; 
    }
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  const btn = document.getElementById("saveBtn");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...'; 
  btn.disabled = true;

  const { data: { user } } = await customAuth.getUser();

  let website = document.getElementById("company_website").value.trim();
  if (website && !website.match(/^https?:\/\//)) website = `https://${website}`;

  const payload = {
    user_id: user.id,
    company_name: document.getElementById("company_name").value.trim(),
    company_website: website || null,
    contact_name: document.getElementById("contact_name").value.trim(),
    contact_email: document.getElementById("contact_email").value.trim(),
    location: document.getElementById("location").value.trim() || null,
    about: document.getElementById("about").value.trim() || null,
  };

  try {
    const res = await backendPut("/recruiter/profile", payload);
    await handleResponse(res);
    
    await customAuth.refreshSession();
    
    originalProfileData = { ...originalProfileData, ...payload, about_company: payload.about }; 
    
    btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
    btn.style.backgroundColor = '#10b981';

    // ✅ FIX: Also update 'recruiterName' in the sidebar on save success
    const sidebarNameEl = document.getElementById('recruiterName');
    if (sidebarNameEl) sidebarNameEl.textContent = payload.contact_name;

    const companyIdEl = document.getElementById('companyId');
    if (companyIdEl) companyIdEl.textContent = payload.company_name;

    setTimeout(() => {
        toggleEditMode(false);
        btn.innerHTML = originalText;
        btn.style.backgroundColor = '';
        btn.disabled = false;
    }, 1000);

  } catch (err) {
    console.error("Save failed:", err);
    alert(`Failed to save: ${err.message}`);
    btn.innerHTML = originalText; 
    btn.disabled = false;
  }
}
// --- ABSOLUTE NAVIGATION LOGIC ---
function setupNavigation() {
    const origin = window.location.origin;

    const navDashboard = document.getElementById('navDashboard');
    const navJobs = document.getElementById('navJobs');
    const navApplications = document.getElementById('navApplications');
    const navProfile = document.getElementById('navProfile');
    const logoutBtn = document.getElementById('logoutBtn');
    const backBtn = document.getElementById("backBtn");

    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = `${CONFIG.PAGES.DASHBOARD_RECRUITER}`);
    if(navJobs) navJobs.addEventListener('click', () => window.location.href = `${CONFIG.PAGES.MY_JOBS}`);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = `${CONFIG.PAGES.APPLICATION_LIST}`);
    if(navProfile) navProfile.addEventListener('click', () => window.location.href = `${CONFIG.PAGES.RECRUITER_PROFILE}`);
    if(backBtn) backBtn.addEventListener("click", () => window.location.href = `${CONFIG.PAGES.DASHBOARD_RECRUITER}`);

    if(logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await customAuth.signOut();
            window.location.href = CONFIG.PAGES.LOGIN;
        });
    }

    // Edit and Form Buttons
    const editBtn = document.getElementById("editBtn");
    if(editBtn) editBtn.addEventListener("click", () => toggleEditMode(true));

    const cancelBtn = document.getElementById("cancelBtn");
    if(cancelBtn) cancelBtn.addEventListener("click", () => {
        populateForm(originalProfileData); 
        toggleEditMode(false);
    });

    const form = document.getElementById("recruiterProfileForm");
    if (form) form.addEventListener("submit", handleProfileSubmit);
}