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
let interviewResponses = [];
let isInterviewComplete = false;

function getFallbackQuestions() {
    return [
        "Please introduce yourself in 30 seconds.",
        "What are your key skills and strengths that make you a great candidate?",
        "Why are you interested in this position and what are your career goals?"
    ];
}

function setupInterviewRecording() {
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
    initInterviewCamera();
}

async function initInterviewCamera() {
    const video = document.getElementById('interviewCameraFeed');
    if(!video) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
            audio: true 
        });
        video.srcObject = stream;
        interviewStream = stream;
    } catch(err) {
        notify('Unable to access camera. Please ensure camera permissions are granted.', 'error');
    }
}

function startInterview() {
    const instructionsDiv = document.getElementById('interviewInstructions');
    const questionsDiv = document.getElementById('interviewQuestionsContainer');
    if(instructionsDiv) instructionsDiv.style.display = 'none';
    if(questionsDiv) questionsDiv.style.display = 'block';
    if(interviewQuestions.length === 0) interviewQuestions = getFallbackQuestions();
    const totalQNum = document.getElementById('totalQNum');
    if(totalQNum) totalQNum.textContent = interviewQuestions.length;
    renderQuestion();
}

function renderQuestion() {
    const questionText = document.getElementById('questionText');
    const currentQNum = document.getElementById('currentQNum');
    if(questionText) questionText.textContent = interviewQuestions[currentQuestionIndex];
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
        updateInterviewProgress(60);
        const response = await backendPost('/applicant/upload-interview-response', formData);
        const result = await handleResponse(response);
        updateInterviewProgress(90);
        if(result.data) {
            interviewResponses.push({ 
                question: interviewQuestions[currentQuestionIndex], 
                video_path: result.data.path, 
                video_url: result.data.url, 
                question_index: currentQuestionIndex 
            });
            const responsesInput = document.getElementById('interviewResponses');
            if(responsesInput) responsesInput.value = JSON.stringify(interviewResponses);
        }
        updateInterviewProgress(100);
        await new Promise(resolve => setTimeout(resolve, 500));
        currentQuestionIndex++;
        if(currentQuestionIndex < interviewQuestions.length) renderQuestion();
        else finishInterview();
    } catch(err) {
        notify('Failed to upload answer. Please try again.', 'error');
        if(reviewControls) reviewControls.style.display = 'flex';
        if(uploadProgress) uploadProgress.style.display = 'none';
    }
}

function updateInterviewProgress(percent) {
    const progressBar = document.getElementById('uploadProgressBar');
    const progressPercent = document.getElementById('uploadProgressPercent');
    if(progressBar) progressBar.style.width = `${percent}%`;
    if(progressPercent) progressPercent.textContent = `${percent}%`;
}

function finishInterview() {
    isInterviewComplete = true;
    const questionsDiv = document.getElementById('interviewQuestionsContainer');
    const completedDiv = document.getElementById('interviewCompleted');
    if(questionsDiv) questionsDiv.style.display = 'none';
    if(completedDiv) completedDiv.style.display = 'block';
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

// Export functions for use in application-form.js
export {
    interviewQuestions,
    interviewResponses,
    isInterviewComplete,
    setupInterviewRecording,
    getFallbackQuestions
};
