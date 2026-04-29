import { customAuth } from '@shared/js/auth-config.js';
import { backendPost, backendPut, backendGet, handleResponse } from '@shared/js/backend-client.js'; 
import { CONFIG } from '@shared/js/config.js';
import { sidebarManager } from '@shared/js/profile-checker.js';
import '@shared/js/mobile.js';

// Setup Assets
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

// Store original data to revert if user clicks Cancel
let originalProfileData = {};

// Run immediately since script is loaded dynamically at end of body
(async function init() {
    try {
        await ensureRecruiter();
        setupNavigation();
    } catch (err) {
        alert("Failed to initialize profile page. Please refresh or log in again.");
    }
})();

async function ensureRecruiter() {
  const user = await customAuth.getUserData();
  
  if (!user || (user.role || "").toLowerCase() !== "recruiter") {
    window.location.href = CONFIG.PAGES.LOGIN;
    return null;
  }

  // Use centralized sidebar manager
  await sidebarManager.initSidebar();

  // Fetch Full Profile Data from Backend
  await fetchProfileData(user);
}

async function fetchProfileData(user) {
  try {
    const res = await backendGet('/recruiter/profile');
    const result = await handleResponse(res);
    // console.log('🔍 Recruiter profile fetch result:', result);

    const profile = result?.data?.data || result?.data || result;
    // console.log('📌 Extracted recruiter profile:', profile);

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
            // Sidebar already initialized by sidebarManager.initSidebar() above
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
    // Log error for debugging but don't break the page
    // console.error("Profile fetch error:", err);
    // Fallback for brand new users
    if (user && user.email) {
        document.getElementById("contact_name").value = user.full_name || "";
        document.getElementById("contact_email").value = user.email || "";
    }
    
    // Ensure the footer shows Pending until profile is completed
    const companyIdEl = document.getElementById('companyId');
    if (companyIdEl) {
        companyIdEl.textContent = 'Pending';
    }
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

    // Update profile header
    const profileName = document.getElementById('profileName');
    const profileCompany = document.getElementById('profileCompany');
    const profileLocation = document.getElementById('profileLocation');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (profileName) profileName.textContent = data.contact_name || data.company_name || 'Recruiter';
    if (profileCompany) profileCompany.textContent = data.company_name || 'Company';
    if (profileLocation) profileLocation.textContent = data.location || 'Location not set';
    
    // Set avatar initials
    if (profileAvatar) {
        const name = data.contact_name || data.company_name || 'R';
        const initialsMatch = name.trim().match(/\b\w/g) || [];
        const initials = ((initialsMatch.shift() || '') + (initialsMatch.pop() || '')).toUpperCase() || 'R';
        profileAvatar.textContent = initials;
    }

    // Update stats (fetch from backend or use defaults)
    loadProfileStats();

    // Load real-time specializations and achievements
    loadSpecializations();
    loadAchievements();
    loadRecentActivity();
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if(el) el.value = val || "";
}

// Load profile statistics
async function loadProfileStats() {
    try {
        // Fetch jobs count
        const jobsRes = await backendGet('/recruiter/jobs');
        const jobsData = await handleResponse(jobsRes);
        const jobs = jobsData?.data || [];
        document.getElementById('statJobs').textContent = Array.isArray(jobs) ? jobs.length : 0;

        // Fetch applications count
        const appsRes = await backendGet('/recruiter/applications');
        const appsData = await handleResponse(appsRes);
        const applications = appsData?.data || [];
        document.getElementById('statApplications').textContent = Array.isArray(applications) ? applications.length : 0;

        // Count hired candidates
        const hired = applications.filter(a => (a.status || '').toLowerCase() === 'hired').length;
        document.getElementById('statHired').textContent = hired;

        // Fetch analysis reports count
        const analysisRes = await backendGet('/analytics/analysis-tasks');
        const analysisData = await handleResponse(analysisRes);
        const tasks = analysisData?.data || [];
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        document.getElementById('statAnalysis').textContent = completedTasks;

    } catch (err) {
        // Keep default values on error
    }
}

// Load hiring specializations
async function loadSpecializations() {
    try {
        const res = await backendGet('/recruiter/profile/specializations');
        const result = await handleResponse(res);
        const specializations = result?.data?.specializations || [];
        const message = result?.data?.message;

        const container = document.getElementById('specializationsList');
        if (!container) return;

        container.innerHTML = '';

        if (specializations.length > 0) {
            specializations.forEach(spec => {
                const tag = document.createElement('span');
                tag.className = 'specialization-tag';
                tag.textContent = spec;
                container.appendChild(tag);
            });
        } else if (message) {
            const tag = document.createElement('span');
            tag.className = 'specialization-tag';
            tag.textContent = message;
            tag.style.background = '#f1f5f9';
            tag.style.color = '#64748b';
            container.appendChild(tag);
        }
    } catch (err) {
        // Keep default values on error
    }
}

// Load achievements
async function loadAchievements() {
    try {
        const res = await backendGet('/recruiter/profile/achievements');
        const result = await handleResponse(res);
        const achievements = result?.data?.achievements || [];

        const container = document.getElementById('achievementsList');
        if (!container) return;

        container.innerHTML = '';

        if (achievements.length > 0) {
            achievements.forEach(achievement => {
                const card = document.createElement('div');
                card.className = 'achievement-card';
                card.innerHTML = `
                    <div class="achievement-icon" style="background: ${achievement.bg_color}; color: ${achievement.color};">
                        <i class="fas ${achievement.icon}"></i>
                    </div>
                    <div class="achievement-info">
                        <h4>${achievement.title}</h4>
                        <p>${achievement.description}</p>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (err) {
        // Keep default values on error
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const res = await backendGet('/recruiter/profile/activity');
        const result = await handleResponse(res);
        const activities = result?.data?.activities || [];

        const container = document.getElementById('activityList');
        if (!container) return;

        container.innerHTML = '';

        if (activities.length > 0) {
            activities.forEach(activity => {
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <div class="activity-icon" style="background: ${activity.bg_color}; color: ${activity.color};">
                        <i class="fas ${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <h4>${activity.title}</h4>
                        <p>${activity.description}</p>
                        <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem;">${activity.time_ago}</p>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    } catch (err) {
        // Keep default values on error
    }
}

// --- EDIT MODE LOGIC ---
function toggleEditMode(enable) {
    const form = document.getElementById("recruiterProfileForm");
    const inputs = form.querySelectorAll("input, textarea");
    const editBtn = document.getElementById("editBtn");
    const editActions = document.getElementById("editActions");

    inputs.forEach(input => {
        // Company ID is ALWAYS read-only, upload buttons should never be disabled
        if (input.id !== "company_id" && input.type !== "file") {
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

  // Frontend validation: Company name is MANDATORY for company ID generation
  const companyName = document.getElementById("company_name").value.trim();
  
  if (!companyName) {
    alert("Company name is required to generate company ID.");
    btn.innerHTML = originalText;
    btn.disabled = false;
    return;
  }

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
    // console.log('[RecruiterProfile] Saving profile with payload:', payload);
    const res = await backendPut("/recruiter/profile", payload);
    // console.log('[RecruiterProfile] Response status:', res.status);
    const result = await handleResponse(res);
    // console.log('[RecruiterProfile] Save result:', result);

    // Optionally mark recruiter as onboarded via backend
    try {
        await backendPost('/mark-onboarded', {});
    } catch (e) {
        // console.warn('Could not mark as onboarded:', e);
    }

    // Refresh stored session data (if available)
    try {
        await customAuth.refreshSession();
    } catch (e) {
        // console.warn('Failed to refresh session after profile update:', e);
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
    // console.error("[RecruiterProfile] Save failed:", err);
    // console.error("[RecruiterProfile] Error message:", err.message);
    // console.error("[RecruiterProfile] Server response:", err.response);
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
    const navAnalysis = document.getElementById('navAnalysis');
    const navProfile = document.getElementById('navProfile');
    const logoutBtn = document.getElementById('logoutBtn');
    const backBtn = document.getElementById("backBtn");

    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = `${CONFIG.PAGES.DASHBOARD_RECRUITER}`);
    if(navJobs) navJobs.addEventListener('click', () => window.location.href = `${CONFIG.PAGES.MY_JOBS}`);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = `${CONFIG.PAGES.APPLICATION_LIST}`);
    if(navAnalysis) navAnalysis.addEventListener('click', () => window.location.href = `../dashboard/analysis.html`);
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

    // Company Logo Upload Functionality
    const uploadCompanyLogoBtn = document.getElementById("uploadCompanyLogoBtn");
    const companyLogoUpload = document.getElementById("companyLogoUpload");
    
    if (uploadCompanyLogoBtn && companyLogoUpload) {
        uploadCompanyLogoBtn.addEventListener("click", () => {
            companyLogoUpload.click();
        });
        
        companyLogoUpload.addEventListener("change", async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert("Please select an image file.");
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert("Image size should be less than 5MB.");
                return;
            }
            
            const btn = uploadCompanyLogoBtn;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Uploading...';
            btn.disabled = true;
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                
                const {data: {session}} = await customAuth.getSession();
                const token = session?.access_token;
                const response = await fetch('/api/v1/recruiter/profile/company-logo', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`Upload failed: ${response.statusText}`);
                }
                
                const result = await response.json();
                // console.log('[RecruiterProfile] Company logo uploaded:', result);
                
                // Update the UI to show the uploaded logo
                if (result.data && result.data.avatar_url) {
                    // You can update any logo preview element here if needed
                    // console.log('Company logo URL:', result.data.avatar_url);
                }
                
                btn.innerHTML = '<i class="fas fa-check me-2"></i> Uploaded';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 2000);
                
            } catch (error) {
                // console.error('[RecruiterProfile] Logo upload failed:', error);
                alert(`Failed to upload logo: ${error.message}`);
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    const form = document.getElementById("recruiterProfileForm");
    if (form) form.addEventListener("submit", handleProfileSubmit);
}
