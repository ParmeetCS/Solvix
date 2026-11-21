import { apiClient } from './client';

export const supportApi = {
  // 1. Dashboard
  getDashboard: async () => {
    const res = await apiClient.get('/support/dashboard');
    return res.data;
  },

  // 2. Tickets
  getTickets: async (params = {}) => {
    const res = await apiClient.get('/support/tickets', { params });
    return res.data;
  },

  getTicketById: async (id) => {
    const res = await apiClient.get(`/support/tickets/${id}`);
    return res.data;
  },

  createTicket: async (ticketData) => {
    const res = await apiClient.post('/support/tickets', ticketData);
    return res.data;
  },

  updateTicket: async (id, updateData) => {
    const res = await apiClient.patch(`/support/tickets/${id}`, updateData);
    return res.data;
  },

  assignTicket: async (id, { assigned_to, notes = '' }) => {
    const res = await apiClient.post(`/support/tickets/${id}/assign`, { assigned_to, notes });
    return res.data;
  },

  addTicketUpdate: async (id, { update_text, is_internal = false }) => {
    const res = await apiClient.post(`/support/tickets/${id}/updates`, { update_text, is_internal });
    return res.data;
  },

  // 3. Warranties
  getWarranties: async (params = {}) => {
    const res = await apiClient.get('/support/warranties', { params });
    return res.data;
  },

  getWarrantyById: async (id) => {
    const res = await apiClient.get(`/support/warranties/${id}`);
    return res.data;
  },

  verifyWarranty: async (serial_number) => {
    const res = await apiClient.post('/support/warranties/verify', { serial_number });
    return res.data;
  },

  // 4. Warranty Claims
  getClaims: async (params = {}) => {
    const res = await apiClient.get('/support/warranties/claims', { params });
    return res.data;
  },

  getClaimById: async (id) => {
    const res = await apiClient.get(`/support/warranties/claims/${id}`);
    return res.data;
  },

  createClaim: async (claimData) => {
    const res = await apiClient.post('/support/warranties/claims', claimData);
    return res.data;
  },

  updateClaim: async (id, { status, resolution = '', notes = '' }) => {
    const res = await apiClient.patch(`/support/warranties/claims/${id}`, { status, resolution, notes });
    return res.data;
  },

  // 5. Repairs
  getRepairs: async (params = {}) => {
    const res = await apiClient.get('/support/repairs', { params });
    return res.data;
  },

  createRepair: async (repairData) => {
    const res = await apiClient.post('/support/repairs', repairData);
    return res.data;
  },

  updateRepair: async (repairData) => {
    const res = await apiClient.patch('/support/repairs', repairData);
    return res.data;
  },

  // 6. Replacements
  getReplacements: async (params = {}) => {
    const res = await apiClient.get('/support/replacements', { params });
    return res.data;
  },

  createReplacement: async (replacementData) => {
    const res = await apiClient.post('/support/replacements', replacementData);
    return res.data;
  },

  // 7. Customer Feedback
  getFeedback: async (params = {}) => {
    const res = await apiClient.get('/support/feedback', { params });
    return res.data;
  },

  submitFeedback: async (feedbackData) => {
    const res = await apiClient.post('/support/feedback', feedbackData);
    return res.data;
  },

  // 8. Staff / Technicians & Serial Lookup
  getAgents: async () => {
    const res = await apiClient.get('/support/agents');
    return res.data;
  },

  getSerials: async (params = {}) => {
    const res = await apiClient.get('/support/serials', { params });
    return res.data;
  }
};
