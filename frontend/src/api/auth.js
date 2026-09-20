import apiClient from './client';

export const authApi = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login/', { email, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post('/auth/register/', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/auth/me/');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await apiClient.put('/auth/me/', data);
    return response.data;
  },

  getSettings: async () => {
    const response = await apiClient.get('/auth/settings/');
    return response.data;
  },

  updateSettings: async (settingsData) => {
    const response = await apiClient.put('/auth/settings/', settingsData);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await apiClient.post('/auth/change-password/', passwordData);
    return response.data;
  },
};
