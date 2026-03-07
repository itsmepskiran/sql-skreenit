import { customAuth } from '@shared/js/auth-config.js';
import { backendPost, backendGet, handleResponse } from '@shared/js/backend-client.js';
import { notify } from '@shared/js/auth-pages.js';
import { CONFIG } from '@shared/js/config.js';
import '@shared/js/mobile.js';
const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

let candidateUserId = null; // Stored for upload callbacks

async function checkAuth() {
    const user = await customAuth.getUserData();
    if (!user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    // Safety check role
    if ((user.role || '').toLowerCase() !== 'candidate') {
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER; return;
    }

    candidateUserId = user.id;
    // #region agent log
    fetch('http://127.0.0.1:7930/ingest/23d9b789-88e9-420a-a1ba-7cd27faf16d3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9e6624'},body:JSON.stringify({sessionId:'9e6624',runId:'pre-fix',hypothesisId:'D',location:'candidate-profile.js:checkAuth',message:'checkAuth user loaded',data:{userId:user.id,role:user.role},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await updateSidebarProfile(user);
    await loadProfile(user.id);
    setupEditProfileButton();
    setupNavigation();
    setupAvatarUpload();
    setupResumeUpload();
}

async function updateSidebarProfile(user) {
    const nameEl = document.getElementById("userName");
    const designationEl = document.getElementById("userDesignation");
    const avatarEl = document.getElementById("userAvatar"); 

    // Fetch profile data once for all sidebar updates
    let profileData = null;
    try {
        const res = await backendGet('/applicant/profile');
        const json = await handleResponse(res);
        profileData = json?.data?.data || json?.data || json;
    } catch (err) {
        console.log('Could not fetch profile for sidebar:', err);
    }

    // Update name with priority: profile full_name > user full_name > email
    let displayName = user.full_name || user.email?.split('@')[0] || 'User';
    if (profileData?.full_name) displayName = profileData.full_name;
    
    if(nameEl) nameEl.textContent = displayName;

    // Update designation based on experience/education
    if(designationEl) {
        if (profileData?.experience && profileData.experience.length > 0) {
            // Sort experience by start_date (most recent first) to get latest job
            const sortedExperience = [...profileData.experience].sort((a, b) => {
                return new Date(b.start_date || 0) - new Date(a.start_date || 0);
            });
            const latestJob = sortedExperience[0];
            designationEl.textContent = latestJob.job_title || 'Professional';
        } else if (profileData?.education && profileData.education.length > 0) {
            designationEl.textContent = 'Student';
        } else {
            designationEl.textContent = 'Fresher';
        }
    }

    // Update avatar with profile image if available
    if(avatarEl) {
        if (profileData?.avatar_url && profileData.avatar_url !== null && profileData.avatar_url !== '' && profileData.avatar_url !== 'null') {
            const initialsSrc = user.full_name || user.email || 'User';
            const initialsSeq = (initialsSrc || 'U').match(/\b\w/g) || [];
            const initials = ((initialsSeq.shift() || '') + (initialsSeq.pop() || '')).toUpperCase();
            avatarEl.innerHTML = `<img src="${profileData.avatar_url}" onerror="this.style.display='none'; this.parentElement.textContent='${initials}';" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="Profile">`;
        } else {
            // Fallback to initials
            const initials = displayName.match(/\b\w/g) || [];
            avatarEl.innerHTML = `
                <div style="width:100%; height:100%; border-radius:50%; background:#6366f1; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">
                    ${initials ? initials[0] + (initials[1] || '') : 'U'}
                </div>
            `;
        }
    }
}

async function loadProfile(userId) {
    try {
        console.log('🔄 Loading profile for user:', userId);
        const res = await backendGet('/applicant/profile');
        const profile = await handleResponse(res);
        const data = profile?.data?.data || profile?.data || profile;
        // #region agent log
        fetch('http://127.0.0.1:7930/ingest/23d9b789-88e9-420a-a1ba-7cd27faf16d3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9e6624'},body:JSON.stringify({sessionId:'9e6624',runId:'pre-fix',hypothesisId:'A',location:'candidate-profile.js:loadProfile',message:'/applicant/profile response',data:{ok:profile.ok ?? true,hasData:!!profile.data,keys:profile && typeof profile==='object'?Object.keys(profile):null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        console.log('📊 Profile response:', profile);
        
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            console.log('✅ Profile data found, populating form');
            populateForm(data, userId);
            setupResumeDownload(data);
        } else {
            console.log('❌ No profile data found');
        }
    } catch (err) {
        console.error('Failed to load profile:', err);
    }
}

function populateForm(profile, userId) {
    // Avatar display in main profile view
    const profileImageEl = document.getElementById('profileImage');
    const avatarInitialsEl = document.getElementById('avatarInitials');
    
    if (profile.avatar_url && profile.avatar_url !== null && profile.avatar_url !== '' && profile.avatar_url !== 'null') {
        if (profileImageEl) {
            profileImageEl.src = profile.avatar_url;
            profileImageEl.style.display = 'block';
        }
        if (avatarInitialsEl) avatarInitialsEl.style.display = 'none';
    } else {
        // Show initials
        const initials = (profile.full_name || 'User').match(/\b\w/g) || [];
        const initialsText = initials ? initials[0] + (initials[1] || '') : 'U';
        if (avatarInitialsEl) {
            avatarInitialsEl.textContent = initialsText;
            avatarInitialsEl.style.display = 'block';
        }
        if (profileImageEl) profileImageEl.style.display = 'none';
    }
    
    // Basic info - populate view elements
    if (profile.full_name) {
        const nameEl = document.getElementById('viewName');
        if (nameEl) nameEl.textContent = profile.full_name;
    }
    if (profile.phone) {
        const phoneEl = document.getElementById('viewPhone');
        if (phoneEl) phoneEl.textContent = profile.phone;
    }
    if (profile.location) {
        const locationEl = document.getElementById('viewLocation');
        if (locationEl) locationEl.textContent = profile.location;
    }
    if (profile.email) {
        const emailEl = document.getElementById('viewEmail');
        if (emailEl) emailEl.textContent = profile.email;
    }

    // Role/Designation in main profile
    const roleEl = document.getElementById('viewRole');
    if (roleEl) {
        if (profile.experience && profile.experience.length > 0) {
            // Sort experience by start_date (most recent first) to get latest job
            const sortedExperience = [...profile.experience].sort((a, b) => {
                return new Date(b.start_date || 0) - new Date(a.start_date || 0);
            });
            const latestJob = sortedExperience[0];
            roleEl.textContent = `${latestJob.job_title || 'Professional'} at ${latestJob.company || ''}`;
        } else if (profile.education && profile.education.length > 0) {
            roleEl.textContent = 'Student';
        } else {
            roleEl.textContent = 'Fresher';
        }
    }

    // Profile image
    if (profile.avatar_url) {
        const profileImg = document.getElementById('profileImage');
        const avatarInitials = document.getElementById('avatarInitials');
        if (profileImg) {
            profileImg.src = profile.avatar_url;
            profileImg.style.display = 'block';
        }
        if (avatarInitials) avatarInitials.style.display = 'none';
    }

    // Education
    if (profile.education && profile.education.length > 0) {
        const educationContainer = document.getElementById('viewEducationList');
        if (educationContainer) {
            educationContainer.innerHTML = profile.education.map(edu => `
                <div class="education-item mb-3">
                    <h6>${edu.degree || ''} - ${edu.institution || ''}</h6>
                    <small class="text-muted">Completed: ${edu.completion_year || 'N/A'}</small>
                </div>
            `).join('');
        }
    }

    // Experience
    if (profile.experience && profile.experience.length > 0) {
        const experienceContainer = document.getElementById('viewExperienceList');
        if (experienceContainer) {
            experienceContainer.innerHTML = profile.experience.map(exp => `
                <div class="experience-item mb-3">
                    <h6>${exp.job_title || ''} at ${exp.company || ''}</h6>
                    <small class="text-muted">${exp.start_date || ''} - ${exp.end_date || 'Present'}</small>
                    <p class="mt-1">${exp.description || ''}</p>
                </div>
            `).join('');
        }
    }

    // Skills
    if (profile.skills && profile.skills.length > 0) {
        const skillsContainer = document.getElementById('viewSkills');
        if (skillsContainer) {
            skillsContainer.innerHTML = profile.skills.map(skill => 
                `<span class="badge bg-primary text-white me-2 mb-2">${skill}</span>`
            ).join('');
        }
    }

    // Intro Video
    console.log('🎥 Checking intro video URL:', profile.intro_video_url);
    const videoCard = document.getElementById('videoCard');
    const noVideoCard = document.getElementById('noVideoCard');
    
    if (profile.intro_video_url && profile.intro_video_url !== null && profile.intro_video_url !== '') {
        console.log('✅ Video found, showing video card');
        if (videoCard) videoCard.style.display = 'block';
        if (noVideoCard) noVideoCard.style.display = 'none';
        
        // Setup video card buttons
        setupVideoCardButtons(profile.intro_video_url, userId);
    } else {
        console.log('📹 No video found, showing no video card');
        if (videoCard) videoCard.style.display = 'none';
        if (noVideoCard) noVideoCard.style.display = 'block';
        
        // Setup add video button
        setupAddVideoButton(userId);
    }
}

function setupVideoCardButtons(videoUrl, userId) {
    const playBtn = document.getElementById('playVideoBtn');
    const deleteBtn = document.getElementById('deleteVideoBtn');
    
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            openVideoModal(videoUrl);
        });
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete your introduction video?')) {
                try {
                    const response = await backendPost('/applicant/delete-intro-video', {});
                    const result = await handleResponse(response);
                    
                    if (result.ok) {
                        notify('Video deleted successfully!', 'success');
                        
                        // Show no video card and hide video card
                        const videoCard = document.getElementById('videoCard');
                        const noVideoCard = document.getElementById('noVideoCard');
                        if (videoCard) videoCard.style.display = 'none';
                        if (noVideoCard) noVideoCard.style.display = 'block';
                        
                        // Setup add video button
                        setupAddVideoButton(userId);
                        
                        // Reload profile to update data
                        await loadProfile(userId);
                    } else {
                        throw new Error('Delete failed');
                    }
                } catch (err) {
                    console.error('Delete video error:', err);
                    notify('Failed to delete video.', 'error');
                }
            }
        });
    }
}

function setupAddVideoButton(userId) {
    const addVideoBtn = document.getElementById('addVideoBtn');
    
    if (addVideoBtn) {
        addVideoBtn.addEventListener('click', () => {
            // Redirect to application form with video step
            window.location.href = '../applicant/detailed-application-form.html?step=6';
        });
    }
}

function getVideoMimeType(url) {
    const ext = url?.split('.').pop()?.toLowerCase();
    if (!ext) return '';
    if (ext === 'mp4') return 'video/mp4';
    if (ext === 'webm') return 'video/webm';
    if (ext === 'ogv' || ext === 'ogg') return 'video/ogg';
    return '';
}

function openVideoModal(videoUrl) {
    const modal = document.getElementById('videoPlayerModal');
    const videoPlayer = document.getElementById('modalVideoPlayer');
    const closeBtn = document.getElementById('closeVideoPlayerBtn');

    if (videoPlayer) {
        const sourceEl = videoPlayer.querySelector('source');
        const mime = getVideoMimeType(videoUrl);

        if (sourceEl) {
            sourceEl.src = videoUrl;
            if (mime) sourceEl.type = mime;
        } else {
            videoPlayer.src = videoUrl;
        }
        videoPlayer.load();
    }

    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }

    if (closeBtn) {
        closeBtn.onclick = () => {
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
            if (videoPlayer) {
                videoPlayer.pause();
                videoPlayer.src = '';
            }
        };
    }

    // Close modal when clicking outside
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
                if (videoPlayer) {
                    videoPlayer.pause();
                    videoPlayer.src = '';
                }
            }
        };
    }
}

function setupVideoUpload(userId) {
    const videoInput = document.getElementById('introVideoFile');
    const uploadBtn = document.getElementById('uploadVideoBtn');
    const progressBar = document.getElementById('videoProgressBar');
    const progressText = document.getElementById('videoProgressText');

    if (!videoInput) return;

    // Handle file selection
    videoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('video/')) {
            notify('Please select a video file.', 'error');
            return;
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB
            notify('Video file must be less than 50MB.', 'error');
            return;
        }

        // Show progress
        const progressContainer = document.getElementById('videoUploadProgress');
        const fileName = document.getElementById('videoFileName');
        if (progressContainer) progressContainer.style.display = 'block';
        if (fileName) fileName.textContent = file.name;

        try {
            // Upload video
            const formData = new FormData();
            formData.append('file', file);

            const response = await backendPost('/applicant/upload-intro-video', formData);
            const result = await handleResponse(response);

            if (result.ok) {
                notify('Video uploaded successfully!', 'success');
                
                // Reload profile to show new video
                await loadProfile(userId);
            } else {
                throw new Error('Upload failed');
            }
        } catch (err) {
            console.error('Video upload error:', err);
            notify('Failed to upload video.', 'error');
        } finally {
            // Hide progress
            if (progressContainer) progressContainer.style.display = 'none';
        }
    });
}

function setupResumeDownload(profile) {
    console.log('📄 Setting up resume download with profile:', profile);
    
    const downloadBtn = document.getElementById('downloadResumeBtn');
    const viewBtn = document.getElementById('viewResumeBtn');
    const resumeContainer = document.getElementById('resumeContainer');
    const noResumeContainer = document.getElementById('noResumeContainer');
    const resumeFileName = document.getElementById('resumeFileName');
    
    if (profile.resume_url && profile.resume_url !== null && profile.resume_url !== '' && resumeContainer) {
        console.log('✅ Resume found, setting up buttons');
        // Show resume container
        if (resumeContainer) resumeContainer.style.display = 'flex';
        if (noResumeContainer) noResumeContainer.style.display = 'none';
        
        // Extract filename from URL
        const filename = profile.resume_url.split('/').pop() || 'resume.pdf';
        if (resumeFileName) resumeFileName.textContent = filename;
        
        // Setup download button with direct href
        if (downloadBtn) {
            downloadBtn.href = profile.resume_url;
            downloadBtn.download = filename;
            downloadBtn.style.display = 'inline-flex';
            console.log('✅ Download button configured');
        }
        
        // Setup view button with direct href
        if (viewBtn) {
            viewBtn.href = profile.resume_url;
            viewBtn.target = '_blank';
            viewBtn.style.display = 'inline-flex';
            console.log('✅ View button configured');
        }
    } else {
        console.log('📄 No resume found, showing upload area');
        // Show no resume container
        if (resumeContainer) resumeContainer.style.display = 'none';
        if (noResumeContainer) noResumeContainer.style.display = 'block';
    }
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
    // Sidebar Navigation
    const logoLink = document.getElementById('logoLink');
    const navDashboard = document.getElementById('navDashboard');
    const navJobs = document.getElementById('navJobs');
    const navApplications = document.getElementById('navApplications');
    const navProfile = document.getElementById('navProfile');
    const logoutBtn = document.getElementById('logoutBtn');

    if(logoLink) logoLink.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE);
    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE);
    if(navJobs) navJobs.addEventListener('click', () => window.location.href = CONFIG.PAGES.JOBS);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_APPLICATIONS);
    if(navProfile) {
        navProfile.addEventListener('click', async () => {
            const u = await customAuth.getUserData();
            if (u && u.onboarded) {
                window.location.href = CONFIG.PAGES.CANDIDATE_PROFILE;
            } else {
                window.location.href = CONFIG.PAGES.APPLY_FORM;
            }
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await customAuth.signOut();
                window.location.href = CONFIG.PAGES.JOBS;
            } catch (err) {
                notify('Logout failed: ' + err.message, 'error');
            }
        });
    }

    const saveBtn = document.getElementById('saveProfileBtn');
    if(saveBtn) saveBtn.addEventListener('click', saveProfile);

    const addEduBtn = document.getElementById('addEducationBtn');
    if(addEduBtn) addEduBtn.addEventListener('click', addEducation);

    const addExpBtn = document.getElementById('addExperienceBtn');
    if(addExpBtn) addExpBtn.addEventListener('click', addExperience);

    const skillsInput = document.getElementById('skillsInput');
    if(skillsInput) {
        skillsInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                e.preventDefault();
                addSkill();
            }
        });
    }
}

function setupAvatarUpload() {
    const uploadBtn = document.getElementById('uploadAvatarBtn');
    const fileInput = document.getElementById('avatarUpload');

    if (!uploadBtn || !fileInput) return;

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            notify('Please upload a valid image file.', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            notify('Please upload an image smaller than 5MB.', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await backendPost('/applicant/profile/avatar', formData);
            const result = await handleResponse(response);
            console.log('✅ Candidate avatar upload response:', result);

            if (result.data?.avatar_url) {
                notify('Avatar uploaded successfully!', 'success');
                await loadProfile(candidateUserId);
            } else {
                notify('Avatar uploaded but response did not include URL.', 'warning');
            }
        } catch (err) {
            console.error('Avatar upload failed:', err);
            notify('Failed to upload avatar. Please try again.', 'error');
        } finally {
            fileInput.value = '';
        }
    });
}

function setupResumeUpload() {
    const resumeInput = document.getElementById('resumeUpload');
    if (!resumeInput) return;

    resumeInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Only accept common resume formats
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            notify('Please upload a PDF or Word document.', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await backendPost('/applicant/profile/resume', formData);
            const result = await handleResponse(response);
            console.log('✅ Candidate resume upload response:', result);

            if (result.data?.resume_url) {
                notify('Resume uploaded successfully!', 'success');
                await loadProfile(candidateUserId);
            } else {
                notify('Resume uploaded but response did not include URL.', 'warning');
            }
        } catch (err) {
            console.error('Resume upload failed:', err);
            notify('Failed to upload resume. Please try again.', 'error');
        } finally {
            resumeInput.value = '';
        }
    });
}

// Setup Edit Profile button
function setupEditProfileButton() {
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            window.location.href = CONFIG.PAGES.APPLY_FORM;
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', checkAuth);
