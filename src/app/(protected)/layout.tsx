"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { usePosSessionStore } from "@/stores/posSessionStore";
import { useUIStore } from "@/stores/uiStore";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { OpeningCashModal } from "@/features/pos/components/OpeningCashModal";
import { FullPageSpinner } from "@/components/common/Spinner";
import { ROLES } from "@/config/constants";

function SessionGate({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.role);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isSessionOpen, isChecking, checkCurrentSession } = usePosSessionStore();
  const isLoggingOut = useUIStore((s) => s.isLoggingOut);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    if (role !== ROLES.CASHIER) {
      setSessionChecked(true);
      return;
    }
    async function check() {
      await checkCurrentSession();
      setSessionChecked(true);
    }
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  if (isLoggingOut || !isAuthenticated) {
    return <FullPageSpinner message="Logging out..." />;
  }

  if (!sessionChecked || isChecking) {
    return <FullPageSpinner message="Checking session..." />;
  }

  if (role === ROLES.CASHIER && !isSessionOpen) {
    return (
      <>
        <FullPageSpinner message="Please start your shift to continue." />
        <OpeningCashModal isOpen={true} />
      </>
    );
  }

  return <>{children}</>;
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <SessionGate>{children}</SessionGate>
    </ProtectedRoute>
  );
}
