"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getRedirectForRole } from "@/features/auth/services/authService";
import { FullPageSpinner } from "@/components/common/Spinner";
import { ROUTES } from "@/config/constants";

export default function HomePage() {
  const { isAuthenticated, role, checkAuth } = useAuthStore();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function init() {
      await checkAuth();
      setChecked(true);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checked) return;
    if (isAuthenticated && role) {
      router.replace(getRedirectForRole(role));
    } else if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
  }, [checked, isAuthenticated, role, router]);

  return <FullPageSpinner />;
}
