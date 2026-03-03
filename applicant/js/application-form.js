import { customAuth } from '@shared/js/auth-config.js';;
import { backendGet, backendPut, handleResponse } from '@shared/js/backend-client.js';
import { notify } from '@shared/js/auth-pages.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

// State
let currentStep = 1;
const totalSteps = 6;
let experienceCount = 0;
let educationCount = 0;
let skills = [];

// Define variables
let form, nextBtn, prevBtn, submitBtn, steps, sections, successModal, logoutBtn, goToDashboardBtn;
let resumeInput, skillInput, addSkillBtn, skillsContainer;
let addExpBtn, addEduBtn;
let profileImageInput, introVideoInput, removeVideoBtn;

// Video Recording State
let introVideoRecorder = null;
let introVideoChunks = [];
let introVideoStream = null;
let introVideoBlob = null;
let isRecordingIntro = false;
let introTimerInterval = null;
let introRecordingSeconds = 0;
let hasIntroVideoRecorded = false;

/* -------------------------------------------------------
   MAIN INITIALIZATION
------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    form = document.getElementById('applicationForm');
    nextBtn = document.getElementById('nextBtn');
    prevBtn = document.getElementById('prevBtn');
    submitBtn = document.getElementById('submitBtn');
    steps = document.querySelectorAll('.step-item'); 
    sections = document.querySelectorAll('.form-section');
    successModal = document.getElementById('successModal');
    logoutBtn = document.getElementById('logoutBtn');
    goToDashboardBtn = document.getElementById('goToDashboardBtn');
    
    resumeInput = document.getElementById('resumeFile');
    skillInput = document.getElementById('skillInput');
    addSkillBtn = document.getElementById('addSkillBtn');
    skillsContainer = document.getElementById('skillsContainer');
    addExpBtn = document.getElementById('addExperience');
    addEduBtn = document.getElementById('addEducation');
    profileImageInput = document.getElementById('profileImageFile');
    introVideoInput = document.getElementById('introVideoFile');
    removeVideoBtn = document.getElementById('removeVideoBtn');

    setupEventListeners();
    
    // ✅ NEW: Chain the auth check to load existing data
    checkAuth().then((isAuthenticated) => {
        if(isAuthenticated) {
            loadExistingProfile();
        }
    });
    
    updateUI();
});

/* -------------------------------------------------------
   AUTH & SIDEBAR
------------------------------------------------------- */
async function checkAuth() {
    const user = await customAuth.getUserData();
    console.log("🔐 Auth user data:", user);
    if (!user) { window.location.href = CONFIG.PAGES.LOGIN; return false; }
  
    if ((user.role || '').toLowerCase() !== 'candidate') {
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER; return false;
    }
  
    updateSidebarProfile(user);

    if(form) {
        const userMeta = user.user_metadata || {};
        console.log("📝 Setting form values:", { 
            full_name: user.full_name || userMeta.full_name,
            email: user.email || userMeta.email,
            phone: user.phone || userMeta.phone
        });
        setVal('full_name', user.full_name || userMeta.full_name || '');
        setVal('email', user.email || userMeta.email || '');
        setVal('phone', user.phone || userMeta.phone || '');
    }
    return true;
}

function updateSidebarProfile(user) {
    const nameEl = document.getElementById("userName");
    const avatarEl = document.getElementById("userAvatar"); 
    const userMeta = user.user_metadata || {};

    if(nameEl) nameEl.textContent = userMeta.full_name || user.full_name || (user.email ? user.email.split('@')[0] : 'User');
    
    if(avatarEl) {
        if (userMeta.avatar_url || user.avatar_url) {
            const avatarUrl = userMeta.avatar_url || user.avatar_url;
            avatarEl.innerHTML = `<img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
        } else {
            const nameForInitials = userMeta.full_name || user.full_name || user.email || '?';
            const initials = nameForInitials.match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.innerHTML = text; 
        }
    }
}

function setVal(name, val) {
    const el = document.querySelector(`[name="${name}"]`);
    if(el) el.value = val;
}

/* -------------------------------------------------------
   ✅ NEW: LOAD EXISTING PROFILE DATA
------------------------------------------------------- */
async function loadExistingProfile() {
    try {
        console.log("🔍 Fetching profile from /api/v1/applicant/profile...");
        const res = await backendGet('/applicant/profile');
        console.log("📡 Profile API response status:", res.status);
        
        const json = await handleResponse(res);
        console.log("✅ Profile data received:", json);
        
        const profile = json.data || {};
        console.log("📋 Profile object:", profile);

        // 1. Pre-fill Basic Info with debug logging
        console.log("📝 Pre-filling fields...");
        if(profile.full_name) {
            console.log("Setting full_name:", profile.full_name);
            setVal('full_name', profile.full_name);
        } else {
            console.warn("⚠️ full_name not in profile");
        }
        
        if(profile.email) {
            console.log("Setting email:", profile.email);
            setVal('email', profile.email);
        } else {
            console.warn("⚠️ email not in profile");
        }
        
        if(profile.phone) {
            console.log("Setting phone:", profile.phone);
            setVal('phone', profile.phone);
        } else {
            console.warn("⚠️ phone not in profile");
        }
        
        if(profile.location) {
            console.log("Setting location:", profile.location);
            setVal('location', profile.location);
        } else {
            console.warn("⚠️ location not in profile");
        }
        
        if(profile.bio || profile.summary) {
            console.log("Setting summary:", profile.bio || profile.summary);
            setVal('summary', profile.bio || profile.summary);
        }
        if(profile.linkedin_url) setVal('linkedin_url', profile.linkedin_url);
        if(profile.portfolio_url) setVal('portfolio_url', profile.portfolio_url);

        // 2. Pre-fill Skills
        if(profile.skills && profile.skills.length > 0) {
            skills = profile.skills;
            renderSkills();
        }

        // 3. Pre-fill Experience
        if(profile.experience && profile.experience.length > 0) {
            profile.experience.forEach(exp => addExperienceField(exp));
        } else {
            addExperienceField(); // Add one blank row by default
        }

        // 4. Pre-fill Education
        if(profile.education && profile.education.length > 0) {
            profile.education.forEach(edu => addEducationField(edu));
        } else {
            addEducationField(); // Add one blank row by default
        }

        // 5. Show Existing Resume status
        if(profile.resume_url) {
            // Extract a clean filename from the resume path
            const fileName = profile.resume_url.split('/').pop().replace(/^\d+_/, ''); 
            const resumeText = document.getElementById('resumeFileName');
            if(resumeText) {
                resumeText.innerHTML = `
                    <span class="text-success"><i class="fas fa-check-circle"></i> Existing Resume: ${fileName}</span> 
                    <br><small class="text-muted" style="font-weight:normal;">(Upload a new file to replace it)</small>
                `;
            }
        }
        
        // 6. Show Existing Profile Image
        if(profile.avatar_url) {
            const img = document.getElementById('profileImageTag');
            const initials = document.getElementById('avatarInitialsPreview');
            if(img) {
                img.src = profile.avatar_url;
                img.style.display = 'block';
            }
            if(initials) initials.style.display = 'none';
            document.getElementById('profileImageFileName').innerHTML = `<span class="text-success"><i class="fas fa-check-circle"></i> Profile photo uploaded</span>`;
        }
        
        // 7. Show Existing Introduction Video
        if(profile.intro_video_url) {
            // Show in accepted state since video already exists
            const introVideoAccepted = document.getElementById('introVideoAccepted');
            const introRecordingControls = document.getElementById('introRecordingControls');
            const introCameraFeed = document.getElementById('introCameraFeed');
            
            if(introVideoAccepted) introVideoAccepted.style.display = 'block';
            if(introRecordingControls) introRecordingControls.style.display = 'none';
            if(introCameraFeed) introCameraFeed.style.display = 'none';
            
            // Store the existing video URL for reference
            hasIntroVideoRecorded = true;
            
            // Update accepted state with message
            const acceptedVideoDuration = document.getElementById('acceptedVideoDuration');
            if(acceptedVideoDuration) acceptedVideoDuration.textContent = 'Existing video from profile';
            
            // Set a flag in the hidden input to indicate we have an existing video
            const blobInput = document.getElementById('introVideoRecordedBlob');
            if(blobInput) blobInput.value = 'existing';
        }

    } catch (err) {
        console.warn("No existing profile found or error fetching:", err);
        // Fallback for brand new users
        addExperienceField();
        addEducationField();
    }
}

/* -------------------------------------------------------
   UI & NAVIGATION
------------------------------------------------------- */
function updateUI() {
    if(steps) {
        steps.forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            if (stepNum === currentStep) { step.classList.add('active'); step.classList.remove('completed'); } 
            else if (stepNum < currentStep) { step.classList.add('completed'); step.classList.remove('active'); } 
            else { step.classList.remove('active', 'completed'); }
        });
    }
    if(sections) {
        sections.forEach(section => {
            if(section.id === `step${currentStep}`) section.classList.add('active');
            else section.classList.remove('active');
        });
    }
    if (prevBtn) prevBtn.style.visibility = (currentStep === 1) ? 'hidden' : 'visible';
  
    if (currentStep === totalSteps) {
        if(nextBtn) nextBtn.style.display = 'none';
        if(submitBtn) submitBtn.style.display = 'block';
    } else {
        if(nextBtn) nextBtn.style.display = 'block';
        if(submitBtn) submitBtn.style.display = 'none';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupEventListeners() {
    const origin = window.location.origin;

    if(nextBtn) nextBtn.addEventListener('click', () => { if (validateStep(currentStep)) { currentStep++; updateUI(); } });
    if(prevBtn) prevBtn.addEventListener('click', () => { if(currentStep > 1) { currentStep--; updateUI(); } });
    if(addExpBtn) addExpBtn.addEventListener('click', () => addExperienceField());
    if(addEduBtn) addEduBtn.addEventListener('click', () => addEducationField());
    if(addSkillBtn) addSkillBtn.addEventListener('click', () => addSkill(skillInput?.value.trim()));
    if(skillInput) skillInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput.value.trim()); } });
    
    if(resumeInput) {
        resumeInput.addEventListener('change', (e) => { 
            if (e.target.files[0]) {
                document.getElementById('resumeFileName').innerHTML = `<i class="fas fa-file-pdf"></i> ${e.target.files[0].name}`; 
            }
        });
    }
    
    // Profile Image Upload Handler
    if(profileImageInput) {
        profileImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file) {
                // Validate file size (max 2MB)
                if(file.size > 2 * 1024 * 1024) {
                    notify('Image size should be less than 2MB', 'error');
                    profileImageInput.value = '';
                    return;
                }
                
                // Show file name
                document.getElementById('profileImageFileName').textContent = file.name;
                
                // Preview image
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.getElementById('profileImageTag');
                    const initials = document.getElementById('avatarInitialsPreview');
                    if(img) {
                        img.src = e.target.result;
                        img.style.display = 'block';
                    }
                    if(initials) initials.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Introduction Video Recording Setup
    setupIntroVideoRecording();
    
    // Remove Video Button (legacy - kept for compatibility)
    if(removeVideoBtn) {
        removeVideoBtn.addEventListener('click', () => {
            introVideoInput.value = '';
            resetIntroVideoRecording();
        });
    }
    
    if(form) form.addEventListener('submit', handleFormSubmit);
    
    if(logoutBtn) logoutBtn.addEventListener('click', async () => { await customAuth.signOut(); window.location.href = CONFIG.PAGES.JOBS; });
    if(goToDashboardBtn) goToDashboardBtn.addEventListener('click', () => { window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE; });
    
    // Sidebar Navigation (ID-based for consistency)
    const navDashboard = document.getElementById('navDashboard');
    const navApplications = document.getElementById('navApplications');
    const navProfile = document.getElementById('navProfile');
    
    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_APPLICATIONS);
    if(navProfile) navProfile.addEventListener('click', () => window.location.href = CONFIG.PAGES.CANDIDATE_PROFILE);
}

function validateStep(step) {
    const currentSection = document.getElementById(`step${step}`);
    if(!currentSection) return true;
    const inputs = currentSection.querySelectorAll('input[required], textarea[required]');
    let isValid = true;
    inputs.forEach(input => {
        if (!input.value.trim()) { 
            isValid = false; 
            input.classList.add("input-error"); 
        } else { 
            input.classList.remove("input-error"); 
        }
    });
    
    // Special validation for video step (step 6)
    if(step === 6) {
        const introVideoInput = document.getElementById('introVideoFile');
        const hasExistingVideo = document.getElementById('introVideoAccepted')?.style.display === 'block';
        
        // Check if we have a newly recorded video or an existing one from profile
        const hasVideoFile = introVideoInput && introVideoInput.files && introVideoInput.files.length > 0;
        
        // Check for existing video from profile (shown in accepted state)
        const videoAcceptedDiv = document.getElementById('introVideoAccepted');
        const isVideoAccepted = videoAcceptedDiv && videoAcceptedDiv.style.display === 'block';
        
        if(!hasVideoFile && !isVideoAccepted) {
            isValid = false;
            notify('Please record and accept your introduction video before submitting.', 'error');
        }
    }
    
    if (!isValid && step !== 6) notify('Please fill in all required fields.', 'error');
    return isValid;
}

/* -------------------------------------------------------
   DYNAMIC CONTENT (Now accepts existing data)
------------------------------------------------------- */
function addExperienceField(data = {}) {
    experienceCount++;
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.innerHTML = `
        <div class="dynamic-item-header">
            <h4>Experience ${experienceCount}</h4>
            <button type="button" class="btn-remove"><i class="fas fa-trash"></i></button>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Title*</label><input type="text" name="exp_title_${experienceCount}" value="${data.title || data.job_title || ''}" required></div>
            <div class="form-group"><label>Company*</label><input type="text" name="exp_company_${experienceCount}" value="${data.company || ''}" required></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Start*</label><input type="date" name="exp_start_${experienceCount}" value="${data.start_date || ''}" required></div>
            <div class="form-group"><label>End</label><input type="date" name="exp_end_${experienceCount}" value="${data.end_date || ''}"></div>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea name="exp_desc_${experienceCount}">${data.description || ''}</textarea>
        </div>
    `;
    div.querySelector('.btn-remove').onclick = () => div.remove();
    document.getElementById('experienceContainer').appendChild(div);
}

function addEducationField(data = {}) {
    educationCount++;
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.innerHTML = `
        <div class="dynamic-item-header">
            <h4>Education ${educationCount}</h4>
            <button type="button" class="btn-remove"><i class="fas fa-trash"></i></button>
        </div>
        <div class="form-row-3">
            <div class="form-group"><label>Degree*</label><input type="text" name="edu_degree_${educationCount}" value="${data.degree || ''}" required></div>
            <div class="form-group"><label>Institution*</label><input type="text" name="edu_school_${educationCount}" value="${data.institution || ''}" required></div>
            <div class="form-group"><label>Year*</label><input type="number" name="edu_year_${educationCount}" value="${data.completion_year || ''}" required></div>
        </div>
    `;
    div.querySelector('.btn-remove').onclick = () => div.remove();
    document.getElementById('educationContainer').appendChild(div);
}

function addSkill(skill) {
    if (skill && !skills.includes(skill)) { skills.push(skill); renderSkills(); }
    if(skillInput) skillInput.value = '';
}

function renderSkills() {
    if(!skillsContainer) return;
    skillsContainer.innerHTML = skills.map(s => `
        <span class="skill-tag">
            ${s} <i class="fas fa-times" onclick="window.removeSkill('${s}')"></i>
        </span>
    `).join('');
}
window.removeSkill = (s) => { skills = skills.filter(k => k !== s); renderSkills(); };

function resetIntroVideoRecording() {
    introVideoBlob = null;
    introVideoChunks = [];
    hasIntroVideoRecorded = false;
    introVideoInput.value = '';
    
    const playback = document.getElementById('introPlaybackFeed');
    const camera = document.getElementById('introCameraFeed');
    
    if(playback) {
        playback.src = '';
        playback.style.display = 'none';
    }
    if(camera) camera.style.display = 'block';
    
    document.getElementById('introRecordingControls').style.display = 'flex';
    document.getElementById('introStopControls').style.display = 'none';
    document.getElementById('introReviewControls').style.display = 'none';
    document.getElementById('introVideoAccepted').style.display = 'none';
    document.getElementById('recordingIndicator').style.display = 'none';
    
    resetIntroTimer();
    
    // Re-initialize camera
    initIntroCamera();
}

function startIntroTimer() {
    introRecordingSeconds = 0;
    const display = document.getElementById('introTimerDisplay');
    if(display) display.textContent = '00:00';
    
    introTimerInterval = setInterval(() => {
        introRecordingSeconds++;
        const mins = Math.floor(introRecordingSeconds / 60).toString().padStart(2, '0');
        const secs = (introRecordingSeconds % 60).toString().padStart(2, '0');
        if(display) display.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopIntroTimer() {
    clearInterval(introTimerInterval);
}

function resetIntroTimer() {
    stopIntroTimer();
    introRecordingSeconds = 0;
    const display = document.getElementById('introTimerDisplay');
    if(display) display.textContent = '00:00';
}

/* -------------------------------------------------------
   SUBMISSION
------------------------------------------------------- */
async function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateStep(currentStep)) return;
    
    // ✅ NEW: Check if a resume already exists before failing validation
    const resumeTextElement = document.getElementById('resumeFileName');
    const hasExistingResume = resumeTextElement && resumeTextElement.innerText.includes('Existing Resume');
    
    if (resumeInput && !resumeInput.files[0] && !hasExistingResume) { 
        notify("Please upload your resume.", "error"); 
        return; 
    }

    submitBtn.disabled = true; submitBtn.textContent = "Submitting...";

    try {
        const fd = new FormData(form);
        
        // 1. Collect Experience
        let experience = [];
        document.querySelectorAll('#experienceContainer .dynamic-item').forEach(item => {
            const inputs = item.querySelectorAll('input, textarea');
            let exp = {};
            inputs.forEach(i => {
                if(i.name.includes('title')) exp.job_title = i.value;
                if(i.name.includes('company')) exp.company = i.value;
                if(i.name.includes('start')) exp.start_date = i.value;
                if(i.name.includes('end')) exp.end_date = i.value;
                if(i.name.includes('desc')) exp.description = i.value;
            });
            experience.push(exp);
        });

        // 2. Collect Education
        let education = [];
        document.querySelectorAll('#educationContainer .dynamic-item').forEach(item => {
            const inputs = item.querySelectorAll('input');
            let edu = {};
            inputs.forEach(i => {
                if(i.name.includes('degree')) edu.degree = i.value;
                if(i.name.includes('school')) edu.institution = i.value;
                if(i.name.includes('year')) edu.completion_year = i.value;
            });
            education.push(edu);
        });

        // 3. Build Payload
        const payload = new FormData();
        payload.append('full_name', fd.get('full_name'));
        payload.append('phone', fd.get('phone') || '');
        payload.append('location', fd.get('location') || '');
        payload.append('summary', fd.get('summary') || '');
        payload.append('linkedin_url', fd.get('linkedin_url') || '');
        payload.append('portfolio_url', fd.get('portfolio_url') || '');
        payload.append('skills', JSON.stringify(skills));
        payload.append('experience', JSON.stringify(experience));
        payload.append('education', JSON.stringify(education)); 
        
        // Only append the file if a new one was selected
        if(resumeInput.files[0]) {
            payload.append('resume', resumeInput.files[0]);
        }
        
        // Append profile image if selected
        if(profileImageInput && profileImageInput.files[0]) {
            payload.append('profile_image', profileImageInput.files[0]);
        }
        
        // Append introduction video if selected
        if(introVideoInput && introVideoInput.files[0]) {
            payload.append('intro_video', introVideoInput.files[0]);
        }

        const response = await backendPut('/applicant/profile', payload);
        await handleResponse(response);
        
        await customAuth.updateUser({ data: { onboarded: true } });

        if(successModal) successModal.classList.add('active');

    } catch (err) {
        notify("Submission failed: " + (err.message || "Unknown error"), "error");
        submitBtn.disabled = false; submitBtn.textContent = "Submit Application";
    }
}