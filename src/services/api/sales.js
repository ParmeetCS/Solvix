import { apiClient } from './client';

export const salesApi = {
  // 1. Dashboard
  getDashboard: async () => {
    const res = await apiClient.get('/sales/dashboard');
    return res.data;
  },

  // 2. Leads
  getLeads: async (params = {}) => {
    const res = await apiClient.get('/sales/leads', { params });
    return res.data;
  },

  getLeadById: async (id) => {
    const res = await apiClient.get(`/sales/leads/${id}`);
    return res.data;
  },

  createLead: async (leadData) => {
    const res = await apiClient.post('/sales/leads', leadData);
    return res.data;
  },

  updateLead: async (id, updateData) => {
    const res = await apiClient.patch(`/sales/leads/${id}`, updateData);
    return res.data;
  },

  assignLead: async (id, { assigned_to, notes }) => {
    const res = await apiClient.post(`/sales/leads/${id}/assign`, { assigned_to, notes });
    return res.data;
  },

  checkDuplicateLead: async (term) => {
    const res = await apiClient.get('/sales/leads', { params: { check_duplicate: term } });
    return res.data;
  },

  requestSurvey: async (id, surveyData = {}) => {
    const res = await apiClient.post(`/sales/leads/${id}/survey-request`, surveyData);
    return res.data;
  },

  // 3. Sales Employees for assignment
  getSalesEmployees: async () => {
    const res = await apiClient.get('/sales/employees');
    return res.data;
  },

  // 4. Follow-ups
  getFollowUps: async (params = {}) => {
    const res = await apiClient.get('/sales/follow-ups', { params });
    return res.data;
  },

  scheduleFollowUp: async (data) => {
    const res = await apiClient.post('/sales/follow-ups', data);
    return res.data;
  },

  updateFollowUp: async (id, data) => {
    const res = await apiClient.patch(`/sales/follow-ups/${id}`, data);
    return res.data;
  },

  // 5. WhatsApp Enquiries
  getWhatsAppEnquiries: async (params = {}) => {
    const res = await apiClient.get('/sales/whatsapp-enquiries', { params });
    return res.data;
  },

  recordWhatsAppEnquiry: async (data) => {
    const res = await apiClient.post('/sales/whatsapp-enquiries', data);
    return res.data;
  },

  convertWhatsAppEnquiry: async (id, data = {}) => {
    const res = await apiClient.post(`/sales/whatsapp-enquiries/${id}/convert`, data);
    return res.data;
  },

  // 6. Customers
  getCustomers: async (params = {}) => {
    const res = await apiClient.get('/sales/customers', { params });
    return res.data;
  },

  getCustomerById: async (id) => {
    const res = await apiClient.get(`/sales/customers/${id}`);
    return res.data;
  },

  createOrLinkCustomer: async (data) => {
    const res = await apiClient.post('/sales/customers', data);
    return res.data;
  },

  // 7. Interactions
  getInteractions: async (params = {}) => {
    const res = await apiClient.get('/sales/interactions', { params });
    return res.data;
  },

  logInteraction: async (data) => {
    const res = await apiClient.post('/sales/interactions', data);
    return res.data;
  }
};

export default salesApi;
