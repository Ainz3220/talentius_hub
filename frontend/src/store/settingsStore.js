import { create } from 'zustand';
import { settings as settingsApi } from '../api/index.js';

export const useSettingsStore = create((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  loadSettings: async () => {
    if (get().settings || get().loading) return;
    set({ loading: true });
    try {
      const { data } = await settingsApi.get();
      set({ settings: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateSettings: async (patch) => {
    try {
      const { data } = await settingsApi.update(patch);
      set({ settings: data });
      if (patch.accentColor) {
        document.documentElement.style.setProperty('--accent', patch.accentColor);
      }
      return data;
    } catch (err) {
      throw err;
    }
  },
}));
