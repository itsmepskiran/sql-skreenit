import { customAuth } from '@shared/js/auth-config.js';
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import { sidebarManager } from '@shared/js/profile-checker.js';
import { initNotifications } from '@shared/js/notification-manager.js';
import '@shared/js/mobile.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

let allReports = [];
let filteredReports = [];

// Initialize
checkAuth();

async function checkAuth() {
    const user = await customAuth.getUserData();
    if (!user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    await sidebarManager.initSidebar();
    if (window.initMobileMenu) window.initMobileMenu();
    
    setupEventListeners();
    initNotifications();
    
    loadAnalysisReports();
}

function setupEventListeners() {
    // Navigation
    document.getElementById('navDashboard')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    document.getElementById('navJobs')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);
    document.getElementById('navApplications')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    document.getElementById('navAnalysis')?.addEventListener('click', () => window.location.href = 'analysis.html');
    document.getElementById('navProfile')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.RECRUITER_PROFILE);
    
    // Back button
    document.getElementById('backBtn')?.addEventListener('click', () => {
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
    });
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => { 
        await customAuth.signOut(); 
        window.location.href = CONFIG.PAGES.JOBS; 
    });
    
    // Search
    document.getElementById('searchInput')?.addEventListener('input', applyFilters);
    document.getElementById('jobFilter')?.addEventListener('change', applyFilters);
    document.getElementById('scoreFilter')?.addEventListener('change', applyFilters);
}

async function loadAnalysisReports() {
    const tableBody = document.getElementById('analysisTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableCard = document.querySelector('.card');
    
    try {
        // Fetch latest analysis reports per application (deduplicated by backend)
        const res = await backendGet('/analytics/latest-reports');
        const data = await handleResponse(res);
        
        // API returns deduplicated reports (one per application)
        allReports = data?.data || [];
        
        // Populate job filter
        populateJobFilter(allReports);
        
        // Update stats
        updateStats(allReports);
        
        // Apply filters and render
        filteredReports = [...allReports];
        renderTable();
        
        // Check URL for application_id parameter (from notification click)
        const urlParams = new URLSearchParams(window.location.search);
        const applicationId = urlParams.get('application_id');
        const taskId = urlParams.get('task_id');
        
        if (applicationId) {
            // Auto-open analysis modal for the specific application
            setTimeout(() => {
                viewAnalysisDetail(applicationId, taskId);
            }, 500);
        }
        
    } catch (err) {
        console.error('Failed to load analysis reports:', err);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="padding: 2rem; text-align: center;">
                        <p class="text-danger">Failed to load reports. Please try again.</p>
                    </td>
                </tr>`;
        }
    }
}

function populateJobFilter(reports) {
    const jobFilter = document.getElementById('jobFilter');
    if (!jobFilter) return;
    
    const jobs = new Map();
    reports.forEach(r => {
        if (r.job_title && !jobs.has(r.job_title)) {
            jobs.set(r.job_title, r.job_id || r.job_title);
        }
    });
    
    jobFilter.innerHTML = '<option value="">All Jobs</option>';
    jobs.forEach((id, title) => {
        jobFilter.innerHTML += `<option value="${id}">${title}</option>`;
    });
}

function updateStats(reports) {
    const total = reports.length;
    const avgScore = total > 0 ? Math.round(reports.reduce((sum, r) => sum + r.avg_score, 0) / total) : 0;
    const avgWpm = total > 0 ? Math.round(reports.reduce((sum, r) => sum + r.avg_wpm, 0) / total) : 0;
    const highScores = reports.filter(r => r.avg_score >= 70).length;
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statAvgScore').textContent = avgScore;
    document.getElementById('statAvgWpm').textContent = avgWpm + ' WPM';
    document.getElementById('statHighScores').textContent = highScores;
}

function applyFilters() {
    const search = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    const jobValue = document.getElementById('jobFilter')?.value || '';
    const scoreValue = document.getElementById('scoreFilter')?.value || '';
    
    filteredReports = allReports.filter(report => {
        // Search filter
        if (search && !report.candidate_name?.toLowerCase().includes(search)) {
            return false;
        }
        
        // Job filter
        if (jobValue && report.job_id !== jobValue && report.job_title !== jobValue) {
            return false;
        }
        
        // Score filter
        if (scoreValue) {
            if (scoreValue === 'high' && report.avg_score < 70) return false;
            if (scoreValue === 'medium' && (report.avg_score < 40 || report.avg_score >= 70)) return false;
            if (scoreValue === 'low' && report.avg_score >= 40) return false;
        }
        
        return true;
    });
    
    renderTable();
}

function renderTable() {
    const container = document.getElementById('analysisListContainer');
    if (!container) return;
    
    if (filteredReports.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 4rem; background: white; border-radius: 16px; border: 2px dashed #e2e8f0;">
                <i class="fas fa-brain fa-3x" style="color: #cbd5e0; margin-bottom: 1rem;"></i>
                <h4 style="color: #1e293b; margin-bottom: 0.5rem;">No analysis reports found</h4>
                <p class="text-muted">Start analyzing video responses from your applications.</p>
                <a href="application-list.html" class="btn btn-primary" style="margin-top: 1rem;">
                    <i class="fas fa-video me-1"></i> Go to Applications
                </a>
            </div>`;
        return;
    }
    
    container.innerHTML = filteredReports.map(report => {
        const scoreClass = report.avg_score >= 70 ? 'score-high' : (report.avg_score >= 40 ? 'score-medium' : 'score-low');
        const appliedDate = report.applied_at ? new Date(report.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent';
        
        const initialsMatch = (report.candidate_name || '').trim().match(/\b\w/g) || [];
        const initials = ((initialsMatch.shift() || '') + (initialsMatch.pop() || '')).toUpperCase() || 'C';
        
        const wpmClass = report.avg_wpm >= 120 && report.avg_wpm <= 150 ? 'metric-good' : (report.avg_wpm >= 100 ? 'metric-average' : 'metric-poor');
        const fillerClass = report.avg_filler <= 5 ? 'metric-good' : (report.avg_filler <= 10 ? 'metric-average' : 'metric-poor');
        const faceClass = report.avg_face >= 80 ? 'metric-good' : (report.avg_face >= 60 ? 'metric-average' : 'metric-poor');
        
        return `
        <div class="analysis-card" onclick="viewAnalysisDetail('${report.application_id}', '${report.task_id}')">
            <div class="candidate-avatar">${initials}</div>
            
            <div class="candidate-info">
                <p class="candidate-name">${report.candidate_name}</p>
                <p class="candidate-meta">
                    <i class="fas fa-briefcase me-1" style="opacity: 0.6;"></i>${report.job_title || 'Position'}
                    <span style="margin: 0 0.5rem; opacity: 0.3;">|</span>
                    <i class="fas fa-calendar me-1" style="opacity: 0.6;"></i>${appliedDate}
                </p>
            </div>
            
            <div class="score-circle ${scoreClass}">${report.avg_score}</div>
            
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <span class="metric-badge ${wpmClass}"><i class="fas fa-microphone me-1"></i>${report.avg_wpm} WPM</span>
                <span class="metric-badge ${fillerClass}"><i class="fas fa-comment-slash me-1"></i>${report.avg_filler} filler</span>
                <span class="metric-badge ${faceClass}"><i class="fas fa-eye me-1"></i>${report.avg_face}%</span>
            </div>
            
            <span class="metric-badge" style="background: #fef3c7; color: #92400e;">
                <i class="fas fa-smile me-1"></i>${report.dominant_emotion}
            </span>
            
            <div class="video-thumbnail">
                <i class="fas fa-play"></i>
            </div>
        </div>`;
    }).join('');
}

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

function getMostFrequent(arr) {
    const counts = {};
    arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
}

// View detailed analysis
window.viewAnalysisDetail = async function(applicationId, taskId) {
    const modal = document.getElementById('analysisModal');
    const content = document.getElementById('analysisModalContent');
    
    if (!modal || !content) {
        console.error('Modal elements not found:', { modal: !!modal, content: !!content });
        return;
    }
    
    // Find the report
    const report = allReports.find(r => r.application_id === applicationId);
    if (!report) {
        console.error('Report not found for application_id:', applicationId);
        content.innerHTML = `<p style="color: #dc2626; text-align: center; padding: 2rem;">Report not found for application ${applicationId}</p>`;
        modal.classList.add('active');
        return;
    }
    
    let html = `
        <div style="margin-bottom: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button onclick="reanalyzeApplication('${applicationId}', event)" style="background: #4338ca; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-sync-alt"></i> Re-Analyze
            </button>
            <button onclick="downloadPDF('${applicationId}', event)" style="background: #059669; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-download"></i> Download PDF Report
            </button>
        </div>
        <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8fafc; border-radius: 8px;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; text-align: center;">
                <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: ${getScoreColor(report.avg_score)};">${report.avg_score} <small style="font-size: 0.9rem;">(${scoreToGrade(report.avg_score).grade})</small></div>
                    <small style="color: #64748b;">Avg Score</small>
                </div>
                <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #059669;">${report.avg_wpm}</div>
                    <small style="color: #64748b;">Avg WPM</small>
                </div>
                <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #d97706;">${report.avg_filler}</div>
                    <small style="color: #64748b;">Avg Fillers</small>
                </div>
                <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #7c3aed;">${report.avg_face}%</div>
                    <small style="color: #64748b;">Avg Face</small>
                </div>
            </div>
        </div>
        <h4 style="margin-bottom: 1rem; color: #334155;">Question-by-Question Analysis</h4>`;
    
    // Add each question analysis
    if (report.analyses && report.analyses.length > 0) {
        report.analyses.forEach((a, idx) => {
            const analysis = a.analysis;
            const summary = analysis?.summary;
            const nlp = analysis?.nlp_analysis;
            
            html += `
                <div style="margin-bottom: 1rem; padding: 1rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h5 style="margin: 0 0 0.75rem 0; color: #334155;">
                        <span style="background: #4338ca; color: white; padding: 4px 10px; border-radius: 4px; margin-right: 8px; font-size: 0.8rem;">Q${a.question_index + 1}</span>
                        ${a.question || 'Question'}
                        ${a.cached ? '<span class="badge ms-2" style="background: #dbeafe; color: #1e40af;">Cached</span>' : ''}
                    </h5>`;
            
            if (summary) {
                html += `
                    <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem; margin-bottom: 0.75rem;">
                        <div style="text-align: center; padding: 0.5rem; background: #f8fafc; border-radius: 6px;">
                            <div style="font-weight: bold; color: ${getScoreColor(summary.overall_score || 0)};">${summary.overall_score || 0} <small>(${scoreToGrade(summary.overall_score || 0).grade})</small></div>
                            <small style="color: #64748b; font-size: 0.7rem;">Score</small>
                        </div>
                        <div style="text-align: center; padding: 0.5rem; background: #f8fafc; border-radius: 6px;">
                            <div style="font-weight: bold; color: #059669;">${summary.speaking_pace || 0}</div>
                            <small style="color: #64748b; font-size: 0.7rem;">WPM</small>
                        </div>
                        <div style="text-align: center; padding: 0.5rem; background: #f8fafc; border-radius: 6px;">
                            <div style="font-weight: bold; color: #d97706;">${summary.filler_words || 0}</div>
                            <small style="color: #64748b; font-size: 0.7rem;">Fillers</small>
                        </div>
                        <div style="text-align: center; padding: 0.5rem; background: #f8fafc; border-radius: 6px;">
                            <div style="font-weight: bold; color: #7c3aed;">${summary.face_presence || 0}%</div>
                            <small style="color: #64748b; font-size: 0.7rem;">Face</small>
                        </div>
                        <div style="text-align: center; padding: 0.5rem; background: #f8fafc; border-radius: 6px;">
                            <div style="font-weight: bold; color: ${getScoreColor(summary.confidence_score || 0)};">${summary.confidence_score || 0}</div>
                            <small style="color: #64748b; font-size: 0.7rem;">Confidence</small>
                        </div>
                        <div style="text-align: center; padding: 0.5rem; background: #f8fafc; border-radius: 6px;">
                            <div style="font-weight: bold; color: #334155;">${summary.word_count || 0}</div>
                            <small style="color: #64748b; font-size: 0.7rem;">Words</small>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="badge" style="background: #fef3c7; color: #92400e;">
                            <i class="fas fa-smile me-1"></i>${summary.dominant_emotion || 'N/A'}
                        </span>
                        <span class="badge" style="background: #dbeafe; color: #1e40af;">
                            <i class="fas fa-clock me-1"></i>${summary.duration || 0}s
                        </span>
                    </div>`;
                
                // NLP Analysis - Communication Skills Section
                if (nlp && nlp.communication_skills && nlp.communication_skills.score > 0) {
                    const comm = nlp.communication_skills;
                    const grammar = nlp.grammar || {};
                    const vocab = nlp.vocabulary || {};
                    const sentences = nlp.sentence_formation || {};
                    
                    html += `
                        <div style="margin-top: 0.75rem; padding: 0.75rem; background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border-radius: 8px; border: 1px solid #e0e7ff;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <strong style="color: #1e40af;"><i class="fas fa-comments me-1"></i>Communication Skills</strong>
                                <span style="background: ${getScoreColor(comm.score)}; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold;">
                                    ${comm.score}/100 (${scoreToGrade(comm.score).grade})
                                </span>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 0.5rem;">
                                <div style="text-align: center; padding: 0.4rem; background: white; border-radius: 4px;">
                                    <div style="font-weight: bold; color: ${getScoreColor(grammar.score || 0)};">${grammar.score || 0} <small>(${scoreToGrade(grammar.score || 0).grade})</small></div>
                                    <small style="color: #64748b; font-size: 0.7rem;">Grammar</small>
                                </div>
                                <div style="text-align: center; padding: 0.4rem; background: white; border-radius: 4px;">
                                    <div style="font-weight: bold; color: ${getScoreColor(sentences.score || 0)};">${sentences.score || 0} <small>(${scoreToGrade(sentences.score || 0).grade})</small></div>
                                    <small style="color: #64748b; font-size: 0.7rem;">Sentences</small>
                                </div>
                                <div style="text-align: center; padding: 0.4rem; background: white; border-radius: 4px;">
                                    <div style="font-weight: bold; color: ${getScoreColor(vocab.score || 0)};">${vocab.score || 0} <small>(${scoreToGrade(vocab.score || 0).grade})</small></div>
                                    <small style="color: #64748b; font-size: 0.7rem;">Vocabulary</small>
                                </div>
                                <div style="text-align: center; padding: 0.4rem; background: white; border-radius: 4px;">
                                    <div style="font-weight: bold; color: #7c3aed;">${comm.level || 'N/A'}</div>
                                    <small style="color: #64748b; font-size: 0.7rem;">Level</small>
                                </div>
                            </div>
                            ${comm.strengths && comm.strengths.length > 0 ? `
                                <div style="margin-bottom: 0.25rem;">
                                    <small style="color: #059669;"><i class="fas fa-check-circle me-1"></i><strong>Strengths:</strong> ${comm.strengths.join(', ')}</small>
                                </div>
                            ` : ''}
                            ${comm.areas_for_improvement && comm.areas_for_improvement.length > 0 ? `
                                <div>
                                    <small style="color: #d97706;"><i class="fas fa-lightbulb me-1"></i><strong>Improve:</strong> ${comm.areas_for_improvement.join(', ')}</small>
                                </div>
                            ` : ''}
                            
                            <!-- Grammar Details -->
                            ${grammar.error_count !== undefined ? `
                            <details style="margin-top: 0.5rem;">
                                <summary style="cursor: pointer; color: #334155; font-size: 0.8rem; padding: 0.25rem 0;">
                                    <i class="fas fa-spell-check me-1"></i><strong>Grammar Details</strong>
                                </summary>
                                <div style="margin-top: 0.5rem; padding: 0.5rem; background: white; border-radius: 4px; font-size: 0.75rem;">
                                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.25rem;">
                                        <div><span style="color: #64748b;">Errors:</span> <strong>${grammar.error_count || 0}</strong></div>
                                        <div><span style="color: #64748b;">Per 100 words:</span> <strong>${grammar.errors_per_100_words || 0}</strong></div>
                                    </div>
                                    ${grammar.error_breakdown ? `
                                    <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                        <span class="badge" style="background: #fee2e2; color: #991b1b;">Spelling: ${grammar.error_breakdown.spelling || 0}</span>
                                        <span class="badge" style="background: #fef3c7; color: #92400e;">Grammar: ${grammar.error_breakdown.grammar || 0}</span>
                                        <span class="badge" style="background: #dbeafe; color: #1e40af;">Punctuation: ${grammar.error_breakdown.punctuation || 0}</span>
                                        <span class="badge" style="background: #f3e8ff; color: #7c3aed;">Style: ${grammar.error_breakdown.style || 0}</span>
                                    </div>
                                    ` : ''}
                                </div>
                            </details>
                            ` : ''}
                            
                            <!-- Sentence Formation Details -->
                            ${sentences.total_sentences !== undefined ? `
                            <details style="margin-top: 0.25rem;">
                                <summary style="cursor: pointer; color: #334155; font-size: 0.8rem; padding: 0.25rem 0;">
                                    <i class="fas fa-align-left me-1"></i><strong>Sentence Formation</strong>
                                </summary>
                                <div style="margin-top: 0.5rem; padding: 0.5rem; background: white; border-radius: 4px; font-size: 0.75rem;">
                                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.25rem;">
                                        <div><span style="color: #64748b;">Sentences:</span> <strong>${sentences.total_sentences || 0}</strong></div>
                                        <div><span style="color: #64748b;">Avg Length:</span> <strong>${sentences.avg_sentence_length || 0} words</strong></div>
                                        <div><span style="color: #64748b;">Complexity:</span> <strong style="text-transform: capitalize;">${sentences.complexity || 'N/A'}</strong></div>
                                    </div>
                                    ${sentences.sentence_types ? `
                                    <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                        <span class="badge" style="background: #dcfce7; color: #166534;">Simple: ${sentences.sentence_types.simple || 0}</span>
                                        <span class="badge" style="background: #dbeafe; color: #1e40af;">Compound: ${sentences.sentence_types.compound || 0}</span>
                                        <span class="badge" style="background: #f3e8ff; color: #7c3aed;">Complex: ${sentences.sentence_types.complex || 0}</span>
                                        ${sentences.sentence_types.fragment > 0 ? `<span class="badge" style="background: #fee2e2; color: #991b1b;">Fragments: ${sentences.sentence_types.fragment}</span>` : ''}
                                    </div>
                                    ` : ''}
                                    ${sentences.readability ? `
                                    <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0;">
                                        <small style="color: #64748b;"><strong>Readability:</strong></small>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.25rem; margin-top: 0.25rem;">
                                            <div><span style="color: #64748b;">Flesch-Kincaid:</span> ${sentences.readability.flesch_kincaid_grade || 'N/A'}</div>
                                            <div><span style="color: #64748b;">Reading Ease:</span> ${sentences.readability.flesch_reading_ease || 'N/A'}</div>
                                        </div>
                                    </div>
                                    ` : ''}
                                </div>
                            </details>
                            ` : ''}
                            
                            <!-- Vocabulary Details -->
                            ${vocab.total_words !== undefined ? `
                            <details style="margin-top: 0.25rem;">
                                <summary style="cursor: pointer; color: #334155; font-size: 0.8rem; padding: 0.25rem 0;">
                                    <i class="fas fa-book me-1"></i><strong>Vocabulary</strong>
                                </summary>
                                <div style="margin-top: 0.5rem; padding: 0.5rem; background: white; border-radius: 4px; font-size: 0.75rem;">
                                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.25rem;">
                                        <div><span style="color: #64748b;">Total Words:</span> <strong>${vocab.total_words || 0}</strong></div>
                                        <div><span style="color: #64748b;">Unique:</span> <strong>${vocab.unique_words || 0}</strong></div>
                                        <div><span style="color: #64748b;">Diversity:</span> <strong>${vocab.diversity_score || 0}%</strong></div>
                                    </div>
                                    <div style="margin-top: 0.25rem;">
                                        <span style="color: #64748b;">Type-Token Ratio:</span> <strong>${vocab.type_token_ratio || 0}</strong>
                                        <span class="badge ms-2" style="background: ${vocab.word_frequency_tier === 'advanced' ? '#dcfce7; color: #166534' : vocab.word_frequency_tier === 'intermediate' ? '#dbeafe; color: #1e40af' : '#fef3c7; color: #92400e'}; text-transform: capitalize;">${vocab.word_frequency_tier || 'basic'}</span>
                                    </div>
                                    ${vocab.sophistication ? `
                                    <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                        <span class="badge" style="background: #fef3c7; color: #92400e;">Basic: ${vocab.sophistication.basic_words || 0}</span>
                                        <span class="badge" style="background: #dbeafe; color: #1e40af;">Intermediate: ${vocab.sophistication.intermediate_words || 0}</span>
                                        <span class="badge" style="background: #dcfce7; color: #166534;">Advanced: ${vocab.sophistication.advanced_words || 0}</span>
                                    </div>
                                    ` : ''}
                                    ${vocab.repetition && vocab.repetition.repeated_words && vocab.repetition.repeated_words.length > 0 ? `
                                    <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0;">
                                        <small style="color: #64748b;"><strong>Repeated Words:</strong></small>
                                        <div style="display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.25rem;">
                                            ${vocab.repetition.repeated_words.slice(0, 5).map(w => `<span class="badge" style="background: #f1f5f9; color: #475569;">${w.word} (${w.count})</span>`).join('')}
                                        </div>
                                    </div>
                                    ` : ''}
                                </div>
                            </details>
                            ` : ''}
                        </div>`;
                }
                
                // Transcript
                if (analysis?.transcription?.transcript) {
                    const transcript = analysis.transcription.transcript;
                    html += `
                        <div style="margin-top: 0.75rem; padding: 0.75rem; background: #f8fafc; border-radius: 6px; font-size: 0.85rem; color: #475569;">
                            <strong>Transcript:</strong>
                            <p style="margin: 0.5rem 0 0; white-space: pre-wrap;">${transcript.substring(0, 200)}${transcript.length > 200 ? '...' : ''}</p>
                        </div>`;
                }
            } else if (a.error) {
                html += `<p style="color: #dc2626;"><i class="fas fa-exclamation-triangle me-1"></i>Error: ${a.error}</p>`;
            } else {
                html += `<p style="color: #64748b;">No analysis available</p>`;
            }
            
            html += `</div>`;
        });
    }
    
    content.innerHTML = html;
    modal.classList.add('active');
};

// Download PDF Report
window.downloadPDF = async function(applicationId, event) {
    try {
        // Get token from auth system
        const { customAuth } = await import('@shared/js/auth-config.js');
        const { CONFIG } = await import('@shared/js/config.js');
        const session = await customAuth.getSession();
        const token = session?.data?.session?.access_token;
        
        if (!token) {
            alert('Please log in to download reports.');
            return;
        }
        
        // Show loading state
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        btn.disabled = true;
        
        const response = await fetch(`${CONFIG.API_BASE}/analytics/download-report/${applicationId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // Try to parse error, but handle non-JSON responses
            let errorMessage = 'Failed to generate PDF';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                // Response wasn't JSON - likely HTML error page
                errorMessage = `Server error (${response.status}): ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        // Get the PDF blob
        const blob = await response.blob();
        
        // Check if we actually got a PDF
        if (blob.type !== 'application/pdf' && blob.size < 1000) {
            throw new Error('Invalid PDF response from server');
        }
        
        // Get filename from Content-Disposition header
        const disposition = response.headers.get('Content-Disposition');
        let filename = 'analysis_report.pdf';
        if (disposition) {
            const match = disposition.match(/filename="(.+)"/);
            if (match) filename = match[1];
        }
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Reset button
        btn.innerHTML = originalText;
        btn.disabled = false;
        
    } catch (error) {
        console.error('PDF download failed:', error);
        alert('Failed to download PDF: ' + error.message);
        
        // Reset button
        const btn = event.target.closest('button');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-download"></i> Download PDF Report';
            btn.disabled = false;
        }
    }
};

// Re-analyze Application (force fresh analysis)
window.reanalyzeApplication = async function(applicationId, event) {
    try {
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
        btn.disabled = true;
        
        // Show toast notification immediately when clicking Re-Analyze
        showAnalysisToast('Re-analysis started! You will be notified when complete.');
        
        // Close modal
        const modal = document.getElementById('analysisModal');
        if (modal) modal.classList.remove('active');
        
        const response = await backendPost(`/analytics/reanalyze/${applicationId}`, null, { timeout: 0 });
        const result = await handleResponse(response);
        
        if (result.ok) {
            btn.innerHTML = '<i class="fas fa-check"></i> Analysis Started';
            btn.style.background = '#059669';
            
            // Reload reports after a delay
            setTimeout(() => {
                loadAnalysisReports();
            }, 2000);
        } else {
            throw new Error(result.detail || 'Failed to start re-analysis');
        }
        
    } catch (error) {
        console.error('Re-analysis failed:', error);
        alert('Failed to start re-analysis: ' + error.message);
        
        const btn = event.target.closest('button');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Re-Analyze';
            btn.disabled = false;
            btn.style.background = '#4338ca';
        }
    }
};

// Toast notification for analysis actions
function showAnalysisToast(message) {
    // Remove existing toast if any
    const existingToast = document.getElementById('analysisToast');
    if (existingToast) existingToast.remove();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'analysisToast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1e293b;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 350px;
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-check-circle" style="color: #10b981; font-size: 20px;"></i>
            <span style="font-size: 14px;">${message}</span>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="toastCloseBtn" style="
                background: #374151;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
            ">Close</button>
            <button id="toastDashboardBtn" style="
                background: #4338ca;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
            ">Back to Dashboard</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Button handlers
    document.getElementById('toastCloseBtn').addEventListener('click', () => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    });
    
    document.getElementById('toastDashboardBtn').addEventListener('click', () => {
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER || '/dashboard/recruiter-dashboard.html';
    });
    
    // Auto-close after 10 seconds
    setTimeout(() => {
        if (document.getElementById('analysisToast')) {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 10000);
}
