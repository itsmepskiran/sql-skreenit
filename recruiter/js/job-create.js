import { customAuth } from '@shared/js/auth-config.js';
import { backendPost, backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import { requireRecruiterProfile, sidebarManager } from '@shared/js/profile-checker.js';
import { getCountries, getStates, searchLocations } from '@shared/js/location.js';
import '@shared/js/mobile.js';

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

// State
let skills = [];
let referenceData = {};

document.addEventListener("DOMContentLoaded", async () => {
    // Check if profile is complete before allowing job creation
    const canProceed = await requireRecruiterProfile();
    if (!canProceed) return; // Stop if profile check failed/redirected
    
    await checkAuth();
    setupNavigation();
    await loadReferenceData();
    await initLocationPickers();
    setupSkillsInput();
    
    const form = document.getElementById("createJobForm");
    if(form) form.addEventListener("submit", handleJobCreate);
});

/* -------------------------------------------------------
   REFERENCE DATA (Dropdowns)
------------------------------------------------------- */
async function loadReferenceData() {
    try {
        const res = await backendGet('/reference/all');
        const result = await handleResponse(res);
        referenceData = result.data || {};
        
        populateDropdown('department', referenceData.departments, 'id', 'name');
        populateDropdown('role', referenceData.roles, 'id', 'name');
        populateDropdown('employment_type', referenceData.employment_types, 'id', 'name');
        populateDropdown('industry', referenceData.industries, 'id', 'name');
        populateDropdown('job_type', referenceData.job_types, 'id', 'name');
        populateDropdown('education_qualification', referenceData.education_levels, 'id', 'name');
    } catch (err) {
        console.error('Error loading reference data:', err);
    }
}

function populateDropdown(elementId, items, valueKey, labelKey) {
    const select = document.getElementById(elementId);
    if (!select || !items) return;
    
    const currentPlaceholder = select.querySelector('option[value=""]');
    select.innerHTML = currentPlaceholder ? currentPlaceholder.outerHTML : '<option value="" disabled selected>Select option</option>';
    
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey] || item.slug || item.name;
        option.textContent = item[labelKey];
        select.appendChild(option);
    });
}

/* -------------------------------------------------------
   LOCATION PICKERS
------------------------------------------------------- */
async function initLocationPickers() {
    try {
        // Load countries
        const countries = await getCountries();
        const countryContainer = document.getElementById('location_country_container') || document.getElementById('location_country')?.parentElement;
        const countrySelect = document.getElementById('location_country');
        
        if(countrySelect && countries.length > 0) {
            // Filter out countries with empty/null names
            const validCountries = countries.filter(c => c.name && c.name.trim());
            // Convert to searchable dropdown - store country name as value (not ID)
            createSearchableDropdown(countrySelect, validCountries, 'name', 'name', loadStatesForCountry);
        }

        // Initialize city autocomplete
        const cityContainer = document.getElementById('jobCityPicker');
        if(cityContainer) {
            cityContainer.innerHTML = '<input type="text" id="location_city" placeholder="Search city..." class="form-control" />';
            const input = cityContainer.querySelector('input');
            setupCityAutocomplete(input);
        }
        
        // Remote checkbox handler
        const isRemoteCheckbox = document.getElementById('is_remote');
        if(isRemoteCheckbox) {
            isRemoteCheckbox.addEventListener('change', (e) => {
                const cityInput = document.getElementById('location_city');
                const stateSelect = document.getElementById('location_state');
                const countrySelect = document.getElementById('location_country');
                
                if(e.target.checked) {
                    if(cityInput) cityInput.disabled = true;
                    if(stateSelect) stateSelect.disabled = true;
                    if(countrySelect) countrySelect.disabled = true;
                } else {
                    if(cityInput) cityInput.disabled = false;
                    if(stateSelect) stateSelect.disabled = false;
                    if(countrySelect) countrySelect.disabled = false;
                }
            });
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
    
    // Create dropdown list
    const dropdown = document.createElement('div');
    dropdown.className = 'searchable-dropdown-list';
    dropdown.style.cssText = 'display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; border-radius: 4px; max-height: 250px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    
    // Render all items
    function renderItems(filter = '') {
        const filtered = filter 
            ? items.filter(item => item[labelKey].toLowerCase().includes(filter.toLowerCase()))
            : items;
        
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
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if(!wrapper.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        if(e.key === 'ArrowDown') {
            const items = dropdown.querySelectorAll('.searchable-dropdown-item');
            const activeItem = dropdown.querySelector('.searchable-dropdown-item.active');
            if(activeItem) {
                activeItem.classList.remove('active');
                const nextItem = items[Array.prototype.indexOf.call(items, activeItem) + 1];
                if(nextItem) {
                    nextItem.classList.add('active');
                    nextItem.scrollIntoView({ block: 'nearest' });
                }
            } else {
                items[0].classList.add('active');
                items[0].scrollIntoView({ block: 'nearest' });
            }
        } else if(e.key === 'ArrowUp') {
            const items = dropdown.querySelectorAll('.searchable-dropdown-item');
            const activeItem = dropdown.querySelector('.searchable-dropdown-item.active');
            if(activeItem) {
                activeItem.classList.remove('active');
                const prevItem = items[Array.prototype.indexOf.call(items, activeItem) - 1];
                if(prevItem) {
                    prevItem.classList.add('active');
                    prevItem.scrollIntoView({ block: 'nearest' });
                }
            } else {
                items[items.length - 1].classList.add('active');
                items[items.length - 1].scrollIntoView({ block: 'nearest' });
            }
        } else if(e.key === 'Enter') {
            const activeItem = dropdown.querySelector('.searchable-dropdown-item.active');
            if(activeItem) {
                input.value = activeItem.dataset.label;
                hiddenInput.value = activeItem.dataset.value;
                dropdown.style.display = 'none';
                if(onChangeCallback) onChangeCallback();
            }
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
        }
    };
    
    return input;
}

async function loadStatesForCountry() {
    const countryInput = document.getElementById('location_country');
    const stateSelect = document.getElementById('location_state');
    
    if(!countryInput || !stateSelect) return;
    
    // Get country name from searchable dropdown
    const countryName = countryInput.getValue ? countryInput.getValue() : countryInput.value;
    if(!countryName) {
        stateSelect.innerHTML = '<option value="">Select State</option>';
        return;
    }
    
    try {
        // Look up country ID from name
        const countries = await getCountries({ search: countryName });
        if(!countries || countries.length === 0) return;
        const countryId = countries[0].id;
        const states = await getStates(countryId);
        // Filter out states with empty/null names
        const validStates = states.filter(s => s.name && s.name.trim());
        
        // Check if searchable dropdown already exists
        const existingWrapper = stateSelect.parentElement.querySelector('.searchable-dropdown');
        if(!existingWrapper || !existingWrapper._searchableInit) {
            createSearchableDropdown(stateSelect, validStates, 'name', 'name');
        } else {
            // Update existing searchable dropdown items
            const input = existingWrapper.querySelector('.searchable-dropdown-input');
            if(input) {
                input._items = validStates;
            }
        }
    } catch (err) {
        console.error('Error loading states:', err);
    }
}

function setupCityAutocomplete(input) {
    if(!input) return;
    
    let debounceTimer;
    
    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const query = e.target.value.trim();
            if(query.length < 2) {
                removeCityDropdown(input);
                return;
            }
            
            try {
                const results = await searchLocations(query, 5);
                showCityDropdown(input, results.cities);
            } catch (err) {
                console.error('City search error:', err);
            }
        }, 300);
    });
}

function showCityDropdown(input, cities) {
    removeCityDropdown(input);
    
    if(cities.length === 0) return;
    
    const dropdown = document.createElement('div');
    dropdown.className = 'city-dropdown';
    dropdown.style.cssText = 'position: absolute; background: white; border: 1px solid #ddd; border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; width: 100%; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
    input.parentElement.style.position = 'relative';
    
    dropdown.innerHTML = cities.map(city => 
        `<div class="city-option" data-city="${city.name}" data-state="${city.state_name || ''}" data-country="${city.country_name || ''}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
            ${city.name}${city.state_name ? `, ${city.state_name}` : ''}${city.country_name ? `, ${city.country_name}` : ''}
        </div>`
    ).join('');
    
    dropdown.querySelectorAll('.city-option').forEach(option => {
        option.addEventListener('click', () => {
            input.value = option.dataset.city;
            
            const stateSelect = document.getElementById('location_state');
            const countrySelect = document.getElementById('location_country');
            
            if(stateSelect && option.dataset.state) {
                stateSelect.value = option.dataset.state;
            }
            if(countrySelect && option.dataset.country) {
                countrySelect.value = option.dataset.country;
            }
            
            removeCityDropdown(input);
        });
        
        option.addEventListener('mouseenter', () => {
            option.style.background = '#f0f0f0';
        });
        option.addEventListener('mouseleave', () => {
            option.style.background = 'white';
        });
    });
    
    input.parentElement.appendChild(dropdown);
}

function removeCityDropdown(input) {
    const existing = input.parentElement.querySelector('.city-dropdown');
    if(existing) existing.remove();
}

/* -------------------------------------------------------
   SKILLS INPUT
------------------------------------------------------- */
function setupSkillsInput() {
    const skillInput = document.getElementById('skillInput');
    const addSkillBtn = document.getElementById('addSkillBtn');
    
    if(skillInput) {
        skillInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSkill(skillInput.value.trim());
            }
        });
    }
    
    if(addSkillBtn) {
        addSkillBtn.addEventListener('click', () => {
            addSkill(skillInput?.value.trim() || '');
        });
    }
}

function addSkill(skill) {
    if (skill && !skills.includes(skill)) {
        skills.push(skill);
        renderSkills();
    }
    const skillInput = document.getElementById('skillInput');
    if(skillInput) skillInput.value = '';
}

function renderSkills() {
    const container = document.getElementById('skillsContainer');
    if(!container) return;
    
    container.innerHTML = skills.map(s => `
        <span class="skill-tag" style="display: inline-flex; align-items: center; gap: 4px; background: var(--bg-light); padding: 4px 10px; border-radius: 20px; margin: 4px; font-size: 0.9rem;">
            ${s} <i class="fas fa-times" onclick="window.removeSkill('${s}')" style="cursor: pointer; font-size: 0.75rem; color: var(--text-light);"></i>
        </span>
    `).join('');
}

window.removeSkill = (s) => { skills = skills.filter(k => k !== s); renderSkills(); };

/* -------------------------------------------------------
   AUTH
------------------------------------------------------- */
async function checkAuth() {
    const user = await customAuth.getUserData();
    if (!user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    if ((user.role || '').toLowerCase() !== 'recruiter') {
        window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE; 
        return;
    }

    // Initialize sidebar using centralized manager
    await sidebarManager.initSidebar();
}

/* -------------------------------------------------------
   JOB CREATE SUBMISSION
------------------------------------------------------- */
async function handleJobCreate(event) {
  event.preventDefault();
  const submitBtn = event.target.querySelector("button[type='submit']");
  const originalText = submitBtn ? submitBtn.innerHTML : "Publish Job";
  
  try {
    if(submitBtn) { 
        submitBtn.disabled = true; 
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Publishing...'; 
    }
  
    // Basic Info
    const job_title = document.getElementById("job_title")?.value.trim() || '';
    const department = document.getElementById("department")?.value || '';
    const role = document.getElementById("role")?.value.trim() || '';
    const employment_type = document.getElementById("employment_type")?.value || '';
    const job_type = document.getElementById("job_type")?.value || '';
    const no_of_openings = parseInt(document.getElementById("no_of_openings")?.value) || 1;
    
    // Location - get values from searchable dropdowns
    const countryInput = document.getElementById("location_country");
    const stateInput = document.getElementById("location_state");
    const location_country = countryInput?.getValue ? countryInput.getValue() : (countryInput?.value || '');
    const location_state = stateInput?.getValue ? stateInput.getValue() : (stateInput?.value || '');
    const location_city = document.getElementById("location_city")?.value || '';
    const is_remote = document.getElementById("is_remote")?.checked || false;
    
    // Experience & Salary
    const experience_min = parseInt(document.getElementById("experience_min")?.value) || null;
    const experience_max = parseInt(document.getElementById("experience_max")?.value) || null;
    const salary_min = parseInt(document.getElementById("salary_min")?.value) || null;
    const salary_max = parseInt(document.getElementById("salary_max")?.value) || null;
    const notice_period_days = parseInt(document.getElementById("notice_period_days")?.value) || null;
    const industry = document.getElementById("industry")?.value || '';
    
    // Education & Skills
    const education_qualification = document.getElementById("education_qualification")?.value || '';
    const diversity_hiring = document.getElementById("diversity_hiring")?.checked || false;
    
    // Job Details
    const description = document.getElementById("job_description")?.value.trim() || '';
    const responsibilities = document.getElementById("responsibilities")?.value.trim() || '';
    const requirements = document.getElementById("requirements")?.value.trim() || '';
    
    // Contact Person
    const contact_person_name = document.getElementById("contact_person_name")?.value.trim() || '';
    const contact_person_email = document.getElementById("contact_person_email")?.value.trim() || '';

    // Build location string for backward compatibility
    const location = is_remote ? 'Remote' : [location_city, location_state, location_country].filter(Boolean).join(', ');

    const payload = {
      job_title,
      department,
      role,
      employment_type,
      job_type,
      no_of_openings,
      location,
      location_country,
      location_state,
      location_city,
      is_remote,
      experience_min,
      experience_max,
      salary_min,
      salary_max,
      notice_period_days,
      industry,
      education_qualification,
      skills: JSON.stringify(skills),
      diversity_hiring,
      description,
      responsibilities,
      requirements,
      contact_person_name,
      contact_person_email,
      currency: "INR",
      status: "active"
    };

    const response = await backendPost('/recruiter/jobs', payload);
    const result = await handleResponse(response);

    if (result.error) {
      throw new Error(result.error.message || 'Failed to create job');
    }

    // Find job ID
    const findId = (obj) => {
        if (!obj || typeof obj !== 'object') return null;
        if (obj.id) return obj.id;
        if (obj.job_id) return obj.job_id;
        for (let key in obj) {
            const found = findId(obj[key]);
            if (found) return found;
        }
        return null;
    };

    const jobId = findId(result);

    if(!jobId) {
        throw new Error("Job published, but ID was not found in the response.");
    }

    submitBtn.innerHTML = '<i class="fas fa-check"></i> Published!';
    submitBtn.style.backgroundColor = '#10b981';
    
    const jobUrl = `${CONFIG.PAGES.JOB_DETAILS}?job_id=${jobId}`;
    generateJobQR(jobUrl, job_title);

  } catch (error) {
    alert(`Error: ${error.message || 'Failed to create Job'}`);
    if(submitBtn) { 
        submitBtn.disabled = false; 
        submitBtn.innerHTML = originalText; 
    }
  } 
}

/* -------------------------------------------------------
   QR CODE GENERATION
------------------------------------------------------- */
async function generateJobQR(url, job_title) {
    const modal = document.getElementById('shareJobModal');
    const qrContainer = document.getElementById('qrcode');
    if (!modal || !qrContainer) return;

    qrContainer.innerHTML = ""; 

    try {
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, url, {
            width: 200, margin: 2,
            color: { dark: '#1e293b', light: '#ffffff' }
        });
        qrContainer.appendChild(canvas);

        document.getElementById('shareJobTitle').textContent = job_title;
        document.getElementById('copyLinkInput').value = url;

        modal.classList.add('active');
        modal.style.display = 'flex'; 

        document.getElementById('modalXClose').onclick = () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
        document.getElementById('backToDashBtn').onclick = () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;

        document.getElementById('copyLinkBtn').onclick = () => {
            navigator.clipboard.writeText(url);
            alert("Link copied!");
        };

        document.getElementById('downloadQRBtn').onclick = () => {
            const link = document.createElement('a');
            link.download = `Skreenit_QR_${job_title.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        };

    } catch (err) { 
        console.error("QR Generation failed:", err); 
    }
}

/* -------------------------------------------------------
   NAVIGATION
------------------------------------------------------- */
function setupNavigation() {
    const navDashboard = document.getElementById('navDashboard');
    const navJobs = document.getElementById('navJobs');
    const navApplications = document.getElementById('navApplications');
    const navAnalysis = document.getElementById('navAnalysis');
    const navProfile = document.getElementById('navProfile');
    const logoutBtn = document.getElementById('logoutBtn');
    const backBtn = document.getElementById("backBtn");

    if(navDashboard) navDashboard.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    if(navJobs) navJobs.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);
    if(navApplications) navApplications.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    if(navAnalysis) navAnalysis.addEventListener('click', () => window.location.href = `../dashboard/analysis.html`);
    if(navProfile) navProfile.addEventListener('click', () => window.location.href = CONFIG.PAGES.RECRUITER_PROFILE);
    
    if(backBtn) {
        backBtn.addEventListener("click", () => {
            if (confirm("Changes made will be lost. Are you sure you want to leave?")) {
                window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
            }
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await customAuth.signOut();
            window.location.href = CONFIG.PAGES.JOBS;
        });
    }
}