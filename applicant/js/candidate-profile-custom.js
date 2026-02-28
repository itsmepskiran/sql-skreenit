import { customAuth } from '@shared/js/auth-config.js';
import { backendPost, backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

async function checkAuth() {
    const { data: { session } } = await customAuth.getSession();
    if (!session?.user) { window.location.href = CONFIG.PAGES.LOGIN; return; }
    
    // Safety check role
    if ((session.user.role || '').toLowerCase() !== 'candidate') {
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

    if(nameEl) nameEl.textContent = user.full_name || user.email.split('@')[0];

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
        if (user.avatar_url) {
            avatarEl.innerHTML = `<img src="${user.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            const initials = (user.full_name || user.email).match(/\b\w/g) || [];
            avatarEl.innerHTML = `
                <div style="width:60px; height:60px; border-radius:50%; background:#6366f1; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:18px;">
                    ${initials ? initials[0] + (initials[1] || '') : 'U'}
                </div>
            `;
        }
    }
}

async function loadProfile(userId) {
    try {
        const res = await backendGet('/applicant/profile');
        const profile = await handleResponse(res);
        
        if (profile.data) {
            populateForm(profile.data);
            setupVideoUpload(userId);
            setupResumeDownload(profile.data);
        }
    } catch (err) {
        console.error('Failed to load profile:', err);
    }
}

function populateForm(profile) {
    // Basic info
    if (profile.full_name) document.getElementById('fullName').value = profile.full_name;
    if (profile.phone) document.getElementById('phone').value = profile.phone;
    if (profile.location) document.getElementById('location').value = profile.location;
    if (profile.linkedin_url) document.getElementById('linkedin').value = profile.linkedin_url;
    if (profile.github_url) document.getElementById('github').value = profile.github_url;
    if (profile.portfolio_url) document.getElementById('portfolio').value = profile.portfolio_url;

    // Education
    if (profile.education && profile.education.length > 0) {
        const educationContainer = document.getElementById('educationContainer');
        educationContainer.innerHTML = '';
        
        profile.education.forEach((edu, index) => {
            const eduDiv = document.createElement('div');
            eduDiv.className = 'education-item mb-3';
            eduDiv.innerHTML = `
                <div class="row">
                    <div class="col-md-3">
                        <input type="text" class="form-control" placeholder="Institution" value="${edu.institution || ''}" data-index="${index}" data-field="institution">
                    </div>
                    <div class="col-md-3">
                        <input type="text" class="form-control" placeholder="Degree" value="${edu.degree || ''}" data-index="${index}" data-field="degree">
                    </div>
                    <div class="col-md-3">
                        <input type="text" class="form-control" placeholder="Field of Study" value="${edu.field_of_study || ''}" data-index="${index}" data-field="field_of_study">
                    </div>
                    <div class="col-md-2">
                        <input type="date" class="form-control" placeholder="Start Date" value="${edu.start_date || ''}" data-index="${index}" data-field="start_date">
                    </div>
                    <div class="col-md-2">
                        <input type="date" class="form-control" placeholder="End Date" value="${edu.end_date || ''}" data-index="${index}" data-field="end_date">
                    </div>
                    <div class="col-md-1">
                        <button type="button" class="btn btn-danger btn-sm" onclick="removeEducation(${index})">Remove</button>
                    </div>
                </div>
            `;
            educationContainer.appendChild(eduDiv);
        });
    }

    // Experience
    if (profile.experience && profile.experience.length > 0) {
        const experienceContainer = document.getElementById('experienceContainer');
        experienceContainer.innerHTML = '';
        
        profile.experience.forEach((exp, index) => {
            const expDiv = document.createElement('div');
            expDiv.className = 'experience-item mb-3';
            expDiv.innerHTML = `
                <div class="row">
                    <div class="col-md-3">
                        <input type="text" class="form-control" placeholder="Company" value="${exp.company || ''}" data-index="${index}" data-field="company">
                    </div>
                    <div class="col-md-3">
                        <input type="text" class="form-control" placeholder="Position" value="${exp.position || ''}" data-index="${index}" data-field="position">
                    </div>
                    <div class="col-md-2">
                        <input type="date" class="form-control" placeholder="Start Date" value="${exp.start_date || ''}" data-index="${index}" data-field="start_date">
                    </div>
                    <div class="col-md-2">
                        <input type="date" class="form-control" placeholder="End Date" value="${exp.end_date || ''}" data-index="${index}" data-field="end_date">
                    </div>
                    <div class="col-md-2">
                        <textarea class="form-control" placeholder="Description" rows="3" data-index="${index}" data-field="description">${exp.description || ''}</textarea>
                    </div>
                    <div class="col-md-1">
                        <button type="button" class="btn btn-danger btn-sm" onclick="removeExperience(${index})">Remove</button>
                    </div>
                </div>
            `;
            experienceContainer.appendChild(expDiv);
        });
    }

    // Skills
    if (profile.skills && profile.skills.length > 0) {
        const skillsContainer = document.getElementById('skillsContainer');
        skillsContainer.innerHTML = '';
        
        profile.skills.forEach((skill, index) => {
            const skillDiv = document.createElement('div');
            skillDiv.className = 'skill-item d-inline-block mb-2';
            skillDiv.innerHTML = `
                <span class="badge bg-primary text-white me-2">${skill}</span>
                <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeSkill(${index})">×</button>
            `;
            skillsContainer.appendChild(skillDiv);
        });
    }
}

function setupVideoUpload(userId) {
    const videoInput = document.getElementById('introVideo');
    const uploadBtn = document.getElementById('uploadVideoBtn');
    const progressBar = document.getElementById('videoProgress');
    const progressText = document.getElementById('progressText');

    if (!videoInput || !uploadBtn) return;

    uploadBtn.addEventListener('click', async () => {
        const file = videoInput.files[0];
        if (!file) {
            alert('Please select a video file');
            return;
        }

        // Validate file
        if (!file.type.startsWith('video/')) {
            alert('Please select a valid video file');
            return;
        }

        if (file.size > 100 * 1024 * 1024) { // 100MB limit
            alert('Video file must be less than 100MB');
            return;
        }

        try {
            updateVideoProgress(10, 'Preparing upload...');
            
            const formData = new FormData();
            formData.append('video_file', file);
            formData.append('candidate_id', userId);

            const response = await backendPost('/applicant/upload-intro-video', formData);
            const result = await handleResponse(response);

            if (result.data && result.data.video_url) {
                updateVideoProgress(100, 'Video uploaded successfully!');
                
                // Update profile with new video URL
                await backendPost('/applicant/update-profile', {
                    intro_video_url: result.data.video_url
                });
                
                // Reload profile after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                throw new Error(result.error || 'Upload failed');
            }

        } catch (err) {
            updateVideoProgress(0, '');
            alert('Video upload failed: ' + err.message);
        }
    });
}

function setupResumeDownload(profile) {
    const downloadBtn = document.getElementById('downloadResumeBtn');
    if (!downloadBtn || !profile.resume_url) return;

    downloadBtn.addEventListener('click', async () => {
        try {
            // Get signed URL from backend
            const response = await backendGet(`/applicant/resume-url?path=${encodeURIComponent(profile.resume_url)}`);
            const result = await handleResponse(response);
            
            if (result.data && result.data.signed_url) {
                // Create temporary link and trigger download
                const link = document.createElement('a');
                link.href = result.data.signed_url;
                link.download = 'resume.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert('Resume download failed');
            }
        } catch (err) {
            alert('Failed to download resume: ' + err.message);
        }
    });
}

function updateVideoProgress(percent, text) {
    const progressBar = document.getElementById('videoProgress');
    const progressText = document.getElementById('progressText');
    
    if (progressBar) {
        progressBar.style.width = percent + '%';
        progressBar.setAttribute('aria-valuenow', percent);
    }
    
    if (progressText) {
        progressText.textContent = text;
    }
}

function addEducation() {
    const educationContainer = document.getElementById('educationContainer');
    const newEdu = document.createElement('div');
    newEdu.className = 'education-item mb-3';
    newEdu.innerHTML = `
        <div class="row">
            <div class="col-md-3">
                <input type="text" class="form-control" placeholder="Institution" data-index="0" data-field="institution">
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control" placeholder="Degree" data-index="0" data-field="degree">
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control" placeholder="Field of Study" data-index="0" data-field="field_of_study">
            </div>
            <div class="col-md-2">
                <input type="date" class="form-control" placeholder="Start Date" data-index="0" data-field="start_date">
            </div>
            <div class="col-md-2">
                <input type="date" class="form-control" placeholder="End Date" data-index="0" data-field="end_date">
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-success btn-sm" onclick="saveEducation(0)">Add</button>
                <button type="button" class="btn btn-danger btn-sm" onclick="removeEducation(0)">Remove</button>
            </div>
        </div>
    `;
    educationContainer.appendChild(newEdu);
}

function addExperience() {
    const experienceContainer = document.getElementById('experienceContainer');
    const newExp = document.createElement('div');
    newExp.className = 'experience-item mb-3';
    newExp.innerHTML = `
        <div class="row">
            <div class="col-md-3">
                <input type="text" class="form-control" placeholder="Company" data-index="0" data-field="company">
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control" placeholder="Position" data-index="0" data-field="position">
            </div>
            <div class="col-md-2">
                <input type="date" class="form-control" placeholder="Start Date" data-index="0" data-field="start_date">
            </div>
            <div class="col-md-2">
                <input type="date" class="form-control" placeholder="End Date" data-index="0" data-field="end_date">
            </div>
            <div class="col-md-2">
                <textarea class="form-control" placeholder="Description" rows="3" data-index="0" data-field="description"></textarea>
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-success btn-sm" onclick="saveExperience(0)">Add</button>
                <button type="button" class="btn btn-danger btn-sm" onclick="removeExperience(0)">Remove</button>
            </div>
        </div>
    `;
    experienceContainer.appendChild(newExp);
}

function addSkill() {
    const skillsInput = document.getElementById('skillsInput');
    const skillsContainer = document.getElementById('skillsContainer');
    
    if (!skillsInput.value.trim()) return;
    
    const newSkill = document.createElement('div');
    newSkill.className = 'skill-item d-inline-block mb-2';
    newSkill.innerHTML = `
        <span class="badge bg-primary text-white me-2">${skillsInput.value}</span>
        <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeSkill(${skillsContainer.children.length})">×</button>
    `;
    skillsContainer.appendChild(newSkill);
    skillsInput.value = '';
}

function removeEducation(index) {
    const educationContainer = document.getElementById('educationContainer');
    if (educationContainer.children[index]) {
        educationContainer.removeChild(educationContainer.children[index]);
        updateEducationIndices();
    }
}

function removeExperience(index) {
    const experienceContainer = document.getElementById('experienceContainer');
    if (experienceContainer.children[index]) {
        experienceContainer.removeChild(experienceContainer.children[index]);
        updateExperienceIndices();
    }
}

function removeSkill(index) {
    const skillsContainer = document.getElementById('skillsContainer');
    if (skillsContainer.children[index]) {
        skillsContainer.removeChild(skillsContainer.children[index]);
        updateSkillIndices();
    }
}

function updateEducationIndices() {
    const educationContainer = document.getElementById('educationContainer');
    Array.from(educationContainer.children).forEach((child, index) => {
        const inputs = child.querySelectorAll('input');
        inputs.forEach(input => {
            input.setAttribute('data-index', index);
        });
    });
}

function updateExperienceIndices() {
    const experienceContainer = document.getElementById('experienceContainer');
    Array.from(experienceContainer.children).forEach((child, index) => {
        const inputs = child.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.setAttribute('data-index', index);
        });
    });
}

function updateSkillIndices() {
    const skillsContainer = document.getElementById('skillsContainer');
    Array.from(skillsContainer.children).forEach((child, index) => {
        const button = child.querySelector('button');
        if (button) {
            button.setAttribute('onclick', `removeSkill(${index})`);
        }
    });
}

async function saveProfile() {
    try {
        const profileData = collectFormData();
        
        const response = await backendPost('/applicant/update-profile', profileData);
        const result = await handleResponse(response);
        
        if (result.data) {
            alert('Profile updated successfully!');
        } else {
            alert('Profile update failed: ' + (result.error || 'Unknown error'));
        }
    } catch (err) {
        alert('Profile update failed: ' + err.message);
    }
}

function collectFormData() {
    const profile = {
        full_name: document.getElementById('fullName')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        location: document.getElementById('location')?.value || '',
        linkedin_url: document.getElementById('linkedin')?.value || '',
        github_url: document.getElementById('github')?.value || '',
        portfolio_url: document.getElementById('portfolio')?.value || '',
        education: [],
        experience: [],
        skills: []
    };

    // Collect education
    const educationContainer = document.getElementById('educationContainer');
    Array.from(educationContainer.children).forEach(child => {
        const edu = {
            institution: child.querySelector('[data-field="institution"]')?.value || '',
            degree: child.querySelector('[data-field="degree"]')?.value || '',
            field_of_study: child.querySelector('[data-field="field_of_study"]')?.value || '',
            start_date: child.querySelector('[data-field="start_date"]')?.value || '',
            end_date: child.querySelector('[data-field="end_date"]')?.value || ''
        };
        if (edu.institution || edu.degree) {
            profile.education.push(edu);
        }
    });

    // Collect experience
    const experienceContainer = document.getElementById('experienceContainer');
    Array.from(experienceContainer.children).forEach(child => {
        const exp = {
            company: child.querySelector('[data-field="company"]')?.value || '',
            position: child.querySelector('[data-field="position"]')?.value || '',
            start_date: child.querySelector('[data-field="start_date"]')?.value || '',
            end_date: child.querySelector('[data-field="end_date"]')?.value || '',
            description: child.querySelector('[data-field="description"]')?.value || ''
        };
        if (exp.company || exp.position) {
            profile.experience.push(exp);
        }
    });

    // Collect skills
    const skillsContainer = document.getElementById('skillsContainer');
    Array.from(skillsContainer.children).forEach(child => {
        const skillText = child.querySelector('.badge')?.textContent;
        if (skillText) {
            profile.skills.push(skillText.trim());
        }
    });

    return profile;
}

function setupNavigation() {
    // Setup navigation handlers
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await customAuth.signOut();
                window.location.href = CONFIG.PAGES.LOGIN;
            } catch (err) {
                alert('Logout failed: ' + err.message);
            }
        });
    }

    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveProfile);
    }

    const addEduBtn = document.getElementById('addEducationBtn');
    if (addEduBtn) {
        addEduBtn.addEventListener('click', addEducation);
    }

    const addExpBtn = document.getElementById('addExperienceBtn');
    if (addExpBtn) {
        addExpBtn.addEventListener('click', addExperience);
    }

    const skillsInput = document.getElementById('skillsInput');
    if (skillsInput) {
        skillsInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
            }
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});
