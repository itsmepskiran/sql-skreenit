import { customAuth } from '@shared/js/auth-config.js';;
import { backendGet, backendPut, backendDelete, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

document.addEventListener("DOMContentLoaded", async () => {
    await checkAuth();
    setupNavigation();
    populateLocationDropdown();
    initJobEditForm();
});

function populateLocationDropdown() {
    const locationSelect = document.getElementById("job_location");
    if (!locationSelect) return;
    
    CONFIG.LOCATIONS.forEach(location => {
        const option = document.createElement("option");
        option.value = location;
        option.textContent = location;
        locationSelect.appendChild(option);
    });
}

async function checkAuth() {
    const user = await customAuth.getUserData();
    if (!user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    if ((user.role || '').toLowerCase() !== 'recruiter') {
        window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE; 
        return;
    }
    // Initialize sidebar quickly, then refresh using backend profile.
    updateSidebarProfile({}, user);
    await updateUserInfo(); 
}

function updateSidebarProfile(profile, user) {
    const nameEl = document.getElementById('recruiterName');
    const avatarEl = document.getElementById('userAvatar'); 
    const displayName = profile?.contact_name || profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Recruiter');

    if (nameEl) nameEl.textContent = displayName;

    const displayAvatar = profile?.company_logo_url || profile?.avatar_url || user?.avatar_url;
    if (avatarEl) {
        if (displayAvatar && !displayAvatar.includes('yourdomain.com')) {
            avatarEl.innerHTML = `<img src="${displayAvatar}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
        } else {
            const initials = displayName.match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.innerHTML = text; 
        }
    }
}

async function updateUserInfo() {
    try {
        const res = await backendGet('/recruiter/profile');
        const data = await handleResponse(res);
        const profile = data.data || data; 
        if (profile) {
            const user = await customAuth.getUserData();
            updateSidebarProfile(profile, user);

            const companyIdEl = document.getElementById('companyId');
            if (companyIdEl) {
                const displayId = profile.company_display_id || profile.company_id || profile.company_name;
                companyIdEl.textContent = displayId || 'Pending';
            }
        }
    } catch (error) { /* silent fail */ }
}

async function initJobEditForm() {
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('job_id');

    if (!jobId) {
        alert("No Job ID provided.");
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
        return;
    }

    try {
        const res = await backendGet(`/recruiter/jobs/${jobId}`);
        const result = await handleResponse(res);
        const job = result.data || result;

        // Populate fields
        document.getElementById("job_title").value = job.job_title || job.title || "";
        document.getElementById("job_location").value = job.location || "";
        document.getElementById("job_type").value = job.job_type || "";
        document.getElementById("job_description").value = job.description || "";
        document.getElementById("requirements").value = job.requirements || "";
        document.getElementById("education_qualification").value = job.education_qualification || "";
        document.getElementById("work_location_preference").value = job.work_location_preference || "";

        // ✅ THE FIX: Pre-select the salary range dropdown
        const salarySelect = document.getElementById("salary_range");
        if (salarySelect) {
            const min = job.salary_min;
            const max = job.salary_max === null ? 0 : job.salary_max;
            if (min !== null) {
                salarySelect.value = `${min}-${max}`;
            }
        }

        const editForm = document.getElementById("editJobForm");
        if(editForm) editForm.addEventListener("submit", (e) => handleJobUpdate(e, jobId));

        setupDeleteButton(jobId);

    } catch (error) {
        console.error("Load job error:", error);
        alert("Failed to load job details.");
    }
}

async function handleJobUpdate(event, jobId) {
  event.preventDefault();
  const submitBtn = event.target.querySelector("button[type='submit']");
  const originalText = submitBtn.innerHTML;
  
  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Updating...';

    const job_title = document.getElementById("job_title").value.trim();
    const location = document.getElementById("job_location").value.trim();
    const job_type = document.getElementById("job_type").value;
    const salary_range = document.getElementById("salary_range").value;
    const description = document.getElementById("job_description").value.trim();
    const requirements = document.getElementById("requirements").value.trim();
    const education_qualification = document.getElementById("education_qualification").value;
    const work_location_preference = document.getElementById("work_location_preference").value;

    // ✅ THE FIX: Correctly parse salary from dropdown
    let salary_min = null;
    let salary_max = null;
    if (salary_range) {
        const parts = salary_range.split('-');
        salary_min = parseInt(parts[0]) || null;
        salary_max = parseInt(parts[1]) || null;
        if (salary_max === 0) salary_max = null; 
    }

    const payload = {
      job_title, location, job_type, salary_min, salary_max, description, requirements, 
      education_qualification, work_location_preference, status: 'active'
    };

    const response = await backendPut(`/recruiter/jobs/${jobId}`, payload);
    await handleResponse(response);

    submitBtn.innerHTML = '<i class="fas fa-check"></i> Updated!';
    setTimeout(() => {
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
    }, 1000);

  } catch (error) {
    alert(`Update failed: ${error.message}`);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

function setupDeleteButton(jobId) {
  const deleteBtn = document.getElementById("deleteJobBtn");
  if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to delete this job listing? This cannot be undone.")) return;
        
        const originalText = deleteBtn.innerHTML;
        try {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            
            const res = await backendDelete(`/recruiter/jobs/${jobId}`);
            await handleResponse(res);
            
            window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
        } catch (err) {
            alert(`Delete failed: ${err.message}`); 
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalText;
        }
      });
  }
}

function setupNavigation() {
    document.getElementById('navDashboard')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    document.getElementById('navJobs')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);
    document.getElementById('navApplications')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    document.getElementById('navProfile')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.RECRUITER_PROFILE);
    
    document.getElementById("backBtn")?.addEventListener("click", () => {
        if (confirm("Changes made will be lost. Are you sure you want to leave?")) {
            window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
        }
    });

    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        await customAuth.signOut();
        window.location.href = CONFIG.PAGES.JOBS;
    });
}