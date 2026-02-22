import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://lgmvbmbzxsqrcclaynuh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbXZibWJ6eHNxcmNjbGF5bnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzgxODQsImV4cCI6MjA4NDcxNDE4NH0.F63Fe9zFBuYni-qxZXwIzJNgCvM-rDxAi5_gFDGrXAM'

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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: CookieStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});