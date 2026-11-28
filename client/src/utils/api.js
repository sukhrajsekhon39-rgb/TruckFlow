import axios from 'axios';

// The session lives in an httpOnly cookie the browser sends automatically.
// The custom header proves the request came from our own pages (CSRF protection).
const api = axios.create({ baseURL: '/api', headers: { 'X-Requested-With': 'TruckFlow' } });

// When the session ends, tell the app so it can show the sign-in page
let onSessionEnded = () => {};
export const setSessionEndedHandler = fn => { onSessionEnded = fn; };

api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || '';
    const isAuthCall = /^\/?auth\/(login|signup|forgot|reset|me)$/.test(url);
    if (err.response?.status === 401 && !isAuthCall) onSessionEnded();
    return Promise.reject(err);
  }
);

// Readable message from an API error
export const apiError = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.error || (err?.response ? fallback : 'Can’t reach TruckFlow. Check your connection and try again.');

export const authApi = {
  me:             () => api.get('/auth/me'),
  signup:         (data) => api.post('/auth/signup', data),
  login:          (data) => api.post('/auth/login', data),
  logout:         () => api.post('/auth/logout'),
  logoutAll:      () => api.post('/auth/logout-all'),
  forgot:         (email) => api.post('/auth/forgot', { email }),
  reset:          (token, password) => api.post('/auth/reset', { token, password }),
  updateMe:       (data) => api.patch('/auth/me', data),
  changePassword: (currentPassword, newPassword) => api.post('/auth/password', { currentPassword, newPassword }),
  getCompany:     () => api.get('/auth/company'),
  updateCompany:  (data) => api.put('/auth/company', data),
  deleteAccount:  (password) => api.delete('/auth/account', { data: { password } }),
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
  getRange: (params) => api.get('/analytics/range', { params }),
};

export const invoicesApi = {
  generate: (loadId) => api.post(`/invoices/generate/${loadId}`, {}, { responseType: 'blob' }),
};

export const milesApi = {
  calculate: (data) => api.post('/miles/calculate', data),
};

export const placesApi = {
  autocomplete: (q) => api.get('/places/autocomplete', { params: { q } }),
};

export default api;
