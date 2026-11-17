import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('tf-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If any request gets 401, clear token and reload to show login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tf-token');
      localStorage.removeItem('tf-user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (data) => axios.post('/api/auth/login', data),
  verify: () => api.get('/api/auth/verify'),
};

export const loadsApi = {
  getAll: (params) => api.get('/loads', { params }),
  getById: (id) => api.get(`/loads/${id}`),
  create: (data) => api.post('/loads', data),
  update: (id, data) => api.put(`/loads/${id}`, data),
  delete: (id) => api.delete(`/loads/${id}`),
  uploadDoc: (id, formData) => api.post(`/loads/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteDoc: (id, docId) => api.delete(`/loads/${id}/documents/${docId}`),
};

export const driversApi = {
  getAll: () => api.get('/drivers'),
  create: (data) => api.post('/drivers', data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
  delete: (id) => api.delete(`/drivers/${id}`),
};

export const trucksApi = {
  getAll: () => api.get('/trucks'),
  create: (data) => api.post('/trucks', data),
  update: (id, data) => api.put(`/trucks/${id}`, data),
  delete: (id) => api.delete(`/trucks/${id}`),
};

export const trailersApi = {
  getAll: () => api.get('/trailers'),
  create: (data) => api.post('/trailers', data),
  update: (id, data) => api.put(`/trailers/${id}`, data),
  delete: (id) => api.delete(`/trailers/${id}`),
};

export const brokersApi = {
  getAll: () => api.get('/brokers'),
  create: (data) => api.post('/brokers', data),
  update: (id, data) => api.put(`/brokers/${id}`, data),
  delete: (id) => api.delete(`/brokers/${id}`),
};

export const analyticsApi = {
  getSummary: (params) => api.get('/analytics/summary', { params }),
};

export const invoicesApi = {
  generate: (loadId, companyInfo) => api.post(`/invoices/generate/${loadId}`, { companyInfo }),
};

export const milesApi = {
  calculate: (data) => api.post('/miles/calculate', data),
};

export default api;