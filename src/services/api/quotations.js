import { apiClient } from './client';

const unwrap = (res) => res.data;

export const quotationsApi = {
  // Quotation dashboard and records
  getDashboard: async () => unwrap(await apiClient.get('/sales/quotations/dashboard')),
  getQuotations: async (params = {}) => unwrap(await apiClient.get('/sales/quotations', { params })),
  getQuotation: async (id) => unwrap(await apiClient.get(`/sales/quotations/${id}`)),
  createQuotation: async (data) => unwrap(await apiClient.post('/sales/quotations', data)),
  updateQuotation: async (id, data) => unwrap(await apiClient.patch(`/sales/quotations/${id}`, data)),
  deleteQuotation: async (id) => unwrap(await apiClient.delete(`/sales/quotations/${id}`)),
  submitQuotation: async (id, data = {}) => unwrap(await apiClient.post(`/sales/quotations/${id}/submit`, data)),
  approveQuotation: async (id, data = {}) => unwrap(await apiClient.post(`/sales/quotations/${id}/approve`, data)),
  sendQuotation: async (id, data = {}) => unwrap(await apiClient.post(`/sales/quotations/${id}/send`, data)),
  markQuotationViewed: async (id) => unwrap(await apiClient.post(`/sales/quotations/${id}/view`)),
  acceptQuotation: async (id, data = {}) => unwrap(await apiClient.post(`/sales/quotations/${id}/accept`, data)),
  rejectQuotation: async (id, data = {}) => unwrap(await apiClient.post(`/sales/quotations/${id}/reject`, data)),
  convertQuotation: async (id) => unwrap(await apiClient.post(`/sales/quotations/${id}/convert`)),
  expireQuotations: async () => unwrap(await apiClient.post('/sales/quotations/expire')),
  downloadQuotationPdf: async (id) => {
    const res = await apiClient.get(`/sales/quotations/${id}/pdf`, { responseType: 'blob' });
    return res.data;
  },
  getComments: async (id) => unwrap(await apiClient.get(`/sales/quotations/${id}/comments`)),
  addComment: async (id, data) => unwrap(await apiClient.post(`/sales/quotations/${id}/comments`, data)),

  // Catalogue and surveys used by the BOM builder
  getCatalogue: async (params = {}) => unwrap(await apiClient.get('/sales/catalogue', { params })),
  getSurveys: async (params = {}) => unwrap(await apiClient.get('/sales/surveys', { params })),

  // Orders
  getOrders: async (params = {}) => unwrap(await apiClient.get('/sales/orders', { params })),
  getOrder: async (id) => unwrap(await apiClient.get(`/sales/orders/${id}`)),
  updateOrder: async (id, data) => unwrap(await apiClient.patch(`/sales/orders/${id}`, data)),
  getOrderPayments: async (id) => unwrap(await apiClient.get(`/sales/orders/${id}/payments`)),
  recordPayment: async (id, data) => unwrap(await apiClient.post(`/sales/orders/${id}/payments`, data)),
  handoffOrder: async (id, data = {}) => unwrap(await apiClient.post(`/sales/orders/${id}/handoff`, data)),

  // Customer portal
  getMyQuotations: async (params = {}) => unwrap(await apiClient.get('/customer/quotations', { params })),
  getMyQuotation: async (id) => unwrap(await apiClient.get(`/customer/quotations/${id}`)),
  acceptMyQuotation: async (id, data = {}) => unwrap(await apiClient.post(`/customer/quotations/${id}/accept`, data)),
  rejectMyQuotation: async (id, data = {}) => unwrap(await apiClient.post(`/customer/quotations/${id}/reject`, data)),
  downloadMyQuotationPdf: async (id) => {
    const res = await apiClient.get(`/customer/quotations/${id}/pdf`, { responseType: 'blob' });
    return res.data;
  },
  getMyComments: async (id) => unwrap(await apiClient.get(`/customer/quotations/${id}/comments`)),
  addMyComment: async (id, data) => unwrap(await apiClient.post(`/customer/quotations/${id}/comments`, data)),
  getMyOrders: async (params = {}) => unwrap(await apiClient.get('/customer/orders', { params })),
  getMyOrder: async (id) => unwrap(await apiClient.get(`/customer/orders/${id}`)),

  // Admin catalogue management
  getAdminCategories: async () => unwrap(await apiClient.get('/admin/catalogue/categories')),
  createCategory: async (data) => unwrap(await apiClient.post('/admin/catalogue/categories', data)),
  updateCategory: async (id, data) => unwrap(await apiClient.patch(`/admin/catalogue/categories/${id}`, data)),
  deleteCategory: async (id) => unwrap(await apiClient.delete(`/admin/catalogue/categories/${id}`)),
  getAdminProducts: async (params = {}) => unwrap(await apiClient.get('/admin/catalogue/products', { params })),
  createProduct: async (data) => unwrap(await apiClient.post('/admin/catalogue/products', data)),
  updateProduct: async (id, data) => unwrap(await apiClient.patch(`/admin/catalogue/products/${id}`, data)),
  archiveProduct: async (id) => unwrap(await apiClient.delete(`/admin/catalogue/products/${id}`)),
  getAdminPackages: async () => unwrap(await apiClient.get('/admin/catalogue/packages')),
  createPackage: async (data) => unwrap(await apiClient.post('/admin/catalogue/packages', data)),
  updatePackage: async (id, data) => unwrap(await apiClient.patch(`/admin/catalogue/packages/${id}`, data)),
  archivePackage: async (id) => unwrap(await apiClient.delete(`/admin/catalogue/packages/${id}`)),
};

export default quotationsApi;
