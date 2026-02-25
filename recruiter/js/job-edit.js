import { supabase } from '@shared/js/supabase-config.js';
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
    initJobEditForm();
});

async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    const user = session.user;
    if ((user.user_metadata?.role || '').toLowerCase() !== 'recruiter') {
        window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE; 
        return;
    }
    updateSidebarProfile(user.user_metadata, user.email);
    updateUserInfo(); 
}

function updateSidebarProfile(meta, email) {
    const nameEl = document.getElementById('recruiterName');
    const avatarEl = document.getElementById('userAvatar'); 
    if(nameEl) nameEl.textContent = meta.full_name || meta.contact_name || email.split('@')[0];
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

async function updateUserInfo() {
    try {
        const res = await backendGet('/recruiter/profile');
        const data = await handleResponse(res);
        const profile = data.data || data; 
        if (profile) {
            if (profile.contact_name) {
                const el = document.getElementById('recruiterName');
                if (el) el.textContent = profile.contact_name;
            }
            if (profile.company_id || profile.company_name) {
                const companyIdEl = document.getElementById('companyId');
                if (companyIdEl) companyIdEl.textContent = profile.company_id || profile.company_name;
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
        document.getElementById("job_title").value = job.title || "";
        document.getElementById("job_location").value = job.location || "";
        document.getElementById("job_type").value = job.job_type || "";
        document.getElementById("job_description").value = job.description || "";
        document.getElementById("requirements").value = job.requirements || "";

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

    const title = document.getElementById("job_title").value.trim();
    const location = document.getElementById("job_location").value.trim();
    const job_type = document.getElementById("job_type").value;
    const salary_range = document.getElementById("salary_range").value;
    const description = document.getElementById("job_description").value.trim();
    const requirements = document.getElementById("requirements").value.trim();

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
      title, location, job_type, salary_min, salary_max, description, requirements, status: 'active'
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
        await supabase.auth.signOut();
        window.location.href = CONFIG.PAGES.LOGIN;
    });
}