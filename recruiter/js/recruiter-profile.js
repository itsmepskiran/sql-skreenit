import { customAuth } from '@shared/js/auth-config.js';;
import { backendPost, backendPut, backendGet, handleResponse } from '@shared/js/backend-client.js'; 
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
    setupAvatarUpload();
    setupCompanyLogoUpload();
});

async function setupAvatarUpload() {
    const uploadBtn = document.getElementById('uploadAvatarBtn');
    const fileInput = document.getElementById('avatarUploadInput');

    if (!uploadBtn || !fileInput) return;

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Optional: limit to 5MB
        if (file.size > 5 * 1024 * 1024) {
            alert('Please upload an image smaller than 5MB.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await backendPost('/recruiter/profile/avatar', formData);
            const result = await handleResponse(res);
            console.log('✅ Avatar upload response:', result);

            const user = await customAuth.getUserData();
            if (result.data?.avatar_url && user) {
                user.avatar_url = result.data.avatar_url;
                customAuth.storage.setItem('user_data', JSON.stringify(user));
                updateSidebarProfile(user);
            }

            // Refresh profile values
            await fetchProfileData(user);

            alert('Avatar uploaded successfully.');
        } catch (err) {
            console.error('Avatar upload failed:', err);
            alert('Failed to upload avatar. Please try again.');
        } finally {
            fileInput.value = '';
        }
    });
}

async function setupCompanyLogoUpload() {
    const uploadBtn = document.getElementById('uploadCompanyLogoBtn');
    const fileInput = document.getElementById('companyLogoUpload');

    if (!uploadBtn || !fileInput) return;

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Please upload an image smaller than 5MB.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await backendPost('/recruiter/profile/company-logo', formData);
            const result = await handleResponse(res);
            console.log('✅ Company logo upload response:', result);

            if (result.data?.logo_url) {
                // Refresh profile to show new logo
                const user = await customAuth.getUserData();
                await fetchProfileData(user);
                alert('Company logo uploaded successfully.');
            }
        } catch (err) {
            console.error('Company logo upload failed:', err);
            alert('Failed to upload company logo. Please try again.');
        } finally {
            fileInput.value = '';
        }
    });
}

// --- AUTH & DATA LOADING ---
async function ensureRecruiter() {
  const user = await customAuth.getUserData();
  
  if (!user || (user.role || "").toLowerCase() !== "recruiter") {
    window.location.href = CONFIG.PAGES.LOGIN;
    return null;
  }

  // Fast UI update
  updateSidebarProfile(user);

  // Fetch Full Profile Data from Backend
  await fetchProfileData(user);
}

function getUserFullName(user) {
    if (!user) return 'Recruiter';
    return user.full_name || user.name || (user.email ? user.email.split('@')[0] : 'Recruiter');
}

function updateSidebarProfile(user) {
    const nameEl = document.getElementById("recruiterName"); 
    const avatarEl = document.getElementById("userAvatar"); 
    const logoUrl = user?.company_logo_url || user?.avatar_url;

    if(nameEl) {
        nameEl.textContent = getUserFullName(user);
    }

    if(avatarEl) {
        if (logoUrl) {
            avatarEl.innerHTML = `<img src="${logoUrl}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
        } else {
            const initials = (getUserFullName(user) || 'R').match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.innerHTML = text; 
        }
    }
}

async function fetchProfileData(user) {
  try {
    const res = await backendGet('/recruiter/profile');
    const result = await handleResponse(res);
    
    // Safely extract the recruiter profile regardless of backend wrapping
    const profile = result?.data?.data || result?.data || result;

    if (profile && Object.keys(profile).length > 0) {
        originalProfileData = profile; // Cache for cancel
        populateForm(originalProfileData);

        // Update Sidebar Company ID dynamically (use display ID if available)
        const companyIdEl = document.getElementById('companyId');
        if (companyIdEl && (profile.company_display_id || profile.company_name || profile.company_id)) {
            companyIdEl.textContent = profile.company_display_id || profile.company_name || profile.company_id;
        }

        // Keep the sidebar in sync using company logo (preferred) or avatar.
        const user = await customAuth.getUserData();
        if (user) {
            if (profile.company_logo_url) {
                user.company_logo_url = profile.company_logo_url;
                user.avatar_url = profile.company_logo_url; // use logo as avatar
            } else if (profile.avatar_url) {
                user.avatar_url = profile.avatar_url;
            }

            if (profile.company_display_id) {
                user.company_display_id = profile.company_display_id;
            }

            customAuth.storage.setItem('user_data', JSON.stringify(user));
            updateSidebarProfile(user);
        }

    } else {
        // Fallback for brand new users
        if (user) {
            document.getElementById("contact_name").value = user.full_name || "";
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
    setValue("company_description", data.company_description || data.about_company || data.about); 

    const logoImg = document.getElementById('companyLogoImg');
    const logoPlaceholder = document.getElementById('companyLogoPlaceholder');
    if (data.company_logo_url) {
        if (logoImg) {
            logoImg.src = data.company_logo_url;
            logoImg.style.display = 'block';
        }
        if (logoPlaceholder) logoPlaceholder.style.display = 'none';
    } else {
        if (logoImg) logoImg.style.display = 'none';
        if (logoPlaceholder) logoPlaceholder.style.display = 'block';
    }
    
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

  // Get user with null check to prevent silent failures
  const authResult = await customAuth.getUser();
  const user = authResult?.data?.user;
  
  if (!user || !user.id) {
    alert("Session expired. Please log in again.");
    window.location.href = CONFIG.PAGES.LOGIN;
    return;
  }

  let website = document.getElementById("company_website").value.trim();
  if (website && !website.match(/^https?:\/\//)) website = `https://${website}`;

  const payload = {
    user_id: user.id,
    company_name: document.getElementById("company_name").value.trim(),
    company_website: website || null,
    contact_name: document.getElementById("contact_name").value.trim(),
    contact_email: document.getElementById("contact_email").value.trim(),
    location: document.getElementById("location").value.trim() || null,
    company_description: document.getElementById("company_description").value.trim() || null,
  };

  try {
    console.log('[RecruiterProfile] Saving profile with payload:', payload);
    const res = await backendPut("/recruiter/profile", payload);
    console.log('[RecruiterProfile] Response status:', res.status);
    const result = await handleResponse(res);
    console.log('[RecruiterProfile] Save result:', result);
    await customAuth.refreshSession();
    
    originalProfileData = { ...originalProfileData, ...payload, about_company: payload.company_description }; 
    
    btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
    btn.style.backgroundColor = '#10b981';

    // Refresh profile (including generated company display ID) and sidebar UI
    await fetchProfileData(user);

    setTimeout(() => {
        toggleEditMode(false);
        btn.innerHTML = originalText;
        btn.style.backgroundColor = '';
        btn.disabled = false;
    }, 1000);

  } catch (err) {
    console.error("[RecruiterProfile] Save failed:", err);
    console.error("[RecruiterProfile] Error message:", err.message);
    console.error("[RecruiterProfile] Server response:", err.response);
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
            window.location.href = CONFIG.PAGES.JOBS;
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