import { apiClient } from './client';

export const surveyApi = {
  // 1. Dashboard metrics
  getDashboard: async () => {
    const res = await apiClient.get('/survey/dashboard');
    return res.data;
  },

  // 2. Survey requests
  getRequests: async (params = {}) => {
    const res = await apiClient.get('/survey/requests', { params });
    return res.data;
  },

  getRequestById: async (id) => {
    const res = await apiClient.get(`/survey/requests/${id}`);
    return res.data;
  },

  createRequest: async (data) => {
    const res = await apiClient.post('/survey/requests', data);
    return res.data;
  },

  updateRequest: async (id, data) => {
    const res = await apiClient.patch(`/survey/requests/${id}`, data);
    return res.data;
  },

  // 3. Assignment & Scheduling
  assignSurvey: async (id, assignData) => {
    const res = await apiClient.post(`/survey/requests/${id}/assign`, assignData);
    return res.data;
  },

  scheduleSurvey: async (id, scheduleData) => {
    const res = await apiClient.post(`/survey/requests/${id}/schedule`, scheduleData);
    return res.data;
  },

  // 4. Digital inspection form & drafts
  saveDraft: async (id, formData) => {
    const res = await apiClient.post(`/survey/requests/${id}/draft`, formData);
    return res.data;
  },

  submitInspection: async (id, formData) => {
    const res = await apiClient.post(`/survey/requests/${id}/submit`, formData);
    return res.data;
  },

  // 5. Photos & documents
  getPhotos: async (id) => {
    const res = await apiClient.get(`/survey/requests/${id}/photos`);
    return res.data;
  },

  uploadPhoto: async (id, photoData) => {
    const res = await apiClient.post(`/survey/requests/${id}/photos`, photoData);
    return res.data;
  },

  // 6. Feasibility report
  getFeasibilityReport: async (id) => {
    const res = await apiClient.get(`/survey/requests/${id}/report`);
    return res.data;
  },

  // 7. Approval workflow
  submitApproval: async (id, approvalData) => {
    const res = await apiClient.post(`/survey/requests/${id}/approval`, approvalData);
    return res.data;
  },

  // 8. Survey history & timeline
  getHistory: async (id) => {
    const res = await apiClient.get(`/survey/requests/${id}/history`);
    return res.data;
  },

  // 9. Surveyors & workload
  getSurveyors: async () => {
    const res = await apiClient.get('/survey/surveyors');
    return res.data;
  }
};

export default surveyApi;
