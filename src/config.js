/**
 * API Configuration
 * 
 * In development, we use relative paths which are proxied by Vite.
 * In production, we use the specific Backend URL provided via environment variables.
 */

// If VITE_API_URL is provided, use it (for production separation)
// Otherwise, fall back to '/api' for local proxy/unified hosting
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    register: `${API_BASE_URL}/api/auth/register`,
  },
  predictions: {
    history: `${API_BASE_URL}/api/predictions/history`,
    save: `${API_BASE_URL}/api/predictions`,
    analyze: `${API_BASE_URL}/api/analyze-image`,
  },
  weather: `${API_BASE_URL}/api/weather`,
  chat: `${API_BASE_URL}/api/chat`,
  feedback: `${API_BASE_URL}/api/feedback`,
  admin: {
    stats: `${API_BASE_URL}/api/admin/stats`,
    users: `${API_BASE_URL}/api/admin/users`,
    predictions: `${API_BASE_URL}/api/admin/predictions`,
  }
};
