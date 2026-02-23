import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

// --- State Management ---
let questions = [];
let currentIndex = 0;
let mediaRecorder;
let recordedChunks = [];
let stream;
let applicationId;
let isRecording = false;
let timerInterval;
let seconds = 0;

// --- Initialize Page ---
document.addEventListener('DOMContentLoaded', async () => {
    const isLocal = CONFIG.IS_LOCAL;
    const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
    const logoImg = document.getElementById('logoImg');
    if (logoImg) logoImg.src = `${assetsBase}/assets/images/logo.png`;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = CONFIG.PAGES.LOGIN; return; }

    const urlParams = new URLSearchParams(window.location.search);
    applicationId = urlParams.get('application_id');
    
    if (!applicationId) { 
        alert("Invalid Interview Link."); 
        window.location.href = CONFIG.PAGES.CANDIDATE_DASHBOARD; 
        return; 
    }

    setupControls();
    await loadInterviewData(applicationId);
    await initCamera();
});

async function loadInterviewData(appId) {
    try {
        const res = await backendGet(`/applicant/applications/${appId}/interview`);
        const json = await handleResponse(res);
        
        questions = json.interview_questions || json.questions || (json.data?.questions) || [];
        
        if (!questions.length) {
            alert("No questions found.");
            return;
        }

        toggleDisplay('loadingQuestions', 'none');
        toggleDisplay('instructionContent', 'block'); 
        
        const totalEl = document.getElementById('totalQNum');
        if(totalEl) totalEl.textContent = questions.length;

    } catch (err) {
        console.error("Critical Load Error:", err);
    }
}

// --- INTERVIEW FLOW ---
function startInterview() {
    toggleDisplay('instructionContent', 'none');
    renderQuestion();
}

function renderQuestion() {
    toggleDisplay('questionContent', 'block');
    
    document.getElementById('currentQNum').textContent = currentIndex + 1;
    document.getElementById('questionText').textContent = questions[currentIndex];

    const dotsContainer = document.getElementById('stepDots');
    if (dotsContainer) {
        dotsContainer.innerHTML = questions.map((_, i) => `
            <div class="step-dot ${i === currentIndex ? 'active' : ''} ${i < currentIndex ? 'completed' : ''}"></div>
        `).join('');
    }

    toggleDisplay('cameraFeed', 'block');
    toggleDisplay('playbackFeed', 'none');
    toggleDisplay('recordingControls', 'flex');
    toggleDisplay('reviewControls', 'none');
    resetTimer();
}

// --- TIMER LOGIC ---
function startTimer() {
    seconds = 0;
    const display = document.getElementById('timerDisplay');
    if (display) display.style.display = 'inline';
    
    timerInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        if (display) display.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function resetTimer() {
    stopTimer();
    const display = document.getElementById('timerDisplay');
    if (display) {
        display.textContent = "00:00";
        display.style.display = 'none';
    }
}

// --- CAMERA & RECORDING ---
async function initCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const video = document.getElementById('cameraFeed');
        if (video) video.srcObject = stream;
    } catch (err) {
        alert("Camera access denied.");
    }
}

function toggleRecording() {
    if (!isRecording) startRecording();
    else stopRecording();
}

function startRecording() {
    recordedChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const videoURL = URL.createObjectURL(blob);
        const playback = document.getElementById('playbackFeed');
        if (playback) { playback.src = videoURL; playback.style.display = 'block'; }
        
        toggleDisplay('cameraFeed', 'none');
        toggleDisplay('recordingControls', 'none');
        toggleDisplay('reviewControls', 'flex');
    };

    mediaRecorder.start();
    isRecording = true;
    
    const btn = document.getElementById('recordBtn');
    const txt = document.getElementById('recordBtnText');
    if (btn) btn.classList.add('recording');
    if (txt) txt.textContent = "Stop Recording";
    startTimer();
}

function stopRecording() {
    mediaRecorder.stop();
    isRecording = false;
    const btn = document.getElementById('recordBtn');
    const txt = document.getElementById('recordBtnText');
    if (btn) btn.classList.remove('recording');
    if (txt) txt.textContent = "Start Recording";
    stopTimer();
}

function retakeVideo() {
    toggleDisplay('playbackFeed', 'none');
    toggleDisplay('cameraFeed', 'block');
    toggleDisplay('reviewControls', 'none');
    toggleDisplay('recordingControls', 'flex');
    resetTimer();
}

async function uploadAnswer() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const fileName = `${applicationId}/q_${currentIndex}_${Date.now()}.webm`;
    
    toggleDisplay('uploadProgress', 'block');
    toggleDisplay('reviewControls', 'none');
    
    const bar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressPercent');

    try {
        updateProgress(bar, progressText, 30);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('video-responses')
            .upload(fileName, blob, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw new Error('Failed to upload video to storage');

        updateProgress(bar, progressText, 70);

        const response = await backendPost(
            `/applicant/applications/${applicationId}/response`, 
            {
                question: questions[currentIndex],
                video_path: uploadData.path
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to save response metadata');
        }

        updateProgress(bar, progressText, 100);
        await handleQuestionTransition();

    } catch (error) {
        console.error("Upload failed:", error);
        alert("We couldn't save your response. Please try again.");
        toggleDisplay('uploadProgress', 'none');
        toggleDisplay('reviewControls', 'flex');
    }
}

function updateProgress(bar, textElement, percent) {
    if (bar) bar.style.width = `${percent}%`;
    if (textElement) textElement.textContent = `${percent}%`;
}

async function handleQuestionTransition() {
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    toggleDisplay('uploadProgress', 'none');
    currentIndex++;

    if (currentIndex < questions.length) {
        renderQuestion();
        retakeVideo();
    } else {
        await finishInterview();
    }
}

async function finishInterview() {
    toggleDisplay('questionContent', 'none');
    toggleDisplay('completionContent', 'block');
    
    if (stream) stream.getTracks().forEach(track => track.stop());

    try {
        const res = await backendPost(`/applicant/applications/${applicationId}/finish-interview`, {});
        await handleResponse(res);
    } catch (err) {
        console.error("Failed to update final status", err);
    }
}

function setupControls() {
    const origin = window.location.origin;
    const dashPath = `${origin}/dashboard/candidate-dashboard.html`;

    const actions = {
        'recordBtn': toggleRecording,
        'retakeBtn': retakeVideo,
        'submitAnswerBtn': uploadAnswer,
        'startInterviewBtn': startInterview,
        'exitBtn': () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
            window.location.href = dashPath;
        },
        'backToDashBtn': () => {
            window.location.href = dashPath;
        }
    };
    
    Object.entries(actions).forEach(([id, func]) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', func);
    });
}

function toggleDisplay(id, displayType) {
    const el = document.getElementById(id);
    if (el) el.style.display = displayType;
}