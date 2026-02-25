// assets/assets/js/backend-client.js
import { supabase } from './supabase-config.js';
import { CONFIG } from './config.js';


class BackendClient {
  constructor() {
    this.backendUrls = [CONFIG.API_BASE]; // Get URL from Config
    this.currentUrlIndex = 0;
    this.requestTimeout = 15000; // 15 seconds
  }

  getCurrentUrl() {
    return this.backendUrls[this.currentUrlIndex];
  }

  async getAuthToken() {
    try {
      let { data } = await supabase.auth.getSession();
      
      // Auto-refresh token if needed
      if (!data?.session?.access_token) {
          const refresh = await supabase.auth.refreshSession();
          data = refresh.data;
      }
      return data?.session?.access_token || null;
    } catch (err) {
      console.warn("[BackendClient] Failed to get session", err);
      return null;
    }
  }

  async request(endpoint, options = {}) {
    const { method = "GET", body = null, headers = {}, timeout } = options;
    const token = await this.getAuthToken();
    
    // Auto-detect JSON vs FormData
    const isFormData = body instanceof FormData;
    const finalHeaders = { ...headers };
    
    if (!isFormData && body && !finalHeaders["Content-Type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }
    
    if (token) {
        finalHeaders["Authorization"] = `Bearer ${token}`;
    }

    // Construct URL
    const baseUrl = this.getCurrentUrl().replace(/\/+$/, ""); // Remove trailing slash
    const cleanEndpoint = endpoint.replace(/^\/+/, "");       // Remove leading slash
    const url = `${baseUrl}/${cleanEndpoint}`;

    // Setup Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout || this.requestTimeout);

    // TWEAK: Conditionally build fetch options to prevent GET requests from receiving a 'body: null' property
    const fetchOptions = {
        method,
        headers: finalHeaders,
        signal: controller.signal
    };

    if (body) {
        fetchOptions.body = isFormData ? body : (typeof body !== 'string' ? JSON.stringify(body) : body);
    }

    try {
        const resp = await fetch(url, fetchOptions);

        clearTimeout(timeoutId);

        if (resp.status >= 500) {
            throw new Error(`Server Error (${resp.status})`);
        }
        return resp;

    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error("Request timed out");
        }
        throw err;
    }
  }

  // Helpers
  async get(endpoint, options = {}) { return this.request(endpoint, { ...options, method: "GET" }); }
  async post(endpoint, data = null, options = {}) { return this.request(endpoint, { ...options, method: "POST", body: data }); }
  async put(endpoint, data = null, options = {}) { return this.request(endpoint, { ...options, method: "PUT", body: data }); }
  async delete(endpoint, options = {}) { return this.request(endpoint, { ...options, method: "DELETE" }); }
}

// Export Singleton Instance
const backendClient = new BackendClient();

export const backendFetch = (...args) => backendClient.request(...args);
export const backendGet = (...args) => backendClient.get(...args);
export const backendPost = (...args) => backendClient.post(...args);
export const backendPut = (...args) => backendClient.put(...args);
export const backendDelete = (...args) => backendClient.delete(...args);

// ✅ handleResponse shows Pydantic validation errors
export const handleResponse = async (response) => {
  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      
      // Check for Pydantic/FastAPI validation array
      if (data.detail && Array.isArray(data.detail)) {
          // Join the array into a readable string
          msg = data.detail.map(err => {
              const field = err.loc ? err.loc.join('.') : 'Field';
              return `${field}: ${err.msg}`;
          }).join('\n');
      } 
      // Check for standard error messages
      else {
          msg = data.detail || data.error || data.message || msg;
      }
    } catch (e) {
      // Fallback if JSON parsing fails
      msg = response.statusText || msg;
    }
    throw new Error(msg);
  }
  
  // Handle success response
  try { 
      return await response.json(); 
  } catch { 
      return await response.text(); 
  }
};