/**
 * Shared Notification Module
 * Handles notification fetching, rendering, and interaction
 */

import { backendGet, backendPut, handleResponse } from './backend-client.js';
import { CONFIG } from './config.js';

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.isOpen = false;
        this.pollingInterval = null;
        this.init();
    }

    init() {
        // Find notification elements
        this.bellBtn = document.getElementById('notificationBtn');
        this.badge = document.getElementById('notificationBadge');
        
        // Create notification panel if it doesn't exist
        this.createNotificationPanel();
        
        // Attach event listeners
        if (this.bellBtn) {
            this.bellBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePanel();
            });
        }

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.panel.contains(e.target) && e.target !== this.bellBtn) {
                this.closePanel();
            }
        });

        // Initial load
        this.loadNotifications();
        
        // Start polling every 60 seconds
        this.startPolling();
    }

    createNotificationPanel() {
        // Check if panel already exists
        if (document.getElementById('notificationPanel')) {
            this.panel = document.getElementById('notificationPanel');
            this.list = document.getElementById('notificationList');
            this.emptyState = document.getElementById('notificationEmpty');
            this.header = document.getElementById('notificationHeader');
            return;
        }

        // Create panel HTML
        this.panel = document.createElement('div');
        this.panel.id = 'notificationPanel';
        this.panel.className = 'notification-panel';
        this.panel.style.display = 'none';
        
        this.panel.innerHTML = `
            <div class="notification-header" id="notificationHeader">
                <h3>Notifications</h3>
                <button class="mark-all-read" id="markAllRead" style="display: none;">Mark all read</button>
            </div>
            <div class="notification-list" id="notificationList"></div>
            <div class="notification-empty" id="notificationEmpty">
                <i class="far fa-bell-slash"></i>
                <p>No notifications yet</p>
            </div>
        `;

        // Insert after bell button in the closest positioned parent (header-actions)
        if (this.bellBtn) {
            const headerActions = this.bellBtn.closest('.header-actions') || this.bellBtn.parentNode;
            if (headerActions) {
                headerActions.style.position = 'relative';
                headerActions.appendChild(this.panel);
            } else {
                document.body.appendChild(this.panel);
            }
        } else {
            document.body.appendChild(this.panel);
        }

        this.list = this.panel.querySelector('#notificationList');
        this.emptyState = this.panel.querySelector('#notificationEmpty');
        this.header = this.panel.querySelector('#notificationHeader');

        // Mark all read button
        const markAllBtn = this.panel.querySelector('#markAllRead');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => this.markAllAsRead());
        }
    }

    async loadNotifications() {
        try {
            const res = await backendGet('/notifications/');
            const json = await handleResponse(res);
            
            // Handle different response structures
            let notifications = [];
            if (Array.isArray(json)) {
                notifications = json;
            } else if (json.data && Array.isArray(json.data.notifications)) {
                notifications = json.data.notifications;
            } else if (json.data && Array.isArray(json.data)) {
                notifications = json.data;
            } else if (json.notifications && Array.isArray(json.notifications)) {
                notifications = json.notifications;
            }
            
            // Ensure each notification has the required fields
            this.notifications = notifications.map(n => ({
                ...n,
                message: n.message || n.title || this.generateMessage(n),
                read: n.is_read || n.read || false,
                metadata: n.metadata || n.notification_metadata || {}
            }));
            
            this.updateBadge();
            if (this.isOpen) {
                this.renderNotifications();
            }
        } catch (err) {
            // Silent fail - don't break the UI if notifications fail to load
        }
    }
    
    generateMessage(notification) {
        const category = notification.category;
        const metadata = notification.metadata || {};
        const jobTitle = metadata.job_title || 'this position';
        
        switch (category) {
            case 'application':
            case 'new_application':
                return `New application received for ${jobTitle}`;
            case 'application_status':
            case 'status_update':
                const status = metadata.status || 'updated';
                return `Your application for ${jobTitle} has been ${status}`;
            case 'interview':
            case 'interview_invitation':
                return `You have been invited for an interview for ${jobTitle}`;
            case 'interview_submitted':
                return `Interview responses submitted for ${jobTitle}`;
            case 'application_received':
                return `Your application for ${jobTitle} has been received successfully!`;
            default:
                return 'You have a new notification';
        }
    }

    updateBadge() {
        const unread = this.notifications.filter(n => !n.read && !n.is_read);
        this.unreadCount = unread.length;

        if (this.badge) {
            if (this.unreadCount > 0) {
                this.badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                this.badge.style.display = 'inline-block';
            } else {
                this.badge.style.display = 'none';
            }
        }

        // Show/hide mark all read button
        const markAllBtn = this.panel?.querySelector('#markAllRead');
        if (markAllBtn) {
            markAllBtn.style.display = this.unreadCount > 0 ? 'block' : 'none';
        }
    }

    renderNotifications() {
        if (!this.list) return;

        if (this.notifications.length === 0) {
            this.list.innerHTML = '';
            this.emptyState.style.display = 'flex';
            return;
        }

        this.emptyState.style.display = 'none';

        // Sort by date (newest first)
        const sorted = [...this.notifications].sort((a, b) => {
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        this.list.innerHTML = sorted.map(n => this.createNotificationHTML(n)).join('');

        // Attach click handlers
        sorted.forEach(n => {
            const el = this.list.querySelector(`[data-id="${n.id}"]`);
            if (el) {
                el.addEventListener('click', () => this.handleNotificationClick(n));
            }
        });
    }

    createNotificationHTML(notification) {
        const isUnread = !notification.read && !notification.is_read;
        const icon = this.getNotificationIcon(notification.category);
        const time = this.formatTime(notification.created_at);
        
        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notification.id}">
                <div class="notification-icon ${notification.category || 'system'}">
                    <i class="${icon}"></i>
                </div>
                <div class="notification-content">
                    <p class="notification-message">${notification.message || notification.title || 'Notification'}</p>
                    <span class="notification-time">${time}</span>
                </div>
                ${isUnread ? '<span class="notification-dot"></span>' : ''}
            </div>
        `;
    }

    getNotificationIcon(category) {
        const icons = {
            'application': 'fas fa-user-plus',
            'new_application': 'fas fa-user-plus',
            'application_received': 'fas fa-check-circle',
            'application_status': 'fas fa-info-circle',
            'status_update': 'fas fa-flag',
            'interview': 'fas fa-video',
            'interview_invitation': 'fas fa-video',
            'interview_submitted': 'fas fa-check-circle',
            'video_analysis': 'fas fa-chart-bar',
            'video_analysis_error': 'fas fa-exclamation-triangle',
            'system': 'fas fa-bell',
            'default': 'fas fa-bell'
        };
        return icons[category] || icons['default'];
    }

    formatTime(timestamp) {
        if (!timestamp) return 'Just now';
        
        // Parse timestamp - handle various formats
        let ts = timestamp;
        
        // If no timezone info, assume UTC and append 'Z'
        if (!ts.endsWith('Z') && !ts.includes('+') && !ts.includes('00:00')) {
            ts = ts + 'Z';
        }
        
        const date = new Date(ts);
        const now = new Date();
        const diff = now - date;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    async handleNotificationClick(notification) {
        // Mark as read
        if (!notification.read && !notification.is_read) {
            await this.markAsRead(notification.id);
        }

        // Navigate based on notification type
        const metadata = notification.metadata || {};
        const category = notification.category;
        const notifType = metadata.type || category;

        // Determine redirect URL based on notification type and user role
        let redirectUrl = null;

        // Get current user role
        const user = await this.getCurrentUser();
        const role = user?.role || 'candidate';

        switch (category) {
            case 'application':
            case 'new_application':
                // Recruiter viewing new application - go to application details
                if (metadata.application_id) {
                    redirectUrl = `${CONFIG.PAGES.APPLICATION_DETAILS || '/dashboard/application-details.html'}?id=${metadata.application_id}`;
                } else {
                    redirectUrl = CONFIG.PAGES.APPLICATION_LIST || '/dashboard/application-list.html';
                }
                break;

            case 'application_received':
                // Candidate - application submitted successfully, go to job details
                if (metadata.job_id) {
                    redirectUrl = `${CONFIG.PAGES.JOB_DETAILS || '/dashboard/job-details.html'}?job_id=${metadata.job_id}`;
                } else if (metadata.application_id) {
                    redirectUrl = `${CONFIG.PAGES.MY_APPLICATIONS || '/applicant/my-applications.html'}?highlight=${metadata.application_id}`;
                } else {
                    redirectUrl = CONFIG.PAGES.MY_APPLICATIONS || '/applicant/my-applications.html';
                }
                break;

            case 'application_status':
            case 'status_update':
                // Candidate viewing status update - go to job details or my applications
                if (metadata.job_id) {
                    redirectUrl = `${CONFIG.PAGES.JOB_DETAILS || '/dashboard/job-details.html'}?job_id=${metadata.job_id}`;
                } else if (metadata.application_id) {
                    redirectUrl = `${CONFIG.PAGES.MY_APPLICATIONS || '/applicant/my-applications.html'}?highlight=${metadata.application_id}`;
                } else {
                    redirectUrl = CONFIG.PAGES.MY_APPLICATIONS || '/applicant/my-applications.html';
                }
                break;

            case 'interview':
            case 'interview_invitation':
                // Candidate invited for interview - go to interview room
                if (metadata.application_id) {
                    redirectUrl = `${CONFIG.PAGES.INTERVIEW_ROOM || '/dashboard/interview-room.html'}?application_id=${metadata.application_id}`;
                } else if (metadata.job_id) {
                    redirectUrl = `${CONFIG.PAGES.JOB_DETAILS || '/dashboard/job-details.html'}?job_id=${metadata.job_id}`;
                } else {
                    redirectUrl = CONFIG.PAGES.MY_APPLICATIONS || '/applicant/my-applications.html';
                }
                break;

            case 'interview_submitted':
                // Recruiter - candidate submitted interview responses
                if (metadata.application_id) {
                    redirectUrl = `${CONFIG.PAGES.APPLICATION_DETAILS || '/dashboard/application-details.html'}?id=${metadata.application_id}`;
                } else {
                    redirectUrl = CONFIG.PAGES.APPLICATION_LIST || '/dashboard/application-list.html';
                }
                break;

            case 'video_analysis':
                // Recruiter - video analysis complete - go to analysis page
                if (metadata.application_id) {
                    redirectUrl = `${CONFIG.PAGES.ANALYSIS || '/dashboard/analysis.html'}?application_id=${metadata.application_id}`;
                } else if (metadata.task_id) {
                    redirectUrl = `${CONFIG.PAGES.ANALYSIS || '/dashboard/analysis.html'}?task_id=${metadata.task_id}`;
                } else {
                    redirectUrl = CONFIG.PAGES.ANALYSIS || '/dashboard/analysis.html';
                }
                break;

            default:
                // Default - go to dashboard based on role
                redirectUrl = role === 'recruiter' 
                    ? (CONFIG.PAGES.DASHBOARD_RECRUITER || '/dashboard/recruiter-dashboard.html')
                    : (CONFIG.PAGES.DASHBOARD_CANDIDATE || '/dashboard/candidate-dashboard.html');
        }

        if (redirectUrl) {
            window.location.href = redirectUrl;
        }

        this.closePanel();
    }

    async markAsRead(notificationId) {
        try {
            await backendPut(`/notifications/${notificationId}/read`);
            
            // Update local state
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                notification.is_read = true;
            }
            
            this.updateBadge();
            this.renderNotifications();
        } catch (err) {
            // console.error('Failed to mark notification as read:', err);
        }
    }

    async markAllAsRead() {
        try {
            await backendPut('/notifications/read-all');
            
            // Update local state
            this.notifications.forEach(n => {
                n.read = true;
                n.is_read = true;
            });
            
            this.updateBadge();
            this.renderNotifications();
        } catch (err) {
            // console.error('Failed to mark all as read:', err);
        }
    }

    togglePanel() {
        if (this.isOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    openPanel() {
        if (this.panel) {
            this.panel.style.display = 'block';
            this.isOpen = true;
            this.renderNotifications();
        }
    }

    closePanel() {
        if (this.panel) {
            this.panel.style.display = 'none';
            this.isOpen = false;
        }
    }

    startPolling() {
        // Poll every 60 seconds
        this.pollingInterval = setInterval(() => {
            this.loadNotifications();
        }, 60000);
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }

    async getCurrentUser() {
        try {
            const { customAuth } = await import('./auth-config.js');
            return await customAuth.getUserData();
        } catch (err) {
            return null;
        }
    }

    // Show onboarding notification for incomplete profiles
    async showOnboardingNotification(user) {
        if (!user) return;
        
        const onboarded = user.onboarded || user.user_metadata?.onboarded || false;
        if (onboarded) return;

        const role = (user.role || user.user_metadata?.role || 'candidate').toLowerCase();
        
        // Create a toast notification instead of backend notification
        // since this is client-side only
        const message = role === 'recruiter' 
            ? '⚠️ Complete your company profile to start posting jobs!'
            : '⚠️ Complete your profile to apply for jobs!';

        // Show toast if showToast function exists
        if (typeof showToast === 'function') {
            showToast(message, 'warning', 10000);
        }

        // Add to notification panel as well
        const onboardingNotification = {
            id: 'onboarding-reminder',
            title: 'Profile Incomplete',
            message: message,
            category: 'system',
            created_at: new Date().toISOString(),
            read: false,
            is_read: false,
            metadata: {
                type: 'onboarding',
                redirect: role === 'recruiter' 
                    ? CONFIG.PAGES.RECRUITER_PROFILE 
                    : CONFIG.PAGES.CANDIDATE_PROFILE
            }
        };

        // Prepend to notifications
        this.notifications.unshift(onboardingNotification);
        this.updateBadge();
    }
}

// Create singleton instance
let notificationManager = null;

export function initNotifications() {
    if (!notificationManager) {
        notificationManager = new NotificationManager();
    }
    return notificationManager;
}

export function getNotificationManager() {
    return notificationManager;
}

export default NotificationManager;

// ============================================
// WARNING RIBBON FUNCTIONS (merged from warning-ribbon.js)
// ============================================

/**
 * Show a warning ribbon with the specified message and type
 * @param {string} elementId - ID of the warning ribbon element
 * @param {string} message - Message to display
 * @param {string} title - Title for the warning (optional)
 * @param {string} type - Type of warning: 'error', 'success', 'info', 'warning' (default: 'error')
 * @param {string} iconClass - Font Awesome icon class (optional)
 * @param {number} autoHideTime - Time in milliseconds to auto-hide (default: 8000)
 */
export function showWarning(elementId, message, title = null, type = 'error', iconClass = null, autoHideTime = 8000) {
    const warningElement = document.getElementById(elementId);
    if (!warningElement) return;

    const warningDetails = warningElement.querySelector(".warning-details");
    const warningTitle = warningElement.querySelector(".warning-message strong");
    const warningIcon = warningElement.querySelector(".warning-icon i");

    // Remove existing variant classes
    warningElement.classList.remove('success', 'info', 'warning');
    
    // Add the appropriate variant class
    if (type !== 'error') {
        warningElement.classList.add(type);
    }

    // Set default title and icon based on type if not provided
    if (!title) {
        switch (type) {
            case 'success': title = 'Success'; break;
            case 'info': title = 'Information'; break;
            case 'warning': title = 'Warning'; break;
            default: title = 'Error';
        }
    }

    if (!iconClass) {
        switch (type) {
            case 'success': iconClass = 'fas fa-check-circle'; break;
            case 'info': iconClass = 'fas fa-info-circle'; break;
            case 'warning': iconClass = 'fas fa-exclamation-triangle'; break;
            default: iconClass = 'fas fa-exclamation-circle';
        }
    }

    // Update the content
    if (warningTitle) warningTitle.textContent = title;
    if (warningDetails) warningDetails.textContent = message;
    if (warningIcon) warningIcon.className = iconClass;

    // Show the warning ribbon
    warningElement.classList.remove("d-none");

    // Auto-hide after specified time
    if (autoHideTime > 0) {
        setTimeout(() => {
            hideWarning(elementId);
        }, autoHideTime);
    }
}

/**
 * Hide a warning ribbon
 * @param {string} elementId - ID of the warning ribbon element
 */
export function hideWarning(elementId) {
    const warningElement = document.getElementById(elementId);
    if (warningElement) {
        warningElement.classList.add("d-none");
    }
}

/**
 * Show a success message
 */
export function showSuccess(elementId, message, title = null) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Check if this is a modal (like successModal) that needs dynamic content
    if (elementId === 'successModal' && element.classList.contains('custom-modal-backdrop')) {
        // Update modal content dynamically
        const titleElement = element.querySelector('h2');
        const buttonElement = element.querySelector('button');
        
        if (titleElement) {
            titleElement.textContent = title || 'Success!';
        }
        
        if (buttonElement) {
            buttonElement.textContent = 'Close';
        }
        
        // Show the modal
        element.classList.add('active');
        return;
    }
    
    // For regular warning ribbons, use the existing showWarning function
    showWarning(elementId, message, title, 'success');
}

/**
 * Show an info message
 */
export function showInfo(elementId, message, title = null) {
    showWarning(elementId, message, title, 'info');
}

/**
 * Show a warning message
 */
export function showWarningMessage(elementId, message, title = null) {
    showWarning(elementId, message, title, 'warning');
}

/**
 * Show an error message
 */
export function showError(elementId, message, title = null) {
    showWarning(elementId, message, title, 'error');
}
