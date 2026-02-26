import { customAuth } from '@shared/js/auth-config.js';;
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
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

        // 3. Avatar Main Card - Handle Profile Image or Avatar
        const avatarInitials = document.getElementById("avatarInitials");
        const profileImage = document.getElementById("profileImage");
        
        if (profile.avatar_url) {
            // Show profile image
            if(profileImage) {
                profileImage.src = profile.avatar_url;
                profileImage.style.display = 'block';
            }
            if(avatarInitials) avatarInitials.style.display = 'none';
        } else {
            // Show initials avatar
            if(profileImage) profileImage.style.display = 'none';
            if(avatarInitials) {
                const initials = (profile.full_name || "C").match(/\b\w/g) || [];
                const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
                avatarInitials.textContent = text || "C";
                avatarInitials.style.display = 'block';
            }
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

        // 5. Introduction Video
        loadIntroductionVideo(profile.intro_video_url);

        // --- 6. RESUME LOGIC (TARGETING EXISTING HTML IDs) ---
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

// --- INTRODUCTION VIDEO FUNCTIONS ---
function loadIntroductionVideo(videoUrl) {
    const videoPlayer = document.getElementById('videoPlayer');
    const videoUploadArea = document.getElementById('videoUploadArea');
    const videoElement = document.getElementById('introVideoElement');
    const videoFileName = document.getElementById('videoFileName');
    
    if (videoUrl) {
        // Show video player with existing video
        if(videoPlayer) videoPlayer.style.display = 'block';
        if(videoUploadArea) videoUploadArea.style.display = 'none';
        if(videoElement) {
            videoElement.src = videoUrl;
            videoElement.load();
        }
        if(videoFileName) {
            videoFileName.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Video uploaded</span>';
        }
    } else {
        // Show upload area
        if(videoPlayer) videoPlayer.style.display = 'none';
        if(videoUploadArea) videoUploadArea.style.display = 'block';
        if(videoFileName) videoFileName.textContent = '';
    }
}

async function handleVideoUpload(file) {
    if (!file) return;
    
    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
        alert('Video size should be less than 50MB');
        return;
    }
    
    const progressBar = document.getElementById('videoProgressBar');
    const progressText = document.getElementById('videoProgressText');
    const uploadProgress = document.getElementById('videoUploadProgress');
    const videoUploadArea = document.getElementById('videoUploadArea');
    
    // Show progress
    if(uploadProgress) uploadProgress.style.display = 'block';
    if(videoUploadArea) videoUploadArea.style.display = 'none';
    
    try {
        // Update progress UI
        updateVideoProgress(10, 'Preparing upload...');
        
        // Generate safe filename
        const timestamp = Date.now();
        const safeName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
        const path = `${(await customAuth.getUser()).data.user.id}/${safeName}`;
        
        updateVideoProgress(30, 'Uploading to storage...');
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
            .from('intro-videos')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) throw error;
        
        updateVideoProgress(70, 'Saving to profile...');
        
        // Update profile with video URL
        const { error: updateError } = await supabase
            .from('candidate_profiles')
            .update({ intro_video_url: path })
            .eq('user_id', (await customAuth.getUser()).data.user.id);
        
        if (updateError) throw updateError;
        
        updateVideoProgress(100, 'Complete!');
        
        // Reload to show the video
        setTimeout(() => {
            loadIntroductionVideo(path);
            if(uploadProgress) uploadProgress.style.display = 'none';
        }, 500);
        
    } catch (err) {
        console.error('Video upload failed:', err);
        alert('Failed to upload video: ' + err.message);
        if(uploadProgress) uploadProgress.style.display = 'none';
        if(videoUploadArea) videoUploadArea.style.display = 'block';
    }
}

function updateVideoProgress(percent, text) {
    const progressBar = document.getElementById('videoProgressBar');
    const progressText = document.getElementById('videoProgressText');
    if(progressBar) progressBar.style.width = percent + '%';
    if(progressText) progressText.textContent = text || `Uploading... ${percent}%`;
}

async function deleteIntroductionVideo() {
    if (!confirm('Are you sure you want to delete your introduction video?')) return;
    
    try {
        const user = (await customAuth.getUser()).data.user;
        
        // Get current video path
        const { data: profile } = await supabase
            .from('candidate_profiles')
            .select('intro_video_url')
            .eq('user_id', user.id)
            .single();
        
        if (profile?.intro_video_url) {
            // Delete from storage
            await supabase.storage
                .from('intro-videos')
                .remove([profile.intro_video_url]);
        }
        
        // Update profile to remove video URL
        await supabase
            .from('candidate_profiles')
            .update({ intro_video_url: null })
            .eq('user_id', user.id);
        
        // Reload UI
        loadIntroductionVideo(null);
        
    } catch (err) {
        console.error('Failed to delete video:', err);
        alert('Failed to delete video: ' + err.message);
    }
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
        await customAuth.signOut();
        window.location.href = CONFIG.PAGES.LOGIN;
    });
    
    // Video Upload Event Listeners
    const introVideoFile = document.getElementById('introVideoFile');
    const replaceVideoBtn = document.getElementById('replaceVideoBtn');
    const deleteVideoBtn = document.getElementById('deleteVideoBtn');
    
    if(introVideoFile) {
        introVideoFile.addEventListener('change', (e) => {
            if(e.target.files[0]) {
                handleVideoUpload(e.target.files[0]);
            }
        });
    }
    
    if(replaceVideoBtn) {
        replaceVideoBtn.addEventListener('click', () => {
            document.getElementById('introVideoFile').click();
        });
    }
    
    if(deleteVideoBtn) {
        deleteVideoBtn.addEventListener('click', deleteIntroductionVideo);
    }
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
// --- INLINE VIDEO RECORDER FUNCTIONS ---
let inlineMediaRecorder = null;
let inlineRecordedChunks = [];
let inlineRecordingInterval = null;
let inlineCurrentVideoBlob = null;

// Check for pending job application redirect
function checkPendingJobApplication() {
    const pendingJobId = sessionStorage.getItem('pendingJobApplication');
    if (pendingJobId) {
        // Show notification that they need to record video to continue application
        const notification = document.createElement('div');
        notification.style.cssText = 'background: #eff6ff; border: 1px solid #bfdbfe; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;';
        notification.innerHTML = `
            <div>
                <p style="margin: 0; font-weight: 600; color: #1e40af;"><i class="fas fa-info-circle"></i> Complete Your Application</p>
                <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem; color: #64748b;">Record or upload your intro video to complete your job application.</p>
            </div>
            <button id="openRecorderFromNotification" class="btn btn-primary btn-sm">
                <i class="fas fa-video"></i> Record Video
            </button>
        `;
        
        const dashboardContent = document.querySelector('.dashboard-content');
        if (dashboardContent) {
            dashboardContent.insertBefore(notification, dashboardContent.firstChild);
        }
        
        // Auto-open recorder after short delay
        setTimeout(() => {
            showInlineVideoRecorder();
        }, 1000);
    }
}

function showInlineVideoRecorder() {
    const modal = document.getElementById('videoRecorderModal');
    if (modal) {
        modal.classList.add('active');
        resetInlineRecorder();
        startInlineCamera();
    }
}

function hideInlineVideoRecorder() {
    const modal = document.getElementById('videoRecorderModal');
    if (modal) {
        modal.classList.remove('active');
        stopInlineCamera();
    }
}

function resetInlineRecorder() {
    inlineCurrentVideoBlob = null;
    document.getElementById('inlineRecordingPreview').style.display = 'none';
    document.getElementById('inlineRecordingIndicator').style.display = 'none';
    document.getElementById('inlineRecordingTimer').style.display = 'none';
    document.getElementById('inlineStartRecordBtn').style.display = 'block';
    document.getElementById('inlineStopRecordBtn').style.display = 'none';
    document.getElementById('inlineRetakeBtn').style.display = 'none';
    document.getElementById('inlineSaveVideoBtn').style.display = 'none';
    document.getElementById('inlineVideoUploadProgress').style.display = 'none';
    document.getElementById('inlineUploadFileName').textContent = '';
}

async function startInlineCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
            audio: true 
        });
        document.getElementById('inlineRecorderVideo').srcObject = stream;
    } catch (err) {
        console.error('Camera access error:', err);
        alert('Could not access camera. You can upload a video file instead.');
    }
}

function stopInlineCamera() {
    const video = document.getElementById('inlineRecorderVideo');
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    if (inlineMediaRecorder && inlineMediaRecorder.state !== 'inactive') {
        inlineMediaRecorder.stop();
    }
    clearInterval(inlineRecordingInterval);
}

function startInlineRecording() {
    const video = document.getElementById('inlineRecorderVideo');
    if (!video.srcObject) {
        alert('Camera not available');
        return;
    }
    
    inlineRecordedChunks = [];
    inlineMediaRecorder = new MediaRecorder(video.srcObject, { mimeType: 'video/webm' });
    
    inlineMediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            inlineRecordedChunks.push(e.data);
        }
    };
    
    inlineMediaRecorder.onstop = () => {
        inlineCurrentVideoBlob = new Blob(inlineRecordedChunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(inlineCurrentVideoBlob);
        document.getElementById('inlinePreviewVideo').src = videoUrl;
    };
    
    inlineMediaRecorder.start();
    
    // Update UI
    document.getElementById('inlineStartRecordBtn').style.display = 'none';
    document.getElementById('inlineStopRecordBtn').style.display = 'block';
    document.getElementById('inlineRecordingIndicator').style.display = 'block';
    document.getElementById('inlineRecordingTimer').style.display = 'block';
    
    // Start timer
    let seconds = 0;
    const maxSeconds = 90;
    inlineRecordingInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        document.getElementById('inlineRecordingTimer').textContent = `${mins}:${secs} / 01:30`;
        
        if (seconds >= maxSeconds) {
            stopInlineRecording();
        }
    }, 1000);
}

function stopInlineRecording() {
    if (inlineMediaRecorder && inlineMediaRecorder.state !== 'inactive') {
        inlineMediaRecorder.stop();
    }
    clearInterval(inlineRecordingInterval);
    
    // Update UI
    document.getElementById('inlineStopRecordBtn').style.display = 'none';
    document.getElementById('inlineRecordingIndicator').style.display = 'none';
    document.getElementById('inlineRecordingTimer').style.display = 'none';
    document.getElementById('inlineRetakeBtn').style.display = 'block';
    document.getElementById('inlineSaveVideoBtn').style.display = 'block';
    document.getElementById('inlineRecordingPreview').style.display = 'block';
}

function retakeInlineVideo() {
    inlineCurrentVideoBlob = null;
    document.getElementById('inlineRecordingPreview').style.display = 'none';
    document.getElementById('inlinePreviewVideo').src = '';
    resetInlineRecorder();
    startInlineCamera();
}

function handleInlineVideoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 50 * 1024 * 1024) {
        alert('Video must be less than 50MB');
        return;
    }
    
    inlineCurrentVideoBlob = file;
    document.getElementById('inlineUploadFileName').textContent = file.name;
    
    // Show preview
    const videoUrl = URL.createObjectURL(file);
    document.getElementById('inlinePreviewVideo').src = videoUrl;
    document.getElementById('inlineRecordingPreview').style.display = 'block';
    
    // Show save button
    document.getElementById('inlineStartRecordBtn').style.display = 'none';
    document.getElementById('inlineStopRecordBtn').style.display = 'none';
    document.getElementById('inlineRetakeBtn').style.display = 'none';
    document.getElementById('inlineSaveVideoBtn').style.display = 'block';
}

async function saveInlineVideo() {
    if (!inlineCurrentVideoBlob) return;
    
    const progressBar = document.getElementById('inlineVideoProgressBar');
    const progressText = document.getElementById('inlineVideoProgressText');
    const progressDiv = document.getElementById('inlineVideoUploadProgress');
    
    progressDiv.style.display = 'block';
    progressBar.style.width = '20%';
    progressText.textContent = 'Preparing upload...';
    
    try {
        const { data: { user } } = await customAuth.getUser();
        const timestamp = Date.now();
        const safeName = `${timestamp}_intro_video.webm`;
        const path = `${user.id}/${safeName}`;
        
        progressBar.style.width = '50%';
        progressText.textContent = 'Uploading video...';
        
        const { data, error } = await supabase.storage
            .from('intro-videos')
            .upload(path, inlineCurrentVideoBlob, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) throw error;
        
        progressBar.style.width = '80%';
        progressText.textContent = 'Saving to profile...';
        
        // Save to profile
        await supabase
            .from('candidate_profiles')
            .update({ intro_video_url: path })
            .eq('user_id', user.id);
        
        progressBar.style.width = '100%';
        progressText.textContent = 'Complete!';
        
        // Check if we need to redirect back to jobs page
        const pendingJobId = sessionStorage.getItem('pendingJobApplication');
        if (pendingJobId) {
            sessionStorage.removeItem('pendingJobApplication');
            // Show success message then redirect
            setTimeout(() => {
                window.location.href = `${CONFIG.PAGES.JOBS}?job_id=${pendingJobId}&video_ready=true`;
            }, 1000);
        } else {
            // Just reload profile page
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
        
    } catch (err) {
        console.error('Video upload failed:', err);
        alert('Failed to upload video: ' + err.message);
        progressDiv.style.display = 'none';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    setupNavigation();
    setupInlineRecorderListeners();
    checkPendingJobApplication();
});

function setupInlineRecorderListeners() {
    // Modal controls
    document.getElementById('closeVideoRecorderBtn')?.addEventListener('click', hideInlineVideoRecorder);
    document.getElementById('videoRecorderModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'videoRecorderModal') hideInlineVideoRecorder();
    });
    
    // Recording controls
    document.getElementById('inlineStartRecordBtn')?.addEventListener('click', startInlineRecording);
    document.getElementById('inlineStopRecordBtn')?.addEventListener('click', stopInlineRecording);
    document.getElementById('inlineRetakeBtn')?.addEventListener('click', retakeInlineVideo);
    document.getElementById('inlineSaveVideoBtn')?.addEventListener('click', saveInlineVideo);
    document.getElementById('inlineUploadVideoFile')?.addEventListener('change', handleInlineVideoUpload);
    
    // Notification button
    document.getElementById('openRecorderFromNotification')?.addEventListener('click', showInlineVideoRecorder);
}