import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      setUser: (user) => set({ user }),
      isAuthenticated: () => !!get().token,
      hasRole: (role) => {
        const hierarchy = { STAFF: 0, MANAGER: 1, SUPER_ADMIN: 2 };
        const userLevel = hierarchy[get().user?.role] ?? -1;
        const requiredLevel = hierarchy[role] ?? 999;
        return userLevel >= requiredLevel;
      },
    }),
    {
      name: 'expatflow-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
