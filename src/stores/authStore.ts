import { create } from 'zustand';

interface AuthState {
  isLoggedIn: boolean;
  username: string | null;
  login: (username: string) => void;
  logout: () => void;
  checkAuth: () => void;
}

const AUTH_KEY = 'fundhub_auth';

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  username: null,

  login: (username: string) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ username, time: Date.now() }));
    set({ isLoggedIn: true, username });
  },

  logout: () => {
    localStorage.removeItem(AUTH_KEY);
    set({ isLoggedIn: false, username: null });
  },

  checkAuth: () => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        // 登录状态保留7天
        if (Date.now() - data.time < 7 * 24 * 60 * 60 * 1000) {
          set({ isLoggedIn: true, username: data.username });
          return;
        }
      }
      set({ isLoggedIn: false, username: null });
    } catch {
      set({ isLoggedIn: false, username: null });
    }
  },
}));