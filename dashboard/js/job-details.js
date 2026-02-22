import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

// --- INITIALIZATION ---
const urlParams = new URLSearchParams(window.location.search);
const jobId = urlParams.get('job_id');

document.addEventListener("DOMContentLoaded", init);

async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }

    // Ensure Sidebar and Navigation is synced
    updateSidebarProfile(session.user);
    setupNavigation();

    if (!jobId || jobId === "null" || jobId === "undefined") { 
        alert("Invalid Job Link. Returning to Dashboard."); 
        window.location.href = "candidate-dashboard.html"; 
        return; 
    }

    try {
        // 1. Get Job Details
        const res = await backendGet(`/dashboard/jobs/${jobId}`);
        const json = await handleResponse(res);
        
        // Handle varying backend response structures
        const jobData = json.data || json;
        if(!jobData) throw new Error("API returned no data");
        
        renderJob(jobData);

        // 2. Check Application Status
        try {
            const statusRes = await backendGet(`/applicant/check-status?job_id=${jobId}`);
            const statusJson = await handleResponse(statusRes);
            
            if (statusJson.applied) {
                markAsApplied();
            } else {
                const btn = document.getElementById("applyBtn");
                if(btn) {
                    btn.onclick = apply;
                    btn.disabled = false;
                }
            }
        } catch(statErr) {
            console.warn("Status check failed (Candidate has likely not applied yet).");
            const btn = document.getElementById("applyBtn");
            if(btn) {
                btn.onclick = apply;
                btn.disabled = false;
            }
        }

    } catch (err) {
        console.error("Critical Error:", err);
        document.querySelector(".dashboard-content").innerHTML = `
            <div class="card w-100 text-center py-5 mt-4">
                <div class="card-body">
                    <i class="fas fa-exclamation-triangle text-danger" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3 class="text-dark fw-bold">Job Not Found</h3>
                    <p class="text-muted">Could not load job details. (ID: ${jobId})</p>
                    <p class="small text-muted mb-4">Error: ${err.message}</p>
                    <button onclick="window.history.back()" class="btn btn-primary px-4 py-2">Return to Dashboard</button>
                </div>
            </div>`;
    }
}

// --- RENDER LOGIC ---
function renderJob(job) {
    setText("jobTitle", job.title);
    setText("companyName", job.company_name || "Hiring Company");
    
    // Fill the clean metadata spans (Icons are already in the HTML now)
    setText("jobLocation", job.location || 'Remote');
    setText("jobType", job.job_type || 'Full Time');
    setText("postedDate", new Date(job.created_at).toLocaleDateString());
    
    // Optional: Format Salary if your backend sends it, otherwise hide it
    if (job.salary) {
        setText("salaryRange", job.salary);
    } else {
        setText("salaryRange", "Not Specified");
    }
    
    // Description (Convert newlines to HTML breaks)
    const desc = document.getElementById("jobDescription");
    if(desc) desc.innerHTML = (job.description || "No description provided.").replace(/\n/g, "<br>");
    
    // Requirements (Convert newlines to HTML breaks)
    const req = document.getElementById("jobRequirements");
    if(req) req.innerHTML = (job.requirements || "No specific requirements listed.").replace(/\n/g, "<br>");
}

// --- APPLY LOGIC ---
async function apply() {
    const btn = document.getElementById("applyBtn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Sending...';
    
    try {
        await backendPost('/applicant/apply', { job_id: jobId });
        
        // Show a brief success state before marking as applied
        btn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Success!';
        btn.style.backgroundColor = "#10b981"; // Emerald Green
        
        setTimeout(() => {
            markAsApplied();
        }, 1500);

    } catch (err) {
        alert("Application Failed: " + err.message);
        btn.disabled = false;
        btn.innerHTML = 'Apply Now <i class="fas fa-paper-plane"></i>';
    }
}

function markAsApplied() {
    const btn = document.getElementById("applyBtn");
    if(btn) {
        btn.innerHTML = 'Already Applied <i class="fas fa-check"></i>';
        // We use inline styles here just for the immediate state override
        btn.style.backgroundColor = "#e2e8f0"; 
        btn.style.color = "#475569";
        btn.style.boxShadow = "none";
        btn.style.cursor = "not-allowed";
        btn.disabled = true;
    }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = val || "";
}

// --- SIDEBAR PROFILE & NAVIGATION ---
async function updateSidebarProfile(user) {
    const roleEl = (user.user_metadata?.role || '').toLowerCase();
    
    const nameEl = document.getElementById("userName"); // Candidate ID
    const designationEl = document.getElementById("userDesignation"); // Candidate ID
    const avatarEl = document.getElementById("userAvatar"); 
    
    const recNameEl = document.getElementById("recruiterName"); // Recruiter ID
    const companyIdEl = document.getElementById("companyId"); // Recruiter ID

    if (roleEl === 'recruiter') {
        // 1. Update Recruiter Specific Elements
        if (recNameEl) recNameEl.textContent = user.user_metadata.full_name || 'Recruiter';
        if (companyIdEl) companyIdEl.textContent = 'Loading...'; // Let updateUserInfo handle the rest
        
        // 2. Fetch Recruiter Data to fill Company ID
        try {
            const res = await backendGet('/recruiter/profile');
            const json = await handleResponse(res);
            const profile = json.data || json || {};
            if (companyIdEl && (profile.company_id || profile.company_name)) {
                companyIdEl.textContent = profile.company_id || profile.company_name;
            }
        } catch(err) {
            if (companyIdEl) companyIdEl.textContent = '---';
        }
        
    } else if (roleEl === 'candidate') {
        // 1. Update Candidate Specific Elements
        if (nameEl) nameEl.textContent = user.user_metadata.full_name || 'Candidate';
        if (designationEl) designationEl.textContent = "Candidate"; // Fallback
        
        // 2. Fetch Candidate Profile Data
        try {
            const res = await backendGet('/applicant/profile');
            const json = await handleResponse(res);
            const profile = json.data || {};
            
            if (designationEl) {
                if (profile.experience && profile.experience.length > 0) {
                    designationEl.textContent = profile.experience[0].position || profile.experience[0].job_title || "Professional";
                } else if (profile.job_title) {
                    designationEl.textContent = profile.job_title;
                } else {
                    designationEl.textContent = "Fresher"; 
                }
            }
        } catch (err) {
            // Silent fail, fallback "Candidate" remains
        }
    }

    if(avatarEl) {
        if (user.user_metadata.avatar_url) {
            avatarEl.innerHTML = `<img src="${user.user_metadata.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
        } else {
            const initials = (user.user_metadata.full_name || user.email).match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.innerHTML = text; 
        }
    }
}

function setupNavigation() {
    const navDashboard = document.getElementById("navDashboard");
    const navProfile = document.getElementById("navProfile");
    const navApplications = document.getElementById("navApplications"); 
    const logoutBtn = document.getElementById("logoutBtn");

    if (navDashboard) navDashboard.onclick = () => window.location.href = "candidate-dashboard.html";
    if (navProfile) navProfile.onclick = () => window.location.href = "../applicant/candidate-profile.html";
    if (navApplications) navApplications.onclick = () => window.location.href = "../applicant/my-applications.html";

    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await supabase.auth.signOut();
            window.location.href = CONFIG.PAGES.LOGIN;
        };
    }
}