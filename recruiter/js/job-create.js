import { supabase } from '@shared/js/supabase-config.js';
import { backendPost, backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

document.addEventListener("DOMContentLoaded", async () => {
    await checkAuth();
    setupNavigation();

    const form = document.getElementById("createJobForm");
    if(form) form.addEventListener("submit", handleJobCreate);
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

async function handleJobCreate(event) {
  event.preventDefault();
  const submitBtn = event.target.querySelector("button[type='submit']");
  const originalText = submitBtn ? submitBtn.innerHTML : "Publish Job";
  
  try {
    if(submitBtn) { 
        submitBtn.disabled = true; 
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Publishing...'; 
    }
  
    const title = document.getElementById("job_title").value.trim();
    const location = document.getElementById("job_location").value.trim();
    const job_type = document.getElementById("job_type").value;
    const salary_range = document.getElementById("salary_range").value; 
    const description = document.getElementById("job_description").value.trim();
    const requirements = document.getElementById("requirements").value.trim();

    if (!title || !location || !job_type || !description || !requirements) {
      throw new Error("Please fill out all required fields.");
    }
    
    let salary_min = null;
    let salary_max = null;

    if (salary_range) {
        const parts = salary_range.split('-').map(s => s.trim());
        if(parts.length >= 2) {
             const min = parseInt(parts[0]);
             const max = parseInt(parts[1]);
             if (!isNaN(min)) salary_min = min;
             if (!isNaN(max)) salary_max = max;
             if (salary_max === 0) salary_max = null; 
        }
    }

    const payload = {
      title, location, job_type, salary_min, salary_max, description, requirements,
      currency: "INR", status: "active" 
    };

    const response = await backendPost('/recruiter/jobs', payload);
    await handleResponse(response);

    submitBtn.innerHTML = '<i class="fas fa-check"></i> Published!';
    submitBtn.style.backgroundColor = '#10b981';
    
    setTimeout(() => {
        window.location.href = `${window.location.origin}/dashboard/recruiter-dashboard.html`;
    }, 1000);

  } catch (error) {
    console.error("Job create failed:", error);
    alert(`Error: ${error.message || 'Failed to create Job'}`);
    if(submitBtn) { 
        submitBtn.disabled = false; 
        submitBtn.innerHTML = originalText; 
    }
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