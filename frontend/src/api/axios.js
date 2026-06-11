import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;
let redirecting = false;

function forceLogout() {
  if (redirecting) return;
  redirecting = true;
  useAuthStore.getState().logout();
  window.location.replace('/login');
}

api.interceptors.response.use(
  r => r,
  async err => {
    const original = err.config;
    // Don't intercept the refresh call itself to avoid infinite loops
    if (err.response?.status === 401 && !original._retry && !original.url?.includes('/auth/refresh')) {
      original._retry = true;
      if (!refreshing) {
        refreshing = api.post('/auth/refresh').then(r => {
          useAuthStore.getState().setToken(r.data.accessToken);
        }).catch(() => {
          forceLogout();
        }).finally(() => {
          refreshing = null;
        });
      }
      await refreshing;
      // If logout was triggered during refresh, don't retry
      if (!useAuthStore.getState().token) {
        return Promise.reject(err);
      }
      return api(original);
    }
    return Promise.reject(err);
  }
);

export default api;
