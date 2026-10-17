import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: (email, password) => api.post('/login', { email, password }),
  logout: () => api.post('/logout'),
  me: () => api.get('/me'),
};

export const supplierService = {
  getAll: (page = 1, search = '') => 
    api.get('/suppliers', { params: { page, search, per_page: 10 } }),
  get: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

export const customerService = {
  getAll: (page = 1, search = '') => 
    api.get('/customers', { params: { page, search, per_page: 10 } }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

export const categoryService = {
  getAll: (type = null) => 
    api.get('/categories', { params: type ? { type } : {} }),
  get: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const unitService = {
  getAll: () => api.get('/units'),
  get: (id) => api.get(`/units/${id}`),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.put(`/units/${id}`, data),
  delete: (id) => api.delete(`/units/${id}`),
};

export const rawMaterialService = {
  getAll: (page = 1, search = '') => 
    api.get('/raw-materials', { params: { page, search, per_page: 10 } }),
  get: (id) => api.get(`/raw-materials/${id}`),
  create: (data) => api.post('/raw-materials', data),
  update: (id, data) => api.put(`/raw-materials/${id}`, data),
  delete: (id) => api.delete(`/raw-materials/${id}`),
};

export const productService = {
  getAll: (page = 1, search = '') => 
    api.get('/products', { params: { page, search, per_page: 10 } }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

export const purchaseOrderService = {
  getAll: (page = 1, params = {}) =>
    api.get('/purchase-orders', { params: { page, per_page: 10, ...params } }),
  get: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  submit:  (id) => api.post(`/purchase-orders/${id}/submit`),
  approve: (id) => api.post(`/purchase-orders/${id}/approve`),
  cancel:  (id) => api.post(`/purchase-orders/${id}/cancel`),
};

export const goodsReceiptService = {
  getAll: (page = 1, params = {}) =>
    api.get('/goods-receipts', { params: { page, per_page: 10, ...params } }),
  get: (id) => api.get(`/goods-receipts/${id}`),
  create: (data) => api.post('/goods-receipts', data),
  complete: (id) => api.post(`/goods-receipts/${id}/complete`),
};

export const inventoryService = {
  getRawMaterials: (params = {}) => api.get('/inventory/raw-materials', { params }),
  getProducts: (params = {}) => api.get('/inventory/products', { params }),
  getLowStock: () => api.get('/inventory/low-stock'),
  getExpiring: (days = 30) => api.get('/inventory/expiring', { params: { days } }),
  getTransactions: (params = {}) => api.get('/inventory/transactions', { params }),
  postAdjustment: (data) => api.post('/inventory/adjustment', data),
  getStockCard: (params = {}) => api.get('/inventory/stock-card', { params }),
};

export const recipeService = {
  getAll: (page = 1, search = '') =>
    api.get('/recipes', { params: { page, per_page: 10, search } }),
  get: (id) => api.get(`/recipes/${id}`),
  create: (data) => api.post('/recipes', data),
  update: (id, data) => api.put(`/recipes/${id}`, data),
  delete: (id) => api.delete(`/recipes/${id}`),
  calculate: (id, quantity) => api.post(`/recipes/${id}/calculate`, { quantity }),
};

export const productionService = {
  getAll: (page = 1, params = {}) =>
    api.get('/productions', { params: { page, per_page: 10, ...params } }),
  get: (id) => api.get(`/productions/${id}`),
  create: (data) => api.post('/productions', data),
  start:    (id) => api.post(`/productions/${id}/start`),
  complete: (id) => api.post(`/productions/${id}/complete`),
  cancel:   (id) => api.post(`/productions/${id}/cancel`),
};

export const salesService = {
  getAll: (page = 1, params = {}) =>
    api.get('/sales', { params: { page, per_page: 10, ...params } }),
  get: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  cancel: (id) => api.post(`/sales/${id}/cancel`),
};

export const returnService = {
  getAll: (page = 1, params = {}) =>
    api.get('/returns', { params: { page, per_page: 10, ...params } }),
  get: (id) => api.get(`/returns/${id}`),
  create: (data) => api.post('/returns', data),
  approve:  (id) => api.post(`/returns/${id}/approve`),
  complete: (id) => api.post(`/returns/${id}/complete`),
};

export const wasteService = {
  getAll: (page = 1, params = {}) =>
    api.get('/wastes', { params: { page, per_page: 10, ...params } }),
  get: (id) => api.get(`/wastes/${id}`),
  create: (data) => api.post('/wastes', data),
};

export const reportService = {
  dashboard:  (month) => api.get('/reports/dashboard', { params: { month } }),
  sales:      (params = {}) => api.get('/reports/sales', { params }),
  inventory:  () => api.get('/reports/inventory'),
  production: (params = {}) => api.get('/reports/production', { params }),
  waste:      (params = {}) => api.get('/reports/waste', { params }),
  exportPdf:  (type, params = {}) =>
    api.get(`/reports/${type}/pdf`, { params, responseType: 'blob' }),
  exportExcel:(type, params = {}) =>
    api.get(`/reports/${type}/excel`, { params, responseType: 'blob' }),
};

export default api;
