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


    await ensureRecruiter();
    setupNavigation();
    setupAvatarUpload();
    setupCompanyLogoUpload();


// --- SIDEBAR / USER METADATA ---
function updateSidebarProfile(user) {
    const nameEl = document.getElementById("recruiterName"); 
    const avatarEl = document.getElementById("userAvatar"); 

    const logoUrl = user?.company_logo_url || user?.avatar_url;
    const initials = (() => {
        const src = user?.full_name || user?.name || (user?.email ? user.email.split('@')[0] : 'Recruiter');
        const chars = (src || 'R').match(/\b\w/g) || [];
        return ((chars.shift() || '') + (chars.pop() || '')).toUpperCase();
    })();

    if(nameEl) {
        nameEl.textContent = user?.full_name || user?.name || (user?.email ? user.email.split('@')[0] : 'Recruiter');
    }
    
    if(avatarEl) {
        if (logoUrl) {
            avatarEl.innerHTML = `<img src="${logoUrl}" onerror="this.style.display='none'; this.parentElement.textContent='${initials}';" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
        } else {
            avatarEl.textContent = initials; 
        }
    }
}

async function ensureRecruiter() {
  const user = await customAuth.getUserData();
  
  if (!user || (user.role || "").toLowerCase() !== "recruiter") {
    window.location.href = CONFIG.PAGES.LOGIN;
    return null;
  }

  // Fast UI update from cached user data
  updateSidebarProfile(user);

  // Fetch Full Profile Data from Backend
  await fetchProfileData(user);
}

async function fetchProfileData(user) {
  try {
    const res = await backendGet('/recruiter/profile');
    const result = await handleResponse(res);
    console.log('🔍 Recruiter profile fetch result:', result);

    const profile = result?.data?.data || result?.data || result;
    console.log('📌 Extracted recruiter profile:', profile);

    if (profile && Object.keys(profile).length > 0) {
        // Ensure we default missing contact details to the signed-in user values
        const currentUser = await customAuth.getUserData();
        if (currentUser) {
            profile.contact_name = profile.contact_name || currentUser.full_name || currentUser.email;
            profile.contact_email = profile.contact_email || currentUser.email;
        }

        originalProfileData = profile; // Cache for cancel
        populateForm(originalProfileData);

        // Update Sidebar Company ID dynamically (use display ID if available)
        const companyIdEl = document.getElementById('companyId');
        if (companyIdEl) {
            // Interpret onboarding status consistently with the UX expectation.
                const onboardedFlag = user?.onboarded ?? user?.user_metadata?.onboarded;
                const isOnboarded = onboardedFlag === true || onboardedFlag === 'true';
                const displayId = profile.company_display_id || profile.company_id || profile.company_name;
                const companyIdValue = (isOnboarded && displayId) ? displayId : 'Pending';
                companyIdEl.textContent = companyIdValue;
        }

        // Sync user_data so other pages can access company_name / logo
        if (currentUser) {
            if (profile.company_logo_url) {
                currentUser.company_logo_url = profile.company_logo_url;
                currentUser.avatar_url = profile.company_logo_url;
            }

            if (profile.company_display_id) {
                currentUser.company_display_id = profile.company_display_id;
            }

            // Keep sidebar name in sync with contact name
            if (profile.contact_name) {
                currentUser.full_name = profile.contact_name;
            }

            // Store company info for other pages
            if (profile.company_name) {
                currentUser.company_name = profile.company_name;
            }

            await customAuth.storage.setItem('user_data', JSON.stringify(currentUser));
            updateSidebarProfile(currentUser);
        }

    } else {
        // Fallback for brand new users
        if (user) {
            document.getElementById("contact_name").value = user.full_name || "";
            document.getElementById("contact_email").value = user.email || "";
        }

        // Ensure the footer shows Pending until profile is completed
        const companyIdEl = document.getElementById('companyId');
        if (companyIdEl) {
            companyIdEl.textContent = 'Pending';
        }
    }
  } catch (err) {
    console.warn("Profile fetch error:", err);
  }
}

function populateForm(data) {
    if(!data) return;
    setValue("company_name", data.company_name);
    setValue("company_website", data.company_website);
    setValue("contact_name", data.contact_name);
    setValue("contact_email", data.contact_email);
    setValue("location", data.location);
    setValue("company_description", data.company_description || data.about_company || data.about); 
    
    const idEl = document.getElementById("company_id");
    if(idEl) idEl.value = data.company_display_id || "Pending (Save Profile First)";

    const logoImgEl = document.getElementById('companyLogoImg');
    const logoPlaceholder = document.getElementById('companyLogoPlaceholder');
    if (data.company_logo_url && !data.company_logo_url.includes('yourdomain.com')) {
        if (logoImgEl) {
            logoImgEl.src = data.company_logo_url;
            logoImgEl.style.display = 'block';
            logoImg.onerror=()=>{
                logoImgEl.style.display='none';
                if(logoPlaceholder) logoPlaceholder.style.display='block';
            };
        }
        if (logoPlaceholder) logoPlaceholder.style.display = 'none';
    } else {
        if (logoImgEl) logoImgEl.style.display = 'none';
        if (logoPlaceholder) logoPlaceholder.style.display = 'block';
    }
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if(el) el.value = val || "";
}

// --- AVATAR + LOGO UPLOAD ---
async function setupAvatarUpload() {
    const uploadBtn = document.getElementById('uploadAvatarBtn');
    const fileInput = document.getElementById('avatarUploadInput');

    if (!uploadBtn || !fileInput) return;

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

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
                await customAuth.storage.setItem('user_data', JSON.stringify(user));
                updateSidebarProfile(user);
            }

            await fetchProfileData(user);
            alert('Avatar uploaded successfully.');
        } catch (err) {
            console.error('Avatar upload failed:', err);
            alert(`Failed to upload avatar: ${err?.message || 'Please try again.'}`);
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

            // Ensure the company name isn't lost when we refresh the profile.
            // The backend /recruiter/profile/company-logo endpoint only updates the logo, so the
            // profile refresh afterwards should still include the company name, but some setups
            // may return a partially-populated company object. Force a backend upsert to keep it.
            const companyName = document.getElementById('company_name')?.value?.trim();
            const user = await customAuth.getUserData();
            const logoUrl = result?.data?.logo_url;

            // Require a company name so we don't create/overwrite a company record with a blank name.
            if (!companyName) {
                alert('Please enter a company name before uploading a logo.');
            } else if (user?.id && logoUrl) {
                try {
                    await backendPut('/recruiter/profile', {
                        user_id: user.id,
                        company_name: companyName,
                        company_logo_url: logoUrl
                    });
                } catch (e) {
                    console.warn('Failed to persist company metadata after logo upload', e);
                }
            }

            await fetchProfileData(user);
            alert('Company logo uploaded successfully.');
        } catch (err) {
            console.error('Company logo upload failed:', err);
            alert(`Failed to upload company logo: ${err?.message || 'Please try again.'}`);
        } finally {
            fileInput.value = '';
        }
    });
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

    // Optionally mark recruiter as onboarded via backend
    try {
        await backendPost('/mark-onboarded', {});
    } catch (e) {
        console.warn('Could not mark as onboarded:', e);
    }

    // Refresh stored session data (if available)
    try {
        await customAuth.refreshSession();
    } catch (e) {
        console.warn('Failed to refresh session after profile update:', e);
    }

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
