console.log('job-edit.js module loading...');

import { customAuth } from '@shared/js/auth-config.js';
import { backendGet, backendPut, backendDelete, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';
import { requireRecruiterProfile, sidebarManager } from '@shared/js/profile-checker.js';
import { getCountries, getStates, searchLocations } from '@shared/js/location.js';
import '@shared/js/mobile.js';

console.log('job-edit.js imports loaded');

const isLocal = CONFIG.IS_LOCAL;
const assetsBase = isLocal ? '../../assets' : 'https://assets.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${assetsBase}/assets/images/logobrand.png`;

// State
let skills = [];
let referenceData = {};

document.addEventListener("DOMContentLoaded", async () => {
    console.log('job-edit.js DOMContentLoaded fired');
    // Check if profile is complete before allowing job edit
    const canProceed = await requireRecruiterProfile();
    console.log('requireRecruiterProfile result:', canProceed);
    if (!canProceed) return; // Stop if profile check failed/redirected
    
    await checkAuth();
    setupNavigation();
    await loadReferenceData();
    await initLocationPickers();
    setupSkillsInput();
    initJobEditForm();
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
            } else if(items.length > 0) {
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
            } else if(items.length > 0) {
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
   JOB EDIT FORM INITIALIZATION
------------------------------------------------------- */
async function initJobEditForm() {
    console.log('initJobEditForm called');
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('job_id');
    console.log('Job ID from URL:', jobId);

    if (!jobId) {
        alert("No Job ID provided.");
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
        return;
    }

    try {
        const res = await backendGet(`/recruiter/jobs/${jobId}`);
        const result = await handleResponse(res);
        const job = result.data || result;

        // Basic Info
        document.getElementById("job_title").value = job.job_title || job.title || "";
        document.getElementById("department").value = job.department_id || job.department || "";
        document.getElementById("role").value = job.role_id || job.role || "";
        document.getElementById("employment_type").value = job.employment_type_id || job.employment_type || "";
        document.getElementById("job_type").value = job.job_type || "";
        document.getElementById("no_of_openings").value = job.no_of_openings || 1;
        
        // Location - set country using searchable dropdown
        const countryInput = document.getElementById("location_country");
        if(countryInput && job.location_country && countryInput.setValue) {
            // Set country name directly (dropdown now stores name, not ID)
            countryInput.setValue(job.location_country);
            await loadStatesForCountry();
        }
        
        // Set state using searchable dropdown
        const stateInput = document.getElementById("location_state");
        if(stateInput && job.location_state && stateInput.setValue) {
            stateInput.setValue(job.location_state);
        }
        
        // Set city value
        const cityInput = document.getElementById("location_city");
        if(cityInput) cityInput.value = job.location_city || "";
        
        // Remote checkbox
        const isRemoteCheckbox = document.getElementById("is_remote");
        if(isRemoteCheckbox && job.is_remote) {
            isRemoteCheckbox.checked = true;
            isRemoteCheckbox.dispatchEvent(new Event('change'));
        }
        
        // Experience & Salary
        document.getElementById("experience_min").value = job.experience_min || "";
        document.getElementById("experience_max").value = job.experience_max || "";
        document.getElementById("salary_min").value = job.salary_min || "";
        document.getElementById("salary_max").value = job.salary_max || "";
        document.getElementById("notice_period_days").value = job.notice_period_days || "";
        document.getElementById("industry").value = job.industry_id || job.industry || "";
        
        // Education & Skills
        document.getElementById("education_qualification").value = job.education_qualification_id || job.education_qualification || "";
        
        // Load skills
        if(job.skills) {
            try {
                skills = typeof job.skills === 'string' ? JSON.parse(job.skills) : job.skills;
                renderSkills();
            } catch(e) {
                console.warn('Failed to parse skills:', e);
            }
        }
        
        // Diversity hiring
        const diversityCheckbox = document.getElementById("diversity_hiring");
        if(diversityCheckbox && job.diversity_hiring) {
            diversityCheckbox.checked = true;
        }
        
        // Job Details
        document.getElementById("job_description").value = job.description || "";
        document.getElementById("responsibilities").value = job.responsibilities || "";
        document.getElementById("requirements").value = job.requirements || "";
        
        // Contact Person
        document.getElementById("contact_person_name").value = job.contact_person_name || "";
        document.getElementById("contact_person_email").value = job.contact_person_email || "";

        const editForm = document.getElementById("editJobForm");
        console.log('editForm found:', !!editForm);
        if(editForm) {
            editForm.addEventListener("submit", (e) => handleJobUpdate(e, jobId));
            console.log('Submit event listener attached to form');
        }

        setupDeleteButton(jobId);

    } catch (error) {
        alert("Failed to load job details.");
    }
}

/* -------------------------------------------------------
   JOB UPDATE SUBMISSION
------------------------------------------------------- */
async function handleJobUpdate(event, jobId) {
  console.log('handleJobUpdate called with jobId:', jobId);
  event.preventDefault();
  const submitBtn = event.target.querySelector("button[type='submit']");
  const originalText = submitBtn.innerHTML;
  
  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Updating...';

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
    console.log('countryInput:', countryInput, 'getValue method:', countryInput?.getValue);
    console.log('stateInput:', stateInput, 'getValue method:', stateInput?.getValue);
    const location_country = countryInput?.getValue ? countryInput.getValue() : (countryInput?.value || '');
    const location_state = stateInput?.getValue ? stateInput.getValue() : (stateInput?.value || '');
    const location_city = document.getElementById("location_city")?.value || '';
    const is_remote = document.getElementById("is_remote")?.checked || false;
    console.log('Location values - country:', location_country, 'state:', location_state, 'city:', location_city);
    
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
      status: 'active'
    };
    
    console.log('Update payload:', payload);

    const response = await backendPut(`/recruiter/jobs/${jobId}`, payload);
    console.log('Update response:', response);
    await handleResponse(response);

    submitBtn.innerHTML = '<i class="fas fa-check"></i> Updated!';
    setTimeout(() => {
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
    }, 1000);

  } catch (error) {
    alert(`Update failed: ${error.message}`);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

/* -------------------------------------------------------
   DELETE BUTTON
------------------------------------------------------- */
function setupDeleteButton(jobId) {
  const deleteBtn = document.getElementById("deleteJobBtn");
  if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to delete this job listing? This cannot be undone.")) return;
        
        const originalText = deleteBtn.innerHTML;
        try {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            
            const res = await backendDelete(`/recruiter/jobs/${jobId}`);
            await handleResponse(res);
            
            window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
        } catch (err) {
            alert(`Delete failed: ${err.message}`); 
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalText;
        }
      });
  }
}

/* -------------------------------------------------------
   NAVIGATION
------------------------------------------------------- */
function setupNavigation() {
    document.getElementById('navDashboard')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);
    document.getElementById('navJobs')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.MY_JOBS);
    document.getElementById('navApplications')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.APPLICATION_LIST);
    document.getElementById('navAnalysis')?.addEventListener('click', () => window.location.href = `../dashboard/analysis.html`);
    document.getElementById('navProfile')?.addEventListener('click', () => window.location.href = CONFIG.PAGES.RECRUITER_PROFILE);
    
    document.getElementById("backBtn")?.addEventListener("click", () => {
        if (confirm("Changes made will be lost. Are you sure you want to leave?")) {
            window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
        }
    });

    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        await customAuth.signOut();
        window.location.href = CONFIG.PAGES.JOBS;
    });
}