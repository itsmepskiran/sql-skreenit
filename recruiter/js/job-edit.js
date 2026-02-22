import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, backendPut, backendDelete, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

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
    } catch (error) { 
        // Silent fail
    }
}

function getJobId() { return new URLSearchParams(window.location.search).get("job_id"); }

async function initJobEditForm() {
  const jobId = getJobId();
  if (!jobId) { 
      alert("No Job ID found."); 
      window.location.href = `${window.location.origin}/dashboard/recruiter-dashboard.html`; 
      return; 
  }

  try {
    const res = await backendGet(`/recruiter/jobs/${jobId}`);
    const data = await handleResponse(res);
    const job = data.data || data; 

    if (job) {
        document.getElementById("job_title").value = job.title || "";
        document.getElementById("job_location").value = job.location || "";
        if(job.job_type) document.getElementById("job_type").value = job.job_type.toLowerCase();

        let salaryStr = "";
        if (job.salary_min !== null) {
            salaryStr = `${job.salary_min}`;
            if (job.salary_max !== null) salaryStr += ` - ${job.salary_max}`;
        }
        document.getElementById("salary_range").value = salaryStr;
        document.getElementById("job_description").value = job.description || "";
        document.getElementById("requirements").value = job.requirements || "";
    }
  } catch (err) { 
      console.error("Error loading job:", err); 
      alert("Could not load job details."); 
  }

  const form = document.getElementById("editJobForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const salaryInput = document.getElementById("salary_range").value.trim();
    let salary_min = null;
    let salary_max = null;

    if (salaryInput) {
        const parts = salaryInput.split('-').map(s => s.trim());
        if(parts.length >= 2) {
             const min = parseInt(parts[0]); const max = parseInt(parts[1]);
             if (!isNaN(min)) salary_min = min; if (!isNaN(max)) salary_max = max;
             if (salary_max === 0) salary_max = null; 
        } else if (parts.length === 1 && !isNaN(parseInt(parts[0]))) { 
            salary_min = parseInt(parts[0]); 
        }
    }

    const payload = {
      title: document.getElementById("job_title").value.trim(),
      location: document.getElementById("job_location").value.trim(),
      job_type: document.getElementById("job_type").value,
      salary_min, salary_max,
      description: document.getElementById("job_description").value.trim(),
      requirements: document.getElementById("requirements").value.trim()
    };

    const btn = form.querySelector("button[type='submit']");
    const originalText = btn.innerHTML; 
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Updating...'; 
    btn.disabled = true;

    try {
        const res = await backendPut(`/recruiter/jobs/${jobId}`, payload);
        await handleResponse(res);
        
        btn.innerHTML = '<i class="fas fa-check"></i> Updated!';
        btn.style.backgroundColor = '#10b981';
        btn.style.borderColor = '#10b981';

        setTimeout(() => {
            window.location.href = `${window.location.origin}/dashboard/recruiter-dashboard.html`;
        }, 1000);

    } catch (err) { 
        alert(`Update failed: ${err.message}`); 
        btn.innerHTML = originalText; 
        btn.disabled = false;
    } 
  });

  const deleteBtn = document.getElementById("deleteJobBtn");
  if(deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if(!confirm("Are you sure? This cannot be undone.")) return;
        
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            const res = await backendDelete(`/recruiter/jobs/${jobId}`);
            await handleResponse(res);
            window.location.href = `${window.location.origin}/dashboard/recruiter-dashboard.html`;
        } catch(err) { 
            alert(`Delete failed: ${err.message}`); 
            deleteBtn.innerHTML = originalText;
        }
      });
  }
}

function setupNavigation() {
    const origin = window.location.origin;

    const navDashboard = document.getElementById('navDashboard');
    const navJobs = document.getElementById('navJobs');
    const navApplications = document.getElementById('navApplications');
    const navProfile = document.getElementById('navProfile');
    const logoutBtn = document.getElementById('logoutBtn');
    const backBtn = document.getElementById("backBtn");

    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = `${origin}/dashboard/recruiter-dashboard.html`);
    if(navJobs) navJobs.addEventListener('click', () => window.location.href = `${origin}/dashboard/my-jobs.html`);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = `${origin}/dashboard/application-list.html`);
    if(navProfile) navProfile.addEventListener('click', () => window.location.href = `${origin}/recruiter/recruiter-profile.html`);
    
    if(backBtn) {
        backBtn.addEventListener("click", () => {
            if (confirm("Changes made will be lost. Are you sure you want to leave?")) {
                window.location.href = `${origin}/dashboard/recruiter-dashboard.html`;
            }
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await supabase.auth.signOut();
            window.location.href = CONFIG.PAGES.LOGIN;
        });
    }
}