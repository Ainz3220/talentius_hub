import api from './axios.js';

// ── Auth ──────────────────────────────────────────
export const auth = {
  login: (data) => api.post('/auth/login', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
};

// ── Users ─────────────────────────────────────────
export const users = {
  list: () => api.get('/users'),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
  verify: (id) => api.post(`/users/${id}/verify`),
};

// ── Settings ──────────────────────────────────────
export const settings = {
  get: () => api.get('/settings'),
  update: (data) => api.patch('/settings', data),
  reset: () => api.post('/settings/reset'),
};

// ── Expats ────────────────────────────────────────
export const expats = {
  list: (params) => api.get('/expats', { params }),
  filterSchema: () => api.get('/expats/filter-schema'),
  get: (id) => api.get(`/expats/${id}`),
  create: (data) => api.post('/expats', data),
  update: (id, data) => api.patch(`/expats/${id}`, data),
  updateStatus: (id, status) => api.patch(`/expats/${id}/status`, { status }),
  remove: (id) => api.delete(`/expats/${id}`),
  getTransfers: (id) => api.get(`/expats/${id}/transfers`),
};

// ── Clients ───────────────────────────────────────
export const clients = {
  list: (params) => api.get('/clients', { params }),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.patch(`/clients/${id}`, data),
  remove: (id) => api.delete(`/clients/${id}`),
  getExpats: (id) => api.get(`/clients/${id}/expats`),
};

// ── Dormitories ───────────────────────────────────
export const dormitories = {
  list: (params) => api.get('/dormitories', { params }),
  get: (id) => api.get(`/dormitories/${id}`),
  create: (data) => api.post('/dormitories', data),
  update: (id, data) => api.patch(`/dormitories/${id}`, data),
  remove: (id) => api.delete(`/dormitories/${id}`),
  assignClient: (id, clientId) => api.post(`/dormitories/${id}/assign-client`, { clientId }),
  removeClient: (id, clientId) => api.delete(`/dormitories/${id}/assign-client/${clientId}`),
  getOccupants: (id) => api.get(`/dormitories/${id}/occupants`),
};

// ── Transfers ─────────────────────────────────────
export const transfers = {
  list: (params) => api.get('/transfers', { params }),
  get: (id) => api.get(`/transfers/${id}`),
  create: (data) => api.post('/transfers', data),
  approve: (id) => api.patch(`/transfers/${id}/approve`),
  reject: (id, reason) => api.patch(`/transfers/${id}/reject`, { reason }),
};

// ── Documents ─────────────────────────────────────
export const documents = {
  list: (params) => api.get('/documents', { params }),
  expiring: (days = 30) => api.get(`/documents/expiring?days=${days}`),
  upload: (formData) => api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  bulkDownload: (ids) => api.post('/documents/bulk-download', { ids }, { responseType: 'blob' }),
  remove: (id) => api.delete(`/documents/${id}`),
};

// ── Checklists ────────────────────────────────────
export const checklists = {
  listTemplates: () => api.get('/checklists/templates'),
  createTemplate: (data) => api.post('/checklists/templates', data),
  updateTemplate: (id, data) => api.patch(`/checklists/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/checklists/templates/${id}`),
  addTemplateItem: (id, data) => api.post(`/checklists/templates/${id}/items`, data),
  updateTemplateItem: (tplId, itemId, data) => api.patch(`/checklists/templates/${tplId}/items/${itemId}`, data),
  deleteTemplateItem: (tplId, itemId) => api.delete(`/checklists/templates/${tplId}/items/${itemId}`),

  list: (params) => api.get('/checklists', { params }),
  get: (id) => api.get(`/checklists/${id}`),
  create: (data) => api.post('/checklists', data),
  archive: (id) => api.delete(`/checklists/${id}`),
  updateItem: (id, itemId, data) => api.patch(`/checklists/${id}/items/${itemId}`, data),
};

// ── Audit ─────────────────────────────────────────
export const audit = {
  list: (params) => api.get('/audit', { params }),
  export: (params) => api.get('/audit/export', { params, responseType: 'blob' }),
};

// ── Notifications ─────────────────────────────────
export const notifications = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/mark-read`),
  markAllRead: () => api.patch('/notifications/mark-all-read'),
  remove: (id) => api.delete(`/notifications/${id}`),
};

// ── Search ────────────────────────────────────────
export const search = {
  global: (q, type) => api.get('/search', { params: { q, type } }),
};

// ── Webhooks ──────────────────────────────────────
export const webhooks = {
  list: () => api.get('/webhooks'),
  create: (data) => api.post('/webhooks', data),
  get: (id) => api.get(`/webhooks/${id}`),
  update: (id, data) => api.patch(`/webhooks/${id}`, data),
  remove: (id) => api.delete(`/webhooks/${id}`),
  test: (id) => api.post(`/webhooks/${id}/test`),
  logs: (id) => api.get(`/webhooks/${id}/logs`),
};

// ── Dashboard helpers ─────────────────────────────
export const dashboard = {
  stats: () => Promise.all([
    api.get('/expats', { params: { status: 'ACTIVE', pageSize: 1 } }),
    api.get('/documents/expiring', { params: { days: 30 } }),
    api.get('/transfers', { params: { status: 'PENDING', pageSize: 1 } }),
    api.get('/clients', { params: { status: 'ACTIVE', pageSize: 1 } }),
  ]).then(([expatRes, docsRes, transferRes, clientRes]) => ({
    activeExpats: expatRes.data.total,
    expiringDocs: docsRes.data.length,
    pendingTransfers: transferRes.data.total,
    activeClients: clientRes.data.total,
  })),
};
