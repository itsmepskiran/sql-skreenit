// assets/assets/js/auth-config.js
import { CONFIG } from './config.js';

// Custom Storage Adapter to share cookies across subdomains
const CookieStorage = {
  getItem: (key) => {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let c = cookies[i].trim();
      if (c.indexOf(key + '=') == 0) return decodeURIComponent(c.substring(key.length + 1, c.length));
    }
    return null;
  },
  setItem: (key, value) => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // If Production, set domain to .skreenit.com to share cookies
    const domainPart = isLocal ? '' : '; domain=.skreenit.com';
    const securePart = isLocal ? '' : '; Secure; SameSite=Lax';
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/${domainPart}${securePart}; max-age=31536000`;
  },
  removeItem: (key) => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const domainPart = isLocal ? '' : '; domain=.skreenit.com';
    document.cookie = `${key}=; path=/${domainPart}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
};

// Custom Auth Service to replace Supabase
class CustomAuth {
  constructor() {
    this.storage = CookieStorage;
    this.baseURL = CONFIG.API_BASE;
  }

  // Get current session from cookies/storage
  async getSession() {
    try {
      const token = this.storage.getItem('access_token');
      const userData = this.storage.getItem('user_data');
      
      if (!token || !userData) {
        return { data: { session: null }, error: null };
      }

      const user = JSON.parse(userData);
      const session = {
        access_token: token,
        user: user,
        expires_at: this.storage.getItem('token_expires_at')
      };

      return { data: { session }, error: null };
    } catch (err) {
      console.warn("[CustomAuth] Failed to get session", err);
      return { data: { session: null }, error: err };
    }
  }

  // Get current user
  async getUser() {
    const { data: { session } } = await this.getSession();
    return { data: { user: session?.user || null }, error: null };
  }

  // Get current user data directly (for MySQL compatibility)
  async getUserData() {
    const { data: { session } } = await this.getSession();
    return session?.user || null;
  }

  // Sign in with email and password
  async signInWithPassword({ email, password }) {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const result = await response.json();
      
      if (result.ok && result.data) {
        // Store tokens and user data
        this.storage.setItem('access_token', result.data.access_token);
        this.storage.setItem('refresh_token', result.data.refresh_token);
        this.storage.setItem('user_data', JSON.stringify(result.data.user));
        
        // Set expiration
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutes
        this.storage.setItem('token_expires_at', expiresAt.toISOString());
      }

      return { data: result.data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // Sign up new user
  async signUp({ email, password, options }) {
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      
      // Add metadata from options
      if (options?.data) {
        Object.keys(options.data).forEach(key => {
          formData.append(key, options.data[key]);
        });
      }
      
      // Add redirect URL
      if (options?.emailRedirectTo) {
        formData.append('email_redirect_to', options.emailRedirectTo);
      }

      const response = await fetch(`${this.baseURL}/register`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      const result = await response.json();
      
      if (result.ok && result.data) {
        // Store tokens and user data
        this.storage.setItem('access_token', result.data.access_token);
        this.storage.setItem('refresh_token', result.data.refresh_token);
        this.storage.setItem('user_data', JSON.stringify(result.data.user));
        
        // Set expiration
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);
        this.storage.setItem('token_expires_at', expiresAt.toISOString());
      }

      return { data: result.data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // Refresh session
  async refreshSession() {
    try {
      const refreshToken = this.storage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const formData = new FormData();
      formData.append('refresh_token', refreshToken);

      const response = await fetch(`${this.baseURL}/refresh-token`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const result = await response.json();
      
      if (result.ok && result.data) {
        // Update tokens
        this.storage.setItem('access_token', result.data.access_token);
        this.storage.setItem('refresh_token', result.data.refresh_token);
        
        // Update expiration
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);
        this.storage.setItem('token_expires_at', expiresAt.toISOString());
      }

      return { data: result.data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // Sign out
  async signOut() {
    try {
      const token = this.storage.getItem('access_token');
      if (token) {
        await fetch(`${this.baseURL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (err) {
      console.warn("[CustomAuth] Logout error:", err);
    } finally {
      // Clear storage regardless of API call success
      this.storage.removeItem('access_token');
      this.storage.removeItem('refresh_token');
      this.storage.removeItem('user_data');
      this.storage.removeItem('token_expires_at');
    }
  }

  // Update password
  async updatePassword(newPassword) {
    try {
      const token = this.storage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('new_password', newPassword);

      const response = await fetch(`${this.baseURL}/update-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Password update failed');
      }

      return { data: { success: true }, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }
}

// Export singleton instance
export const customAuth = new CustomAuth();
