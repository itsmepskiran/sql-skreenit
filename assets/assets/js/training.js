/**
 * Training Sessions - JavaScript Module
 * Handles registration, form validation, and payment flow
 */

import { CONFIG } from '@shared/js/config.js';

// =========================================
// CONFIGURATION
// =========================================

const TRAINING_COURSES = {
    behavioral: { name: 'Behavioral Training', price: 1999, duration: '2 Days' },
    corporate: { name: 'Corporate Training', price: 7999, duration: '3 Days' },
    interview: { name: 'Interview Etiquette', price: 1999, duration: '1 Day' },
    communication: { name: 'Communication Skills', price: 2999, duration: '2 Days' },
    leadership: { name: 'Leadership Development', price: 9999, duration: '5 Days' },
    technical: { name: 'Technical Skills Development', price: 8999, duration: '5 Days' },
    softskills: { name: 'Soft Skills Mastery', price: 3999, duration: '3 Days' },
    resume: { name: 'Resume Building Workshop', price: 1999, duration: '1 Day' },
    gd: { name: 'Group Discussion Mastery', price: 1499, duration: '1 Day' },
    combo: { name: 'Complete Package (All Courses)', price: 34999, duration: '4 Weeks' },
    custom: { name: 'Custom Corporate Package', price: 0, duration: 'Custom' }
};

// Razorpay configuration (loaded from backend)
let RAZORPAY_KEY_ID = '';

/**
 * Load Razorpay configuration from backend
 */
async function loadPaymentConfig() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/training/payment-config`);
        const result = await response.json();
        
        if (result.ok && result.data.key_id) {
            RAZORPAY_KEY_ID = result.data.key_id;
            console.log('Razorpay key loaded from backend');
        } else {
            console.warn('Razorpay key not available from backend');
        }
    } catch (error) {
        console.error('Failed to load payment config:', error);
    }
}

// =========================================
// UTILITY FUNCTIONS
// =========================================

/**
 * Generate unique ID (similar to Company ID / Skreenit ID logic)
 */
function generateTrainingId(type) {
    const prefix = type === 'college' ? 'STU' : 'CORP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

/**
 * Show/hide elements
 */
function toggleDisplay(elementId, display) {
    const el = document.getElementById(elementId);
    if (el) el.style.display = display;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Style the toast
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#4f46e5'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 9999;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate mobile number
 */
function isValidMobile(mobile) {
    return /^[+]?[\d\s-]{10,15}$/.test(mobile);
}

// =========================================
// REGISTRATION TYPE SELECTION
// =========================================

let selectedRegistrationType = null;
let registrationData = {};

function selectType(type) {
    selectedRegistrationType = type;
    
    // Update visual selection
    document.querySelectorAll('.type-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.getElementById(`${type}Card`).classList.add('selected');
    
    // Show corresponding form after brief delay
    setTimeout(() => {
        toggleDisplay('typeSelection', 'none');
        toggleDisplay(`${type}Form`, 'block');
        
        // Scroll to form
        document.getElementById(`${type}Form`).scrollIntoView({ behavior: 'smooth' });
    }, 300);
}

function backToSelection() {
    toggleDisplay('collegeForm', 'none');
    toggleDisplay('companyForm', 'none');
    toggleDisplay('paymentSection', 'none');
    toggleDisplay('typeSelection', 'block');
    
    selectedRegistrationType = null;
    
    // Remove selection highlight
    document.querySelectorAll('.type-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToForm() {
    toggleDisplay('paymentSection', 'none');
    toggleDisplay(`${selectedRegistrationType}Form`, 'block');
}

// =========================================
// FORM HANDLING
// =========================================

function handleCollegeFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Validation
    if (!data.firstName || !data.lastName) {
        showToast('Please enter your full name', 'error');
        return;
    }
    
    if (!isValidEmail(data.email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (!isValidMobile(data.mobile)) {
        showToast('Please enter a valid mobile number', 'error');
        return;
    }
    
    if (!data.collegeName || !data.universityName) {
        showToast('Please enter college and university details', 'error');
        return;
    }
    
    if (!data.trainingCourse) {
        showToast('Please select a training course', 'error');
        return;
    }
    
    if (!data.tnc) {
        showToast('Please accept the Terms & Conditions', 'error');
        return;
    }
    
    // Generate Student ID
    const studentId = generateTrainingId('college');
    
    // Store registration data
    registrationData = {
        type: 'college',
        studentId: studentId,
        ...data,
        courseDetails: TRAINING_COURSES[data.trainingCourse]
    };
    
    // Save to database first
    submitRegistration().then(() => {
        // Show payment section after successful save
        showPaymentSection();
    }).catch(error => {
        console.error('Registration save failed:', error);
        showToast('Failed to save registration. Please try again.', 'error');
    });
}

function handleCompanyFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Validation
    if (!data.companyName) {
        showToast('Please enter company name', 'error');
        return;
    }
    
    if (!data.contactName || !isValidEmail(data.contactEmail)) {
        showToast('Please enter valid contact details', 'error');
        return;
    }
    
    if (!isValidMobile(data.contactMobile)) {
        showToast('Please enter a valid mobile number', 'error');
        return;
    }
    
    if (!data.trainingCourse) {
        showToast('Please select a training course', 'error');
        return;
    }
    
    if (!data.tnc) {
        showToast('Please accept the Terms & Conditions', 'error');
        return;
    }
    
    // Generate Corporate ID
    const corporateId = generateTrainingId('company');
    
    // Store registration data
    registrationData = {
        type: 'company',
        corporateId: corporateId,
        ...data,
        courseDetails: TRAINING_COURSES[data.trainingCourse]
    };
    
    // For corporate, show quote request instead of immediate payment
    if (data.trainingCourse === 'custom') {
        submitQuoteRequest();
    } else {
        // Save to database first
        submitRegistration().then(() => {
            // Show payment section after successful save
            showPaymentSection();
        }).catch(error => {
            console.error('Registration save failed:', error);
            showToast('Failed to save registration. Please try again.', 'error');
        });
    }
}

// =========================================
// PAYMENT SECTION
// =========================================

function showPaymentSection() {
    toggleDisplay(`${selectedRegistrationType}Form`, 'none');
    toggleDisplay('paymentSection', 'block');
    
    // Generate payment summary
    const summary = document.getElementById('paymentSummary');
    const course = registrationData.courseDetails;
    
    if (registrationData.type === 'college') {
        summary.innerHTML = `
            <div class="summary-row">
                <span>Student ID:</span>
                <strong>${registrationData.studentId}</strong>
            </div>
            <div class="summary-row">
                <span>Name:</span>
                <strong>${registrationData.firstName} ${registrationData.lastName}</strong>
            </div>
            <div class="summary-row">
                <span>Course:</span>
                <strong>${course.name}</strong>
            </div>
            <div class="summary-row">
                <span>Duration:</span>
                <strong>${course.duration}</strong>
            </div>
            <div class="summary-row total">
                <span>Total Amount:</span>
                <strong>₹${course.price.toLocaleString('en-IN')}</strong>
            </div>
        `;
    } else {
        const employeeCount = parseInt(registrationData.employeeCount) || 1;
        const totalPrice = course.price * employeeCount;
        
        summary.innerHTML = `
            <div class="summary-row">
                <span>Corporate ID:</span>
                <strong>${registrationData.corporateId}</strong>
            </div>
            <div class="summary-row">
                <span>Company:</span>
                <strong>${registrationData.companyName}</strong>
            </div>
            <div class="summary-row">
                <span>Course:</span>
                <strong>${course.name}</strong>
            </div>
            <div class="summary-row">
                <span>Employees:</span>
                <strong>${employeeCount}</strong>
            </div>
            <div class="summary-row">
                <span>Price per person:</span>
                <strong>₹${course.price.toLocaleString('en-IN')}</strong>
            </div>
            <div class="summary-row total">
                <span>Total Amount:</span>
                <strong>₹${totalPrice.toLocaleString('en-IN')}</strong>
            </div>
        `;
    }
    
    // Add summary styles
    summary.style.cssText = `
        .summary-row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0; }
        .summary-row:last-child { border-bottom: none; }
        .summary-row.total { font-size: 1.1rem; color: #059669; margin-top: 0.5rem; padding-top: 1rem; border-top: 2px solid #e2e8f0; }
    `;
    
    document.getElementById('paymentSection').scrollIntoView({ behavior: 'smooth' });
}

function initiatePayment() {
    const course = registrationData.courseDetails;
    const amount = registrationData.type === 'company' 
        ? course.price * (parseInt(registrationData.employeeCount) || 1)
        : course.price;
    
    // Prepare Razorpay options
    const options = {
        key: RAZORPAY_KEY_ID,
        amount: amount * 100, // Amount in paise
        currency: 'INR',
        name: 'Skreenit Training',
        description: `${course.name} - ${registrationData.type === 'college' ? registrationData.studentId : registrationData.corporateId}`,
        image: 'https://assets.skreenit.com/assets/images/logobrand.png',
        handler: function(response) {
            // Payment successful
            handlePaymentSuccess(response);
        },
        prefill: {
            name: registrationData.type === 'college' 
                ? `${registrationData.firstName} ${registrationData.lastName}`
                : registrationData.contactName,
            email: registrationData.type === 'college' 
                ? registrationData.email 
                : registrationData.contactEmail,
            contact: registrationData.type === 'college' 
                ? registrationData.mobile 
                : registrationData.contactMobile
        },
        notes: {
            registration_type: registrationData.type,
            registration_id: registrationData.type === 'college' 
                ? registrationData.studentId 
                : registrationData.corporateId,
            course: course.name
        },
        theme: {
            color: '#4f46e5'
        }
    };
    
    // Initialize Razorpay
    if (typeof Razorpay !== 'undefined') {
        const rzp = new Razorpay(options);
        rzp.open();
        
        rzp.on('payment.failed', function(response) {
            showToast('Payment failed. Please try again.', 'error');
            console.error('Payment failed:', response.error);
        });
    } else {
        showToast('Payment gateway loading... Please try again in a moment.', 'info');
        // Fallback: Simulate successful payment for testing
        setTimeout(() => {
            handlePaymentSuccess({ razorpay_payment_id: 'TEST_' + Date.now() });
        }, 2000);
    }
}

function handlePaymentSuccess(response) {
    // Store payment details
    registrationData.paymentId = response.razorpay_payment_id;
    registrationData.paymentStatus = 'completed';
    registrationData.paymentDate = new Date().toISOString();

    // Update localStorage with payment status
    try {
        const localRegistrations = JSON.parse(localStorage.getItem('trainingRegistrations') || '[]');
        const index = localRegistrations.findIndex(r =>
            r.backendRegistrationId === registrationData.backendRegistrationId ||
            r.id === registrationData.backendRegistrationId
        );
        if (index !== -1) {
            localRegistrations[index].paymentStatus = 'completed';
            localRegistrations[index].paymentId = response.razorpay_payment_id;
            localRegistrations[index].paymentDate = registrationData.paymentDate;
            localStorage.setItem('trainingRegistrations', JSON.stringify(localRegistrations));
        }
    } catch (e) {
        console.error('Failed to update payment status in localStorage:', e);
    }

    // Update backend payment status
    updatePaymentStatus().then(() => {
        showToast('Payment successful! Registration confirmed.', 'success');

        // Redirect to confirmation page
        window.location.href = `confirmation.html?type=${registrationData.type}&id=${registrationData.backendRegistrationId}`;
    }).catch(error => {
        console.error('Payment status update failed:', error);
        // Still redirect to confirmation even if backend update fails
        window.location.href = `confirmation.html?type=${registrationData.type}&id=${registrationData.backendRegistrationId}`;
    });
}

async function updatePaymentStatus() {
    try {
        if (!registrationData.backendRegistrationId || !registrationData.paymentId) {
            throw new Error('Missing registration ID or payment ID');
        }

        const response = await fetch(`${CONFIG.API_BASE}/training/payment-success`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                registration_id: registrationData.backendRegistrationId,
                payment_id: registrationData.paymentId
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            showToast('Payment successful! Registration confirmed.', 'success');
            return result.data;
        } else {
            throw new Error(result.data?.message || 'Payment status update failed');
        }
    } catch (error) {
        console.error('Payment status update error:', error);
        throw error;
    }
}

async function submitRegistration() {
    try {
        // Determine endpoint based on registration type
        const endpoint = registrationData.type === 'college'
            ? `${CONFIG.API_BASE}/training/register-college`
            : `${CONFIG.API_BASE}/training/register-corporate`;

        // Prepare payload
        const payload = registrationData.type === 'college'
            ? {
                firstName: registrationData.firstName,
                lastName: registrationData.lastName,
                email: registrationData.email,
                mobile: registrationData.mobile,
                collegeName: registrationData.collegeName,
                universityName: registrationData.universityName,
                collegeAddress: registrationData.collegeAddress,
                rollNumber: registrationData.rollNumber,
                course: registrationData.course,
                yearOfStudy: registrationData.yearOfStudy,
                passingYear: registrationData.passingYear,
                trainingCourse: registrationData.trainingCourse,
                batchTiming: registrationData.batchTiming
            }
            : {
                companyName: registrationData.companyName,
                companyHQ: registrationData.companyHQ,
                companyHC: registrationData.companyHC,
                industry: registrationData.industry,
                companyType: registrationData.companyType,
                companyWebsite: registrationData.companyWebsite,
                contactName: registrationData.contactName,
                contactDesignation: registrationData.contactDesignation,
                contactEmail: registrationData.contactEmail,
                contactMobile: registrationData.contactMobile,
                trainingCourse: registrationData.trainingCourse,
                employeeCount: registrationData.employeeCount,
                trainingMode: registrationData.trainingMode,
                preferredDate: registrationData.preferredDate,
                duration: registrationData.duration,
                additionalRequirements: registrationData.additionalRequirements
            };

        // Call backend API
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Check if response is OK and has JSON content
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response. API endpoint may not be available.');
        }

        const result = await response.json();

        if (result.ok) {
            // Store registration ID for payment
            registrationData.backendRegistrationId = result.data.registration_id;

            // Save full registration to localStorage for confirmation page
            const localRegistrations = JSON.parse(localStorage.getItem('trainingRegistrations') || '[]');
            const savedRegistration = {
                ...registrationData,
                savedAt: new Date().toISOString(),
                paymentStatus: 'pending'
            };
            localRegistrations.push(savedRegistration);
            localStorage.setItem('trainingRegistrations', JSON.stringify(localRegistrations));

            // Show success message - form handler will proceed to payment section
            showToast('Registration saved successfully! Click "View Details" to see your confirmation.', 'success');

            return result.data;
        } else {
            throw new Error(result.data?.message || 'Registration failed');
        }

    } catch (error) {
        console.error('Registration error:', error);
        // Don't show toast here - let the caller handle it
        throw error;
    }
}

function submitQuoteRequest() {
    // For corporate custom packages
    console.log('Submitting quote request:', registrationData);
    showToast('Quote request submitted! Our team will contact you within 24 hours.', 'success');

    setTimeout(() => {
        window.location.href = 'index.html';
    }, 3000);
}

// Export registrations to CSV/Excel format
function exportRegistrationsToCSV() {
    try {
        const localRegistrations = JSON.parse(localStorage.getItem('trainingRegistrations') || '[]');

        if (localRegistrations.length === 0) {
            console.log('No registrations to export');
            return;
        }

        // Define CSV headers based on registration type
        const headers = [
            'ID',
            'Type',
            'Status',
            'Saved At',
            'Name/Company',
            'Email',
            'Mobile',
            'Course',
            'Details'
        ];

        // Convert data to CSV format
        const csvRows = [headers.join(',')];

        localRegistrations.forEach(reg => {
            const row = [
                reg.id || '',
                reg.type || '',
                reg.status || '',
                reg.savedAt || '',
                reg.type === 'college' ? `${reg.firstName} ${reg.lastName}` : reg.companyName || '',
                reg.type === 'college' ? reg.email : reg.contactEmail || '',
                reg.type === 'college' ? reg.mobile : reg.contactMobile || '',
                reg.trainingCourse || '',
                reg.type === 'college' ? `${reg.collegeName}, ${reg.universityName}` : `${reg.companyHC}, ${reg.industry}`
            ];
            csvRows.push(row.map(cell => `"${cell || ''}"`).join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `training_registrations_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('Registrations exported to CSV successfully');
    } catch (error) {
        console.error('Failed to export registrations:', error);
    }
}

// =========================================
// INITIALIZATION
// =========================================

function initLogo() {
    const isLocal = CONFIG.IS_LOCAL;
    const assetsBase = isLocal ? '../assets' : 'https://assets.skreenit.com';
    const logoImg = document.getElementById('logoImg');
    if (logoImg) {
        logoImg.src = `${assetsBase}/assets/images/logobrand.png`;
    }
}

// =========================================
// COLLEGE SEARCH DROPDOWN
// =========================================

let collegesData = [];
let universitiesData = [];
let collegeSearchTimeout = null;
let universitySearchTimeout = null;

async function loadCollegesData() {
    if (collegesData.length > 0) return;
    try {
        const assetsBase = CONFIG.IS_LOCAL ? '../assets' : 'https://assets.skreenit.com';
        const response = await fetch(`${assetsBase}/database/colleges.json`);
        collegesData = await response.json();
        console.log(`Loaded ${collegesData.length} colleges`);
    } catch (error) {
        console.error('Failed to load colleges data:', error);
    }
}

async function loadUniversitiesData() {
    if (universitiesData.length > 0) return;
    try {
        const assetsBase = CONFIG.IS_LOCAL ? '../assets' : 'https://assets.skreenit.com';
        const response = await fetch(`${assetsBase}/database/universities.json`);
        universitiesData = await response.json();
        console.log(`Loaded ${universitiesData.length} universities`);
    } catch (error) {
        console.error('Failed to load universities data:', error);
    }
}

function initCollegeSearch() {
    const collegeInput = document.getElementById('collegeName');
    const dropdown = document.getElementById('collegeDropdown');

    if (!collegeInput || !dropdown) return;

    // Load colleges data
    loadCollegesData();

    // Search on input
    collegeInput.addEventListener('input', function() {
        clearTimeout(collegeSearchTimeout);
        const query = this.value.trim().toLowerCase();

        if (query.length < 2) {
            dropdown.classList.remove('active');
            dropdown.innerHTML = '';
            return;
        }

        collegeSearchTimeout = setTimeout(() => {
            const results = collegesData.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.district.toLowerCase().includes(query) ||
                c.state.toLowerCase().includes(query)
            ).slice(0, 50);

            if (results.length === 0) {
                dropdown.innerHTML = '<div class="college-dropdown-empty">No colleges found. Type your college name manually.</div>';
                dropdown.classList.add('active');
                return;
            }

            dropdown.innerHTML = results.map((college, idx) => `
                <div class="college-dropdown-item" data-index="${idx}">
                    <div class="college-name">${highlightMatch(college.name, query)}</div>
                    <div class="college-meta">
                        <span><i class="fas fa-map-marker-alt"></i> ${college.district}, ${college.state}</span>
                    </div>
                </div>
            `).join('');

            dropdown.classList.add('active');

            // Click handler for each item
            dropdown.querySelectorAll('.college-dropdown-item').forEach((item, i) => {
                item.addEventListener('mousedown', function(e) {
                    e.preventDefault(); // Prevent blur from closing dropdown before click registers
                    selectCollege(results[i]);
                });
            });
        }, 200);
    });

    // Show dropdown on focus if there's text
    collegeInput.addEventListener('focus', function() {
        if (this.value.trim().length >= 2) {
            this.dispatchEvent(new Event('input'));
        }
    });

    // Hide dropdown on blur
    collegeInput.addEventListener('blur', function() {
        setTimeout(() => {
            dropdown.classList.remove('active');
        }, 200);
    });

    // Keyboard navigation
    collegeInput.addEventListener('keydown', function(e) {
        const items = dropdown.querySelectorAll('.college-dropdown-item');
        if (!items.length) return;

        const highlighted = dropdown.querySelector('.college-dropdown-item.highlighted');
        let idx = highlighted ? Array.from(items).indexOf(highlighted) : -1;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (highlighted) highlighted.classList.remove('highlighted');
            idx = (idx + 1) % items.length;
            items[idx].classList.add('highlighted');
            items[idx].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (highlighted) highlighted.classList.remove('highlighted');
            idx = idx <= 0 ? items.length - 1 : idx - 1;
            items[idx].classList.add('highlighted');
            items[idx].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter' && highlighted) {
            e.preventDefault();
            const collegeIdx = parseInt(highlighted.dataset.index);
            const results = collegesData.filter(c =>
                c.name.toLowerCase().includes(collegeInput.value.trim().toLowerCase()) ||
                c.district.toLowerCase().includes(collegeInput.value.trim().toLowerCase()) ||
                c.state.toLowerCase().includes(collegeInput.value.trim().toLowerCase())
            ).slice(0, 50);
            if (results[collegeIdx]) selectCollege(results[collegeIdx]);
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('active');
        }
    });

    // Allow manual entry if college not found
    collegeInput.addEventListener('change', function() {
        const hiddenInput = document.getElementById('collegeNameHidden');
        if (hiddenInput) hiddenInput.value = this.value;
    });
}

function selectCollege(college) {
    const collegeInput = document.getElementById('collegeName');
    const universityInput = document.getElementById('universityName');
    const dropdown = document.getElementById('collegeDropdown');
    const hiddenInput = document.getElementById('collegeNameHidden');

    collegeInput.value = college.name;
    if (hiddenInput) hiddenInput.value = college.name;

    // Auto-fill university if data is loaded
    if (college.university && universityInput) {
        universityInput.value = college.university;
        const uniHidden = document.getElementById('universityNameHidden');
        if (uniHidden) uniHidden.value = college.university;
    }

    dropdown.classList.remove('active');
}

function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<strong style="color:var(--primary-color)">$1</strong>');
}

function initUniversitySearch() {
    const uniInput = document.getElementById('universityName');
    const dropdown = document.getElementById('universityDropdown');

    if (!uniInput || !dropdown) return;

    // Load universities data
    loadUniversitiesData();

    // Search on input
    uniInput.addEventListener('input', function() {
        clearTimeout(universitySearchTimeout);
        const query = this.value.trim().toLowerCase();

        if (query.length < 2) {
            dropdown.classList.remove('active');
            dropdown.innerHTML = '';
            return;
        }

        universitySearchTimeout = setTimeout(() => {
            const results = universitiesData.filter(u =>
                u.name.toLowerCase().includes(query) ||
                u.state.toLowerCase().includes(query)
            ).slice(0, 50);

            if (results.length === 0) {
                dropdown.innerHTML = '<div class="college-dropdown-empty">No universities found. Type your university name manually.</div>';
                dropdown.classList.add('active');
                return;
            }

            dropdown.innerHTML = results.map((uni, idx) => `
                <div class="college-dropdown-item" data-index="${idx}">
                    <div class="college-name">${highlightMatch(uni.name, query)}</div>
                    <div class="college-meta">
                        <span><i class="fas fa-map-marker-alt"></i> ${uni.state}</span>
                        <span><i class="fas fa-landmark"></i> ${uni.type}</span>
                    </div>
                </div>
            `).join('');

            dropdown.classList.add('active');

            // Click handler for each item
            dropdown.querySelectorAll('.college-dropdown-item').forEach((item, i) => {
                item.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    selectUniversity(results[i]);
                });
            });
        }, 200);
    });

    // Show dropdown on focus if there's text
    uniInput.addEventListener('focus', function() {
        if (this.value.trim().length >= 2) {
            this.dispatchEvent(new Event('input'));
        }
    });

    // Hide dropdown on blur
    uniInput.addEventListener('blur', function() {
        setTimeout(() => {
            dropdown.classList.remove('active');
        }, 200);
    });

    // Keyboard navigation
    uniInput.addEventListener('keydown', function(e) {
        const items = dropdown.querySelectorAll('.college-dropdown-item');
        if (!items.length) return;

        const highlighted = dropdown.querySelector('.college-dropdown-item.highlighted');
        let idx = highlighted ? Array.from(items).indexOf(highlighted) : -1;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (highlighted) highlighted.classList.remove('highlighted');
            idx = (idx + 1) % items.length;
            items[idx].classList.add('highlighted');
            items[idx].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (highlighted) highlighted.classList.remove('highlighted');
            idx = idx <= 0 ? items.length - 1 : idx - 1;
            items[idx].classList.add('highlighted');
            items[idx].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter' && highlighted) {
            e.preventDefault();
            const uniIdx = parseInt(highlighted.dataset.index);
            const results = universitiesData.filter(u =>
                u.name.toLowerCase().includes(uniInput.value.trim().toLowerCase()) ||
                u.state.toLowerCase().includes(uniInput.value.trim().toLowerCase())
            ).slice(0, 50);
            if (results[uniIdx]) selectUniversity(results[uniIdx]);
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('active');
        }
    });

    // Allow manual entry
    uniInput.addEventListener('change', function() {
        const hiddenInput = document.getElementById('universityNameHidden');
        if (hiddenInput) hiddenInput.value = this.value;
    });
}

function selectUniversity(uni) {
    const uniInput = document.getElementById('universityName');
    const dropdown = document.getElementById('universityDropdown');
    const hiddenInput = document.getElementById('universityNameHidden');

    uniInput.value = uni.name;
    if (hiddenInput) hiddenInput.value = uni.name;
    dropdown.classList.remove('active');
}

function initForms() {
    // College form
    const collegeForm = document.getElementById('collegeRegistrationForm');
    if (collegeForm) {
        collegeForm.addEventListener('submit', handleCollegeFormSubmit);
    }
    
    // Company form
    const companyForm = document.getElementById('companyRegistrationForm');
    if (companyForm) {
        companyForm.addEventListener('submit', handleCompanyFormSubmit);
    }
    
    // View Details button - redirects to confirmation page
    const payBtn = document.getElementById('payNowBtn');
    if (payBtn) {
        payBtn.addEventListener('click', () => {
            if (registrationData.backendRegistrationId) {
                window.location.href = `confirmation.html?type=${registrationData.type}&id=${registrationData.backendRegistrationId}`;
            } else {
                showToast('Please complete registration first', 'error');
            }
        });
    }
    
    // Year of study change handler
    const yearOfStudy = document.getElementById('yearOfStudy');
    if (yearOfStudy) {
        yearOfStudy.addEventListener('change', function() {
            const passingYear = document.getElementById('passingYear');
            const passingYearLabel = document.getElementById('passingYearLabel');

            if (this.value === 'passed_out') {
                passingYearLabel.textContent = 'Year of Passing *';
                passingYear.placeholder = 'e.g., 2020';
                passingYear.min = '1980';
                passingYear.max = new Date().getFullYear().toString();
            } else {
                passingYearLabel.textContent = 'Expected Passing Year *';
                passingYear.placeholder = 'e.g., 2025';
                passingYear.min = '2020';
                passingYear.max = '2030';
            }
        });
    }

    // College search dropdown
    initCollegeSearch();

    // University search dropdown
    initUniversitySearch();
}

function prefillCourseFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const course = urlParams.get('course');
    
    if (course && TRAINING_COURSES[course]) {
        // Try to prefill both dropdowns
        const collegeSelect = document.getElementById('collegeTrainingCourse');
        const companySelect = document.getElementById('companyTrainingCourse');
        
        if (collegeSelect) collegeSelect.value = course;
        if (companySelect) companySelect.value = course;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initLogo();
    initForms();
    prefillCourseFromURL();
    loadPaymentConfig(); // Load Razorpay key from backend
});

// Make functions available globally for onclick handlers
window.selectType = selectType;
window.backToSelection = backToSelection;
window.backToForm = backToForm;
window.exportRegistrationsToCSV = exportRegistrationsToCSV;
