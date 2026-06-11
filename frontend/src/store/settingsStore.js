import { create } from 'zustand';
import api from '../api/axios.js';

export const useSettingsStore = create((set, get) => ({
  settings: null,
  loading: false,
  loadSettings: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const { data } = await api.get('/settings');
      set({ settings: data, loading: false });
      document.documentElement.style.setProperty('--accent', data.primaryColor || '#1F4E3D');
    } catch {
      set({ loading: false });
    }
  },
  updateSettings: async (patch) => {
    const { data } = await api.patch('/settings', patch);
    set({ settings: data });
    if (patch.primaryColor) {
      document.documentElement.style.setProperty('--accent', patch.primaryColor);
    }
    return data;
  },
}));
