// Add error handling for module imports
window.addEventListener('error', function(e) {
    // console.error('❌ Global JavaScript error:', e.error);
    // console.error('❌ Error details:', {
    //     message: e.message,
    //     filename: e.filename,
    //     lineno: e.lineno,
    //     colno: e.colno
    // });
});

window.addEventListener('unhandledrejection', function(e) {
    // console.error('❌ Unhandled promise rejection:', e.reason);
});

import { customAuth } from '@shared/js/auth-config.js';
import { backendPost, backendGet, handleResponse } from '@shared/js/backend-client.js';
import { notify } from '@shared/js/auth-pages.js';
import { CONFIG } from '@shared/js/config.js';
import { sidebarManager } from '@shared/js/profile-checker.js';
import '@shared/js/mobile.js';

// Shared grade calculation - single source of truth
// Matches backend/utils/grading.py GradeCalculator
function scoreToGrade(score) {
    score = Math.max(0, Math.min(100, Math.round(score)));
    if (score >= 90) return { grade: 'A+', label: 'Exceptional', color: '#059669' };
    if (score >= 80) return { grade: 'A', label: 'Excellent', color: '#10b981' };
    if (score >= 70) return { grade: 'B+', label: 'Very Good', color: '#22c55e' };
    if (score >= 60) return { grade: 'B', label: 'Good', color: '#84cc16' };
    if (score >= 50) return { grade: 'C', label: 'Average', color: '#eab308' };
    if (score >= 40) return { grade: 'D', label: 'Below Average', color: '#f97316' };
    return { grade: 'F', label: 'Poor', color: '#dc2626' };
}

function getScoreColor(score) {
    return scoreToGrade(score).color;
}

// console.log('✅ All modules imported successfully');
// console.log('🚀 Candidate Profile script initializing...');
const isLocal = CONFIG.IS_LOCAL;
// console.log('🌐 Local environment:', isLocal);
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
// console.log('📁 Assets base path:', assetsBase);
const logoImg = document.getElementById('logoImg');
if(logoImg) {
    logoImg.src = `${assetsBase}/assets/images/logobrand.png`;
    // console.log('🖼️ Logo set');
} else {
    // console.log('❌ Logo element not found');
}

let candidateUserId = null; // Stored for upload callbacks
// console.log('✅ Candidate Profile script initialization complete');

async function checkAuth() {
    // console.log('🔍 checkAuth() started');
    try {
        // Prevent multiple initializations
        if (window.candidateProfileInitialized) {
            // console.log('⚠️ Already initialized, skipping...');
            return;
        }
        
        const user = await customAuth.getUserData();
        // console.log('👤 User data:', user);
        
        if (!user) { 
            // console.log('❌ No user found, redirecting to login');
            window.location.href = CONFIG.PAGES.LOGIN; 
            return; 
        }
        
        // console.log('✅ User found, checking role...');
        // Safety check role
        if ((user.role || '').toLowerCase() !== 'candidate') {
            // console.log('❌ User is not a candidate, role:', user.role);
            // console.log('❌ Redirecting to recruiter dashboard');
            window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER; 
            return;
        }
        
        // console.log('✅ User role is candidate');
        candidateUserId = user.id;
        // console.log('✅ User authenticated, candidate ID:', candidateUserId);
        
        // #region agent log - DISABLED to avoid connection errors
        // fetch('http://127.0.0.1:7930/ingest/23d9b789-88e9-420a-a1ba-7cd27faf16d3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9e6624'},body:JSON.stringify({sessionId:'9e6624',runId:'pre-fix',hypothesisId:'D',location:'candidate-profile.js:checkAuth',message:'checkAuth user loaded',data:{userId:user.id,role:user.role},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        
        // console.log('🔄 About to initialize sidebar...');
        await sidebarManager.initSidebar();
        // console.log('✅ Sidebar initialization completed');
        
        // console.log('🔄 About to call loadProfile...');
        await loadProfile(user.id);
        // console.log('✅ loadProfile completed');
        
        // console.log('🔄 About to setup UI components...');
        setupEditProfileButton();
        // console.log('✅ setupEditProfileButton completed');
        
        setupNavigation();
        // console.log('✅ setupNavigation completed');
        
        setupAvatarUpload();
        // console.log('✅ setupAvatarUpload completed');
        
        setupResumeUpload();
        // console.log('✅ setupResumeUpload completed');
        
        window.candidateProfileInitialized = true;
        // console.log('✅ checkAuth() completed successfully');
    } catch (error) {
        // console.error('❌ checkAuth() failed with error:', error);
        // console.error('❌ Error stack:', error.stack);
    }
}

async function loadProfile(userId) {
    try {
        // console.log('🔄 Loading profile for user:', userId);
        const res = await backendGet('/applicant/profile');
        const profile = await handleResponse(res);
        const data = profile?.data || profile;  // Remove extra .data level
        // console.log('📊 Profile response received:', profile);
        // console.log('📊 Extracted profile data:', data);
        
        // #region agent log - DISABLED to avoid connection errors
        // fetch('http://127.0.0.1:7930/ingest/23d9b789-88e9-420a-a1ba-7cd27faf16d3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9e6624'},body:JSON.stringify({sessionId:'9e6624',runId:'pre-fix',hypothesisId:'A',location:'candidate-profile.js:loadProfile',message:'/applicant/profile response',data:{ok:profile.ok ?? true,hasData:!!profile.data,keys:profile && typeof profile==='object'?Object.keys(profile):null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            // console.log('✅ Profile data found, populating form');
            populateForm(data, userId);
            setupResumeDownload(data);
        } else {
            // console.log('❌ No profile data found, data:', data);
        }
    } catch (err) {
        // console.error('❌ Failed to load profile:', err);
    }
}

function populateForm(profile, userId) {
    // console.log('🔄 populateForm() started with profile:', profile);
    
    // Avatar display in main profile view
    const profileImageEl = document.getElementById('profileImage');
    const avatarInitialsEl = document.getElementById('avatarInitials');
    
    // console.log('🖼️ Setting up profile image...');
    // console.log('🔍 Avatar URL check:', profile.avatar_url);
    // console.log('🔍 Avatar URL type:', typeof profile.avatar_url);
    // console.log('🔍 Avatar URL value:', JSON.stringify(profile.avatar_url));
    
    // Construct full URL if avatar_url is just a filename
    let avatarUrl = profile.avatar_url;
    if (avatarUrl && !avatarUrl.startsWith('http')) {
        // Use the backend-mounted URL pattern
        avatarUrl = `http://localhost:8083/uploads/profilepics/${avatarUrl}`;
        // console.log('🔗 Constructed avatar URL:', avatarUrl);
    }
    
    if (avatarUrl && avatarUrl !== null && avatarUrl !== '' && avatarUrl !== 'null' && avatarUrl !== 'undefined') {
        if (profileImageEl) {
            profileImageEl.src = avatarUrl;
            profileImageEl.style.display = 'block';
            profileImageEl.onerror = function() {
                // console.log('❌ Profile image failed to load, showing initials');
                // console.log('❌ Failed URL was:', this.src);
                this.style.display = 'none';
                if (avatarInitialsEl) {
                    avatarInitialsEl.style.display = 'block';
                }
            };
            profileImageEl.onload = function() {
                // console.log('✅ Profile image loaded successfully');
                // console.log('✅ Final URL:', this.src);
            };
            // console.log('✅ Profile image set to:', avatarUrl);
        }
        if (avatarInitialsEl) avatarInitialsEl.style.display = 'none';
    } else {
        // console.log('🔤 No valid avatar URL, showing initials');
        // Show initials
        const initials = (profile.full_name || 'User').match(/\b\w/g) || [];
        const initialsText = initials ? initials[0] + (initials[1] || '') : 'U';
        if (avatarInitialsEl) {
            avatarInitialsEl.textContent = initialsText;
            avatarInitialsEl.style.display = 'block';
            // console.log('🔤 Set avatar initials to:', initialsText);
        }
        if (profileImageEl) profileImageEl.style.display = 'none';
    }
    
    // Basic info - populate view elements
    // console.log('📝 Populating basic info...');
    if (profile.full_name) {
        const nameEl = document.getElementById('viewName');
        if (nameEl) {
            nameEl.textContent = profile.full_name;
            // console.log('✅ Name set to:', profile.full_name);
        } else {
            // console.log('❌ viewName element not found');
        }
    }
    if (profile.phone) {
        const phoneEl = document.getElementById('viewPhone');
        if (phoneEl) {
            phoneEl.textContent = profile.phone;
            // console.log('✅ Phone set to:', profile.phone);
        } else {
            // console.log('❌ viewPhone element not found');
        }
    }
    if (profile.location) {
        const locationEl = document.getElementById('viewLocation');
        if (locationEl) {
            locationEl.textContent = profile.location;
            // console.log('✅ Location set to:', profile.location);
        } else {
            // console.log('❌ viewLocation element not found');
        }
    }
    if (profile.email) {
        const emailEl = document.getElementById('viewEmail');
        if (emailEl) {
            emailEl.textContent = profile.email;
            // console.log('✅ Email set to:', profile.email);
        } else {
            // console.log('❌ viewEmail element not found');
        }
    }

    // Candidate ID display
    if (profile.candidate_display_id) {
        const candidateIdEl = document.getElementById('viewCandidateId');
        if (candidateIdEl) {
            candidateIdEl.textContent = profile.candidate_display_id;
            // console.log('✅ Candidate ID set to:', profile.candidate_display_id);
        } else {
            // console.log('❌ viewCandidateId element not found');
        }
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
        
        // Reset analysis state for new video - show analyze button, hide re-analyze
        const analysisButtonContainer = document.getElementById('analysisButtonContainer');
        const analysisResults = document.getElementById('analysisResults');
        const reanalyzeBtn = document.getElementById('reanalyzeVideoBtn');
        
        if (analysisButtonContainer) analysisButtonContainer.style.display = 'block';
        if (analysisResults) analysisResults.style.display = 'none';
        if (reanalyzeBtn) reanalyzeBtn.style.display = 'none';
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
    const reuploadBtn = document.getElementById('reuploadVideoBtn');
    const deleteBtn = document.getElementById('deleteVideoBtn');
    
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            openVideoModal(videoUrl);
        });
    }
    
    if (reuploadBtn) {
        reuploadBtn.addEventListener('click', () => {
            openVideoRecordingModal(userId);
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
    
    // Setup video analysis
    setupVideoAnalysis(userId);
}

function setupVideoAnalysis(userId) {
    const analyzeBtn = document.getElementById('analyzeVideoBtn');
    const reanalyzeBtn = document.getElementById('reanalyzeVideoBtn');
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => analyzeVideo(userId));
    }
    
    if (reanalyzeBtn) {
        reanalyzeBtn.addEventListener('click', () => analyzeVideo(userId, true));
    }
    
    // Check for existing analysis on load
    loadExistingAnalysis(userId);
}

async function loadExistingAnalysis(userId) {
    try {
        const response = await backendGet('/analytics/video-analysis');
        const result = await handleResponse(response);
        
        if (result.data) {
            // Existing analysis - hide re-analyze button
            displayAnalysisResults(result.data);
        }
    } catch (err) {
        // No existing analysis - that's fine
        console.log('No existing video analysis found');
    }
}

async function analyzeVideo(userId, forceRefresh = false) {
    const analyzeBtn = document.getElementById('analyzeVideoBtn');
    const analysisLoading = document.getElementById('analysisLoading');
    const analysisResults = document.getElementById('analysisResults');
    const analysisButtonContainer = document.getElementById('analysisButtonContainer');
    
    // Show loading, hide button
    if (analysisButtonContainer) analysisButtonContainer.style.display = 'none';
    if (analysisLoading) analysisLoading.style.display = 'block';
    if (analysisResults) analysisResults.style.display = 'none';
    
    try {
        // No timeout - video analysis can take several minutes
        const response = await backendPost('/analytics/analyze-video', {}, { timeout: 0 });
        const result = await handleResponse(response);
        
        if (result.data) {
            displayAnalysisResults(result.data);
            notify('Video analysis complete!', 'success');
        } else {
            throw new Error('No analysis data returned');
        }
    } catch (err) {
        console.error('Video analysis error:', err);
        notify('Failed to analyze video. Please try again.', 'error');
        
        // Show button again on error
        if (analysisButtonContainer) analysisButtonContainer.style.display = 'block';
        if (analysisLoading) analysisLoading.style.display = 'none';
    }
}

function displayAnalysisResults(data) {
    const analysisLoading = document.getElementById('analysisLoading');
    const analysisResults = document.getElementById('analysisResults');
    const analysisButtonContainer = document.getElementById('analysisButtonContainer');
    const reanalyzeBtn = document.getElementById('reanalyzeVideoBtn');
    
    // Hide loading, show results
    if (analysisLoading) analysisLoading.style.display = 'none';
    if (analysisButtonContainer) analysisButtonContainer.style.display = 'none';
    if (analysisResults) analysisResults.style.display = 'block';
    
    // Always hide re-analyze button after analysis - user must re-upload video to analyze again
    if (reanalyzeBtn) {
        reanalyzeBtn.style.display = 'none';
    }
    
    const summary = data.summary || {};
    const transcription = data.transcription || {};
    const visual = data.visual_analysis || {};
    
    // Overall Score - show grade
    const overallScore = document.getElementById('overallScore');
    const scoreTitle = document.getElementById('scoreTitle');
    const scoreFeedback = document.getElementById('scoreFeedback');
    const scoreCircle = document.getElementById('scoreCircle');
    
    const score = summary.overall_score || 0;
    const gradeInfo = scoreToGrade(score);
    
    if (overallScore) overallScore.textContent = gradeInfo.grade;
    if (overallScore) overallScore.style.color = gradeInfo.color;
    
    // Set feedback based on grade
    let scoreTitleText = 'Great Job!';
    let scoreFeedbackText = 'Your video shows confidence and good speaking pace.';
    
    if (score < 60) {
        scoreTitleText = 'Needs Improvement';
        scoreFeedbackText = 'Consider re-recording with better lighting and speaking more clearly.';
    } else if (score < 80) {
        scoreTitleText = 'Good Start';
        scoreFeedbackText = 'Your video is decent but could use some improvements.';
    }
    
    if (scoreCircle) scoreCircle.style.border = `3px solid ${gradeInfo.color}`;
    if (scoreTitle) {
        scoreTitle.textContent = scoreTitleText;
        scoreTitle.style.color = gradeInfo.color;
    }
    if (scoreFeedback) scoreFeedback.textContent = scoreFeedbackText;
    
    // Speaking Pace - show grade instead of WPM
    const speakingPace = document.getElementById('speakingPace');
    if (speakingPace) {
        const wpm = summary.speaking_pace || 0;
        let wpmGrade = 'N/A';
        if (wpm >= 120 && wpm <= 150) wpmGrade = 'A';
        else if ((wpm >= 100 && wpm < 120) || (wpm > 150 && wpm <= 170)) wpmGrade = 'B';
        else if ((wpm >= 80 && wpm < 100) || (wpm > 170 && wpm <= 190)) wpmGrade = 'C';
        else if (wpm > 0) wpmGrade = 'D';
        speakingPace.textContent = wpmGrade;
        speakingPace.style.color = scoreToGrade(wpm >= 120 && wpm <= 150 ? 85 : wpm > 0 ? 60 : 0).color;
    }
    
    // Duration
    const videoDuration = document.getElementById('videoDuration');
    if (videoDuration) videoDuration.textContent = `${summary.duration || 0} sec`;
    
    // Confidence - show grade
    const confidenceScore = document.getElementById('confidenceScore');
    if (confidenceScore) {
        const confScore = summary.confidence_score || 0;
        const confGrade = scoreToGrade(confScore);
        confidenceScore.textContent = confGrade.grade;
        confidenceScore.style.color = confGrade.color;
    }
    
    // Face Presence - show grade
    const facePresence = document.getElementById('facePresence');
    if (facePresence) {
        const faceScore = summary.face_presence || 0;
        const faceGrade = scoreToGrade(faceScore);
        facePresence.textContent = faceGrade.grade;
        facePresence.style.color = faceGrade.color;
    }
    
    // Dominant Emotion
    const dominantEmotion = document.getElementById('dominantEmotion');
    if (dominantEmotion) {
        const emotion = summary.dominant_emotion || 'unknown';
        dominantEmotion.textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
    }
    
    // Emotion Distribution
    const emotionDistribution = document.getElementById('emotionDistribution');
    if (emotionDistribution && visual.emotion_distribution) {
        const emotions = Object.entries(visual.emotion_distribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([k, v]) => `${k}: ${v}%`)
            .join(', ');
        emotionDistribution.textContent = `(${emotions})`;
    }
    
    // Transcript Preview
    const transcriptPreview = document.getElementById('transcriptPreview');
    const wordCount = document.getElementById('wordCount');
    
    if (transcriptPreview) {
        const transcript = transcription.transcript || 'No transcript available';
        transcriptPreview.textContent = transcript.length > 200 
            ? `"${transcript.substring(0, 200)}..."` 
            : `"${transcript}"`;
    }
    if (wordCount) wordCount.textContent = `${transcription.word_count || 0} words`;
    
    // Filler Words Alert
    const fillerWordsAlert = document.getElementById('fillerWordsAlert');
    const fillerWordsCount = document.getElementById('fillerWordsCount');
    
    if (fillerWordsAlert && fillerWordsCount) {
        const fillerCount = summary.filler_words || 0;
        if (fillerCount > 3) {
            fillerWordsAlert.style.display = 'block';
            fillerWordsCount.textContent = `${fillerCount} filler words`;
        } else {
            fillerWordsAlert.style.display = 'none';
        }
    }
    
    // Last Analyzed
    const lastAnalyzed = document.getElementById('lastAnalyzed');
    if (lastAnalyzed && data.analyzed_at) {
        const date = new Date(data.analyzed_at);
        lastAnalyzed.textContent = `Last analyzed: ${date.toLocaleString()}`;
    }
    
    // Communication Skills (NLP Analysis)
    const nlp = data.nlp_analysis || {};
    const commSection = document.getElementById('communicationSkillsSection');
    
    if (nlp && nlp.communication_skills && nlp.communication_skills.score > 0) {
        const comm = nlp.communication_skills;
        const grammar = nlp.grammar || {};
        const vocab = nlp.vocabulary || {};
        const sentences = nlp.sentence_formation || {};
        
        // Show section
        if (commSection) commSection.style.display = 'block';
        
        // Overall Communication Score - show grade
        const commScoreEl = document.getElementById('commScore');
        if (commScoreEl) {
            const commGrade = scoreToGrade(comm.score);
            commScoreEl.textContent = commGrade.grade;
            commScoreEl.style.background = commGrade.color;
        }
        
        // Individual scores - show grades
        const grammarScoreEl = document.getElementById('grammarScore');
        if (grammarScoreEl) {
            const gramGrade = scoreToGrade(grammar.score || 0);
            grammarScoreEl.textContent = gramGrade.grade;
            grammarScoreEl.style.color = gramGrade.color;
        }
        
        const sentenceScoreEl = document.getElementById('sentenceScore');
        if (sentenceScoreEl) {
            const sentGrade = scoreToGrade(sentences.score || 0);
            sentenceScoreEl.textContent = sentGrade.grade;
            sentenceScoreEl.style.color = sentGrade.color;
        }
        
        const vocabScoreEl = document.getElementById('vocabScore');
        if (vocabScoreEl) {
            const vocabGrade = scoreToGrade(vocab.score || 0);
            vocabScoreEl.textContent = vocabGrade.grade;
            vocabScoreEl.style.color = vocabGrade.color;
        }
        
        const commLevelEl = document.getElementById('commLevel');
        if (commLevelEl) {
            commLevelEl.textContent = (comm.level || 'N/A').charAt(0).toUpperCase() + (comm.level || '').slice(1);
        }
        
        // Strengths
        const commStrengthsEl = document.getElementById('commStrengths');
        const strengthsTextEl = document.getElementById('strengthsText');
        if (comm.strengths && comm.strengths.length > 0) {
            if (commStrengthsEl) commStrengthsEl.style.display = 'block';
            if (strengthsTextEl) strengthsTextEl.textContent = comm.strengths.join(', ');
        }
        
        // Areas for Improvement
        const commImprovementsEl = document.getElementById('commImprovements');
        const improvementsTextEl = document.getElementById('improvementsText');
        if (comm.areas_for_improvement && comm.areas_for_improvement.length > 0) {
            if (commImprovementsEl) commImprovementsEl.style.display = 'block';
            if (improvementsTextEl) improvementsTextEl.textContent = comm.areas_for_improvement.join(', ');
        }
        
        // Grammar Details
        const grammarDetailsEl = document.getElementById('grammarDetails');
        if (grammarDetailsEl && grammar.error_count !== undefined) {
            let html = `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.25rem;">
                <div><span style="color: #64748b;">Errors:</span> <strong>${grammar.error_count || 0}</strong></div>
                <div><span style="color: #64748b;">Per 100 words:</span> <strong>${grammar.errors_per_100_words || 0}</strong></div>
            </div>`;
            if (grammar.error_breakdown) {
                html += `<div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">Spelling: ${grammar.error_breakdown.spelling || 0}</span>
                    <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">Grammar: ${grammar.error_breakdown.grammar || 0}</span>
                    <span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">Punctuation: ${grammar.error_breakdown.punctuation || 0}</span>
                    <span style="background: #f3e8ff; color: #7c3aed; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">Style: ${grammar.error_breakdown.style || 0}</span>
                </div>`;
            }
            grammarDetailsEl.innerHTML = html;
        }
        
        // Sentence Details
        const sentenceDetailsEl = document.getElementById('sentenceDetails');
        if (sentenceDetailsEl && sentences.total_sentences !== undefined) {
            let html = `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.25rem;">
                <div><span style="color: #64748b;">Sentences:</span> <strong>${sentences.total_sentences || 0}</strong></div>
                <div><span style="color: #64748b;">Avg Length:</span> <strong>${sentences.avg_sentence_length || 0} words</strong></div>
                <div><span style="color: #64748b;">Complexity:</span> <strong style="text-transform: capitalize;">${sentences.complexity || 'N/A'}</strong></div>
            </div>`;
            if (sentences.sentence_types) {
                html += `<div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">Simple: ${sentences.sentence_types.simple || 0}</span>
                    <span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">Compound: ${sentences.sentence_types.compound || 0}</span>
                    <span style="background: #f3e8ff; color: #7c3aed; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">Complex: ${sentences.sentence_types.complex || 0}</span>
                    ${sentences.sentence_types.fragment > 0 ? `<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">Fragments: ${sentences.sentence_types.fragment}</span>` : ''}
                </div>`;
            }
            if (sentences.readability) {
                html += `<div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0;">
                    <small style="color: #64748b;"><strong>Readability:</strong></small>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.25rem; margin-top: 0.25rem;">
                        <div><span style="color: #64748b;">Flesch-Kincaid:</span> ${sentences.readability.flesch_kincaid_grade || 'N/A'}</div>
                        <div><span style="color: #64748b;">Reading Ease:</span> ${sentences.readability.flesch_reading_ease || 'N/A'}</div>
                    </div>
                </div>`;
            }
            sentenceDetailsEl.innerHTML = html;
        }
        
        // Vocabulary Details
        const vocabDetailsEl = document.getElementById('vocabDetails');
        if (vocabDetailsEl && vocab.total_words !== undefined) {
            let html = `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.25rem;">
                <div><span style="color: #64748b;">Total Words:</span> <strong>${vocab.total_words || 0}</strong></div>
                <div><span style="color: #64748b;">Unique:</span> <strong>${vocab.unique_words || 0}</strong></div>
                <div><span style="color: #64748b;">Diversity:</span> <strong>${vocab.diversity_score || 0}%</strong></div>
            </div>`;
            html += `<div style="margin-top: 0.25rem;">
                <span style="color: #64748b;">Type-Token Ratio:</span> <strong>${vocab.type_token_ratio || 0}</strong>
                <span style="background: ${vocab.word_frequency_tier === 'advanced' ? '#dcfce7; color: #166534' : vocab.word_frequency_tier === 'intermediate' ? '#dbeafe; color: #1e40af' : '#fef3c7; color: #92400e'}; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; margin-left: 0.5rem; text-transform: capitalize;">${vocab.word_frequency_tier || 'basic'}</span>
            </div>`;
            if (vocab.sophistication) {
                html += `<div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">Basic: ${vocab.sophistication.basic_words || 0}</span>
                    <span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">Intermediate: ${vocab.sophistication.intermediate_words || 0}</span>
                    <span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">Advanced: ${vocab.sophistication.advanced_words || 0}</span>
                </div>`;
            }
            if (vocab.repetition && vocab.repetition.repeated_words && vocab.repetition.repeated_words.length > 0) {
                html += `<div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0;">
                    <small style="color: #64748b;"><strong>Repeated Words:</strong></small>
                    <div style="display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.25rem;">
                        ${vocab.repetition.repeated_words.slice(0, 5).map(w => `<span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 10px; font-size: 0.65rem;">${w.word} (${w.count})</span>`).join('')}
                    </div>
                </div>`;
            }
            vocabDetailsEl.innerHTML = html;
        }
    } else {
        // Hide section if no NLP data
        if (commSection) commSection.style.display = 'none';
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
    console.log('🔧 Candidate Profile - Setting up navigation...');
    
    // Sidebar Navigation - check if elements exist before adding listeners
    const logoImg = document.getElementById('logoImg');
    const navDashboard = document.getElementById('navDashboard');
    const navJobs = document.getElementById('navJobs');
    const navApplications = document.getElementById('navApplications');
    const navProfile = document.getElementById('navProfile');
    const logoutBtn = document.getElementById('logoutBtn');

    console.log('🔍 Candidate Profile - Found elements:', {
        logoImg: !!logoImg,
        navDashboard: !!navDashboard,
        navJobs: !!navJobs,
        navApplications: !!navApplications,
        navProfile: !!navProfile,
        logoutBtn: !!logoutBtn
    });

    // Logo click - go to dashboard
    if(logoImg) {
        logoImg.style.cursor = 'pointer';
        logoImg.addEventListener('click', () => {
            console.log('🖼️ Logo clicked, going to dashboard');
            window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
        });
    }
    
    if(navDashboard) {
        navDashboard.addEventListener('click', () => {
            console.log('🏠 Dashboard nav clicked');
            window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
        });
    } else {
        console.log('❌ navDashboard not found in candidate profile');
    }
    
    if(navJobs) {
        navJobs.addEventListener('click', () => {
            console.log('💼 Jobs nav clicked');
            window.location.href = CONFIG.PAGES.JOBS;
        });
    }
    
    if(navApplications) {
        navApplications.addEventListener('click', () => {
            console.log('📋 Applications nav clicked');
            window.location.href = CONFIG.PAGES.MY_APPLICATIONS;
        });
    } else {
        console.log('❌ navApplications not found in candidate profile');
    }
    
    // Profile nav item - scroll to top or reload
    if(navProfile) {
        navProfile.addEventListener('click', () => {
            console.log('👤 Profile nav clicked - scrolling to top');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    } else {
        console.log('❌ navProfile not found in candidate profile');
    }

    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                console.log('� Candidate Profile - Logout clicked');
                await customAuth.signOut();
                console.log('✅ Logged out, redirecting to jobs page');
                window.location.href = CONFIG.PAGES.JOBS;
            } catch (err) {
                console.error('❌ Logout failed:', err);
                notify('Logout failed: ' + err.message, 'error');
            }
        });
    } else {
        console.log('❌ logoutBtn not found in candidate profile');
    }
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

// Video Recording Modal Functions
let profileVideoStream = null;
let profileVideoRecorder = null;
let profileVideoChunks = [];
let profileVideoBlob = null;
let profileVideoTimer = null;
let profileVideoRecordingTime = 0;

function openVideoRecordingModal(userId) {
    const modal = document.getElementById('videoRecordingModal');
    const closeBtn = document.getElementById('closeVideoRecordingModal');
    const cancelBtn = document.getElementById('profileCancelRecordingBtn');
    
    if (!modal) return;
    
    // Reset recording state
    resetProfileVideoRecording();
    
    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('active');
    
    // Setup event listeners
    const closeModal = () => {
        stopProfileVideoRecording();
        modal.style.display = 'none';
        modal.classList.remove('active');
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Setup recording buttons
    setupProfileVideoRecording(userId);
}

function setupProfileVideoRecording(userId) {
    const startBtn = document.getElementById('profileStartRecordingBtn');
    const stopBtn = document.getElementById('profileStopRecordingBtn');
    const acceptBtn = document.getElementById('profileAcceptVideoBtn');
    const retakeBtn = document.getElementById('profileRetakeVideoBtn');
    
    if (startBtn) {
        startBtn.addEventListener('click', startProfileVideoRecording);
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopProfileVideoRecording);
    }
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => uploadProfileVideo(userId));
    }
    
    if (retakeBtn) {
        retakeBtn.addEventListener('click', retakeProfileVideo);
    }
}

async function startProfileVideoRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }, 
            audio: true 
        });
        
        profileVideoStream = stream;
        profileVideoChunks = [];
        
        const preview = document.getElementById('profileVideoPreview');
        if (preview) {
            preview.srcObject = stream;
        }
        
        profileVideoRecorder = new MediaRecorder(stream);
        
        profileVideoRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                profileVideoChunks.push(event.data);
            }
        };
        
        profileVideoRecorder.onstop = () => {
            profileVideoBlob = new Blob(profileVideoChunks, { type: 'video/webm' });
            showProfileVideoPreview();
        };
        
        profileVideoRecorder.start();
        startProfileVideoTimer();
        
        // Update UI
        document.getElementById('profileVideoInitialState').style.display = 'none';
        document.getElementById('profileVideoRecordingState').style.display = 'block';
        
    } catch (err) {
        console.error('Camera access error:', err);
        notify('Camera access denied. Please allow camera access to record video.', 'error');
    }
}

function stopProfileVideoRecording() {
    if (profileVideoRecorder && profileVideoRecorder.state !== 'inactive') {
        profileVideoRecorder.stop();
        stopProfileVideoTimer();
    }
    
    if (profileVideoStream) {
        profileVideoStream.getTracks().forEach(track => track.stop());
        profileVideoStream = null;
    }
}

function startProfileVideoTimer() {
    profileVideoRecordingTime = 0;
    updateProfileVideoTimer();
    
    profileVideoTimer = setInterval(() => {
        profileVideoRecordingTime++;
        updateProfileVideoTimer();
    }, 1000);
}

function stopProfileVideoTimer() {
    if (profileVideoTimer) {
        clearInterval(profileVideoTimer);
        profileVideoTimer = null;
    }
}

function updateProfileVideoTimer() {
    const minutes = Math.floor(profileVideoRecordingTime / 60);
    const seconds = profileVideoRecordingTime % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerEl = document.getElementById('profileRecordingTimer');
    if (timerEl) {
        timerEl.textContent = display;
    }
}

function showProfileVideoPreview() {
    const recordedVideo = document.getElementById('profileRecordedVideo');
    if (recordedVideo && profileVideoBlob) {
        recordedVideo.src = URL.createObjectURL(profileVideoBlob);
    }
    
    // Update UI
    document.getElementById('profileVideoRecordingState').style.display = 'none';
    document.getElementById('profileVideoPreviewState').style.display = 'block';
}

function retakeProfileVideo() {
    resetProfileVideoRecording();
    document.getElementById('profileVideoPreviewState').style.display = 'none';
    document.getElementById('profileVideoInitialState').style.display = 'block';
}

function resetProfileVideoRecording() {
    // Stop recording if active
    stopProfileVideoRecording();
    
    // Clear blob
    profileVideoBlob = null;
    profileVideoChunks = [];
    
    // Reset timer
    profileVideoRecordingTime = 0;
    updateProfileVideoTimer();
    
    // Clear video preview
    const preview = document.getElementById('profileVideoPreview');
    if (preview) {
        preview.srcObject = null;
    }
    
    const recordedVideo = document.getElementById('profileRecordedVideo');
    if (recordedVideo) {
        recordedVideo.src = '';
    }
}

async function uploadProfileVideo(userId) {
    if (!profileVideoBlob) {
        notify('No video to upload.', 'error');
        return;
    }
    
    // Check maximum duration (90 seconds)
    if (profileVideoRecordingTime > 90) {
        notify('Video must be no longer than 90 seconds.', 'error');
        return;
    }
    
    try {
        // Show upload progress
        document.getElementById('profileVideoPreviewState').style.display = 'none';
        document.getElementById('profileVideoUploadState').style.display = 'block';
        
        // Create form data
        const formData = new FormData();
        formData.append('file', profileVideoBlob, 'intro-video.webm');
        
        // Upload video using authenticated backend client
        const response = await backendPost('/applicant/upload-intro-video', formData);
        const result = await handleResponse(response);
        
        if (result.ok) {
            notify('Video uploaded successfully!', 'success');
            
            // Close modal
            const modal = document.getElementById('videoRecordingModal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
            
            // Reload profile to show new video
            await loadProfile(userId);
        } else {
            throw new Error(result.message || 'Upload failed');
        }
    } catch (err) {
        console.error('Video upload error:', err);
        notify('Failed to upload video. Please try again.', 'error');
        
        // Show preview state again on error
        document.getElementById('profileVideoUploadState').style.display = 'none';
        document.getElementById('profileVideoPreviewState').style.display = 'block';
    }
}

// Setup Edit Profile button
function setupEditProfileButton() {
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        console.log('🔧 Setting up Edit Profile button');
        editProfileBtn.addEventListener('click', () => {
            console.log('✏️ Edit Profile button clicked');
            // Since edit sections don't exist, redirect to apply form for editing
            window.location.href = CONFIG.PAGES.APPLY_FORM;
        });
        console.log('✅ Edit Profile button setup complete');
    } else {
        console.log('❌ Edit Profile button not found');
    }
}

// Initialize on page load - use single reliable method
console.log('� Adding initialization...');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 DOM loaded, starting checkAuth...');
        checkAuth();
    });
} else {
    console.log('🚀 DOM already loaded, starting checkAuth immediately...');
    checkAuth();
}
