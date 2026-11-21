import { apiClient } from './client';

export const installationApi = {
  // 1. Dashboard
  getDashboard: async () => {
    const res = await apiClient.get('/installation/dashboard');
    return res.data;
  },

  // 2. Jobs
  getJobs: async (params = {}) => {
    const res = await apiClient.get('/installation/jobs', { params });
    return res.data;
  },

  getJobById: async (id) => {
    const res = await apiClient.get(`/installation/jobs/${id}`);
    return res.data;
  },

  createJob: async (data) => {
    const res = await apiClient.post('/installation/jobs', data);
    return res.data;
  },

  updateJob: async (id, data) => {
    const res = await apiClient.patch(`/installation/jobs/${id}`, data);
    return res.data;
  },

  updateStatus: async (id, data) => {
    const res = await apiClient.post(`/installation/jobs/${id}/status`, data);
    return res.data;
  },

  // 3. Assignment & Scheduling
  assignTechnicians: async (id, data) => {
    const res = await apiClient.post(`/installation/jobs/${id}/assign`, data);
    return res.data;
  },

  scheduleJob: async (id, data) => {
    const res = await apiClient.post(`/installation/jobs/${id}/schedule`, data);
    return res.data;
  },

  // 4. Equipment Verification
  verifyEquipment: async (id, data) => {
    const res = await apiClient.post(`/installation/jobs/${id}/equipment-verify`, data);
    return res.data;
  },

  // 5. Checklist Tasks
  getTasks: async (id) => {
    const res = await apiClient.get(`/installation/jobs/${id}/tasks`);
    return res.data;
  },

  updateTask: async (id, data) => {
    const res = await apiClient.post(`/installation/jobs/${id}/tasks`, data);
    return res.data;
  },

  // 6. Photographs
  getPhotos: async (id) => {
    const res = await apiClient.get(`/installation/jobs/${id}/photos`);
    return res.data;
  },

  uploadPhoto: async (id, data) => {
    const res = await apiClient.post(`/installation/jobs/${id}/photos`, data);
    return res.data;
  },

  // 7. Commissioning & Testing
  submitCommissioning: async (id, data) => {
    const res = await apiClient.post(`/installation/jobs/${id}/commissioning`, data);
    return res.data;
  },

  // 8. Customer Signature & Completion Report
  submitSignature: async (id, data) => {
    const res = await apiClient.post(`/installation/jobs/${id}/signature`, data);
    return res.data;
  },

  getReport: async (id) => {
    const res = await apiClient.get(`/installation/jobs/${id}/report`);
    return res.data;
  },

  generateReport: async (id) => {
    const res = await apiClient.post(`/installation/jobs/${id}/report`, {});
    return res.data;
  },

  // 9. Technicians Management
  getTechnicians: async () => {
    const res = await apiClient.get('/installation/technicians');
    return res.data;
  },

  getTechnicianById: async (id) => {
    const res = await apiClient.get(`/installation/technicians/${id}`);
    return res.data;
  },

  updateTechnicianAvailability: async (id, data) => {
    const res = await apiClient.patch(`/installation/technicians/${id}/availability`, data);
    return res.data;
  },

  // 10. Technician Personal Queue
  getMyJobs: async () => {
    const res = await apiClient.get('/installation/my-jobs');
    return res.data;
  },

  // 11. Eligible Confirmed Orders
  getEligibleOrders: async () => {
    const res = await apiClient.get('/installation/eligible-orders');
    return res.data;
  }
};

export default installationApi;
