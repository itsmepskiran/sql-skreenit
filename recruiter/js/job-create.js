import { customAuth } from '@shared/js/auth-config.js';;
import { backendPost, backendGet, handleResponse } from '@shared/js/backend-client.js';
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
    
    const form = document.getElementById("createJobForm");
    if(form) form.addEventListener("submit", handleJobCreate);
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

    // Show something immediately, then refresh from backend profile
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
            // Ensure sidebar and footer show latest profile values
            const user = await customAuth.getUserData();
            updateSidebarProfile(profile, user);

            const companyIdEl = document.getElementById('companyId');
            if (companyIdEl) {
                const displayId = profile.company_display_id || profile.company_id || profile.company_name;
                companyIdEl.textContent = displayId || 'Pending';
            }
        }
    } catch (error) { /* Silent fail */ }
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
  
    const job_title = document.getElementById("job_title").value.trim();
    const location = document.getElementById("job_location").value.trim();
    const job_type = document.getElementById("job_type").value;
    const salary_range = document.getElementById("salary_range").value; 
    const description = document.getElementById("job_description").value.trim();
    const requirements = document.getElementById("requirements").value.trim();
    const education_qualification = document.getElementById("education_qualification").value;
    const work_location_preference = document.getElementById("work_location_preference").value;

    const payload = {
      job_title, location, job_type, description, requirements,
      education_qualification, work_location_preference,
      currency: "INR", status: "active" 
    };

    if (salary_range) {
        const parts = salary_range.split('-').map(s => s.trim());
        if(parts.length >= 2) {
             payload.salary_min = parseInt(parts[0]) || null;
             payload.salary_max = parseInt(parts[1]) || null;
             if (payload.salary_max === 0) payload.salary_max = null; 
        }
    }

    const response = await backendPost('/recruiter/jobs', payload);
    
    // Log response details for debugging
    console.log('Job creation response status:', response.status);
    console.log('Job creation response ok:', response.ok);

    const result = await handleResponse(response);

    if (result.error) {
      throw new Error(result.error.message || 'Failed to create job');
    }

    console.log('Job creation response:', response);

    // ✅ ROBUST SEARCH FOR ID
    const findId = (obj) => {
        if (!obj || typeof obj !== 'object') return null;
        if (obj.id) return obj.id;
        if (obj.job_id) return obj.job_id;
        for (let key in obj) {
            const found = findId(obj[key]);
            if (found) return found;
        }
        return null;
    };

    const jobId = findId(result);

    if(!jobId) {
        console.error("Debug Response:", result);
        throw new Error("Job published, but ID was not found in the response.");
    }

    submitBtn.innerHTML = '<i class="fas fa-check"></i> Published!';
    submitBtn.style.backgroundColor = '#10b981';
    
    const jobUrl = `${CONFIG.PAGES.JOB_DETAILS}?job_id=${jobId}`;
    generateJobQR(jobUrl, job_title);

  } catch (error) {
    console.error("Job create failed:", error);
    alert(`Error: ${error.message || 'Failed to create Job'}`);
    if(submitBtn) { 
        submitBtn.disabled = false; 
        submitBtn.innerHTML = originalText; 
    }
  } 
}

async function generateJobQR(url, job_title) {
    const modal = document.getElementById('shareJobModal');
    const qrContainer = document.getElementById('qrcode');
    if (!modal || !qrContainer) return;

    qrContainer.innerHTML = ""; 

    try {
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, url, {
            width: 200, margin: 2,
            color: { dark: '#1e293b', light: '#ffffff' }
        });
        qrContainer.appendChild(canvas);

        document.getElementById('shareJobTitle').textContent =  job_title;
        document.getElementById('copyLinkInput').value = url;

        modal.classList.add('active');
        modal.style.display = 'flex'; 

        // Set up interactions
        document.getElementById('modalXClose').onclick = () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
        document.getElementById('backToDashBtn').onclick = () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;

        document.getElementById('copyLinkBtn').onclick = () => {
            navigator.clipboard.writeText(url);
            alert("Link copied!");
        };

        document.getElementById('downloadQRBtn').onclick = () => {
            const link = document.createElement('a');
            link.download = `Skreenit_QR_${job_title.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        };

    } catch (err) { console.error("QR Generation failed:", err); }
}

function setupNavigation() {
    const navDashboard = document.getElementById('navDashboard');
    const navJobs = document.getElementById('navJobs');
    const navApplications = document.getElementById('navApplications');
    const navProfile = document.getElementById('navProfile');
    const logoutBtn = document.getElementById('logoutBtn');
    const backBtn = document.getElementById("backBtn");

    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    if(navJobs) navJobs.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    if(navProfile) navProfile.addEventListener('click', () => window.location.href = CONFIG.PAGES.RECRUITER_PROFILE);
    
    if(backBtn) {
        backBtn.addEventListener("click", () => {
            if (confirm("Changes made will be lost. Are you sure you want to leave?")) {
                window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
            }
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await customAuth.signOut();
            window.location.href = CONFIG.PAGES.JOBS;
        });
    }
}