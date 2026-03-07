
// assets/assets/js/backend-client.js
import { customAuth } from './auth-config.js';
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
      const session = await customAuth.getSession();
      
      // Handle both old Supabase and new MySQL session structures
      const token = session?.data?.session?.access_token || 
                    session?.access_token || 
                    session?.session?.access_token ||
                    session?.token ||
                    null;
      
      // Proactive expiry check using stored expiration time
      const expiresAtStr = session?.data?.session?.expires_at;
      const isExpired = expiresAtStr ? (Date.now() > Date.parse(expiresAtStr) - 5000) : false;
      if (isExpired) {
        const refreshed = await customAuth.refreshSession();
        const refreshData = refreshed?.data || refreshed;
        return refreshData?.access_token || refreshData?.session?.access_token || null;
      }
      
      // Auto-refresh token if needed
      if (!token) {
          const refresh = await customAuth.refreshSession();
          const refreshData = refresh?.data || refresh;
          return refreshData?.access_token || refreshData?.session?.access_token || null;
      }
      
      return token;
    } catch (err) {
      console.warn("[BackendClient] Failed to get session", err);
      return null;
    }
  }

  async request(endpoint, options = {}) {
    const { method = "GET", body = null, headers = {}, timeout } = options;
    let token = await this.getAuthToken();
    
    // Auto-detect JSON vs FormData
    const isFormData = body instanceof FormData;
    let finalHeaders = { ...headers };
    
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
    let fetchOptions = {
        method,
        headers: finalHeaders,
        signal: controller.signal
    };

    if (body) {
        fetchOptions.body = isFormData ? body : (typeof body !== 'string' ? JSON.stringify(body) : body);
    }

    try {
        let resp = await fetch(url, fetchOptions);

        clearTimeout(timeoutId);

        // If unauthorized, attempt a single refresh + retry
        if (resp.status === 401) {
            try {
                const refreshed = await customAuth.refreshSession();
                const refreshData = refreshed?.data || refreshed;
                token = refreshData?.access_token || refreshData?.session?.access_token || null;
                if (token) {
                    finalHeaders = { ...finalHeaders, Authorization: `Bearer ${token}` };
                    fetchOptions = { ...fetchOptions, headers: finalHeaders };
                    // Retry once
                    resp = await fetch(url, fetchOptions);
                }
            } catch (e) {
                // Fall through with original 401
            }
        }
        
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
      // Check for specific error types with user-friendly messages
      else if (data.error === 'email_exists') {
          msg = 'Email Already Registered';
      }
      else if (data.error === 'invalid_credentials') {
          msg = 'Invalid email or password';
      }
      else if (data.error === 'not_found') {
          msg = 'Account not found';
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
