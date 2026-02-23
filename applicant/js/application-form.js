import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, backendPut, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

// State
let currentStep = 1;
const totalSteps = 5;
let experienceCount = 0;
let educationCount = 0;
let skills = [];

// Define variables
let form, nextBtn, prevBtn, submitBtn, steps, sections, successModal, logoutBtn, goToDashboardBtn;
let resumeInput, skillInput, addSkillBtn, skillsContainer;
let addExpBtn, addEduBtn;

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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) { window.location.href = CONFIG.PAGES.LOGIN; return false; }
  
    const user = session.user;
    if ((user.user_metadata?.role || '').toLowerCase() !== 'candidate') {
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER; return false;
    }
  
    updateSidebarProfile(user);

    if(form) {
        setVal('full_name', user.user_metadata.full_name || '');
        setVal('email', user.email || '');
    }
    return true;
}

function updateSidebarProfile(user) {
    const nameEl = document.getElementById("userName");
    const avatarEl = document.getElementById("userAvatar"); 

    if(nameEl) nameEl.textContent = user.user_metadata.full_name || user.email.split('@')[0];
    
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

function setVal(name, val) {
    const el = document.querySelector(`[name="${name}"]`);
    if(el) el.value = val;
}

/* -------------------------------------------------------
   ✅ NEW: LOAD EXISTING PROFILE DATA
------------------------------------------------------- */
async function loadExistingProfile() {
    try {
        const res = await backendGet('/applicant/profile');
        const json = await handleResponse(res);
        const profile = json.data || {};

        // 1. Pre-fill Basic Info
        if(profile.phone) setVal('phone', profile.phone);
        if(profile.location) setVal('location', profile.location);
        if(profile.bio) setVal('summary', profile.bio);
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
            // Extract a clean filename from the Supabase path
            const fileName = profile.resume_url.split('/').pop().replace(/^\d+_/, ''); 
            const resumeText = document.getElementById('resumeFileName');
            if(resumeText) {
                resumeText.innerHTML = `
                    <span class="text-success"><i class="fas fa-check-circle"></i> Existing Resume: ${fileName}</span> 
                    <br><small class="text-muted" style="font-weight:normal;">(Upload a new file to replace it)</small>
                `;
            }
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
    
    if(form) form.addEventListener('submit', handleFormSubmit);
    
    if(logoutBtn) logoutBtn.addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = CONFIG.PAGES.LOGIN; });
    if(goToDashboardBtn) goToDashboardBtn.addEventListener('click', () => { window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE; });
    
    document.querySelectorAll('.nav-item').forEach(item => { 
        item.addEventListener('click', () => { 
            const text = item.textContent.trim().toLowerCase();
            if(text.includes('dashboard')) window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE; 
            if(text.includes('applications')) window.location.href = CONFIG.PAGES.MY_APPLICATIONS; 
            if(text.includes('profile')) window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE; 
        }); 
    });
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
    if (!isValid) alert('Please fill in all required fields.');
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
        alert("Please upload your resume."); 
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
                if(i.name.includes('title')) exp.title = i.value;
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

        const response = await backendPut('/applicant/profile', payload);
        await handleResponse(response);
        
        await supabase.auth.updateUser({ data: { onboarded: true } });

        if(successModal) successModal.classList.add('active');

    } catch (err) {
        console.error(err); alert(`Submission failed: ${err.message}`);
        submitBtn.disabled = false; submitBtn.textContent = "Submit Application";
    }
}