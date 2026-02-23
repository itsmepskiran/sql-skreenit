import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { window.location.href = CONFIG.PAGES.LOGIN; return; }
    
    // Safety check role
    if ((session.user.user_metadata?.role || '').toLowerCase() !== 'candidate') {
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER; return;
    }
    
    await updateSidebarProfile(session.user);
    loadProfile(session.user.id);
    setupNavigation();
}

async function updateSidebarProfile(user) {
    const nameEl = document.getElementById("userName");
    const designationEl = document.getElementById("userDesignation");
    const avatarEl = document.getElementById("userAvatar"); 

    if(nameEl) nameEl.textContent = user.user_metadata.full_name || user.email.split('@')[0];

    if(designationEl) {
        designationEl.textContent = "Fresher"; 
        try {
            const res = await backendGet('/applicant/profile');
            const json = await handleResponse(res);
            const profile = json.data || {};

            if (profile.experience && profile.experience.length > 0) {
                designationEl.textContent = profile.experience[0].title || "Fresher";
            }
        } catch (err) {
            // Silent fail
        }
    }

    if(avatarEl) {
        if (user.user_metadata.avatar_url) {
            avatarEl.innerHTML = `<img src="${user.user_metadata.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            const initials = (user.user_metadata.full_name || user.email).match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.innerHTML = text;
        }
    }
}

async function loadProfile(userId) {
    try {
        const res = await backendGet('/applicant/profile');
        const data = await handleResponse(res);
        const profile = data.data || {};

        // 1. Header Basic Info
        setText("viewName", profile.full_name || "Candidate");
        setText("viewEmail", profile.contact_email || profile.email || "-");
        setText("viewPhone", profile.phone || "-");
        setText("viewLocation", profile.location || "Location not set");

        // 2. Role / Experience Logic
        let roleText = "Fresher";
        if (profile.experience && profile.experience.length > 0) {
             const currentJob = profile.experience.find(e => (e.end_date || '').toLowerCase() === 'present');
             const latest = currentJob || profile.experience[0];
             if (latest) {
                 roleText = `${latest.title} at ${latest.company}`;
             }
        }
        setText("viewRole", roleText);

        // 3. Avatar Main Card
        const avatarEl = document.getElementById("viewAvatar");
        if (profile.avatar_url) {
            avatarEl.innerHTML = `<img src="${profile.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            const initials = (profile.full_name || "C").match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.textContent = text || "C";
        }

        // 4. Links
        const linkedin = document.getElementById("viewLinkedin");
        if(linkedin && profile.linkedin_url) {
             linkedin.innerHTML = `<a href="${profile.linkedin_url}" target="_blank" style="color:var(--primary-color); font-weight:600; text-decoration:none;"><i class="fab fa-linkedin" style="margin-right:8px;"></i> LinkedIn Profile</a>`;
        }

        const portfolio = document.getElementById("viewPortfolio");
        if(portfolio && profile.portfolio_url) {
             portfolio.innerHTML = `<a href="${profile.portfolio_url}" target="_blank" style="color:var(--primary-color); font-weight:600; text-decoration:none;"><i class="fas fa-globe" style="margin-right:8px;"></i> Portfolio Link</a>`;
        }

        // --- 5. RESUME LOGIC (TARGETING EXISTING HTML IDs) ---
        const resumeContainer = document.getElementById("resumeContainer");
        const noResumeContainer = document.getElementById("noResumeContainer");
        const fileNameEl = document.getElementById("resumeFileName");
        const viewBtn = document.getElementById("viewResumeBtn");
        const downloadBtn = document.getElementById("downloadResumeBtn");

        if (profile.resume_url) {
            // Show the card, hide the empty state
            if(resumeContainer) resumeContainer.style.display = 'flex';
            if(noResumeContainer) noResumeContainer.style.display = 'none';

            // Clean the filename
            const fileName = profile.resume_url.split('/').pop().replace(/^\d+_/, '');
            if(fileNameEl) fileNameEl.textContent = fileName;

            // Bind Secure On-the-Fly URL Generation Actions
            if(viewBtn) {
                viewBtn.removeAttribute('target');
                viewBtn.removeAttribute('download');
                viewBtn.href = "javascript:void(0);"; // Prevents default # jumping
                viewBtn.onclick = (e) => {
                    e.preventDefault();
                    window.handleResumeAction(profile.resume_url, 'view');
                };
            }
            if(downloadBtn) {
                downloadBtn.removeAttribute('target');
                downloadBtn.href = "javascript:void(0);"; // Prevents default # jumping
                downloadBtn.removeAttribute('download'); // Remove native HTML download attribute to prevent conflicts
                downloadBtn.onclick = (e) => {
                    e.preventDefault();
                    window.handleResumeAction(profile.resume_url, 'download');
                };
            }
        } else {
            // Hide the card, show the empty state
            if(resumeContainer) resumeContainer.style.display = 'none';
            if(noResumeContainer) noResumeContainer.style.display = 'block';
        }

        // 6. Experience List
        const expContainer = document.getElementById("viewExperienceList");
        if (expContainer) {
            if (profile.experience && profile.experience.length > 0) {
                expContainer.innerHTML = profile.experience.map(exp => `
                    <div class="list-group-item">
                        <span class="list-title">${exp.title}</span>
                        <span class="list-subtitle"><i class="fas fa-building me-1"></i> ${exp.company} &nbsp;|&nbsp; <i class="far fa-calendar-alt me-1"></i> ${exp.start_date || ''} - ${exp.end_date || 'Present'}</span>
                        <p style="margin-top:0.5rem; font-size:0.95rem; line-height:1.5; color:var(--text-light);">${exp.description || ''}</p>
                    </div>
                `).join("");
            } else {
                expContainer.innerHTML = '<div class="text-muted">No experience details added.</div>';
            }
        }

        // 7. Education List
        const eduContainer = document.getElementById("viewEducationList");
        if (eduContainer) {
            if (profile.education && profile.education.length > 0) {
                eduContainer.innerHTML = profile.education.map(edu => `
                    <div class="list-group-item">
                        <span class="list-title">${edu.degree}</span>
                        <span class="list-subtitle"><i class="fas fa-university me-1"></i> ${edu.institution} &nbsp;|&nbsp; Class of ${edu.completion_year}</span>
                    </div>
                `).join("");
            } else {
                eduContainer.innerHTML = '<div class="text-muted">No education details added.</div>';
            }
        }

        // 8. Skills
        const skillsContainer = document.getElementById("viewSkills");
        if (skillsContainer) {
            if (profile.skills && profile.skills.length > 0) {
                skillsContainer.innerHTML = profile.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join("");
            } else {
                skillsContainer.innerHTML = '<div class="text-muted">No skills added.</div>';
            }
        }

    } catch (err) {
        console.warn("Profile load error", err);
    }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
}

function setupNavigation() {
    const origin = window.location.origin;

    const editBtn = document.getElementById("editProfileBtn");
    if(editBtn) editBtn.addEventListener("click", () => {
        window.location.href = CONFIG.PAGES.APPLY_FORM;
    });

    const navDash = document.getElementById("navDashboard");
    if(navDash) navDash.addEventListener("click", () => {
        window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
    });

    const navApps = document.getElementById("navApplications");
    if(navApps) navApps.addEventListener("click", () => {
        window.location.href = CONFIG.PAGES.MY_APPLICATIONS; 
    });

    const logoutBtn = document.getElementById("logoutBtn");
    if(logoutBtn) logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = CONFIG.PAGES.LOGIN;
    });
}

// --- SECURE SIGNED URL GENERATOR ---
// --- SECURE SIGNED URL GENERATOR & SMART VIEWER ---
window.handleResumeAction = async function(path, action) {
    try {
        document.body.style.cursor = 'wait';
        
        // 1. Extract clean filename (e.g. "my_resume.pdf")
        const fileName = path.split('/').pop().replace(/^\d+_/, '');
        
        const options = action === 'download' ? { download: true } : {};
        const { data, error } = await supabase.storage.from('resumes').createSignedUrl(path, 3600, options);
        
        if (error) throw error;
        
        if (action === 'view') {
            const viewerModal = document.getElementById('resumeViewerModal');
            const iframe = document.getElementById('resumeIframe');
            const loading = document.getElementById('resumeLoading');
            const modalDlBtn = document.getElementById('modalDownloadBtn');
            const modalTitle = document.getElementById('resumeModalTitle'); // Grab the title element
            
            if (!viewerModal) {
                window.open(data.signedUrl, '_blank');
                return;
            }

            // 2. Set dynamic title!
            if (modalTitle) modalTitle.textContent = fileName;

            loading.style.display = 'block';
            iframe.src = '';
            viewerModal.classList.add('active');

            const isPdf = path.toLowerCase().endsWith('.pdf');
            let viewerUrl = data.signedUrl;
            
            if (!isPdf) {
                viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(data.signedUrl)}&embedded=true`;
            }
            
            iframe.src = viewerUrl;
            modalDlBtn.onclick = () => window.handleResumeAction(path, 'download');

        } else if (action === 'download') {
            window.location.href = data.signedUrl;
        }
    } catch (err) {
        console.error("Resume generation failed:", err);
        alert("Could not load secure resume link. " + err.message);
    } finally {
        document.body.style.cursor = 'default';
    }
};
document.addEventListener("DOMContentLoaded", checkAuth);