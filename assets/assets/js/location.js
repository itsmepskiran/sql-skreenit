/**
 * Location Module - Consolidated location services and components
 * Combines: location-service.js, city-autocomplete.js, country-select.js, location-picker.js
 * 
 * Usage:
 *   import { getCountries, CityAutocomplete, CountrySelect, LocationPicker } from '@shared/js/location.js';
 */

import { backendGet, handleResponse } from './backend-client.js';

// ============================================
// LOCATION SERVICE - API client for world location data
// ============================================

const cache = {
    countries: null,
    states: new Map(),
    cities: new Map(),
    searchResults: new Map(),
    lastFetch: new Map()
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function isCacheValid(key) {
    const lastFetch = cache.lastFetch.get(key);
    return lastFetch && (Date.now() - lastFetch < CACHE_DURATION);
}

export async function getCountries(options = {}) {
    const cacheKey = 'countries';
    
    if (!options.region && !options.search && cache.countries && isCacheValid(cacheKey)) {
        return cache.countries;
    }
    
    try {
        const params = new URLSearchParams();
        if (options.region) params.append('region', options.region);
        if (options.search) params.append('search', options.search);
        params.append('limit', options.limit || '250');
        
        const response = await backendGet(`/locations/countries?${params}`);
        const data = await handleResponse(response);
        
        if (!options.region && !options.search) {
            cache.countries = data;
            cache.lastFetch.set(cacheKey, Date.now());
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching countries:', error);
        throw error;
    }
}

export async function getCountry(countryId) {
    try {
        const response = await backendGet(`/locations/countries/${countryId}`);
        return await handleResponse(response);
    } catch (error) {
        console.error(`Error fetching country ${countryId}:`, error);
        throw error;
    }
}

export async function getStates(countryId, options = {}) {
    const cacheKey = `states_${countryId}`;
    
    if (cache.states.has(countryId) && isCacheValid(cacheKey)) {
        return cache.states.get(countryId);
    }
    
    try {
        const params = new URLSearchParams();
        params.append('country_id', countryId);
        if (options.search) params.append('search', options.search);
        params.append('limit', options.limit || '100');
        
        const response = await backendGet(`/locations/state?${params}`);
        const data = await handleResponse(response);
        
        cache.states.set(countryId, data);
        cache.lastFetch.set(cacheKey, Date.now());
        
        return data;
    } catch (error) {
        console.error(`Error fetching states for country ${countryId}:`, error);
        throw error;
    }
}

export async function getState(stateId) {
    try {
        const response = await backendGet(`/locations/state/${stateId}`);
        return await handleResponse(response);
    } catch (error) {
        console.error(`Error fetching state ${stateId}:`, error);
        throw error;
    }
}

export async function getCities(filters = {}) {
    const cacheKey = `cities_${filters.country_id}_${filters.state_id}_${filters.search}`;
    
    if (cache.cities.has(cacheKey) && isCacheValid(cacheKey)) {
        return cache.cities.get(cacheKey);
    }
    
    try {
        const params = new URLSearchParams();
        if (filters.country_id) params.append('country_id', filters.country_id);
        if (filters.state_id) params.append('state_id', filters.state_id);
        if (filters.search) {
            if (filters.search.length < 2) return [];
            params.append('search', filters.search);
        }
        params.append('limit', filters.limit || '50');
        
        const response = await backendGet(`/locations/city?${params}`);
        const data = await handleResponse(response);
        
        cache.cities.set(cacheKey, data);
        cache.lastFetch.set(cacheKey, Date.now());
        
        return data;
    } catch (error) {
        console.error('Error fetching cities:', error);
        throw error;
    }
}

export async function getCity(cityId) {
    try {
        const response = await backendGet(`/locations/city/${cityId}`);
        return await handleResponse(response);
    } catch (error) {
        console.error(`Error fetching city ${cityId}:`, error);
        throw error;
    }
}

export async function searchLocations(query, limit = 10) {
    if (!query || query.length < 2) {
        return { cities: [], states: [], countries: [] };
    }
    
    const cacheKey = `search_${query}_${limit}`;
    
    if (cache.searchResults.has(cacheKey) && isCacheValid(cacheKey)) {
        return cache.searchResults.get(cacheKey);
    }
    
    try {
        const params = new URLSearchParams();
        params.append('q', query);
        params.append('limit', limit);
        
        const response = await backendGet(`/locations/search?${params}`);
        const data = await handleResponse(response);
        
        cache.searchResults.set(cacheKey, data);
        cache.lastFetch.set(cacheKey, Date.now());
        
        return data;
    } catch (error) {
        console.error('Error searching locations:', error);
        throw error;
    }
}

export async function getNearbyCities(lat, lng, radius_km = 50, limit = 20) {
    try {
        const params = new URLSearchParams();
        params.append('lat', lat);
        params.append('lng', lng);
        params.append('radius_km', radius_km);
        params.append('limit', limit);
        
        const response = await backendGet(`/locations/nearby?${params}`);
        return await handleResponse(response);
    } catch (error) {
        console.error('Error fetching nearby cities:', error);
        throw error;
    }
}

export function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    });
}

export function formatLocation({ city, state, country, city_name, state_name, country_name }) {
    const parts = [];
    if (city_name || city) parts.push(city_name || city);
    if (state_name || state) parts.push(state_name || state);
    if (country_name || country) parts.push(country_name || country);
    return parts.join(', ');
}

export function clearLocationCache() {
    cache.countries = null;
    cache.states.clear();
    cache.cities.clear();
    cache.searchResults.clear();
    cache.lastFetch.clear();
}

export function debounce(func, wait) {
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

// ============================================
// CITY AUTOCOMPLETE COMPONENT
// ============================================

export class CityAutocomplete {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        this.options = {
            placeholder: 'Search for a city...',
            minChars: 2,
            debounceMs: 200,
            maxResults: 10,
            showState: true,
            showCountry: true,
            countryId: null,
            stateId: null,
            onSelect: null,
            onChange: null,
            allowFreeText: false,
            ...options
        };
        this.selectedCity = null;
        this.isOpen = false;
        this.currentQuery = '';
    }

    async init() {
        if (!this.container) {
            console.error(`CityAutocomplete: Container not found`);
            return;
        }
        this.render();
        this.attachEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="city-autocomplete-wrapper">
                <div class="city-autocomplete-input-wrapper">
                    <input type="text" class="city-autocomplete-input" 
                           placeholder="${this.options.placeholder}" autocomplete="off" spellcheck="false">
                    <button type="button" class="city-autocomplete-clear" style="display: none;">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 7.293l3.146-3.147a.5.5 0 0 1 .708.708L8.707 8l3.147 3.146a.5.5 0 0 1-.708.708L8 8.707l-3.146 3.147a.5.5 0 0 1-.708-.708L7.293 8 4.146 4.854a.5.5 0 1 1 .708-.708L8 7.293z"/>
                        </svg>
                    </button>
                    <svg class="city-autocomplete-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                    </svg>
                </div>
                <div class="city-autocomplete-dropdown" style="display: none;">
                    <div class="city-autocomplete-list"></div>
                </div>
            </div>
        `;

        this.wrapper = this.container.querySelector('.city-autocomplete-wrapper');
        this.input = this.container.querySelector('.city-autocomplete-input');
        this.clearBtn = this.container.querySelector('.city-autocomplete-clear');
        this.dropdown = this.container.querySelector('.city-autocomplete-dropdown');
        this.list = this.container.querySelector('.city-autocomplete-list');
    }

    attachEvents() {
        const debouncedSearch = debounce((query) => this.search(query), this.options.debounceMs);
        
        this.input.addEventListener('input', (e) => {
            this.currentQuery = e.target.value;
            if (this.currentQuery.length >= this.options.minChars) {
                debouncedSearch(this.currentQuery);
            } else {
                this.close();
            }
            this.updateClearButton();
        });

        this.input.addEventListener('focus', () => {
            if (this.currentQuery.length >= this.options.minChars) {
                this.search(this.currentQuery);
            }
        });

        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.clearBtn.addEventListener('click', () => { this.reset(); this.input.focus(); });
        this.list.addEventListener('click', (e) => {
            const option = e.target.closest('.city-autocomplete-option');
            if (option) this.selectCity(parseInt(option.dataset.id), option.dataset.name);
        });
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) this.close();
        });
    }

    handleKeydown(e) {
        const options = this.list.querySelectorAll('.city-autocomplete-option');
        const activeOption = this.list.querySelector('.city-autocomplete-option.active');
        let index = Array.from(options).indexOf(activeOption);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (this.isOpen) {
                    index = (index + 1) % options.length;
                    this.highlightOption(options[index]);
                } else if (this.currentQuery.length >= this.options.minChars) {
                    this.search(this.currentQuery);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (this.isOpen) {
                    index = (index - 1 + options.length) % options.length;
                    this.highlightOption(options[index]);
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (activeOption) {
                    this.selectCity(parseInt(activeOption.dataset.id), activeOption.dataset.name);
                } else if (this.options.allowFreeText && this.currentQuery) {
                    this.selectFreeText(this.currentQuery);
                }
                break;
            case 'Escape': this.close(); break;
            case 'Tab': this.close(); break;
        }
    }

    highlightOption(option) {
        this.list.querySelectorAll('.city-autocomplete-option').forEach(opt => opt.classList.remove('active'));
        if (option) {
            option.classList.add('active');
            option.scrollIntoView({ block: 'nearest' });
        }
    }

    async search(query) {
        if (!query || query.length < this.options.minChars) { this.close(); return; }
        this.showLoading();
        try {
            let results;
            if (this.options.countryId || this.options.stateId) {
                results = await getCities({
                    country_id: this.options.countryId,
                    state_id: this.options.stateId,
                    search: query,
                    limit: this.options.maxResults
                });
            } else {
                const searchResults = await searchLocations(query, this.options.maxResults);
                results = searchResults.cities;
            }
            this.renderResults(results);
            this.open();
        } catch (error) {
            console.error('Error searching cities:', error);
            this.showError();
        }
    }

    renderResults(cities) {
        if (cities.length === 0) {
            if (this.options.allowFreeText) {
                this.list.innerHTML = `<div class="city-autocomplete-option city-autocomplete-free-text" data-name="${this.currentQuery}">
                    <span class="city-name">"${this.currentQuery}"</span>
                    <span class="city-meta">Use as custom location</span>
                </div>`;
            } else {
                this.list.innerHTML = '<div class="city-autocomplete-empty">No cities found</div>';
            }
            return;
        }

        this.list.innerHTML = cities.map((city, index) => {
            const locationParts = [];
            if (this.options.showState && city.state_name) locationParts.push(city.state_name);
            if (this.options.showCountry && city.country_name) locationParts.push(city.country_name);
            
            return `<div class="city-autocomplete-option ${index === 0 ? 'active' : ''}" data-id="${city.id}" data-name="${city.name}">
                <div class="city-main">
                    <span class="city-name">${this.highlightMatch(city.name, this.currentQuery)}</span>
                    ${city.population ? `<span class="city-population">${this.formatPopulation(city.population)}</span>` : ''}
                </div>
                ${locationParts.length > 0 ? `<div class="city-location">${locationParts.join(', ')}</div>` : ''}
            </div>`;
        }).join('');
    }

    highlightMatch(text, query) {
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    formatPopulation(pop) {
        if (pop >= 1000000) return (pop / 1000000).toFixed(1) + 'M';
        if (pop >= 1000) return (pop / 1000).toFixed(1) + 'K';
        return pop.toString();
    }

    selectCity(id, name) {
        this.selectedCity = { id, name };
        this.input.value = name;
        this.close();
        this.updateClearButton();
        if (this.options.onSelect) this.options.onSelect(this.selectedCity);
        if (this.options.onChange) this.options.onChange(this.selectedCity);
        this.container.dispatchEvent(new CustomEvent('citySelect', { detail: this.selectedCity, bubbles: true }));
    }

    selectFreeText(text) {
        this.selectedCity = { name: text, isCustom: true };
        this.input.value = text;
        this.close();
        this.updateClearButton();
        if (this.options.onSelect) this.options.onSelect(this.selectedCity);
        if (this.options.onChange) this.options.onChange(this.selectedCity);
        this.container.dispatchEvent(new CustomEvent('citySelect', { detail: this.selectedCity, bubbles: true }));
    }

    showLoading() { this.list.innerHTML = '<div class="city-autocomplete-loading">Searching...</div>'; }
    showError() { this.list.innerHTML = '<div class="city-autocomplete-error">Search failed. Please try again.</div>'; }
    open() { this.isOpen = true; this.wrapper.classList.add('open'); this.dropdown.style.display = 'block'; }
    close() { this.isOpen = false; this.wrapper.classList.remove('open'); this.dropdown.style.display = 'none'; }
    updateClearButton() { this.clearBtn.style.display = this.input.value ? 'block' : 'none'; }

    setValue(value) {
        if (typeof value === 'object' && value.name) {
            this.selectedCity = value;
            this.input.value = value.name;
        } else if (typeof value === 'string') {
            this.selectedCity = { name: value };
            this.input.value = value;
        }
        this.updateClearButton();
    }

    getValue() { return this.selectedCity; }
    reset() { this.selectedCity = null; this.currentQuery = ''; this.input.value = ''; this.close(); this.updateClearButton(); }
    destroy() { this.container.innerHTML = ''; }
}

export async function createCityAutocomplete(containerId, options = {}) {
    const autocomplete = new CityAutocomplete(`#${containerId}`, options);
    await autocomplete.init();
    return autocomplete;
}

// ============================================
// COUNTRY SELECT COMPONENT
// ============================================

export class CountrySelect {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        this.options = {
            showFlag: true,
            showPhoneCode: false,
            showRegion: false,
            placeholder: 'Select a country...',
            defaultValue: null,
            disabled: false,
            onSelect: null,
            onChange: null,
            ...options
        };
        this.countries = [];
        this.selectedCountry = null;
        this.isOpen = false;
    }

    async init() {
        if (!this.container) {
            console.error(`CountrySelect: Container not found`);
            return;
        }
        this.render();
        await this.loadCountries();
        this.attachEvents();
        if (this.options.defaultValue) this.setValue(this.options.defaultValue);
    }

    render() {
        this.container.innerHTML = `
            <div class="country-select-wrapper ${this.options.disabled ? 'disabled' : ''}">
                <div class="country-select-trigger" tabindex="0">
                    <span class="country-select-placeholder">${this.options.placeholder}</span>
                    <span class="country-select-value" style="display: none;"></span>
                    <svg class="country-select-arrow" width="12" height="12" viewBox="0 0 12 12">
                        <path d="M6 8L1 3h10z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="country-select-dropdown" style="display: none;">
                    <div class="country-select-search">
                        <input type="text" placeholder="Search countries..." autocomplete="off">
                    </div>
                    <div class="country-select-list"></div>
                </div>
            </div>
        `;

        this.wrapper = this.container.querySelector('.country-select-wrapper');
        this.trigger = this.container.querySelector('.country-select-trigger');
        this.placeholder = this.container.querySelector('.country-select-placeholder');
        this.valueDisplay = this.container.querySelector('.country-select-value');
        this.dropdown = this.container.querySelector('.country-select-dropdown');
        this.searchInput = this.container.querySelector('.country-select-search input');
        this.list = this.container.querySelector('.country-select-list');
    }

    async loadCountries() {
        try {
            this.list.innerHTML = '<div class="country-select-loading">Loading...</div>';
            this.countries = await getCountries();
            this.renderList(this.countries);
        } catch (error) {
            this.list.innerHTML = '<div class="country-select-error">Failed to load countries</div>';
        }
    }

    renderList(countries) {
        if (countries.length === 0) {
            this.list.innerHTML = '<div class="country-select-empty">No countries found</div>';
            return;
        }

        this.list.innerHTML = countries.map(country => `
            <div class="country-select-option" data-id="${country.id}" data-iso2="${country.iso2 || ''}">
                ${this.options.showFlag && country.emoji ? `<span class="country-flag">${country.emoji}</span>` : ''}
                <span class="country-name">${country.name}</span>
                ${this.options.showPhoneCode && country.phonecode ? `<span class="country-phone">+${country.phonecode}</span>` : ''}
                ${this.options.showRegion && country.region ? `<span class="country-region">${country.region}</span>` : ''}
            </div>
        `).join('');
    }

    attachEvents() {
        this.trigger.addEventListener('click', () => this.toggle());
        this.trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.toggle(); }
            else if (e.key === 'Escape') this.close();
        });

        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.searchInput.addEventListener('click', (e) => e.stopPropagation());
        this.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });

        this.list.addEventListener('click', (e) => {
            const option = e.target.closest('.country-select-option');
            if (option) this.selectCountry(parseInt(option.dataset.id));
        });

        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) this.close();
        });
    }

    toggle() { if (!this.options.disabled) this.isOpen ? this.close() : this.open(); }
    open() { this.isOpen = true; this.wrapper.classList.add('open'); this.dropdown.style.display = 'block'; this.searchInput.focus(); this.searchInput.select(); }
    close() { this.isOpen = false; this.wrapper.classList.remove('open'); this.dropdown.style.display = 'none'; this.searchInput.value = ''; this.renderList(this.countries); }

    handleSearch(query) {
        const filtered = this.countries.filter(c => 
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            (c.iso2 && c.iso2.toLowerCase().includes(query.toLowerCase()))
        );
        this.renderList(filtered);
    }

    selectCountry(id) {
        const country = this.countries.find(c => c.id === id);
        if (!country) return;

        this.selectedCountry = country;
        this.placeholder.style.display = 'none';
        this.valueDisplay.style.display = 'flex';
        this.valueDisplay.innerHTML = `
            ${this.options.showFlag && country.emoji ? `<span class="country-flag">${country.emoji}</span>` : ''}
            <span>${country.name}</span>
        `;
        this.close();

        if (this.options.onSelect) this.options.onSelect(country);
        if (this.options.onChange) this.options.onChange(country);
        this.container.dispatchEvent(new CustomEvent('countrySelect', { detail: country, bubbles: true }));
    }

    setValue(value) {
        let country;
        if (typeof value === 'number') country = this.countries.find(c => c.id === value);
        else if (typeof value === 'string') country = this.countries.find(c => c.iso2 === value || c.name === value);
        if (country) this.selectCountry(country.id);
    }

    getValue() { return this.selectedCountry; }
    reset() { this.selectedCountry = null; this.placeholder.style.display = 'block'; this.valueDisplay.style.display = 'none'; this.valueDisplay.innerHTML = ''; }
    disable() { this.options.disabled = true; this.wrapper.classList.add('disabled'); }
    enable() { this.options.disabled = false; this.wrapper.classList.remove('disabled'); }
    destroy() { this.container.innerHTML = ''; }
}

export async function createCountrySelect(containerId, options = {}) {
    const select = new CountrySelect(`#${containerId}`, options);
    await select.init();
    return select;
}

// ============================================
// LOCATION PICKER COMPONENT
// ============================================

export class LocationPicker {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        this.options = {
            showCountry: true,
            showCity: true,
            showGeolocation: false,
            countryPlaceholder: 'Select country...',
            cityPlaceholder: 'Search city...',
            label: 'Location',
            onChange: null,
            onSelect: null,
            required: false,
            ...options
        };
        this.selectedCountry = null;
        this.selectedCity = null;
        this.countrySelect = null;
        this.cityAutocomplete = null;
    }

    async init() {
        if (!this.container) {
            console.error(`LocationPicker: Container not found`);
            return;
        }
        this.render();
        await this.initComponents();
        this.attachEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="location-picker">
                ${this.options.label ? `<label class="location-picker-label">${this.options.label}${this.options.required ? ' *' : ''}</label>` : ''}
                <div class="location-picker-row">
                    ${this.options.showCountry ? `<div class="location-picker-country"><div id="location-country-${this.uniqueId()}"></div></div>` : ''}
                    ${this.options.showCity ? `<div class="location-picker-city"><div id="location-city-${this.uniqueId()}"></div></div>` : ''}
                </div>
                ${this.options.showGeolocation ? `
                    <button type="button" class="btn-use-my-location">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0zm0 13a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13zm4.75-5.25a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5zM3.5 8a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5zm9.348-4.652a.75.75 0 0 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.061l1.061-1.06zm-7.07 7.07a.75.75 0 0 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.061l1.06-1.06zm9.348 7.07a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.061zM4.652 3.348a.75.75 0 0 0 1.06 1.06l1.061-1.06a.75.75 0 0 0-1.06-1.061l-1.061 1.06zM8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
                        </svg>
                        Use my current location
                    </button>
                ` : ''}
                <input type="hidden" id="location-value" name="${this.options.name || 'location'}">
            </div>
        `;
        this.hiddenInput = this.container.querySelector('#location-value');
    }

    uniqueId() { return Math.random().toString(36).substring(2, 9); }

    async initComponents() {
        if (this.options.showCountry) {
            const countryContainer = this.container.querySelector('.location-picker-country > div');
            this.countrySelect = new CountrySelect(`#${countryContainer.id}`, {
                showFlag: true,
                showPhoneCode: false,
                placeholder: this.options.countryPlaceholder,
                onSelect: (country) => this.handleCountrySelect(country),
                onChange: (country) => this.handleCountryChange(country)
            });
            await this.countrySelect.init();
        }

        if (this.options.showCity) {
            const cityContainer = this.container.querySelector('.location-picker-city > div');
            this.cityAutocomplete = new CityAutocomplete(`#${cityContainer.id}`, {
                placeholder: this.options.cityPlaceholder,
                showState: true,
                showCountry: !this.options.showCountry,
                onSelect: (city) => this.handleCitySelect(city),
                onChange: (city) => this.handleCityChange(city)
            });
            await this.cityAutocomplete.init();
        }
    }

    attachEvents() {
        if (this.options.showGeolocation) {
            const geoBtn = this.container.querySelector('.btn-use-my-location');
            if (geoBtn) geoBtn.addEventListener('click', () => this.useCurrentLocation());
        }
    }

    handleCountrySelect(country) {
        this.selectedCountry = country;
        if (this.cityAutocomplete) {
            this.cityAutocomplete.options.countryId = country.id;
            this.cityAutocomplete.reset();
        }
        this.updateValue();
    }

    handleCountryChange(country) {}
    handleCitySelect(city) { this.selectedCity = city; this.updateValue(); }
    handleCityChange(city) {}

    updateValue() {
        const location = this.getLocation();
        this.hiddenInput.value = JSON.stringify(location);
        if (this.options.onChange) this.options.onChange(location);
        if (this.options.onSelect && (this.selectedCity || this.selectedCountry)) this.options.onSelect(location);
        this.container.dispatchEvent(new CustomEvent('locationChange', { detail: location, bubbles: true }));
    }

    getLocation() {
        const location = {};
        if (this.selectedCountry) {
            location.country = {
                id: this.selectedCountry.id,
                name: this.selectedCountry.name,
                iso2: this.selectedCountry.iso2,
                iso3: this.selectedCountry.iso3
            };
        }
        if (this.selectedCity) {
            location.city = {
                id: this.selectedCity.id,
                name: this.selectedCity.name,
                state_name: this.selectedCity.state_name,
                country_name: this.selectedCity.country_name,
                latitude: this.selectedCity.latitude,
                longitude: this.selectedCity.longitude
            };
        }
        const parts = [];
        if (this.selectedCity?.name) parts.push(this.selectedCity.name);
        else if (this.selectedCity?.state_name) parts.push(this.selectedCity.state_name);
        if (this.selectedCountry?.name && !this.selectedCity?.country_name) parts.push(this.selectedCountry.name);
        location.formatted = parts.join(', ');
        return location;
    }

    async useCurrentLocation() {
        if (!navigator.geolocation) { alert('Geolocation is not supported by your browser'); return; }
        const btn = this.container.querySelector('.btn-use-my-location');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Getting location...';

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
            });
            const { latitude, longitude } = position.coords;
            const nearby = await getNearbyCities(latitude, longitude, 50, 5);

            if (nearby.length > 0) {
                const nearest = nearby[0];
                if (this.countrySelect && nearest.country_id) {
                    this.countrySelect.setValue(nearest.country_id);
                    this.selectedCountry = this.countrySelect.getValue();
                }
                if (this.cityAutocomplete) {
                    this.cityAutocomplete.setValue({
                        id: nearest.id, name: nearest.name, state_name: nearest.state_name,
                        country_name: nearest.country_name, latitude: nearest.latitude, longitude: nearest.longitude
                    });
                    this.selectedCity = this.cityAutocomplete.getValue();
                }
                this.updateValue();
            } else { alert('No nearby cities found'); }
        } catch (error) {
            console.error('Geolocation error:', error);
            alert('Unable to get your location. Please select manually.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0zm0 13a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13zm4.75-5.25a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5zM3.5 8a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5zm9.348-4.652a.75.75 0 0 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.061l1.061-1.06zm-7.07 7.07a.75.75 0 0 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.061l1.06-1.06zm9.348 7.07a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.061zM4.652 3.348a.75.75 0 0 0 1.06 1.06l1.061-1.06a.75.75 0 0 0-1.06-1.061l-1.061 1.06zM8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
            </svg> Use my current location`;
        }
    }

    setValue(value) {
        if (typeof value === 'string') {
            try { value = JSON.parse(value); } catch (e) { this.setSimpleValue(value); return; }
        }
        if (value.country && this.countrySelect) {
            this.countrySelect.setValue(value.country.id || value.country);
            this.selectedCountry = this.countrySelect.getValue();
        }
        if (value.city && this.cityAutocomplete) {
            this.cityAutocomplete.setValue(value.city);
            this.selectedCity = this.cityAutocomplete.getValue();
        }
        this.updateValue();
    }

    setSimpleValue(locationString) {
        if (this.cityAutocomplete) {
            this.cityAutocomplete.setValue(locationString);
            this.selectedCity = { name: locationString };
        }
        this.updateValue();
    }

    getValue() { return this.getLocation(); }
    getFormattedValue() { return this.getLocation().formatted; }
    
    reset() {
        if (this.countrySelect) { this.countrySelect.reset(); this.selectedCountry = null; }
        if (this.cityAutocomplete) { this.cityAutocomplete.reset(); this.selectedCity = null; }
        this.updateValue();
    }

    validate() {
        if (!this.options.required) return true;
        if (this.options.showCountry && !this.selectedCountry) return false;
        if (this.options.showCity && !this.selectedCity) return false;
        return true;
    }

    destroy() {
        if (this.countrySelect) this.countrySelect.destroy();
        if (this.cityAutocomplete) this.cityAutocomplete.destroy();
        this.container.innerHTML = '';
    }
}

export async function createLocationPicker(containerId, options = {}) {
    const picker = new LocationPicker(`#${containerId}`, options);
    await picker.init();
    return picker;
}
