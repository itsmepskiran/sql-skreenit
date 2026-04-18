import { customAuth } from '@shared/js/auth-config.js';
import { backendGet, backendPut, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { notify } from '@shared/js/auth-pages.js';
import { CONFIG } from '@shared/js/config.js';
import { showError, showSuccess, showWarning, hideWarning } from '@shared/js/notification-manager.js';
import { sidebarManager } from '@shared/js/profile-checker.js';
import { getCountries, getStates, getCities, searchLocations, CityAutocomplete } from '@shared/js/location.js';
import '@shared/js/mobile.js';

// Global variables for video recording
let introVideoStream = null;
let introVideoRecorder = null;
let introVideoChunks = [];
let introVideoBlob = null;
let hasIntroVideoRecorded = false;
let introRecordingSeconds = 0;
let introTimerInterval = null;

// Location picker instances
let currentCityPicker = null;
let permanentCityPicker = null;

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

// State
let currentStep = 1;
const totalSteps = 7;
let experienceCount = 0;
let educationCount = 0;
let certificationCount = 1;
let skills = [];
let certifications = [];

// Define variables
let form, nextBtn, prevBtn, submitBtn, steps, sections, successModal, logoutBtn, goToProfileBtn;
let resumeInput, skillInput, addSkillBtn, skillsContainer;
let addExpBtn, addEduBtn;
let profileImageInput, introVideoInput, removeVideoBtn;

/* -------------------------------------------------------
   MAIN INITIALIZATION
------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    form = document.getElementById('applicationForm');
    nextBtn = document.getElementById('nextBtn');
    prevBtn = document.getElementById('prevBtn');
    submitBtn = document.getElementById('submitBtn');
    steps = document.querySelectorAll('.step-item'); 
    sections = document.querySelectorAll('.form-section');
    successModal = document.getElementById('successModal');
    logoutBtn = document.getElementById('logoutBtn');
    goToProfileBtn = document.getElementById('goToProfileBtn');
    
    resumeInput = document.getElementById('resumeFile');
    skillInput = document.getElementById('skillInput');
    addSkillBtn = document.getElementById('addSkillBtn');
    skillsContainer = document.getElementById('skillsContainer');
    addExpBtn = document.getElementById('addExperience');
    addEduBtn = document.getElementById('addEducation');
    profileImageInput = document.getElementById('profileImageFile');
    introVideoInput = document.getElementById('introVideoFile');
    removeVideoBtn = document.getElementById('removeVideoBtn');

    setupEventListeners();
    
    // ✅ NEW: Chain the auth check to load existing data
    checkAuth().then((isAuthenticated) => {
        if(isAuthenticated) {
            loadExistingProfile();
        }
    });
    
    updateUI();
});

/* -------------------------------------------------------
   AUTH & SIDEBAR
------------------------------------------------------- */
async function checkAuth() {
    const user = await customAuth.getUserData();
    console.log("🔐 Auth user data:", user);
    if (!user) { window.location.href = CONFIG.PAGES.LOGIN; return false; }
  
    if ((user.role || '').toLowerCase() !== 'candidate') {
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER; return false;
    }
  
    await sidebarManager.initSidebar();

    if(form) {
        console.log("📝 Setting form values:", { 
            full_name: user.full_name,
            email: user.email,
            phone: user.phone
        });
        setVal('full_name', user.full_name || '');
        setVal('email', user.email || '');
        setVal('phone', user.phone || '');
    }
    return true;
}

function setVal(name, val) {
    const el = document.querySelector(`[name="${name}"]`);
    if(el) el.value = val;
}

/* -------------------------------------------------------
   ✅ NEW: LOAD EXISTING PROFILE DATA
------------------------------------------------------- */
async function loadExistingProfile() {
    try {
        console.log("🔍 Fetching profile from /api/v1/applicant/profile...");
        const res = await backendGet('/applicant/profile');
        console.log("📡 Profile API response status:", res.status);
        
        const json = await handleResponse(res);
        console.log("✅ Profile data received:", json);
        
        const profile = json.data || {};
        console.log("📋 Profile object:", profile);

        // Initialize location pickers
        await initLocationPickers();
        
        // Now set state and country values using the searchable dropdown's setValue method
        // Current Address - State and Country
        if(profile.current_state) {
            const currentStateSelect = document.getElementById('currentStateSelect');
            if(currentStateSelect && currentStateSelect.setValue) {
                currentStateSelect.setValue(profile.current_state);
            }
        }
        if(profile.current_country) {
            const currentCountrySelect = document.getElementById('currentCountrySelect');
            if(currentCountrySelect && currentCountrySelect.setValue) {
                currentCountrySelect.setValue(profile.current_country);
            }
        }
        
        // Permanent Address - State and Country
        if(profile.permanent_state) {
            const permanentStateSelect = document.getElementById('permanentStateSelect');
            if(permanentStateSelect && permanentStateSelect.setValue) {
                permanentStateSelect.setValue(profile.permanent_state);
            }
        }
        if(profile.permanent_country) {
            const permanentCountrySelect = document.getElementById('permanentCountrySelect');
            if(permanentCountrySelect && permanentCountrySelect.setValue) {
                permanentCountrySelect.setValue(profile.permanent_country);
            }
        }

        // 1. Pre-fill Basic Personal Info
        console.log("📝 Pre-filling fields...");
        if(profile.full_name) setVal('full_name', profile.full_name);
        if(profile.email) setVal('email', profile.email);
        if(profile.phone) setVal('phone', profile.phone);
        
        // Personal Details
        if(profile.date_of_birth) setVal('date_of_birth', profile.date_of_birth?.split('T')[0]);
        if(profile.gender) setVal('gender', profile.gender);
        if(profile.marital_status) setVal('marital_status', profile.marital_status);
        
        // Current Address
        if(profile.current_address) setVal('current_address', profile.current_address);
        if(profile.current_city) setVal('current_city', profile.current_city);
        // State and country will be set after location pickers are initialized
        
        // Permanent Address
        if(profile.permanent_address) setVal('permanent_address', profile.permanent_address);
        if(profile.permanent_city) setVal('permanent_city', profile.permanent_city);
        // State and country will be set after location pickers are initialized
        
        // Professional Details
        if(profile.summary) setVal('summary', profile.summary);
        if(profile.current_salary) setVal('current_salary', profile.current_salary);
        if(profile.expected_salary) setVal('expected_salary', profile.expected_salary);
        if(profile.notice_period_days) setVal('notice_period_days', profile.notice_period_days);
        if(profile.highest_qualification) setVal('highest_qualification', profile.highest_qualification);
        
        // Social Links
        if(profile.linkedin_url) setVal('linkedin_url', profile.linkedin_url);
        if(profile.portfolio_url) setVal('portfolio_url', profile.portfolio_url);
        if(profile.personal_projects) setVal('personal_projects', profile.personal_projects);
        if(profile.personal_blogs) setVal('personal_blogs', profile.personal_blogs);

        // Education Details
        if(profile.schooling) setVal('schooling', profile.schooling);
        if(profile.schooling_year) setVal('schooling_year', profile.schooling_year);
        if(profile.schooling_percentage) setVal('schooling_percentage', profile.schooling_percentage);
        if(profile.pre_university) setVal('pre_university', profile.pre_university);
        if(profile.pre_university_year) setVal('pre_university_year', profile.pre_university_year);
        if(profile.pre_university_percentage) setVal('pre_university_percentage', profile.pre_university_percentage);
        if(profile.graduation) setVal('graduation', profile.graduation);
        if(profile.graduation_year) setVal('graduation_year', profile.graduation_year);
        if(profile.graduation_percentage) setVal('graduation_percentage', profile.graduation_percentage);
        if(profile.post_graduation) setVal('post_graduation', profile.post_graduation);
        if(profile.post_graduation_year) setVal('post_graduation_year', profile.post_graduation_year);
        if(profile.post_graduation_percentage) setVal('post_graduation_percentage', profile.post_graduation_percentage);

        // Languages
        if(profile.spoken_languages && profile.spoken_languages.length > 0) {
            const langCheckboxes = document.querySelectorAll('input[name="languages"]');
            langCheckboxes.forEach(cb => {
                if(profile.spoken_languages.includes(cb.value)) {
                    cb.checked = true;
                }
            });
        }

        // Skills
        if(profile.skills && profile.skills.length > 0) {
            skills = profile.skills;
            renderSkills();
        }

        // Certifications
        if(profile.certifications && profile.certifications.length > 0) {
            certifications = profile.certifications;
            renderCertifications();
        }

        // Current/Latest Experience
        if(profile.current_company) setVal('current_company', profile.current_company);
        if(profile.current_designation) setVal('current_designation', profile.current_designation);
        if(profile.current_doj) setVal('current_doj', profile.current_doj?.split('T')[0]);
        if(profile.current_dol) setVal('current_dol', profile.current_dol?.split('T')[0]);
        if(profile.experience_years) setVal('experience_years', profile.experience_years);

        // Previous Experience
        if(profile.experience && profile.experience.length > 0) {
            profile.experience.forEach(exp => addExperienceField(exp));
        }

        // Additional Education
        if(profile.education && profile.education.length > 0) {
            profile.education.forEach(edu => addEducationField(edu));
        }

        // Resume
        if(profile.resume_url) {
            const fileName = profile.resume_url.split('/').pop().replace(/^\d+_/, ''); 
            const resumeText = document.getElementById('resumeFileName');
            if(resumeText) {
                resumeText.innerHTML = `
                    <span class="text-success"><i class="fas fa-check-circle"></i> Existing Resume: ${fileName}</span> 
                    <br><small class="text-muted" style="font-weight:normal;">(Upload a new file to replace it)</small>
                `;
            }
        }
        
        // Profile Image
        if(profile.avatar_url) {
            const img = document.getElementById('profileImageTag');
            const initials = document.getElementById('avatarInitialsPreview');
            if(img) {
                img.src = profile.avatar_url;
                img.style.display = 'block';
            }
            if(initials) initials.style.display = 'none';
            document.getElementById('profileImageFileName').innerHTML = `<span class="text-success"><i class="fas fa-check-circle"></i> Profile photo uploaded</span>`;
        }
        
        // Introduction Video
        if(profile.intro_video_url) {
            const introVideoAccepted = document.getElementById('introVideoAccepted');
            const introRecordingControls = document.getElementById('introRecordingControls');
            const introCameraFeed = document.getElementById('introCameraFeed');
            
            if(introVideoAccepted) introVideoAccepted.style.display = 'block';
            if(introRecordingControls) introRecordingControls.style.display = 'none';
            if(introCameraFeed) introCameraFeed.style.display = 'none';
            
            hasIntroVideoRecorded = true;
            
            const acceptedVideoDuration = document.getElementById('acceptedVideoDuration');
            if(acceptedVideoDuration) acceptedVideoDuration.textContent = 'Existing video from profile';
            
            const blobInput = document.getElementById('introVideoRecordedBlob');
            if(blobInput) blobInput.value = 'existing';
        }

    } catch (err) {
        console.warn("No existing profile found or error fetching:", err);
        addExperienceField();
        addEducationField();
        await initLocationPickers();
    }
}

/* -------------------------------------------------------
   LOCATION PICKERS INITIALIZATION
------------------------------------------------------- */
async function initLocationPickers() {
    try {
        // Load countries for both selects
        const countries = await getCountries();
        // Filter out countries with empty/null names
        const validCountries = countries.filter(c => c.name && c.name.trim());
        const currentCountrySelect = document.getElementById('currentCountrySelect');
        const permanentCountrySelect = document.getElementById('permanentCountrySelect');
        
        if(currentCountrySelect && validCountries.length > 0) {
            createSearchableDropdown(currentCountrySelect, validCountries, 'name', 'name', () => loadStatesForCountry('current'));
        }
        
        if(permanentCountrySelect && validCountries.length > 0) {
            createSearchableDropdown(permanentCountrySelect, validCountries, 'name', 'name', () => loadStatesForCountry('permanent'));
        }

        // Initialize city autocomplete pickers
        const currentCityContainer = document.getElementById('currentCityPicker');
        const permanentCityContainer = document.getElementById('permanentCityPicker');
        
        if(currentCityContainer) {
            currentCityContainer.innerHTML = '<input type="text" name="current_city" placeholder="Search city..." class="form-control" />';
            const input = currentCityContainer.querySelector('input');
            setupCityAutocomplete(input, 'current');
        }
        
        if(permanentCityContainer) {
            permanentCityContainer.innerHTML = '<input type="text" name="permanent_city" placeholder="Search city..." class="form-control" />';
            const input = permanentCityContainer.querySelector('input');
            setupCityAutocomplete(input, 'permanent');
        }
    } catch (err) {
        console.error('Error initializing location pickers:', err);
    }
}

// Create searchable dropdown with all items accessible but only ~7 visible
function createSearchableDropdown(originalSelect, items, valueKey, labelKey, onChangeCallback) {
    const container = originalSelect.parentElement;
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'searchable-dropdown';
    wrapper.style.cssText = 'position: relative;';
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control searchable-dropdown-input';
    input.placeholder = 'Search...';
    input.id = originalSelect.id;
    input.autocomplete = 'off';
    
    // Hidden input to store actual value
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = originalSelect.name || originalSelect.id;
    hiddenInput.id = originalSelect.id + '_value';
    
    // Remove name from original select to avoid duplicate form fields
    originalSelect.removeAttribute('name');
    
    // Create dropdown list
    const dropdown = document.createElement('div');
    dropdown.className = 'searchable-dropdown-list';
    dropdown.style.cssText = 'display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; border-radius: 4px; max-height: 250px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    
    // Render all items - use input._items to allow dynamic updates
    function renderItems(filter = '') {
        const currentItems = input._items || items;
        const filtered = filter 
            ? currentItems.filter(item => item[labelKey].toLowerCase().includes(filter.toLowerCase()))
            : currentItems;
        
        dropdown.innerHTML = filtered.slice(0, 100).map(item => 
            `<div class="searchable-dropdown-item" data-value="${item[valueKey]}" data-label="${item[labelKey]}" style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
                ${item[labelKey]}
            </div>`
        ).join('');
        
        if(filtered.length === 0) {
            dropdown.innerHTML = '<div style="padding: 10px; color: #999; text-align: center;">No results found</div>';
        }
        
        // Add click handlers
        dropdown.querySelectorAll('.searchable-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.dataset.label;
                hiddenInput.value = item.dataset.value;
                dropdown.style.display = 'none';
                if(onChangeCallback) onChangeCallback();
            });
            item.addEventListener('mouseenter', () => item.style.background = '#f0f0f0');
            item.addEventListener('mouseleave', () => item.style.background = 'white');
        });
    }
    
    // Input events
    input.addEventListener('focus', () => {
        renderItems(input.value);
        dropdown.style.display = 'block';
    });
    
    input.addEventListener('input', () => {
        renderItems(input.value);
        dropdown.style.display = 'block';
    });
    
    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.searchable-dropdown-item');
        if(items.length === 0) return;
        
        const currentHighlight = dropdown.querySelector('.searchable-dropdown-item.highlighted');
        let currentIndex = -1;
        items.forEach((item, idx) => {
            if(item === currentHighlight) currentIndex = idx;
        });
        
        if(e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            items.forEach(item => item.style.background = '');
            items[nextIndex].style.background = '#f0f0f0';
            items[nextIndex].classList.add('highlighted');
            items[nextIndex].scrollIntoView({ block: 'nearest' });
        } else if(e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            items.forEach(item => item.style.background = '');
            items[prevIndex].style.background = '#f0f0f0';
            items[prevIndex].classList.add('highlighted');
            items[prevIndex].scrollIntoView({ block: 'nearest' });
        } else if(e.key === 'Enter') {
            e.preventDefault();
            if(currentHighlight) {
                input.value = currentHighlight.dataset.label;
                hiddenInput.value = currentHighlight.dataset.value;
                dropdown.style.display = 'none';
                if(onChangeCallback) onChangeCallback();
            }
        } else if(e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if(!wrapper.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    // Assemble
    wrapper.appendChild(input);
    wrapper.appendChild(hiddenInput);
    wrapper.appendChild(dropdown);
    
    // Replace original select
    originalSelect.style.display = 'none';
    container.insertBefore(wrapper, originalSelect);
    
    // Mark wrapper as initialized for subsequent calls
    wrapper._searchableInit = true;
    
    // Store reference for external access
    input._hiddenInput = hiddenInput;
    input._dropdown = dropdown;
    input._items = items;
    input._valueKey = valueKey;
    input._labelKey = labelKey;
    
    // Expose getValue/setValue methods
    input.getValue = () => hiddenInput.value;
    input.setValue = (val) => {
        const item = items.find(i => i[valueKey] == val);
        if(item) {
            input.value = item[labelKey];
            hiddenInput.value = item[valueKey];
            if(onChangeCallback) onChangeCallback();
        }
    };
    
    return input;
}

async function loadStatesForCountry(type) {
    const countryInput = document.getElementById(`${type}CountrySelect`);
    const stateSelect = document.getElementById(`${type}StateSelect`);
    
    if(!countryInput || !stateSelect) return;
    
    // Get country name from searchable dropdown input or hidden value
    let countryName = '';
    if(countryInput.getValue) {
        // Searchable dropdown - getValue returns the hidden input value (country name)
        countryName = countryInput.getValue();
    } else if(countryInput._hiddenInput) {
        countryName = countryInput._hiddenInput.value;
    } else {
        countryName = countryInput.value;
    }
    
    if(!countryName) {
        stateSelect.innerHTML = '<option value="">Select State</option>';
        return;
    }
    
    try {
        console.log('Location: Searching for country:', countryName);
        const countries = await getCountries({ search: countryName });
        console.log('Location: Countries found:', countries);
        if(countries && countries.length > 0) {
            const countryId = countries[0].id;
            console.log('Location: Country ID:', countryId, 'Type:', typeof countryId);
            const states = await getStates(countryId);
            console.log('Location: States loaded:', states?.length || 0, 'states');
            // Filter out states with empty/null names
            const validStates = states.filter(s => s.name && s.name.trim());
            
            // Check if searchable dropdown already exists (check wrapper, not the hidden select)
            const existingWrapper = stateSelect.parentElement.querySelector('.searchable-dropdown');
            if(!existingWrapper || !existingWrapper._searchableInit) {
                // First time - create the searchable dropdown
                createSearchableDropdown(stateSelect, validStates, 'name', 'name');
            } else {
                // Update existing searchable dropdown items and clear previous selection
                const input = existingWrapper.querySelector('.searchable-dropdown-input');
                const hiddenInput = existingWrapper.querySelector('input[type="hidden"]');
                if(input) {
                    input._items = validStates;
                    input.value = '';  // Clear previous selection
                    if(hiddenInput) hiddenInput.value = '';  // Clear hidden value
                }
            }
        }
    } catch (err) {
        console.error('Error loading states:', err);
    }
}

function setupCityAutocomplete(input, type) {
    if(!input) return;
    
    let debounceTimer;
    let dropdown = null;
    
    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const query = e.target.value.trim();
            if(query.length < 2) {
                if(dropdown) dropdown.remove();
                return;
            }
            
            try {
                const results = await searchLocations(query, 5);
                if(results && results.cities && results.cities.length > 0) {
                    showCityDropdown(input, results.cities, type);
                } else {
                    // No cities found or cities table doesn't exist - just allow free text input
                    if(dropdown) dropdown.remove();
                }
            } catch (err) {
                console.warn('City search unavailable (cities table may not exist):', err);
                // Gracefully fail - allow user to type city name manually
                if(dropdown) dropdown.remove();
            }
        }, 300);
    });
}

function showCityDropdown(input, cities, type) {
    let dropdown = input.parentElement.querySelector('.city-dropdown');

    if(!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'city-dropdown';
        dropdown.style.cssText = 'position: absolute; background: white; border: 1px solid #ddd; border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; width: 100%; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(dropdown);
    }

    if(cities.length === 0) {
        dropdown.innerHTML = '<div style="padding: 8px; color: #999;">No cities found</div>';
        return;
    }

    dropdown.innerHTML = cities.map(city => 
        `<div class="city-option" data-city="${city.name}" data-state="${city.state_name || ''}" data-country="${city.country_name || ''}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
            ${city.name}${city.state_name ? `, ${city.state_name}` : ''}${city.country_name ? `, ${city.country_name}` : ''}
        </div>`
    ).join('');

    dropdown.querySelectorAll('.city-option').forEach(option => {
        option.addEventListener('click', () => {
            input.value = option.dataset.city;

            // Also update state and country selects (handle both regular and searchable dropdowns)
            const stateSelect = document.getElementById(`${type}StateSelect`);
            const countrySelect = document.getElementById(`${type}CountrySelect`);

            // Update state - handle searchable dropdown
            if(stateSelect && option.dataset.state) {
                if(stateSelect.setValue) {
                    stateSelect.setValue(option.dataset.state);
                } else {
                    stateSelect.value = option.dataset.state;
                }
            }

            // Update country - handle searchable dropdown
            if(countrySelect && option.dataset.country) {
                if(countrySelect.setValue) {
                    countrySelect.setValue(option.dataset.country);
                } else {
                    countrySelect.value = option.dataset.country;
                }
            }

            dropdown.remove();
        });

        option.addEventListener('mouseenter', () => {
            option.style.background = '#f0f0f0';
        });
        option.addEventListener('mouseleave', () => {
            option.style.background = 'white';
        });
    });
}

/* -------------------------------------------------------
   UI & NAVIGATION
------------------------------------------------------- */
function updateUI() {
    if(steps) {
        steps.forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            if (stepNum === currentStep) { step.classList.add('active'); step.classList.remove('completed'); } 
            else if (stepNum < currentStep) { step.classList.add('completed'); step.classList.remove('active'); } 
            else { step.classList.remove('active', 'completed'); }
        });
    }
    if(sections) {
        sections.forEach(section => {
            if(section.id === `step${currentStep}`) section.classList.add('active');
            else section.classList.remove('active');
        });
    }
    if (prevBtn) prevBtn.style.visibility = (currentStep === 1) ? 'hidden' : 'visible';
  
    if (currentStep === totalSteps) {
        if(nextBtn) nextBtn.style.display = 'none';
        if(submitBtn) submitBtn.style.display = 'block';
    } else {
        if(nextBtn) nextBtn.style.display = 'block';
        if(submitBtn) submitBtn.style.display = 'none';
    }
    
    // Initialize video recording when reaching video step (step 7)
    if (currentStep === 7 && !window.videoSetupInitialized) {
        setupIntroVideoRecording();
        window.videoSetupInitialized = true;
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupEventListeners() {
    const origin = window.location.origin;

    if(nextBtn) nextBtn.addEventListener('click', () => { if (validateStep(currentStep)) { currentStep++; updateUI(); } });
    if(prevBtn) prevBtn.addEventListener('click', () => { if(currentStep > 1) { currentStep--; updateUI(); } });
    if(addExpBtn) addExpBtn.addEventListener('click', () => addExperienceField());
    if(addEduBtn) addEduBtn.addEventListener('click', () => addEducationField());
    if(addSkillBtn) addSkillBtn.addEventListener('click', () => addSkill(skillInput?.value.trim()));
    if(skillInput) skillInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput.value.trim()); } });
    
    if(resumeInput) {
        resumeInput.addEventListener('change', (e) => { 
            if (e.target.files[0]) {
                document.getElementById('resumeFileName').innerHTML = `<i class="fas fa-file-pdf"></i> ${e.target.files[0].name}`; 
            }
        });
    }
    
    // Profile Image Upload Handler
    if(profileImageInput) {
        profileImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file) {
                // Validate file size (max 2MB)
                if(file.size > 2 * 1024 * 1024) {
                    notify('Image size should be less than 2MB', 'error');
                    profileImageInput.value = '';
                    return;
                }
                
                // Show file name
                document.getElementById('profileImageFileName').textContent = file.name;
                
                // Preview image
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.getElementById('profileImageTag');
                    const initials = document.getElementById('avatarInitialsPreview');
                    if(img) {
                        img.src = e.target.result;
                        img.style.display = 'block';
                    }
                    if(initials) initials.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if(form) form.addEventListener('submit', handleFormSubmit);
    
    if(logoutBtn) logoutBtn.addEventListener('click', async () => { await customAuth.signOut(); window.location.href = CONFIG.PAGES.JOBS; });
    if(goToProfileBtn) goToProfileBtn.addEventListener('click', () => { window.location.href = CONFIG.PAGES.CANDIDATE_PROFILE; });
    
    // Sidebar Navigation (ID-based for consistency)
    const navDashboard = document.getElementById('navDashboard');
    const navJobs = document.getElementById('navJobs');
    const navApplications = document.getElementById('navApplications');
    const navProfile = document.getElementById('navProfile');
    
    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE);
    if(navJobs) navJobs.addEventListener('click', () => window.location.href = CONFIG.PAGES.JOBS);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_APPLICATIONS);
    if(navProfile) navProfile.addEventListener('click', () => window.location.href = CONFIG.PAGES.CANDIDATE_PROFILE);
}

function validateStep(step) {
    const currentSection = document.getElementById(`step${step}`);
    if(!currentSection) return true;
    const inputs = currentSection.querySelectorAll('input[required], textarea[required]');
    let isValid = true;
    inputs.forEach(input => {
        if (!input.value.trim()) { 
            isValid = false; 
            input.classList.add("input-error"); 
        } else { 
            input.classList.remove("input-error"); 
        }
    });
    
    // Special validation for video step (step 7)
    if(step === 7) {
        // Check for existing video from profile (shown in accepted state)
        const videoAcceptedDiv = document.getElementById('introVideoAccepted');
        const isVideoAccepted = videoAcceptedDiv && videoAcceptedDiv.style.display === 'block';
        
        // Check if we have a newly recorded video blob
        const hasRecordedVideo = hasIntroVideoRecorded && introVideoBlob;
        
        if(!hasRecordedVideo && !isVideoAccepted) {
            isValid = false;
            notify('Please record and accept your introduction video before submitting.', 'error');
        }
    }
    
    if (!isValid && step !== 6) notify('Please fill in all required fields.', 'error');
    return isValid;
}

/* -------------------------------------------------------
   DYNAMIC CONTENT (Now accepts existing data)
------------------------------------------------------- */
function addExperienceField(data = {}) {
    experienceCount++;
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.innerHTML = `
        <div class="dynamic-item-header">
            <h4>Experience ${experienceCount}</h4>
            <button type="button" class="btn-remove"><i class="fas fa-trash"></i></button>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Title*</label><input type="text" name="exp_title_${experienceCount}" value="${data.title || data.job_title || ''}" required></div>
            <div class="form-group"><label>Company*</label><input type="text" name="exp_company_${experienceCount}" value="${data.company || ''}" required></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Start*</label><input type="date" name="exp_start_${experienceCount}" value="${data.start_date || ''}" required></div>
            <div class="form-group"><label>End</label><input type="date" name="exp_end_${experienceCount}" value="${data.end_date || ''}"></div>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea name="exp_desc_${experienceCount}">${data.description || ''}</textarea>
        </div>
    `;
    div.querySelector('.btn-remove').onclick = () => div.remove();
    document.getElementById('experienceContainer').appendChild(div);
}

function addEducationField(data = {}) {
    educationCount++;
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.innerHTML = `
        <div class="dynamic-item-header">
            <h4>Education ${educationCount}</h4>
            <button type="button" class="btn-remove"><i class="fas fa-trash"></i></button>
        </div>
        <div class="form-row-3">
            <div class="form-group"><label>Degree*</label><input type="text" name="edu_degree_${educationCount}" value="${data.degree || ''}" required></div>
            <div class="form-group"><label>Institution*</label><input type="text" name="edu_school_${educationCount}" value="${data.institution || ''}" required></div>
            <div class="form-group"><label>Year*</label><input type="number" name="edu_year_${educationCount}" value="${data.completion_year || ''}" required></div>
        </div>
    `;
    div.querySelector('.btn-remove').onclick = () => div.remove();
    document.getElementById('educationContainer').appendChild(div);
}

function addSkill(skill) {
    if (skill && !skills.includes(skill)) { skills.push(skill); renderSkills(); }
    if(skillInput) skillInput.value = '';
}

function renderSkills() {
    if(!skillsContainer) return;
    skillsContainer.innerHTML = skills.map(s => `
        <span class="skill-tag">
            ${s} <i class="fas fa-times" onclick="window.removeSkill('${s}')"></i>
        </span>
    `).join('');
}
window.removeSkill = (s) => { skills = skills.filter(k => k !== s); renderSkills(); };

/* -------------------------------------------------------
   VIDEO RECORDING SETUP
------------------------------------------------------- */
function setupIntroVideoRecording() {
    const startBtn = document.getElementById('startIntroRecordingBtn');
    const stopBtn = document.getElementById('stopIntroRecordingBtn');
    const acceptBtn = document.getElementById('acceptIntroVideoBtn');
    const retakeBtn = document.getElementById('retakeIntroVideoBtn');
    
    if(startBtn) startBtn.addEventListener('click', startIntroRecording);
    if(stopBtn) stopBtn.addEventListener('click', stopIntroRecording);
    if(acceptBtn) acceptBtn.addEventListener('click', acceptIntroVideo);
    if(retakeBtn) retakeBtn.addEventListener('click', retakeIntroVideo);
    
    // Re-record button (in accepted state)
    const reRecordBtn = document.getElementById('reRecordIntroVideoBtn');
    if(reRecordBtn) {
        reRecordBtn.addEventListener('click', () => {
            resetIntroVideoRecording();
        });
    }
    
    // View Video button (in accepted state)
    const viewVideoBtn = document.getElementById('viewIntroVideoBtn');
    if(viewVideoBtn) {
        viewVideoBtn.addEventListener('click', async () => {
            const playbackFeed = document.getElementById('introPlaybackFeed');
            const cameraFeed = document.getElementById('introCameraFeed');
            const acceptedDiv = document.getElementById('introVideoAccepted');
            
            // Check if we have a newly recorded video blob
            if(playbackFeed && introVideoBlob) {
                // Show playback video
                playbackFeed.style.display = 'block';
                playbackFeed.src = URL.createObjectURL(introVideoBlob);
                playbackFeed.play();
                if(cameraFeed) cameraFeed.style.display = 'none';
                if(acceptedDiv) acceptedDiv.style.display = 'none';
                
                // When video ends, show accepted state again
                playbackFeed.onended = () => {
                    playbackFeed.style.display = 'none';
                    if(cameraFeed) cameraFeed.style.display = 'block';
                    if(acceptedDiv) acceptedDiv.style.display = 'block';
                };
            } else {
                // Check for existing video from profile
                try {
                    const res = await backendGet('/applicant/profile');
                    const json = await handleResponse(res);
                    const profile = json.data || {};
                    
                    if(profile.intro_video_url && playbackFeed) {
                        playbackFeed.style.display = 'block';
                        playbackFeed.src = profile.intro_video_url;
                        playbackFeed.play();
                        if(cameraFeed) cameraFeed.style.display = 'none';
                        if(acceptedDiv) acceptedDiv.style.display = 'none';
                        
                        playbackFeed.onended = () => {
                            playbackFeed.style.display = 'none';
                            if(cameraFeed) cameraFeed.style.display = 'block';
                            if(acceptedDiv) acceptedDiv.style.display = 'block';
                        };
                    }
                } catch(err) {
                    console.error('Error fetching existing video:', err);
                }
            }
        });
    }
    
    // Initialize camera on page load
    initIntroCamera();
}

async function initIntroCamera() {
    const video = document.getElementById('introCameraFeed');
    if(!video) return;
    
    try {
        // Try with video and audio first
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }, 
            audio: true 
        });
        video.srcObject = stream;
        introVideoStream = stream;
    } catch (err) {
        console.error('Camera access error:', err);
        
        // If audio is the issue (no mic), try video only
        if (err.name === 'NotFoundError') {
            try {
                const videoOnlyStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }, 
                    audio: false 
                });
                video.srcObject = videoOnlyStream;
                introVideoStream = videoOnlyStream;
                showWarning("warningBox", "No microphone detected. Video will be recorded without audio.", "No Microphone");
                return;
            } catch (videoOnlyErr) {
                console.error('Video-only also failed:', videoOnlyErr);
                err = videoOnlyErr;
            }
        }
        
        // Handle specific error types
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            showError("errorBox", "No camera detected. Check if camera is enabled in Windows Settings > Privacy > Camera.", "No Camera Found");
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            showWarning("warningBox", "Camera access denied. Click the camera icon in the address bar and allow access.", "Camera Access Required");
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            showError("errorBox", "Camera is being used by another application. Close other browser tabs, Camera app, Teams, Zoom, etc. and refresh.", "Camera In Use");
        } else {
            showError("errorBox", "Unable to access camera: " + err.message, "Camera Error");
        }
    }
}

function startIntroRecording() {
    const video = document.getElementById('introCameraFeed');
    if(!video || !introVideoStream) {
        showError("errorBox", "Camera not ready. Please wait...", "Camera Not Ready");
        return;
    }
    
    introVideoChunks = [];
    const mediaRecorder = new MediaRecorder(introVideoStream);
    
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            introVideoChunks.push(event.data);
        }
    };
    
    mediaRecorder.onstop = () => {
        introVideoBlob = new Blob(introVideoChunks, { type: 'video/webm' });
        const videoURL = URL.createObjectURL(introVideoBlob);
        
        // Show playback
        const playback = document.getElementById('introPlaybackFeed');
        const camera = document.getElementById('introCameraFeed');
        
        if(playback) {
            playback.src = videoURL;
            playback.style.display = 'block';
        }
        if(camera) camera.style.display = 'none';
        
        // Show review controls
        document.getElementById('introRecordingControls').style.display = 'none';
        document.getElementById('introStopControls').style.display = 'none';
        document.getElementById('introReviewControls').style.display = 'flex';
        
        hasIntroVideoRecorded = true;
    };
    
    mediaRecorder.start();
    introVideoRecorder = mediaRecorder;
    
    // Update UI
    document.getElementById('introRecordingControls').style.display = 'none';
    document.getElementById('introStopControls').style.display = 'flex';
    document.getElementById('recordingIndicator').style.display = 'block';
    
    startIntroTimer();
}

function stopIntroRecording() {
    if(introVideoRecorder && introVideoRecorder.state !== 'inactive') {
        introVideoRecorder.stop();
        stopIntroTimer();
    }
}

function acceptIntroVideo() {
    // Hide review controls, show accepted state
    document.getElementById('introReviewControls').style.display = 'none';
    document.getElementById('introVideoAccepted').style.display = 'block';
    
    // Store blob in hidden input for form submission
    const blobInput = document.getElementById('introVideoRecordedBlob');
    if(blobInput && introVideoBlob) {
        // Convert blob to base64 for form submission
        const reader = new FileReader();
        reader.onloadend = () => {
            blobInput.value = reader.result;
        };
        reader.readAsDataURL(introVideoBlob);
    }
    
    // Update accepted state with duration
    const acceptedVideoDuration = document.getElementById('acceptedVideoDuration');
    if(acceptedVideoDuration) {
        const mins = Math.floor(introRecordingSeconds / 60).toString().padStart(2, '0');
        const secs = (introRecordingSeconds % 60).toString().padStart(2, '0');
        acceptedVideoDuration.textContent = `Duration: ${mins}:${secs}`;
    }
    
    showSuccess("errorBox", "Video recorded successfully!", "Recording Complete");
}

function retakeIntroVideo() {
    resetIntroVideoRecording();
}

function resetIntroVideoRecording() {
    introVideoBlob = null;
    introVideoChunks = [];
    hasIntroVideoRecorded = false;
    introVideoInput.value = '';
    
    const playback = document.getElementById('introPlaybackFeed');
    const camera = document.getElementById('introCameraFeed');
    
    if(playback) {
        playback.src = '';
        playback.style.display = 'none';
    }
    if(camera) camera.style.display = 'block';
    
    document.getElementById('introRecordingControls').style.display = 'flex';
    document.getElementById('introStopControls').style.display = 'none';
    document.getElementById('introReviewControls').style.display = 'none';
    document.getElementById('introVideoAccepted').style.display = 'none';
    document.getElementById('recordingIndicator').style.display = 'none';
    
    resetIntroTimer();
    
    // Re-initialize camera
    initIntroCamera();
}

function startIntroTimer() {
    introRecordingSeconds = 0;
    const display = document.getElementById('introTimerDisplay');
    if(display) display.textContent = '00:00';
    
    introTimerInterval = setInterval(() => {
        introRecordingSeconds++;
        const mins = Math.floor(introRecordingSeconds / 60).toString().padStart(2, '0');
        const secs = (introRecordingSeconds % 60).toString().padStart(2, '0');
        if(display) display.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopIntroTimer() {
    clearInterval(introTimerInterval);
}

function resetIntroTimer() {
    stopIntroTimer();
    introRecordingSeconds = 0;
    const display = document.getElementById('introTimerDisplay');
    if(display) display.textContent = '00:00';
}

/* -------------------------------------------------------
   SUBMISSION
------------------------------------------------------- */
async function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateStep(currentStep)) return;
    
    // Check if a resume already exists before failing validation
    const resumeTextElement = document.getElementById('resumeFileName');
    const hasExistingResume = resumeTextElement && resumeTextElement.innerText.includes('Existing Resume');
    
    if (resumeInput && !resumeInput.files[0] && !hasExistingResume) { 
        showError("errorBox", "Please upload your resume.", "Resume Required");
        return; 
    }

    submitBtn.disabled = true; submitBtn.textContent = "Submitting...";

    try {
        const fd = new FormData(form);
        
        // 1. Collect Previous Experience
        let experience = [];
        document.querySelectorAll('#experienceContainer .dynamic-item').forEach(item => {
            const inputs = item.querySelectorAll('input, textarea');
            let exp = {};
            inputs.forEach(i => {
                if(i.name.includes('title')) exp.job_title = i.value;
                if(i.name.includes('company')) exp.company = i.value;
                if(i.name.includes('start')) exp.start_date = i.value;
                if(i.name.includes('end')) exp.end_date = i.value;
                if(i.name.includes('desc')) exp.description = i.value;
            });
            experience.push(exp);
        });

        // 2. Collect Additional Education
        let education = [];
        document.querySelectorAll('#educationContainer .dynamic-item').forEach(item => {
            const inputs = item.querySelectorAll('input');
            let edu = {};
            inputs.forEach(i => {
                if(i.name.includes('degree')) edu.degree = i.value;
                if(i.name.includes('school')) edu.institution = i.value;
                if(i.name.includes('year')) edu.completion_year = i.value;
            });
            education.push(edu);
        });

        // 3. Collect Languages
        const selectedLanguages = [];
        document.querySelectorAll('input[name="languages"]:checked').forEach(cb => {
            selectedLanguages.push(cb.value);
        });
        const otherLanguages = document.getElementById('otherLanguageInput')?.value || '';
        if(otherLanguages) {
            otherLanguages.split(',').forEach(lang => {
                const trimmed = lang.trim();
                if(trimmed && !selectedLanguages.includes(trimmed)) {
                    selectedLanguages.push(trimmed);
                }
            });
        }

        // 4. Collect Certifications
        const certifications = [];
        document.querySelectorAll('#certificationsContainer .certification-item').forEach(item => {
            const inputs = item.querySelectorAll('input');
            const cert = {};
            inputs.forEach(i => {
                if(i.name.includes('cert_name')) cert.name = i.value;
                if(i.name.includes('cert_issuer')) cert.issuer = i.value;
                if(i.name.includes('cert_year')) cert.year = i.value;
            });
            if(cert.name || cert.issuer || cert.year) {
                certifications.push(cert);
            }
        });

        // 5. Build Payload with all new fields
        const payload = new FormData();
        
        // Personal Info
        payload.append('phone', fd.get('phone') || '');
        payload.append('date_of_birth', fd.get('date_of_birth') || '');
        payload.append('gender', fd.get('gender') || '');
        payload.append('marital_status', fd.get('marital_status') || '');
        
        // Current Address - get from hidden inputs created by searchable dropdowns
        payload.append('current_address', fd.get('current_address') || '');
        payload.append('current_city', fd.get('current_city') || '');
        // State and Country use hidden inputs with IDs like currentStateSelect_value, currentCountrySelect_value
        const currentStateHidden = document.getElementById('currentStateSelect_value');
        const currentCountryHidden = document.getElementById('currentCountrySelect_value');
        payload.append('current_state', currentStateHidden?.value || fd.get('current_state') || '');
        payload.append('current_country', currentCountryHidden?.value || fd.get('current_country') || '');
        
        // Permanent Address - get from hidden inputs created by searchable dropdowns
        payload.append('permanent_address', fd.get('permanent_address') || '');
        payload.append('permanent_city', fd.get('permanent_city') || '');
        const permanentStateHidden = document.getElementById('permanentStateSelect_value');
        const permanentCountryHidden = document.getElementById('permanentCountrySelect_value');
        payload.append('permanent_state', permanentStateHidden?.value || fd.get('permanent_state') || '');
        payload.append('permanent_country', permanentCountryHidden?.value || fd.get('permanent_country') || '');
        
        // Professional Details
        payload.append('summary', fd.get('summary') || '');
        payload.append('current_salary', fd.get('current_salary') || '');
        payload.append('expected_salary', fd.get('expected_salary') || '');
        payload.append('notice_period_days', fd.get('notice_period_days') || '');
        payload.append('highest_qualification', fd.get('highest_qualification') || '');
        
        // Social Links
        payload.append('linkedin_url', fd.get('linkedin_url') || '');
        payload.append('portfolio_url', fd.get('portfolio_url') || '');
        payload.append('personal_projects', fd.get('personal_projects') || '');
        payload.append('personal_blogs', fd.get('personal_blogs') || '');
        
        // Education Details
        payload.append('schooling', fd.get('schooling') || '');
        payload.append('schooling_year', fd.get('schooling_year') || '');
        payload.append('schooling_percentage', fd.get('schooling_percentage') || '');
        payload.append('pre_university', fd.get('pre_university') || '');
        payload.append('pre_university_year', fd.get('pre_university_year') || '');
        payload.append('pre_university_percentage', fd.get('pre_university_percentage') || '');
        payload.append('graduation', fd.get('graduation') || '');
        payload.append('graduation_year', fd.get('graduation_year') || '');
        payload.append('graduation_percentage', fd.get('graduation_percentage') || '');
        payload.append('post_graduation', fd.get('post_graduation') || '');
        payload.append('post_graduation_year', fd.get('post_graduation_year') || '');
        payload.append('post_graduation_percentage', fd.get('post_graduation_percentage') || '');
        
        // Skills & Languages
        payload.append('skills', JSON.stringify(skills));
        payload.append('spoken_languages', JSON.stringify(selectedLanguages));
        payload.append('certifications', JSON.stringify(certifications));
        
        // Current/Latest Experience
        payload.append('current_company', fd.get('current_company') || '');
        payload.append('current_designation', fd.get('current_designation') || '');
        payload.append('current_doj', fd.get('current_doj') || '');
        payload.append('current_dol', fd.get('current_dol') || '');
        
        // Previous Experience (JSON)
        payload.append('experience', JSON.stringify(experience));
        
        // Additional Education (JSON)
        payload.append('education', JSON.stringify(education));
        
        // Resume file
        if(resumeInput.files[0]) {
            payload.append('resume', resumeInput.files[0]);
        }
        
        // Profile image
        if(profileImageInput && profileImageInput.files[0]) {
            payload.append('profile_image', profileImageInput.files[0]);
        }

        const response = await backendPut('/applicant/profile', payload);
        await handleResponse(response);
        
        // Upload introduction video separately if recorded
        if(hasIntroVideoRecorded && introVideoBlob) {
            try {
                const videoPayload = new FormData();
                videoPayload.append('file', introVideoBlob, 'intro-video.webm');
                
                const videoResponse = await backendPost('/applicant/upload-intro-video', videoPayload);
                await handleResponse(videoResponse);
                
                console.log('Intro video uploaded successfully');
            } catch (videoError) {
                console.warn('Video upload failed, but profile was saved:', videoError);
            }
        }
        
        // Mark user as onboarded
        try {
            await customAuth.updateUser({ data: { onboarded: true } });
        } catch (updateError) {
            console.warn('User update failed, but profile was saved:', updateError);
        }

        if(successModal) successModal.classList.add('active');

    } catch (err) {
        showError("errorBox", "Submission failed: " + (err.message || "Unknown error"), "Application Failed");
        submitBtn.disabled = false; submitBtn.textContent = "Submit Application";
    }
}

/* -------------------------------------------------------
   HELPER FUNCTIONS
------------------------------------------------------- */
// Copy current address to permanent address
window.copyCurrentAddress = function() {
    const sameAsCurrent = document.getElementById('sameAsCurrent');
    const permanentSection = document.getElementById('permanentAddressSection');
    
    if(sameAsCurrent && sameAsCurrent.checked) {
        // Copy values
        setVal('permanent_address', getVal('current_address'));
        setVal('permanent_city', getVal('current_city'));
        setVal('permanent_state', getVal('current_state'));
        setVal('permanent_country', getVal('current_country'));
        
        // Hide the permanent address section
        if(permanentSection) permanentSection.style.display = 'none';
    } else {
        // Show the permanent address section
        if(permanentSection) permanentSection.style.display = 'block';
    }
};

function getVal(name) {
    const el = document.querySelector(`[name="${name}"]`);
    return el ? el.value : '';
}

// Render certifications
function renderCertifications() {
    const container = document.getElementById('certificationsContainer');
    if(!container || !certifications.length) return;
    
    container.innerHTML = certifications.map((cert, idx) => `
        <div class="certification-item" style="display: grid; grid-template-columns: 1fr 1fr 100px auto; gap: 1rem; margin-bottom: 1rem;">
            <input type="text" name="cert_name_${idx + 1}" value="${cert.name || ''}" placeholder="Certification Name" />
            <input type="text" name="cert_issuer_${idx + 1}" value="${cert.issuer || ''}" placeholder="Issuing Organization" />
            <input type="number" name="cert_year_${idx + 1}" value="${cert.year || ''}" placeholder="Year" min="2000" max="2030" />
            ${idx === 0 ? '<button type="button" class="btn btn-outline-secondary btn-sm" id="addCertification"><i class="fas fa-plus"></i></button>' : '<button type="button" class="btn btn-outline-danger btn-sm" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>'}
        </div>
    `).join('');
}

// Add certification handler
document.addEventListener('DOMContentLoaded', () => {
    const addCertBtn = document.getElementById('addCertification');
    if(addCertBtn) {
        addCertBtn.addEventListener('click', () => {
            certificationCount++;
            const container = document.getElementById('certificationsContainer');
            if(container) {
                const newCert = document.createElement('div');
                newCert.className = 'certification-item';
                newCert.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 100px auto; gap: 1rem; margin-bottom: 1rem;';
                newCert.innerHTML = `
                    <input type="text" name="cert_name_${certificationCount}" placeholder="Certification Name" />
                    <input type="text" name="cert_issuer_${certificationCount}" placeholder="Issuing Organization" />
                    <input type="number" name="cert_year_${certificationCount}" placeholder="Year" min="2000" max="2030" />
                    <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
                `;
                container.appendChild(newCert);
            }
        });
    }
});