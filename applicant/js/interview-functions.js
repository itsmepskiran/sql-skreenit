/* -------------------------------------------------------
   INTERVIEW RECORDING FUNCTIONS
   These functions handle the question-based interview flow
------------------------------------------------------- */

// Import dependencies
import { backendPost, handleResponse } from '@shared/js/backend-client.js';
import { notify } from '@shared/js/auth-pages.js';

// Interview state variables
let interviewQuestions = [];
let currentQuestionIndex = 0;
let interviewStream = null;
let interviewRecorder = null;
let interviewRecordedChunks = [];
let interviewRecordingBlob = null;
let interviewRecordingSeconds = 0;
let interviewTimerInterval = null;
let generatedQuestionsFromResume = [];
let interviewResponses = [];
// Store on window object so both interview-functions.js and application-form.js can access it
window.isInterviewComplete = false;
let selectedLanguage = 'auto'; // 'auto' for auto-detection, or specific language code
let supportedLanguages = [];

// Supported Indian Languages for display
const INDIAN_LANGUAGES = [
    { code: 'auto', name: 'Auto-Detect (Recommended)', native: 'स्वचालित पहचान' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'ur', name: 'Urdu', native: 'اردو' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
    { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
    { code: 'en', name: 'English', native: 'English' }
];

function getFallbackQuestions() {
    // Return questions in new format with english and translated
    return [
        { english: "Please introduce yourself in 30 seconds.", translated: "Please introduce yourself in 30 seconds.", language: "en" },
        { english: "What are your key skills and strengths that make you a great candidate?", translated: "What are your key skills and strengths that make you a great candidate?", language: "en" },
        { english: "Why are you interested in this position and what are your career goals?", translated: "Why are you interested in this position and what are your career goals?", language: "en" }
    ];
}

async function loadSupportedLanguages() {
    try {
        const response = await fetch('/api/v1/applicant/supported-languages');
        const result = await response.json();
        if(result.ok && result.data) {
            supportedLanguages = result.data.languages || INDIAN_LANGUAGES.filter(l => l.code !== 'auto');
        }
    } catch(e) {
        console.warn('Failed to load supported languages:', e);
        supportedLanguages = INDIAN_LANGUAGES.filter(l => l.code !== 'auto');
    }
}

function getSelectedLanguageFromStep6() {
    // Get the language selected in Step 6 from dropdown
    const languageSelect = document.getElementById('interviewLanguageSelect');
    const hiddenInput = document.getElementById('selectedInterviewLanguage');
    
    if(languageSelect && languageSelect.value) {
        selectedLanguage = languageSelect.value;
    } else if(hiddenInput && hiddenInput.value) {
        selectedLanguage = hiddenInput.value;
    } else {
        selectedLanguage = 'en'; // Default to English
    }
    
    console.log('Selected interview language:', selectedLanguage);
    return selectedLanguage;
}

async function translateQuestions(questions, targetLang) {
    // If English, no translation needed - just format the questions
    if(targetLang === 'en') {
        return questions.map(q => {
            if(typeof q === 'string') {
                return { english: q, translated: q, language: 'en' };
            }
            return q; // Already in correct format
        });
    }
    
    // Call backend to translate questions with timeout
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await backendPost('/applicant/translate-questions', {
            questions: questions.map(q => typeof q === 'string' ? q : q.english),
            language: targetLang
        });
        
        clearTimeout(timeoutId);
        const result = await handleResponse(response);
        
        if(result.ok && result.data && result.data.questions) {
            console.log(`Questions translated to ${targetLang}`);
            return result.data.questions;
        }
    } catch(e) {
        console.warn('Translation failed or timed out, using English:', e);
    }
    
    // Fallback: return questions in English format
    return questions.map(q => ({
        english: typeof q === 'string' ? q : q.english,
        translated: typeof q === 'string' ? q : q.english,
        language: 'en'
    }));
}

function setupInterviewRecording() {
    console.log('setupInterviewRecording called');
    const startBtn = document.getElementById('startInterviewBtn');
    if(startBtn) startBtn.addEventListener('click', startInterview);
    const startRecordingBtn = document.getElementById('startRecordingBtn');
    const stopRecordingBtn = document.getElementById('stopRecordingBtn');
    const retakeAnswerBtn = document.getElementById('retakeAnswerBtn');
    const submitAnswerBtn = document.getElementById('submitAnswerBtn');
    if(startRecordingBtn) startRecordingBtn.addEventListener('click', startInterviewRecording);
    if(stopRecordingBtn) stopRecordingBtn.addEventListener('click', stopInterviewRecording);
    if(retakeAnswerBtn) retakeAnswerBtn.addEventListener('click', retakeAnswer);
    if(submitAnswerBtn) submitAnswerBtn.addEventListener('click', submitAnswer);
    console.log('Event listeners setup, camera will initialize when interview starts');
}

async function initInterviewCamera() {
    console.log('initInterviewCamera called');
    const video = document.getElementById('interviewCameraFeed');
    if(!video) {
        console.error('Video element not found');
        return;
    }
    
    console.log('Video element found, requesting camera access...');
    console.log('Video element offsetWidth:', video.offsetWidth);
    console.log('Video element offsetHeight:', video.offsetHeight);
    console.log('Video element display:', window.getComputedStyle(video).display);
    console.log('Video element visibility:', window.getComputedStyle(video).visibility);
    console.log('Video element in DOM:', document.body.contains(video));
    const rect = video.getBoundingClientRect();
    console.log('Video element getBoundingClientRect:', rect);
    console.log('Video element clientWidth:', video.clientWidth);
    console.log('Video element clientHeight:', video.clientHeight);
    
    // Check parent container dimensions and force dimensions on entire hierarchy
    const parentContainer = video.parentElement;
    if(parentContainer) {
        console.log('Parent container offsetWidth:', parentContainer.offsetWidth);
        console.log('Parent container offsetHeight:', parentContainer.offsetHeight);
        console.log('Parent container display:', window.getComputedStyle(parentContainer).display);
        // Force parent container (black div) to have dimensions with !important
        parentContainer.style.setProperty('width', '100%', 'important');
        parentContainer.style.setProperty('height', '350px', 'important');
        parentContainer.style.setProperty('min-height', '350px', 'important');
        parentContainer.style.setProperty('display', 'block', 'important');
        
        // Also force dimensions on grandparent (Video Recording Area div)
        const grandparentContainer = parentContainer.parentElement;
        if(grandparentContainer) {
            console.log('Grandparent container offsetWidth:', grandparentContainer.offsetWidth);
            console.log('Grandparent container offsetHeight:', grandparentContainer.offsetHeight);
            grandparentContainer.style.setProperty('width', '100%', 'important');
            grandparentContainer.style.setProperty('min-height', '400px', 'important');
            grandparentContainer.style.setProperty('display', 'block', 'important');
        }
        
        // Also force dimensions on interviewQuestionsContainer
        const questionsContainer = document.getElementById('interviewQuestionsContainer');
        if(questionsContainer) {
            console.log('Questions container offsetWidth:', questionsContainer.offsetWidth);
            console.log('Questions container offsetHeight:', questionsContainer.offsetHeight);
            console.log('Questions container children count:', questionsContainer.children.length);
            console.log('Questions container innerHTML length:', questionsContainer.innerHTML.length);
            questionsContainer.style.setProperty('width', '100%', 'important');
            questionsContainer.style.setProperty('min-height', '500px', 'important');
            questionsContainer.style.setProperty('display', 'block', 'important');
            questionsContainer.style.setProperty('visibility', 'visible', 'important');
            questionsContainer.style.setProperty('opacity', '1', 'important');
        }
        
        // Also force dimensions on step 7 section
        const step7Section = document.getElementById('step7');
        if(step7Section) {
            console.log('Step 7 section offsetWidth:', step7Section.offsetWidth);
            console.log('Step 7 section offsetHeight:', step7Section.offsetHeight);
            console.log('Step 7 section has active class:', step7Section.classList.contains('active'));
            // Add active class if missing
            if(!step7Section.classList.contains('active')) {
                console.log('Adding active class to step 7 section');
                step7Section.classList.add('active');
            }
            // Force step 7 to expand based on content
            step7Section.style.setProperty('width', '100%', 'important');
            step7Section.style.setProperty('height', 'auto', 'important');
            step7Section.style.setProperty('min-height', 'auto', 'important');
            step7Section.style.setProperty('max-height', 'none', 'important');
            step7Section.style.setProperty('display', 'block', 'important');
            step7Section.style.setProperty('overflow', 'visible', 'important');
        }
    }
    
    try {
        // Stop any existing stream
        if(interviewStream) {
            interviewStream.getTracks().forEach(track => track.stop());
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, 
            audio: true 
        });
        
        console.log('Camera stream obtained, setting up video...');
        console.log('Stream tracks:', stream.getTracks().map(t => t.kind));
        
        // Set stream and play
        video.srcObject = stream;
        video.muted = true; // Mute to avoid feedback
        video.playsInline = true;
        
        // Force video element to be visible with static positioning
        video.style.setProperty('position', 'static', 'important');
        video.style.setProperty('width', '100%', 'important');
        video.style.setProperty('height', '350px', 'important');
        video.style.setProperty('max-height', '350px', 'important');
        video.style.setProperty('display', 'block', 'important');
        video.style.setProperty('visibility', 'visible', 'important');
        video.style.setProperty('opacity', '1', 'important');
        video.style.setProperty('background', '#000', 'important');
        video.style.setProperty('transform', 'scaleX(-1)', 'important');
        
        // Wait for video to be ready
        video.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            console.log('Video videoWidth:', video.videoWidth);
            console.log('Video videoHeight:', video.videoHeight);
            console.log('Video readyState:', video.readyState);
            video.play().catch(e => console.warn('Video autoplay issue:', e));
            console.log('Camera initialized successfully');
            console.log('Video element display style:', video.style.display);
        };
        
        video.onplay = () => {
            console.log('Video is now playing');
            console.log('Video element offsetWidth after play:', video.offsetWidth);
            console.log('Video element offsetHeight after play:', video.offsetHeight);
            
            // If video still has 0 dimensions, try to force them with setTimeout
            if(video.offsetWidth === 0 || video.offsetHeight === 0) {
                console.warn('Video element still has 0 dimensions, forcing with setTimeout');
                setTimeout(() => {
                    video.style.width = '640px';
                    video.style.height = '360px';
                    console.log('Video element offsetWidth after setTimeout:', video.offsetWidth);
                    console.log('Video element offsetHeight after setTimeout:', video.offsetHeight);
                }, 100);
            }
        };
        
        video.onerror = (e) => {
            console.error('Video error:', e);
            console.error('Video error code:', video.error?.code);
            console.error('Video error message:', video.error?.message);
        };
        
        interviewStream = stream;
    } catch(err) {
        console.error('Camera access error:', err);
        notify('Unable to access camera. Please ensure camera permissions are granted.', 'error');
    }
}

async function startInterview() {
    const instructionsDiv = document.getElementById('interviewInstructions');
    const questionsDiv = document.getElementById('interviewQuestionsContainer');
    const step7Section = document.getElementById('step7');
    
    if(instructionsDiv) instructionsDiv.style.display = 'none';
    if(step7Section) {
        step7Section.style.setProperty('height', '800px', 'important');
        step7Section.style.setProperty('min-height', '800px', 'important');
        step7Section.style.setProperty('overflow', 'visible', 'important');
    }
    
    // Show the interview modal instead of inline
    const interviewModal = document.getElementById('interviewModal');
    if(interviewModal) interviewModal.style.display = 'block';
    
    // Setup close button handlers
    const closeBtn = document.getElementById('closeInterviewModalBtn');
    const closeCompletedBtn = document.getElementById('closeCompletedBtn');
    if(closeBtn) {
        closeBtn.onclick = () => {
            if(confirm('Are you sure you want to exit the interview? Your progress will be lost.')) {
                resetInterviewState();
                closeInterviewModal();
            }
        };
    }
    if(closeCompletedBtn) {
        closeCompletedBtn.onclick = () => {
            // Just close the modal - don't reset state, user may want to submit application
            closeInterviewModal();
            // Don't auto-submit - let user manually submit when ready
            notify('Interview completed! You can now submit your application.', 'success');
        };
    }
    
    // Wait for browser to render the container before initializing camera
    console.log('Starting interview, waiting for render...');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Initialize camera now that the questions container is visible
    console.log('Starting interview, initializing camera...');
    await initInterviewCamera();
    
    // Get selected language from Step 6
    getSelectedLanguageFromStep6();
    
    // Start with the intro question only
    const introQuestion = [
        { english: "Please introduce yourself in 30 seconds.", translated: "Please introduce yourself in 30 seconds.", language: "en" }
    ];
    setInterviewQuestions(introQuestion);
    
    const totalQNum = document.getElementById('totalQNum');
    if(totalQNum) totalQNum.textContent = '1';
    
    renderQuestion();
}

function closeInterviewModal() {
    const interviewModal = document.getElementById('interviewModal');
    if(interviewModal) interviewModal.style.display = 'none';
    // Don't reset interview state here - keep it intact for form submission
    // State will only be reset when starting a new interview
    
    // Stop and clean up camera stream
    if(interviewStream) {
        interviewStream.getTracks().forEach(track => track.stop());
        interviewStream = null;
    }
}

function resetInterviewState() {
    // Only call this when starting a new interview, not when closing after completion
    currentQuestionIndex = 0;
    interviewQuestions = [];
    interviewResponses = [];
    generatedQuestionsFromResume = [];
    window.isInterviewComplete = false;
}

function renderQuestion() {
    const questionTextEnglish = document.getElementById('questionTextEnglish');
    const questionTextTranslated = document.getElementById('questionTextTranslated');
    const translatedContainer = document.getElementById('questionTranslatedContainer');
    const currentQNum = document.getElementById('currentQNum');
    
    const currentQ = interviewQuestions[currentQuestionIndex];
    
    // Display English question
    if(questionTextEnglish) {
        questionTextEnglish.textContent = currentQ.english || currentQ;
    }
    
    // Display translated question if different from English
    if(questionTextTranslated && translatedContainer) {
        if(currentQ.translated && currentQ.translated !== currentQ.english && selectedLanguage !== 'en') {
            questionTextTranslated.textContent = currentQ.translated;
            translatedContainer.style.display = 'block';
        } else {
            translatedContainer.style.display = 'none';
        }
    }
    
    if(currentQNum) currentQNum.textContent = currentQuestionIndex + 1;
    const dotsContainer = document.getElementById('interviewStepDots');
    if(dotsContainer) {
        dotsContainer.innerHTML = interviewQuestions.map((_, i) => {
            let bgColor = '#e2e8f0';
            if(i === currentQuestionIndex) bgColor = 'var(--primary-color)';
            else if(i < currentQuestionIndex) bgColor = '#22c55e';
            return `<div style="width: 12px; height: 12px; border-radius: 50%; background: ${bgColor};"></div>`;
        }).join('');
    }
    resetInterviewRecordingState();
}

function startInterviewRecording() {
    const video = document.getElementById('interviewCameraFeed');
    if(!video || !interviewStream) { 
        notify('Camera not ready. Please wait...', 'error'); 
        return; 
    }
    interviewRecordedChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const mediaRecorder = new MediaRecorder(interviewStream, { mimeType });
    mediaRecorder.ondataavailable = (event) => { 
        if(event.data.size > 0) interviewRecordedChunks.push(event.data); 
    };
    mediaRecorder.onstop = () => {
        interviewRecordingBlob = new Blob(interviewRecordedChunks, { type: 'video/webm' });
        const playback = document.getElementById('interviewPlaybackFeed');
        const camera = document.getElementById('interviewCameraFeed');
        if(playback) { 
            playback.src = URL.createObjectURL(interviewRecordingBlob); 
            playback.style.display = 'block'; 
        }
        if(camera) camera.style.display = 'none';
        document.getElementById('interviewRecordingControls').style.display = 'none';
        document.getElementById('interviewStopControls').style.display = 'none';
        document.getElementById('interviewReviewControls').style.display = 'flex';
    };
    mediaRecorder.start();
    interviewRecorder = mediaRecorder;
    document.getElementById('interviewRecordingControls').style.display = 'none';
    document.getElementById('interviewStopControls').style.display = 'flex';
    document.getElementById('interviewRecordingIndicator').style.display = 'block';
    startInterviewTimer();
}

function stopInterviewRecording() {
    if(interviewRecorder && interviewRecorder.state !== 'inactive') {
        interviewRecorder.stop();
        stopInterviewTimer();
        document.getElementById('interviewRecordingIndicator').style.display = 'none';
    }
}

function retakeAnswer() {
    resetInterviewRecordingState();
    interviewRecordingBlob = null;
    interviewRecordedChunks = [];
}

function resetInterviewRecordingState() {
    const playback = document.getElementById('interviewPlaybackFeed');
    const camera = document.getElementById('interviewCameraFeed');
    if(playback) { playback.src = ''; playback.style.display = 'none'; }
    if(camera) camera.style.display = 'block';
    const recordingControls = document.getElementById('interviewRecordingControls');
    const stopControls = document.getElementById('interviewStopControls');
    const reviewControls = document.getElementById('interviewReviewControls');
    const uploadProgress = document.getElementById('uploadProgressContainer');
    const recordingIndicator = document.getElementById('interviewRecordingIndicator');
    if(recordingControls) recordingControls.style.display = 'flex';
    if(stopControls) stopControls.style.display = 'none';
    if(reviewControls) reviewControls.style.display = 'none';
    if(uploadProgress) uploadProgress.style.display = 'none';
    if(recordingIndicator) recordingIndicator.style.display = 'none';
    resetInterviewTimer();
}

async function submitAnswer() {
    if(!interviewRecordingBlob) return;
    const uploadProgress = document.getElementById('uploadProgressContainer');
    const reviewControls = document.getElementById('interviewReviewControls');
    if(uploadProgress) uploadProgress.style.display = 'block';
    if(reviewControls) reviewControls.style.display = 'none';
    try {
        updateInterviewProgress(30);
        const formData = new FormData();
        formData.append('video_file', interviewRecordingBlob, `interview_q${currentQuestionIndex}_${Date.now()}.webm`);
        formData.append('question_index', currentQuestionIndex);
        formData.append('question', interviewQuestions[currentQuestionIndex]);
        formData.append('application_id', ''); // Will be filled by backend from user context
        updateInterviewProgress(60);
        const response = await backendPost('/applicant/upload-video-response', formData);
        const result = await handleResponse(response);
        updateInterviewProgress(90);
        if(result.data) {
            // Save to database immediately after upload
            const responsePayload = {
                question: interviewQuestions[currentQuestionIndex],
                video_path: result.data.path,
                video_url: result.data.url,
                question_index: currentQuestionIndex
            };
            
            try {
                const saveResponse = await backendPost('/applicant/save-intro-response', responsePayload);
                await handleResponse(saveResponse);
                console.log('Interview response saved to database successfully');
            } catch (saveError) {
                console.warn('Failed to save response to database, but video was uploaded:', saveError);
            }
            
            interviewResponses.push({ 
                question: interviewQuestions[currentQuestionIndex], 
                video_path: result.data.path, 
                video_url: result.data.url, 
                question_index: currentQuestionIndex,
                language: result.data.language_analysis?.detected_language || selectedLanguage,
                transcription: result.data.language_analysis?.transcription
            });
            const responsesInput = document.getElementById('interviewResponses');
            if(responsesInput) responsesInput.value = JSON.stringify(interviewResponses);
        }
        updateInterviewProgress(100);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // After intro question is submitted, load the generated questions
        if(currentQuestionIndex === 0) {
            console.log('Intro question submitted. Loading generated questions...');
            await loadGeneratedQuestions();
        }
        
        currentQuestionIndex++;
        if(currentQuestionIndex < interviewQuestions.length) renderQuestion();
        else finishInterview();
    } catch(err) {
        notify('Failed to upload answer. Please try again.', 'error');
        if(reviewControls) reviewControls.style.display = 'flex';
        if(uploadProgress) uploadProgress.style.display = 'none';
    }
}

async function loadGeneratedQuestions() {
    // Use the stored generated questions from resume upload
    if(generatedQuestionsFromResume.length > 0) {
        // Keep the intro question as first, then add generated questions
        const introQuestion = interviewQuestions[0];
        interviewQuestions = [introQuestion, ...generatedQuestionsFromResume];
        
        const totalQNum = document.getElementById('totalQNum');
        if(totalQNum) totalQNum.textContent = interviewQuestions.length;
        
        console.log(`Loaded ${generatedQuestionsFromResume.length} generated questions from resume. Total: ${interviewQuestions.length}`);
    } else {
        // Fallback to default questions if no generated questions found
        console.warn('No generated questions found, using fallback');
        const fallbackGenerated = getFallbackQuestions().slice(1); // Get all except first (intro)
        interviewQuestions = interviewQuestions.concat(fallbackGenerated);
        
        const totalQNum = document.getElementById('totalQNum');
        if(totalQNum) totalQNum.textContent = interviewQuestions.length;
    }
}

function updateInterviewProgress(percent) {
    const progressBar = document.getElementById('uploadProgressBar');
    const progressPercent = document.getElementById('uploadProgressPercent');
    if(progressBar) progressBar.style.width = `${percent}%`;
    if(progressPercent) progressPercent.textContent = `${percent}%`;
}

function finishInterview() {
    console.log('finishInterview called, setting isInterviewComplete = true');
    window.isInterviewComplete = true;
    const completedDiv = document.getElementById('interviewCompleted');
    const recordingControls = document.getElementById('interviewRecordingControls');
    const stopControls = document.getElementById('interviewStopControls');
    const reviewControls = document.getElementById('interviewReviewControls');
    const uploadProgress = document.getElementById('uploadProgressContainer');
    
    if(completedDiv) completedDiv.style.display = 'block';
    if(recordingControls) recordingControls.style.display = 'none';
    if(stopControls) stopControls.style.display = 'none';
    if(reviewControls) reviewControls.style.display = 'none';
    if(uploadProgress) uploadProgress.style.display = 'none';
    
    if(interviewStream) interviewStream.getTracks().forEach(track => track.stop());
    notify('Interview completed successfully! You can now submit your application.', 'success');
}

function startInterviewTimer() {
    interviewRecordingSeconds = 0;
    const display = document.getElementById('interviewTimerDisplay');
    if(display) display.textContent = '00:00';
    interviewTimerInterval = setInterval(() => {
        interviewRecordingSeconds++;
        const mins = Math.floor(interviewRecordingSeconds / 60).toString().padStart(2, '0');
        const secs = (interviewRecordingSeconds % 60).toString().padStart(2, '0');
        if(display) display.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopInterviewTimer() { 
    clearInterval(interviewTimerInterval); 
}

function resetInterviewTimer() {
    stopInterviewTimer();
    interviewRecordingSeconds = 0;
    const display = document.getElementById('interviewTimerDisplay');
    if(display) display.textContent = '00:00';
}

// Setter function to update interviewQuestions from other modules
function setInterviewQuestions(questions) {
    interviewQuestions = questions;
    // Store generated questions from resume upload (not intro question)
    // Always store if it's not just the intro question
    if(questions.length > 1) {
        generatedQuestionsFromResume = questions;
        console.log(`Stored ${questions.length} generated questions from resume`);
    } else if(questions.length === 1 && !questions[0].english.includes('introduce yourself')) {
        generatedQuestionsFromResume = questions;
        console.log(`Stored 1 generated question from resume`);
    }
}

// Export functions for use in application-form.js
export {
    interviewQuestions,
    interviewResponses,
    setupInterviewRecording,
    getFallbackQuestions,
    setInterviewQuestions
};
