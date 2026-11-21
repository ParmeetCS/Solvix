import { apiClient } from './client';

export const adminApi = {
  getOverview: async () => (await apiClient.get('/admin/overview')).data,
  getPeople: async () => (await apiClient.get('/admin/people')).data,
  updatePerson: async (id, payload) => (await apiClient.patch(`/admin/people/${id}`, payload)).data,
  getActivity: async (params = {}) => (await apiClient.get('/admin/activity', { params })).data,
  getReport: async (params = {}) => (await apiClient.get('/admin/reports', { params })).data,
};

export default adminApi;
