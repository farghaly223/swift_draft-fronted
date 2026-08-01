"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { usePosSessionStore } from "@/stores/posSessionStore";
import { useUIStore } from "@/stores/uiStore";
import { getRedirectForRole } from "@/features/auth/services/authService";
import { ROUTES } from "@/config/constants";

export function useAuth() {
  const store = useAuthStore();
  const clearSession = usePosSessionStore((s) => s.clearSession);
  const setLoggingOut = useUIStore((s) => s.setLoggingOut);
  const router = useRouter();

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      store.clearError();
      try {
        await store.login(email, password);
        const role = useAuthStore.getState().role;
        router.push(getRedirectForRole(role));
      } catch {
        // error is set in store
      }
    },
    [store, router]
  );

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    await store.logout();
    clearSession();
    window.location.href = ROUTES.LOGIN;
  }, [store, clearSession, setLoggingOut]);

  return {
    user: store.user,
    role: store.role,
    fullName: store.fullName,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    login: handleLogin,
    logout: handleLogout,
    checkAuth: store.checkAuth,
    clearError: store.clearError,
  };
}
