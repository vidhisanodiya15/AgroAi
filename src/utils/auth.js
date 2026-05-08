import { API_ENDPOINTS } from '../config';

const SESSION_KEY = 'agro_ai_session';
const TOKEN_KEY = 'agro_ai_token';

export const auth = {
  login: async (email, password, isAdmin = false) => {
    try {
      const response = await fetch(API_ENDPOINTS.auth.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, isAdmin }),
      });
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
        localStorage.setItem(TOKEN_KEY, data.token);
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (err) {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  signup: async (name, email, password) => {
    try {
      const response = await fetch(API_ENDPOINTS.auth.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
        localStorage.setItem(TOKEN_KEY, data.token);
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || 'Signup failed' };
    } catch (err) {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },

  getCurrentUser: () => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  setCurrentUser: (user) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
};
