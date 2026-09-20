import apiClient from './client';

export const emailApi = {
  // Folder listing & counts
  getEmails: async (params = {}) => {
    const response = await apiClient.get('/emails/', { params });
    return response.data;
  },

  getFolderEmails: async (folder, params = {}) => {
    const response = await apiClient.get(`/emails/${folder}/`, { params });
    return response.data;
  },

  getFolderCounts: async () => {
    const response = await apiClient.get('/emails/counts/');
    return response.data;
  },

  // Detail & Sending
  getEmail: async (id) => {
    const response = await apiClient.get(`/emails/${id}/`);
    return response.data;
  },

  sendEmail: async (formData) => {
    const response = await apiClient.post('/emails/send/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  syncInbox: async () => {
    const response = await apiClient.post('/emails/sync/');
    return response.data;
  },

  populateInbox: async (reset = false) => {
    const response = await apiClient.post('/emails/populate-inbox/', { reset });
    return response.data;
  },

  // Individual Actions
  markRead: async (id) => {
    const response = await apiClient.post(`/emails/${id}/read/`);
    return response.data;
  },

  markUnread: async (id) => {
    const response = await apiClient.post(`/emails/${id}/unread/`);
    return response.data;
  },

  toggleStar: async (id) => {
    const response = await apiClient.post(`/emails/${id}/star/`);
    return response.data;
  },

  toggleImportant: async (id) => {
    const response = await apiClient.post(`/emails/${id}/important/`);
    return response.data;
  },

  archiveEmail: async (id) => {
    const response = await apiClient.post(`/emails/${id}/archive/`);
    return response.data;
  },

  markSpam: async (id) => {
    const response = await apiClient.post(`/emails/${id}/spam/`);
    return response.data;
  },

  removeSpam: async (id) => {
    const response = await apiClient.post(`/emails/${id}/unspam/`);
    return response.data;
  },

  moveToTrash: async (id) => {
    const response = await apiClient.post(`/emails/${id}/trash/`);
    return response.data;
  },

  restoreEmail: async (id) => {
    const response = await apiClient.post(`/emails/${id}/restore/`);
    return response.data;
  },

  deletePermanent: async (id) => {
    const response = await apiClient.delete(`/emails/${id}/`);
    return response.data;
  },

  emptyTrash: async () => {
    const response = await apiClient.post('/emails/empty-trash/');
    return response.data;
  },

  // Bulk Actions
  bulkAction: async (emailIds, action, labelId = null) => {
    const response = await apiClient.post('/emails/bulk/', {
      email_ids: emailIds,
      action,
      label_id: labelId,
    });
    return response.data;
  },

  // Search
  searchEmails: async (params = {}) => {
    const response = await apiClient.get('/emails/search/', { params });
    return response.data;
  },

  // Drafts
  getDrafts: async () => {
    const response = await apiClient.get('/drafts/');
    return response.data;
  },

  getDraft: async (id) => {
    const response = await apiClient.get(`/drafts/${id}/`);
    return response.data;
  },

  saveDraft: async (draftData) => {
    if (draftData.id) {
      const response = await apiClient.put(`/drafts/${draftData.id}/`, draftData);
      return response.data;
    }
    const response = await apiClient.post('/drafts/', draftData);
    return response.data;
  },

  deleteDraft: async (id) => {
    const response = await apiClient.delete(`/drafts/${id}/`);
    return response.data;
  },

  sendDraft: async (id, formData) => {
    const response = await apiClient.post(`/drafts/${id}/send/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Labels
  getLabels: async () => {
    const response = await apiClient.get('/labels/');
    return Array.isArray(response.data) ? response.data : (response.data.results || []);
  },

  createLabel: async (labelData) => {
    const response = await apiClient.post('/labels/', labelData);
    return response.data;
  },

  updateLabel: async (id, labelData) => {
    const response = await apiClient.put(`/labels/${id}/`, labelData);
    return response.data;
  },

  deleteLabel: async (id) => {
    const response = await apiClient.delete(`/labels/${id}/`);
    return response.data;
  },

  toggleLabel: async (emailId, labelId) => {
    const response = await apiClient.post(`/emails/${emailId}/labels/${labelId}/`);
    return response.data;
  },
};
