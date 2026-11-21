import { apiClient } from './client';

// Every endpoint returns only the signed-in customer's own records.
export const customerApi = {
  getInstallations: async () => (await apiClient.get('/customer/installations')).data,
  getOrders: async (params = {}) => (await apiClient.get('/customer/orders', { params })).data,
  getQuotations: async (params = {}) => (await apiClient.get('/customer/quotations', { params })).data,
  getWarranties: async (params = {}) => (await apiClient.get('/support/warranties', { params })).data,
  getTickets: async (params = {}) => (await apiClient.get('/support/tickets', { params })).data,
  createTicket: async (payload) => (await apiClient.post('/support/tickets', payload)).data,
};

export default customerApi;
