import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  r => r,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = api.post('/auth/refresh').then(r => {
          useAuthStore.getState().setToken(r.data.accessToken);
          refreshing = null;
        }).catch(() => {
          useAuthStore.getState().logout();
          refreshing = null;
          window.location.href = '/login';
        });
      }
      await refreshing;
      return api(original);
    }
    return Promise.reject(err);
  }
);

export default api;
