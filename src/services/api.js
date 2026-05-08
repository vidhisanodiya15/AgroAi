import { auth } from '../utils/auth';
import { API_ENDPOINTS } from '../config';

const getAuthHeaders = () => {
  const token = auth.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const dashboardService = {
  /** Fetch prediction history for the logged-in user */
  getHistory: async () => {
    try {
      const response = await fetch(API_ENDPOINTS.predictions.history, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('History fetch failed:', data.error);
        return [];
      }

      // Normalize backend fields → frontend shape
      return (data.data || []).map((item) => ({
        id: item._id,
        cropName: item.crop || 'Unknown',
        disease: item.diseaseName || 'Unknown',
        confidence: item.confidenceScore ?? 0,
        treatment: item.treatment || '',
        prevention: item.prevention || '',
        description: item.symptoms || '',
        image: item.imageUrl ? (item.imageUrl.startsWith('http') ? item.imageUrl : `${API_ENDPOINTS.predictions.save.replace('/api/predictions', '')}${item.imageUrl}`) : null,
        date: item.createdAt || new Date().toISOString(),
      }));
    } catch (err) {
      console.error('CRITICAL: Error fetching history:', err);
      return [];
    }
  },

  /** Save a prediction result to the user's history */
  savePrediction: async (result) => {
    try {
      const response = await fetch(API_ENDPOINTS.predictions.save, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          crop: result.crop_name,
          diseaseName: result.disease_name,
          confidenceScore: result.confidence,
          treatment: result.treatment,
          prevention: result.prevention,
          symptoms: result.description,
          imageUrl: result.imageUrl || ''
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save prediction');
      }
      return data.data;
    } catch (err) {
      console.error('Error saving prediction:', err);
      throw err;
    }
  },
};

export const adminService = {
  getStats: async () => {
    const response = await fetch(API_ENDPOINTS.admin.stats, { headers: getAuthHeaders() });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to fetch admin stats');
    return data;
  },

  getAllUsers: async () => {
    const response = await fetch(API_ENDPOINTS.admin.users, { headers: getAuthHeaders() });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to fetch users');
    return data.data;
  },

  getAllPredictions: async () => {
    const response = await fetch(API_ENDPOINTS.admin.predictions, { headers: getAuthHeaders() });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to fetch predictions');
    return data.data;
  },

  deleteUser: async (id) => {
    const response = await fetch(`${API_ENDPOINTS.admin.users}/${id}`, { 
      method: 'DELETE',
      headers: getAuthHeaders() 
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to delete user');
    return data;
  },

  deletePrediction: async (id) => {
    const response = await fetch(`${API_ENDPOINTS.admin.predictions}/${id}`, { 
      method: 'DELETE',
      headers: getAuthHeaders() 
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to delete record');
    return data;
  },

  getAllFeedback: async () => {
    const response = await fetch(API_ENDPOINTS.feedback, { headers: getAuthHeaders() });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to fetch feedback');
    return data.data;
  },

  deleteFeedback: async (id) => {
    const response = await fetch(`/api/feedback/${id}`, { 
      method: 'DELETE',
      headers: getAuthHeaders() 
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to delete message');
    return data;
  },
};
