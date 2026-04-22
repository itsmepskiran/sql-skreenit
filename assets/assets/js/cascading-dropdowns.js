/**
 * Cascading Dropdowns with Search Functionality
 * Supports: Country -> State -> City and University -> College
 */

// API Base URL - adjust based on environment
const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
const API_BASE = isLocal ? 'http://localhost:8000' : 'https://api.skreenit.com';

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================================
// LOCATION DROPDOWNS (Country -> State -> City)
// ============================================================

/**
 * Setup location dropdowns with cascading logic
 * @param {string} formId - The form ID containing the location fields
 * @param {Object} options - Configuration options
 */
export async function setupLocationDropdowns(formId, options = {}) {
    const {
        countryField = 'country',
        stateField = 'state',
        cityField = 'city',
        countryId = null,
        stateId = null,
        cityId = null
    } = options;

    const form = document.getElementById(formId);
    if (!form) return;

    const countryInput = form.querySelector(`[name="${countryField}"]`);
    const stateInput = form.querySelector(`[name="${stateField}"]`);
    const cityInput = form.querySelector(`[name="${cityField}"]`);

    if (!countryInput || !stateInput || !cityInput) return;

    // Create dropdown containers
    setupSearchDropdown(countryInput, 'country');
    setupSearchDropdown(stateInput, 'state');
    setupSearchDropdown(cityInput, 'city');

    // Store IDs for cascading
    countryInput.dataset.selectedId = countryId || '';
    stateInput.dataset.selectedId = stateId || '';
    cityInput.dataset.selectedId = cityId || '';

    // Country selection handler
    countryInput.addEventListener('select', (e) => {
        const selectedId = e.detail.id;
        countryInput.dataset.selectedId = selectedId;
        stateInput.dataset.selectedId = '';
        cityInput.dataset.selectedId = '';
        stateInput.value = '';
        cityInput.value = '';
        loadStates(selectedId);
    });

    // State selection handler
    stateInput.addEventListener('select', (e) => {
        const selectedId = e.detail.id;
        stateInput.dataset.selectedId = selectedId;
        cityInput.dataset.selectedId = '';
        cityInput.value = '';
        loadCities(selectedId);
    });

    // City selection handler
    cityInput.addEventListener('select', (e) => {
        const selectedId = e.detail.id;
        cityInput.dataset.selectedId = selectedId;
    });

    // Load initial data
    await loadCountries();
    if (countryId) {
        await loadStates(countryId);
        if (stateId) {
            await loadCities(stateId);
        }
    }
}

/**
 * Setup a search dropdown for an input field
 */
function setupSearchDropdown(input, type) {
    // Create dropdown container
    const dropdown = document.createElement('div');
    dropdown.className = `${type}-dropdown search-dropdown`;
    dropdown.style.display = 'none';
    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(dropdown);

    // Debounced search handler
    const debouncedSearch = debounce(async (query) => {
        if (query.length < 2) {
            dropdown.style.display = 'none';
            return;
        }
        await showDropdownItems(input, dropdown, type, query);
    }, 300);

    // Input event for search
    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        debouncedSearch(query);
    });

    // Focus event
    input.addEventListener('focus', async () => {
        if (input.value.length >= 2) {
            await showDropdownItems(input, dropdown, type, input.value);
        }
    });

    // Hide dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.dropdown-item');
        const activeItem = dropdown.querySelector('.dropdown-item.active');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (activeItem) {
                activeItem.classList.remove('active');
                const next = activeItem.nextElementSibling;
                if (next) next.classList.add('active');
            } else if (items.length > 0) {
                items[0].classList.add('active');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (activeItem) {
                activeItem.classList.remove('active');
                const prev = activeItem.previousElementSibling;
                if (prev) prev.classList.add('active');
            } else if (items.length > 0) {
                items[items.length - 1].classList.add('active');
            }
        } else if (e.key === 'Enter' && activeItem) {
            e.preventDefault();
            activeItem.click();
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    });
}

/**
 * Show dropdown items based on search
 */
async function showDropdownItems(input, dropdown, type, query) {
    try {
        let data = [];
        let endpoint = '';

        switch (type) {
            case 'country':
                endpoint = `${API_BASE}/locations/countries?search=${encodeURIComponent(query)}&limit=50`;
                break;
            case 'state':
                const countryId = input.closest('form').querySelector('[data-location="country"]')?.dataset.selectedId;
                endpoint = `${API_BASE}/locations/states?search=${encodeURIComponent(query)}&limit=50${countryId ? `&country_id=${countryId}` : ''}`;
                break;
            case 'city':
                const stateId = input.closest('form').querySelector('[data-location="state"]')?.dataset.selectedId;
                endpoint = `${API_BASE}/locations/cities?search=${encodeURIComponent(query)}&limit=50${stateId ? `&state_id=${stateId}` : ''}`;
                break;
            case 'university':
                endpoint = `${API_BASE}/locations/universities?search=${encodeURIComponent(query)}&limit=50`;
                break;
            case 'college':
                const universityId = input.closest('form').querySelector('[data-education="university"]')?.dataset.selectedId;
                endpoint = `${API_BASE}/locations/colleges?search=${encodeURIComponent(query)}&limit=50${universityId ? `&university_id=${universityId}` : ''}`;
                break;
        }

        const response = await fetch(endpoint);
        data = await response.json();

        if (data.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-item no-results">No results found</div>';
        } else {
            dropdown.innerHTML = data.map(item => `
                <div class="dropdown-item" data-id="${item.id}" data-name="${item.name}">
                    ${item.name}${item.state_name ? `, ${item.state_name}` : ''}${item.country_name ? `, ${item.country_name}` : ''}
                </div>
            `).join('');

            // Add click handlers
            dropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    input.value = item.dataset.name;
                    input.dataset.selectedId = item.dataset.id;
                    dropdown.style.display = 'none';
                    
                    // Dispatch custom event for cascading
                    input.dispatchEvent(new CustomEvent('select', {
                        detail: { id: item.dataset.id, name: item.dataset.name }
                    }));
                });

                item.addEventListener('mouseenter', () => {
                    dropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                });
            });
        }

        dropdown.style.display = 'block';
    } catch (error) {
        console.error(`Error loading ${type} data:`, error);
        dropdown.innerHTML = '<div class="dropdown-item error">Error loading data</div>';
        dropdown.style.display = 'block';
    }
}

/**
 * Load countries
 */
async function loadCountries() {
    // Countries are loaded on demand via search
}

/**
 * Load states for a country
 */
async function loadStates(countryId) {
    // States are loaded on demand via search
}

/**
 * Load cities for a state
 */
async function loadCities(stateId) {
    // Cities are loaded on demand via search
}

// ============================================================
// EDUCATION DROPDOWNS (University -> College)
// ============================================================

/**
 * Setup education dropdowns with cascading logic
 * @param {string} formId - The form ID containing the education fields
 * @param {Object} options - Configuration options
 */
export async function setupEducationDropdowns(formId, options = {}) {
    const {
        universityField = 'university',
        collegeField = 'college',
        universityId = null,
        collegeId = null
    } = options;

    const form = document.getElementById(formId);
    if (!form) return;

    const universityInput = form.querySelector(`[name="${universityField}"]`);
    const collegeInput = form.querySelector(`[name="${collegeField}"]`);

    if (!universityInput || !collegeInput) return;

    // Set data attributes for identification
    universityInput.dataset.education = 'university';
    collegeInput.dataset.education = 'college';

    // Create dropdown containers
    setupSearchDropdown(universityInput, 'university');
    setupSearchDropdown(collegeInput, 'college');

    // Store IDs for cascading
    universityInput.dataset.selectedId = universityId || '';
    collegeInput.dataset.selectedId = collegeId || '';

    // University selection handler
    universityInput.addEventListener('select', (e) => {
        const selectedId = e.detail.id;
        universityInput.dataset.selectedId = selectedId;
        collegeInput.dataset.selectedId = '';
        collegeInput.value = '';
    });

    // College selection handler
    collegeInput.addEventListener('select', (e) => {
        const selectedId = e.detail.id;
        collegeInput.dataset.selectedId = selectedId;
    });
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get selected ID from an input field
 */
export function getSelectedId(input) {
    return input?.dataset.selectedId || null;
}

/**
 * Set selected value and ID for an input field
 */
export function setSelectedValue(input, name, id) {
    if (input) {
        input.value = name;
        input.dataset.selectedId = id;
    }
}

/**
 * Reset location dropdowns
 */
export function resetLocationDropdowns(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    const countryInput = form.querySelector('[data-location="country"]');
    const stateInput = form.querySelector('[data-location="state"]');
    const cityInput = form.querySelector('[data-location="city"]');

    if (countryInput) {
        countryInput.value = '';
        countryInput.dataset.selectedId = '';
    }
    if (stateInput) {
        stateInput.value = '';
        stateInput.dataset.selectedId = '';
        stateInput.disabled = true;
    }
    if (cityInput) {
        cityInput.value = '';
        cityInput.dataset.selectedId = '';
        cityInput.disabled = true;
    }
}

/**
 * Reset education dropdowns
 */
export function resetEducationDropdowns(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    const universityInput = form.querySelector('[data-education="university"]');
    const collegeInput = form.querySelector('[data-education="college"]');

    if (universityInput) {
        universityInput.value = '';
        universityInput.dataset.selectedId = '';
    }
    if (collegeInput) {
        collegeInput.value = '';
        collegeInput.dataset.selectedId = '';
        collegeInput.disabled = true;
    }
}
