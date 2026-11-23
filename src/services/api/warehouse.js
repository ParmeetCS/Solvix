import { apiClient } from './client';

// The API wraps lists as { data: { products: [...] } }; the pages expect data to be
// the array itself. Accept both so a list never reaches .map() as an object.
function unwrapList(body, key) {
  if (body && body.data && !Array.isArray(body.data) && Array.isArray(body.data[key])) {
    return { ...body, data: body.data[key] };
  }
  return body;
}

export const warehouseApi = {
  // 1. Dashboard KPIs & Activity
  getDashboard: async () => {
    const res = await apiClient.get('/warehouse/dashboard');
    return res.data;
  },

  // 2. Products Catalog
  getProducts: async (params = {}) => {
    const res = await apiClient.get('/warehouse/products', { params });
    return unwrapList(res.data, 'products');
  },

  getProductById: async (id) => {
    const res = await apiClient.get(`/warehouse/products/${id}`);
    return res.data;
  },

  createProduct: async (productData) => {
    const res = await apiClient.post('/warehouse/products', productData);
    return res.data;
  },

  updateProduct: async (id, productData) => {
    const res = await apiClient.patch(`/warehouse/products/${id}`, productData);
    return res.data;
  },

  // 3. Inventory & Stock Operations
  getInventory: async (params = {}) => {
    const res = await apiClient.get('/warehouse/inventory', { params });
    return unwrapList(res.data, 'inventory');
  },

  getInventoryById: async (id) => {
    const res = await apiClient.get(`/warehouse/inventory/${id}`);
    return res.data;
  },

  performStockOperation: async (operationData) => {
    // operationData: { operation: 'stock_in'|'stock_out'|'adjustment'|'transfer', productId, warehouseId, quantity, ... }
    const res = await apiClient.post('/warehouse/inventory', operationData);
    return res.data;
  },

  // 4. Purchase Orders & Goods Receiving
  getPurchaseOrders: async (params = {}) => {
    const res = await apiClient.get('/warehouse/purchase-orders', { params });
    return unwrapList(res.data, 'purchaseOrders');
  },

  createPurchaseOrder: async (poData) => {
    const res = await apiClient.post('/warehouse/purchase-orders', poData);
    return res.data;
  },

  receivePurchaseOrder: async (id, receiveData) => {
    // receiveData: { received_items: [{ product_id, quantity_received }], receiving_notes }
    const res = await apiClient.post(`/warehouse/purchase-orders/${id}/receive`, receiveData);
    return res.data;
  },

  // 5. Packing & Order Preparation
  getPackingQueue: async () => {
    const res = await apiClient.get('/warehouse/packing');
    return unwrapList(res.data, 'packingQueue');
  },

  getOrderPackingDetails: async (orderId) => {
    const res = await apiClient.get(`/warehouse/packing/${orderId}`);
    return res.data;
  },

  updateOrderPacking: async (orderId, actionData) => {
    // actionData: { action: 'reserve' | 'complete_packing', items, serial_numbers }
    const res = await apiClient.post(`/warehouse/packing/${orderId}`, actionData);
    return res.data;
  },

  // 6. Serial Numbers & QR Lookup
  getSerialNumbers: async (params = {}) => {
    const res = await apiClient.get('/warehouse/serial-numbers', { params });
    return unwrapList(res.data, 'serialNumbers');
  },

  registerSerialNumbers: async (payload) => {
    // single: { product_id, serial_number, warehouse_id, ... }
    // batch: { batch: [ { product_id, serial_number, ... } ] }
    const res = await apiClient.post('/warehouse/serial-numbers', payload);
    return res.data;
  },

  lookupSerialNumber: async (query) => {
    const res = await apiClient.get('/warehouse/serial-numbers/lookup', {
      params: typeof query === 'string' ? { q: query } : query
    });
    return res.data;
  },

  // 7. Dispatch Management & Delivery Confirmation
  getDispatches: async (params = {}) => {
    const res = await apiClient.get('/warehouse/dispatches', { params });
    return unwrapList(res.data, 'dispatches');
  },

  getDispatchById: async (id) => {
    const res = await apiClient.get(`/warehouse/dispatches/${id}`);
    return res.data;
  },

  createDispatch: async (dispatchData) => {
    const res = await apiClient.post('/warehouse/dispatches', dispatchData);
    return res.data;
  },

  confirmDelivery: async (id, deliveryData = {}) => {
    // deliveryData: { recipient_name, recipient_phone, delivery_notes, proof_photo_url }
    const res = await apiClient.post(`/warehouse/dispatches/${id}/deliver`, deliveryData);
    return res.data;
  }
};

export default warehouseApi;
