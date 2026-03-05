// Warning Ribbon Utility Functions
// Reusable functions for displaying warning ribbons across the application

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
      case 'success':
        title = 'Success';
        break;
      case 'info':
        title = 'Information';
        break;
      case 'warning':
        title = 'Warning';
        break;
      default:
        title = 'Error';
    }
  }

  if (!iconClass) {
    switch (type) {
      case 'success':
        iconClass = 'fas fa-check-circle';
        break;
      case 'info':
        iconClass = 'fas fa-info-circle';
        break;
      case 'warning':
        iconClass = 'fas fa-exclamation-triangle';
        break;
      default:
        iconClass = 'fas fa-exclamation-circle';
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
 * @param {string} elementId - ID of the warning ribbon element
 * @param {string} message - Success message to display
 * @param {string} title - Custom title (optional)
 */
export function showSuccess(elementId, message, title = null) {
  showWarning(elementId, message, title, 'success');
}

/**
 * Show an info message
 * @param {string} elementId - ID of the warning ribbon element
 * @param {string} message - Info message to display
 * @param {string} title - Custom title (optional)
 */
export function showInfo(elementId, message, title = null) {
  showWarning(elementId, message, title, 'info');
}

/**
 * Show a warning message
 * @param {string} elementId - ID of the warning ribbon element
 * @param {string} message - Warning message to display
 * @param {string} title - Custom title (optional)
 */
export function showWarningMessage(elementId, message, title = null) {
  showWarning(elementId, message, title, 'warning');
}

/**
 * Show an error message
 * @param {string} elementId - ID of the warning ribbon element
 * @param {string} message - Error message to display
 * @param {string} title - Custom title (optional)
 */
export function showError(elementId, message, title = null) {
  showWarning(elementId, message, title, 'error');
}
