import api from './axios.js';

// Auth
export const authApi = {
  login: (d) => api.post('/auth/login', d).then(r => r.data),
  verifyOtp: (d) => api.post('/auth/verify-otp', d).then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`).then(r => r.data),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }).then(r => r.data),
};

// Users
export const usersApi = {
  list: () => api.get('/users').then(r => r.data),
  get: (id) => api.get(`/users/${id}`).then(r => r.data),
  create: (d) => api.post('/users', d).then(r => r.data),
  update: (id, d) => api.patch(`/users/${id}`, d).then(r => r.data),
  verify: (id) => api.patch(`/users/${id}/verify`).then(r => r.data),
  resendVerification: (id) => api.post(`/users/${id}/resend-verification`).then(r => r.data),
  delete: (id) => api.delete(`/users/${id}`).then(r => r.data),
};

// Settings
export const settingsApi = {
  get: () => api.get('/settings').then(r => r.data),
  update: (d) => api.patch('/settings', d).then(r => r.data),
  reset: () => api.post('/settings/reset').then(r => r.data),
};

// Clients
export const clientsApi = {
  list: (p) => api.get('/clients', { params: p }).then(r => r.data),
  get: (id) => api.get(`/clients/${id}`).then(r => r.data),
  create: (d) => api.post('/clients', d).then(r => r.data),
  update: (id, d) => api.patch(`/clients/${id}`, d).then(r => r.data),
  delete: (id) => api.delete(`/clients/${id}`),
  expats: (id) => api.get(`/clients/${id}/expats`).then(r => r.data),
  revealField: (id, fieldName) => api.post(`/clients/${id}/reveal-field`, { fieldName }).then(r => r.data),
};

// Dormitories
export const dormitoriesApi = {
  list: (p) => api.get('/dormitories', { params: p }).then(r => r.data),
  get: (id) => api.get(`/dormitories/${id}`).then(r => r.data),
  create: (d) => api.post('/dormitories', d).then(r => r.data),
  update: (id, d) => api.patch(`/dormitories/${id}`, d).then(r => r.data),
  delete: (id) => api.delete(`/dormitories/${id}`),
  assignClient: (id, d) => api.post(`/dormitories/${id}/assign-client`, d).then(r => r.data),
  removeClient: (id, clientId) => api.delete(`/dormitories/${id}/assign-client/${clientId}`),
  occupants: (id) => api.get(`/dormitories/${id}/occupants`).then(r => r.data),
};

// Expats
export const expatsApi = {
  list: (p) => api.get('/expats', { params: p }).then(r => r.data),
  get: (id) => api.get(`/expats/${id}`).then(r => r.data),
  create: (d) => api.post('/expats', d).then(r => r.data),
  update: (id, d) => api.patch(`/expats/${id}`, d).then(r => r.data),
  updateStatus: (id, status) => api.patch(`/expats/${id}/status`, { status }).then(r => r.data),
  delete: (id) => api.delete(`/expats/${id}`),
  transfers: (id) => api.get(`/expats/${id}/transfers`).then(r => r.data),
  revealField: (id, fieldName) => api.post(`/expats/${id}/reveal-field`, { fieldName }).then(r => r.data),
};

// Transfers
export const transfersApi = {
  list: (p) => api.get('/transfers', { params: p }).then(r => r.data),
  get: (id) => api.get(`/transfers/${id}`).then(r => r.data),
  create: (d) => api.post('/transfers', d).then(r => r.data),
  approve: (id) => api.patch(`/transfers/${id}/approve`).then(r => r.data),
  reject: (id, rejectedReason) => api.patch(`/transfers/${id}/reject`, { rejectedReason }).then(r => r.data),
};

// Documents
export const documentsApi = {
  list: (p) => api.get('/documents', { params: p }).then(r => r.data),
  expiring: (days) => api.get('/documents/expiring', { params: { days } }).then(r => r.data),
  upload: (formData) => api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }).then(r => r.data),
  bulkDownload: (ids) => api.post('/documents/bulk-download', { ids }, { responseType: 'blob' }).then(r => r.data),
  delete: (id) => api.delete(`/documents/${id}`),
};

// Checklists
export const checklistsApi = {
  // Templates
  listTemplates: (p) => api.get('/checklist-templates', { params: p }).then(r => r.data),
  getTemplate: (id) => api.get(`/checklist-templates/${id}`).then(r => r.data),
  createTemplate: (d) => api.post('/checklist-templates', d).then(r => r.data),
  updateTemplate: (id, d) => api.patch(`/checklist-templates/${id}`, d).then(r => r.data),
  deleteTemplate: (id) => api.delete(`/checklist-templates/${id}`),
  addTemplateItem: (id, d) => api.post(`/checklist-templates/${id}/items`, d).then(r => r.data),
  updateTemplateItem: (id, itemId, d) => api.patch(`/checklist-templates/${id}/items/${itemId}`, d).then(r => r.data),
  deleteTemplateItem: (id, itemId) => api.delete(`/checklist-templates/${id}/items/${itemId}`),
  // Instances
  list: (p) => api.get('/checklists', { params: p }).then(r => r.data),
  get: (id) => api.get(`/checklists/${id}`).then(r => r.data),
  create: (d) => api.post('/checklists', d).then(r => r.data),
  archive: (id) => api.delete(`/checklists/${id}`),
  updateItem: (id, itemId, d) => api.patch(`/checklists/${id}/items/${itemId}`, d).then(r => r.data),
};

// Audit
export const auditApi = {
  list: (p) => api.get('/audit', { params: p }).then(r => r.data),
  export: (p) => api.get('/audit/export', { params: { ...p, format: 'csv' }, responseType: 'blob' }).then(r => r.data),
};

// Notifications
export const notificationsApi = {
  list: () => api.get('/notifications').then(r => r.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then(r => r.data),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Search
export const searchApi = {
  search: (q, type = 'all') => api.get('/search', { params: { q, type } }).then(r => r.data),
};

// Webhooks
export const webhooksApi = {
  list: () => api.get('/webhooks').then(r => r.data),
  get: (id) => api.get(`/webhooks/${id}`).then(r => r.data),
  create: (d) => api.post('/webhooks', d).then(r => r.data),
  update: (id, d) => api.patch(`/webhooks/${id}`, d).then(r => r.data),
  delete: (id) => api.delete(`/webhooks/${id}`),
  test: (id) => api.post(`/webhooks/${id}/test`).then(r => r.data),
  logs: (id, p) => api.get(`/webhooks/${id}/logs`, { params: p }).then(r => r.data),
};
