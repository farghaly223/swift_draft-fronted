"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getRedirectForRole } from "@/features/auth/services/authService";
import { FullPageSpinner } from "@/components/common/Spinner";
import { ROUTES } from "@/config/constants";
import type { UserRole } from "@/types/api";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, role, isLoading, checkAuth } = useAuthStore();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function verify() {
      if (!isAuthenticated) {
        await checkAuth();
      }
      setIsChecking(false);
    }
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isChecking || isLoading) return;

    if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN);
      return;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
      router.replace(getRedirectForRole(role));
    }
  }, [isChecking, isLoading, isAuthenticated, role, allowedRoles, router]);

  if (isChecking || isLoading) {
    return <FullPageSpinner message="Verifying session..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
