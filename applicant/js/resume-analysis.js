import { backendPost, handleResponse } from '@shared/js/backend-client.js';
import { showSuccess, showWarning, showError } from '@shared/js/notification-manager.js';

// Resume Analysis State
let resumeAnalysisData = null;
let selectedTemplate = null;
let currentResumeFile = null;
let availableTemplates = [];

/* -------------------------------------------------------
   RESUME ANALYSIS FUNCTIONS
------------------------------------------------------- */

/**
 * Analyze uploaded resume and show recommendations
 */
async function analyzeResume(file) {
    currentResumeFile = file;
    
    try {
        // Show loading state
        showResumeAnalysisLoading();
        
        // Call backend resume analysis API
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await backendPost('/resume-analysis/analyze', formData);
        const result = await handleResponse(response);
        
        if (result.success) {
            resumeAnalysisData = result;
            await showResumeAnalysisResults(result);
            
            // Also get available templates
            await getAvailableTemplates();
        } else {
            throw new Error(result.message || 'Resume analysis failed');
        }
        
    } catch (error) {
        console.error('Resume analysis error:', error);
        showError('errorBox', 'Failed to analyze resume. Please try again.', 'Analysis Error');
        hideResumeAnalysisModal();
    }
}

/**
 * Get available resume templates from backend
 */
async function getAvailableTemplates() {
    try {
        const response = await backendGet('/resume-analysis/formats');
        const result = await handleResponse(response);

        if (result.formats) {
            availableTemplates = Object.entries(result.formats).map(([key, template]) => ({
                id: key,
                ...template
            }));

            // Filter templates based on analysis recommendations
            const recommendedTemplates = getRecommendedTemplates(resumeAnalysisData);
            displayTemplates(recommendedTemplates);
        }
    } catch (error) {
        console.error('Error getting templates:', error);
        // Use fallback templates
        availableTemplates = getFallbackTemplates();
        displayTemplates(availableTemplates);
    }
}

/**
 * Get recommended templates based on analysis
 */
function getRecommendedTemplates(analysisData) {
    const recommendations = [];
    
    // Always include modern template as default
    recommendations.push(availableTemplates.find(t => t.id === 'modern'));
    
    // Add ATS template if score is low
    if (analysisData.overall_score < 70) {
        recommendations.push(availableTemplates.find(t => t.id === 'ats'));
    }
    
    // Add creative template if skills suggest creative role
    const creativeSkills = ['design', 'ui', 'ux', 'creative', 'art', 'animation'];
    const hasCreativeSkills = creativeSkills.some(skill => 
        resumeAnalysisData.parsed_data.skills.some(s => s.toLowerCase().includes(skill))
    );
    
    if (hasCreativeSkills) {
        recommendations.push(availableTemplates.find(t => t.id === 'creative'));
    }
    
    // Add traditional template for conservative fields
    const conservativeFields = ['finance', 'banking', 'legal', 'government', 'education'];
    const hasConservativeField = conservativeFields.some(field =>
        resumeAnalysisData.parsed_data.raw_text.toLowerCase().includes(field)
    );
    
    if (hasConservativeField) {
        recommendations.push(availableTemplates.find(t => t.id === 'traditional'));
    }
    
    return recommendations.filter(Boolean).slice(0, 3); // Max 3 recommendations
}

/**
 * Get fallback templates if API fails
 */
function getFallbackTemplates() {
    return [
        {
            id: 'modern',
            name: 'Modern Professional',
            description: 'Clean, contemporary format with clear sections',
            features: ['Contact info at top', 'Professional summary', 'Bullet points', 'Clean layout']
        },
        {
            id: 'ats',
            name: 'ATS Optimized',
            description: 'Optimized for Applicant Tracking Systems',
            features: ['Simple formatting', 'Keyword optimization', 'Standard headings', 'No tables/columns']
        },
        {
            id: 'traditional',
            name: 'Traditional Conservative',
            description: 'Classic format for traditional industries',
            features: ['Formal structure', 'Objective statement', 'Chronological order', 'Standard fonts']
        }
    ];
}

/**
 * Show resume analysis modal with loading state
 */
function showResumeAnalysisLoading() {
    const modal = document.getElementById('resumeAnalysisModal');
    const overallScore = document.getElementById('overallScore');
    const scoreInterpretation = document.getElementById('scoreInterpretation');
    const formatIssuesList = document.getElementById('formatIssuesList');
    const templatesList = document.getElementById('templatesList');
    
    if (modal) {
        modal.style.display = 'flex';
        
        // Show loading state
        if (overallScore) {
            overallScore.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            overallScore.style.background = '#94a3b8';
        }
        
        if (scoreInterpretation) {
            scoreInterpretation.textContent = 'Analyzing your resume...';
        }
        
        if (formatIssuesList) {
            formatIssuesList.innerHTML = '<div class="loading-placeholder">Analyzing format...</div>';
        }
        
        if (templatesList) {
            templatesList.innerHTML = '<div class="loading-placeholder">Loading templates...</div>';
        }
    }
}

/**
 * Show resume analysis results
 */
async function showResumeAnalysisResults(analysisData) {
    const overallScore = document.getElementById('overallScore');
    const scoreInterpretation = document.getElementById('scoreInterpretation');
    const formatIssuesList = document.getElementById('formatIssuesList');
    
    // Update score
    if (overallScore) {
        const score = Math.round(analysisData.overall_score);
        overallScore.textContent = score;
        overallScore.style.background = getScoreColor(score);
    }
    
    // Update score interpretation
    if (scoreInterpretation) {
        scoreInterpretation.textContent = getScoreInterpretation(analysisData.overall_score);
    }
    
    // Display format issues
    if (formatIssuesList && analysisData.format_issues.length > 0) {
        formatIssuesList.innerHTML = analysisData.format_issues
            .map(issue => `
                <div class="issue-item" style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 0.75rem; margin-bottom: 0.5rem;">
                    <i class="fas fa-exclamation-circle" style="color: #f59e0b; margin-right: 8px;"></i>
                    <span style="color: #92400e;">${issue}</span>
                </div>
            `)
            .join('');
    } else if (formatIssuesList) {
        formatIssuesList.innerHTML = `
            <div class="issue-item" style="background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 6px; padding: 0.75rem;">
                <i class="fas fa-check-circle" style="color: #10b981; margin-right: 8px;"></i>
                <span style="color: #065f46;">Great! No major format issues found.</span>
            </div>
        `;
    }
}

/**
 * Display template options
 */
function displayTemplates(templates) {
    const templatesList = document.getElementById('templatesList');
    
    if (templatesList) {
        templatesList.innerHTML = templates
            .map(template => `
                <div class="template-card" data-template-id="${template.id}" style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; cursor: pointer; transition: all 0.3s ease;">
                    <div class="template-header" style="margin-bottom: 1rem;">
                        <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-dark);">${template.name}</h4>
                        <div class="template-badge" style="background: var(--primary-color); color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; display: inline-block; margin-top: 0.5rem;">
                            RECOMMENDED
                        </div>
                    </div>
                    <p style="margin: 0 0 1rem 0; color: var(--text-light); font-size: 0.9rem; line-height: 1.5;">
                        ${template.description}
                    </p>
                    <div class="template-features" style="margin-bottom: 1rem;">
                        ${template.features ? template.features.map(feature => `
                            <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                                <i class="fas fa-check" style="color: #10b981; margin-right: 8px; font-size: 0.8rem;"></i>
                                <span style="color: var(--text-light); font-size: 0.85rem;">${feature}</span>
                            </div>
                        `).join('') : ''}
                    </div>
                    <button class="btn btn-primary btn-sm preview-template-btn" data-template-id="${template.id}" style="width: 100%;">
                        <i class="fas fa-eye" style="margin-right: 8px;"></i>
                        Preview Template
                    </button>
                </div>
            `)
            .join('');
        
        // Add click handlers
        templatesList.querySelectorAll('.preview-template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const templateId = btn.dataset.templateId;
                previewTemplate(templateId);
            });
        });
        
        templatesList.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                const templateId = card.dataset.templateId;
                previewTemplate(templateId);
            });
        });
    }
}

/**
 * Preview selected template with resume data
 */
async function previewTemplate(templateId) {
    try {
        selectedTemplate = availableTemplates.find(t => t.id === templateId);
        
        if (!selectedTemplate) {
            throw new Error('Template not found');
        }
        
        // Show loading state in preview
        const previewSection = document.getElementById('templatePreviewSection');
        const templatePreview = document.getElementById('templatePreview');
        const templateRecommendations = document.getElementById('templateRecommendations');
        const analysisActions = document.getElementById('analysisActions');
        
        if (previewSection && templatePreview) {
            previewSection.style.display = 'block';
            templatePreview.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i><p style="margin-top: 1rem;">Generating preview...</p></div>';
            
            // Hide other sections
            if (templateRecommendations) templateRecommendations.style.display = 'none';
            if (analysisActions) analysisActions.style.display = 'none';
        }
        
        // Generate template preview with resume data
        const previewHtml = await generateTemplatePreview(selectedTemplate.id, resumeAnalysisData.parsed_data);
        
        if (templatePreview) {
            templatePreview.innerHTML = previewHtml;
        }
        
    } catch (error) {
        console.error('Error generating template preview:', error);
        const templatePreview = document.getElementById('templatePreview');
        if (templatePreview) {
            templatePreview.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ef4444;"><i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i><p style="margin-top: 1rem;">Failed to generate preview. Please try again.</p></div>';
        }
    }
}

/**
 * Generate template preview HTML with resume data
 */
async function generateTemplatePreview(templateId, parsedData) {
    const templates = {
        modern: generateModernTemplate,
        ats: generateATSTemplate,
        traditional: generateTraditionalTemplate,
        creative: generateCreativeTemplate
    };
    
    const generator = templates[templateId] || templates.modern;
    return generator(parsedData);
}

/**
 * Generate modern template preview
 */
function generateModernTemplate(data) {
    const contact = data.contact_info || {};
    const sections = data.sections || {};
    const skills = data.skills || [];
    
    return `
        <div style="font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.6; color: #333;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #2563eb;">
                <h1 style="margin: 0; font-size: 2rem; color: #1e40af; font-weight: 600;">YOUR NAME</h1>
                <div style="margin-top: 0.5rem; color: #64748b;">
                    ${contact.emails?.[0] || 'email@example.com'} • ${contact.phones?.[0] || '+1 234-567-8900'}
                    ${contact.linkedin?.[0] ? `• ${contact.linkedin[0]}` : ''}
                </div>
            </div>
            
            <!-- Summary -->
            ${sections.summary ? `
                <div style="margin-bottom: 2rem;">
                    <h2 style="color: #1e40af; font-size: 1.2rem; margin-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">Professional Summary</h2>
                    <p style="margin: 0;">${sections.summary}</p>
                </div>
            ` : ''}
            
            <!-- Experience -->
            ${sections.experience ? `
                <div style="margin-bottom: 2rem;">
                    <h2 style="color: #1e40af; font-size: 1.2rem; margin-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">Professional Experience</h2>
                    <div style="white-space: pre-line;">${sections.experience}</div>
                </div>
            ` : ''}
            
            <!-- Education -->
            ${sections.education ? `
                <div style="margin-bottom: 2rem;">
                    <h2 style="color: #1e40af; font-size: 1.2rem; margin-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">Education</h2>
                    <div style="white-space: pre-line;">${sections.education}</div>
                </div>
            ` : ''}
            
            <!-- Skills -->
            ${skills.length > 0 ? `
                <div style="margin-bottom: 2rem;">
                    <h2 style="color: #1e40af; font-size: 1.2rem; margin-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">Technical Skills</h2>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${skills.map(skill => `
                            <span style="background: #e0e7ff; color: #3730a3; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem;">${skill}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Generate ATS-optimized template preview
 */
function generateATSTemplate(data) {
    const contact = data.contact_info || {};
    const sections = data.sections || {};
    const skills = data.skills || [];
    
    return `
        <div style="font-family: 'Times New Roman', serif; line-height: 1.5; color: #000;">
            <!-- Header -->
            <div style="margin-bottom: 1rem;">
                <h1 style="margin: 0; font-size: 16pt; font-weight: bold;">YOUR NAME</h1>
                <div style="margin-top: 0.25rem;">
                    ${contact.emails?.[0] || 'email@example.com'} | ${contact.phones?.[0] || '+1 234-567-8900'}
                    ${contact.linkedin?.[0] ? ` | ${contact.linkedin[0]}` : ''}
                </div>
            </div>
            
            <!-- Summary -->
            ${sections.summary ? `
                <div style="margin-bottom: 1rem;">
                    <h2 style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">PROFESSIONAL SUMMARY</h2>
                    <p style="margin: 0;">${sections.summary}</p>
                </div>
            ` : ''}
            
            <!-- Experience -->
            ${sections.experience ? `
                <div style="margin-bottom: 1rem;">
                    <h2 style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">PROFESSIONAL EXPERIENCE</h2>
                    <div style="white-space: pre-line;">${sections.experience}</div>
                </div>
            ` : ''}
            
            <!-- Education -->
            ${sections.education ? `
                <div style="margin-bottom: 1rem;">
                    <h2 style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">EDUCATION</h2>
                    <div style="white-space: pre-line;">${sections.education}</div>
                </div>
            ` : ''}
            
            <!-- Skills -->
            ${skills.length > 0 ? `
                <div style="margin-bottom: 1rem;">
                    <h2 style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">TECHNICAL SKILLS</h2>
                    <p style="margin: 0;">${skills.join(', ')}</p>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Generate traditional template preview
 */
function generateTraditionalTemplate(data) {
    const contact = data.contact_info || {};
    const sections = data.sections || {};
    const skills = data.skills || [];
    
    return `
        <div style="font-family: 'Times New Roman', serif; line-height: 1.6; color: #000;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 2rem;">
                <h1 style="margin: 0; font-size: 18pt; font-weight: bold;">YOUR NAME</h1>
                <div style="margin-top: 0.5rem;">
                    ${contact.emails?.[0] || 'email@example.com'} • ${contact.phones?.[0] || '+1 234-567-8900'}
                    ${contact.linkedin?.[0] ? `• ${contact.linkedin[0]}` : ''}
                </div>
            </div>
            
            <!-- Objective -->
            ${sections.summary ? `
                <div style="margin-bottom: 2rem;">
                    <h2 style="font-size: 14pt; font-weight: bold; text-align: center; text-transform: uppercase;">OBJECTIVE</h2>
                    <p style="text-align: center; margin: 0; font-style: italic;">${sections.summary}</p>
                </div>
            ` : ''}
            
            <!-- Experience -->
            ${sections.experience ? `
                <div style="margin-bottom: 2rem;">
                    <h2 style="font-size: 14pt; font-weight: bold; text-align: center; text-transform: uppercase;">PROFESSIONAL EXPERIENCE</h2>
                    <div style="white-space: pre-line;">${sections.experience}</div>
                </div>
            ` : ''}
            
            <!-- Education -->
            ${sections.education ? `
                <div style="margin-bottom: 2rem;">
                    <h2 style="font-size: 14pt; font-weight: bold; text-align: center; text-transform: uppercase;">EDUCATION</h2>
                    <div style="white-space: pre-line;">${sections.education}</div>
                </div>
            ` : ''}
            
            <!-- Skills -->
            ${skills.length > 0 ? `
                <div style="margin-bottom: 2rem;">
                    <h2 style="font-size: 14pt; font-weight: bold; text-align: center; text-transform: uppercase;">SKILLS</h2>
                    <p style="text-align: center; margin: 0;">${skills.join(' • ')}</p>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Generate creative template preview
 */
function generateCreativeTemplate(data) {
    const contact = data.contact_info || {};
    const sections = data.sections || {};
    const skills = data.skills || [];
    
    return `
        <div style="font-family: 'Helvetica', 'Arial', sans-serif; line-height: 1.6; color: #333;">
            <!-- Creative Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; margin: -2rem -2rem 2rem -2rem; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 2.5rem; font-weight: 300;">YOUR NAME</h1>
                <div style="margin-top: 1rem; opacity: 0.9;">
                    ${contact.emails?.[0] || 'email@example.com'} • ${contact.phones?.[0] || '+1 234-567-8900'}
                    ${contact.linkedin?.[0] ? `• ${contact.linkedin[0]}` : ''}
                </div>
            </div>
            
            <!-- Summary -->
            ${sections.summary ? `
                <div style="margin-bottom: 2rem;">
                    <h2 style="color: #667eea; font-size: 1.3rem; margin-bottom: 0.5rem; font-weight: 600;">✨ About Me</h2>
                    <p style="margin: 0;">${sections.summary}</p>
                </div>
            ` : ''}
            
            <!-- Experience -->
            ${sections.experience ? `
                <div style="margin-bottom: 2rem;">
                    <h2 style="color: #667eea; font-size: 1.3rem; margin-bottom: 0.5rem; font-weight: 600;">💼 Professional Journey</h2>
                    <div style="white-space: pre-line;">${sections.experience}</div>
                </div>
            ` : ''}
            
            <!-- Education -->
            ${sections.education ? `
                <div style="margin-bottom: 2rem;">
                    <h2 style="color: #667eea; font-size: 1.3rem; margin-bottom: 0.5rem; font-weight: 600;">🎓 Academic Background</h2>
                    <div style="white-space: pre-line;">${sections.education}</div>
                </div>
            ` : ''}
            
            <!-- Skills -->
            ${skills.length > 0 ? `
                <div style="margin-bottom: 2rem;">
                    <h2 style="color: #667eea; font-size: 1.3rem; margin-bottom: 0.5rem; font-weight: 600;">🚀 Tech Stack</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem;">
                        ${skills.map(skill => `
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.5rem; border-radius: 8px; text-align: center; font-weight: 500;">${skill}</div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Get color based on score
 */
function getScoreColor(score) {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
}

/**
 * Get score interpretation text
 */
function getScoreInterpretation(score) {
    if (score >= 80) return 'Excellent! Your resume is well-formatted and professional.';
    if (score >= 60) return 'Good! Your resume has some areas for improvement.';
    if (score >= 40) return 'Fair. Your resume needs significant improvements.';
    return 'Poor. Your resume requires major formatting and content improvements.';
}

/**
 * Download improved resume
 */
async function downloadImprovedResume() {
    if (!selectedTemplate || !resumeAnalysisData) {
        showError('errorBox', 'Please select a template first.', 'No Template Selected');
        return;
    }
    
    try {
        // Generate the resume content
        const resumeContent = await generateTemplatePreview(selectedTemplate.id, resumeAnalysisData.parsed_data);
        
        // Create HTML document
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Improved Resume</title>
                <style>
                    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                ${resumeContent}
            </body>
            </html>
        `;
        
        // Create blob and download
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `improved-resume-${selectedTemplate.id}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showSuccess('successModal', 'Resume downloaded successfully!', 'Download Complete');
        
    } catch (error) {
        console.error('Download error:', error);
        showError('errorBox', 'Failed to download resume. Please try again.', 'Download Error');
    }
}

/**
 * Apply template and continue
 */
function applyTemplateAndContinue() {
    if (!selectedTemplate) {
        showError('errorBox', 'Please select a template first.', 'No Template Selected');
        return;
    }
    
    // Store selected template info
    localStorage.setItem('selectedResumeTemplate', JSON.stringify(selectedTemplate));
    
    // Hide modal and continue
    hideResumeAnalysisModal();
    showSuccess('successModal', 'Template applied successfully! Your resume will be formatted accordingly.', 'Template Applied');
}

/**
 * Hide resume analysis modal
 */
function hideResumeAnalysisModal() {
    const modal = document.getElementById('resumeAnalysisModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Reset modal state
    const templatePreviewSection = document.getElementById('templatePreviewSection');
    const templateRecommendations = document.getElementById('templateRecommendations');
    const analysisActions = document.getElementById('analysisActions');
    
    if (templatePreviewSection) templatePreviewSection.style.display = 'none';
    if (templateRecommendations) templateRecommendations.style.display = 'block';
    if (analysisActions) analysisActions.style.display = 'flex';
}

/* -------------------------------------------------------
   EVENT LISTENERS
------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // Close modal button
    const closeBtn = document.getElementById('closeResumeAnalysisBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideResumeAnalysisModal);
    }
    
    // Skip analysis button
    const skipBtn = document.getElementById('skipAnalysisBtn');
    if (skipBtn) {
        skipBtn.addEventListener('click', hideResumeAnalysisModal);
    }
    
    // View templates button
    const viewTemplatesBtn = document.getElementById('viewTemplatesBtn');
    if (viewTemplatesBtn) {
        viewTemplatesBtn.addEventListener('click', () => {
            const templateRecommendations = document.getElementById('templateRecommendations');
            const analysisActions = document.getElementById('analysisActions');
            
            if (templateRecommendations) templateRecommendations.style.display = 'block';
            if (analysisActions) analysisActions.style.display = 'none';
        });
    }
    
    // Back to templates button
    const backToTemplatesBtn = document.getElementById('backToTemplatesBtn');
    if (backToTemplatesBtn) {
        backToTemplatesBtn.addEventListener('click', () => {
            const templatePreviewSection = document.getElementById('templatePreviewSection');
            const templateRecommendations = document.getElementById('templateRecommendations');
            const analysisActions = document.getElementById('analysisActions');
            
            if (templatePreviewSection) templatePreviewSection.style.display = 'none';
            if (templateRecommendations) templateRecommendations.style.display = 'block';
            if (analysisActions) analysisActions.style.display = 'flex';
        });
    }
    
    // Download improved resume button
    const downloadBtn = document.getElementById('downloadImprovedResume');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadImprovedResume);
    }
    
    // Apply template button
    const applyBtn = document.getElementById('applyTemplateBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyTemplateAndContinue);
    }
    
    // Close modal when clicking backdrop
    const modal = document.getElementById('resumeAnalysisModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideResumeAnalysisModal();
            }
        });
    }
});

/* -------------------------------------------------------
   EXPORTS
------------------------------------------------------- */

export {
    analyzeResume,
    hideResumeAnalysisModal,
    resumeAnalysisData,
    selectedTemplate
};
