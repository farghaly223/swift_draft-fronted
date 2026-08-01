import { create } from "zustand";
import { frappeApi } from "@/lib/api";
import { setCsrfToken } from "@/lib/axios";
import { extractFrappeError } from "@/lib/utils";
import type { UserRole } from "@/types/api";

interface AuthState {
  user: string | null;
  role: UserRole | null;
  fullName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearAuth: () => void;
  clearError: () => void;
}

const initialState = {
  user: null,
  role: null,
  fullName: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    // A new session issues a new CSRF token — drop any token cached from a
    // previous session (e.g. a Frappe desk session in another tab).
    setCsrfToken(null);
    try {
      const { data } = await frappeApi.login(email, password);
      setCsrfToken(null);
      set({
        user: data.user,
        role: data.role,
        fullName: data.full_name,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: extractFrappeError(err) });
      throw err;
    }
  },

  logout: async () => {
    try {
      await frappeApi.logout();
    } catch {
      // proceed with local cleanup even if server call fails
    }
    setCsrfToken(null);
    set(initialState);
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const { data } = await frappeApi.me();
      set({
        user: data.user,
        role: data.role,
        fullName: data.full_name,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ ...initialState, isLoading: false });
    }
  },

  clearAuth: () => {
    set(initialState);
  },

  clearError: () => {
    set({ error: null });
  },
}));
