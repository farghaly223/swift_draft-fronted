"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { ReturnScreen } from "@/features/returns/components/ReturnScreen";
import { Button } from "@/components/common/Button";
import { ArrowLeft } from "lucide-react";

export default function ReturnsPage() {
  const router = useRouter();
  const { fullName } = useAuthStore();

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900">RETURNS</h1>
          <span className="text-xs text-gray-400 hidden sm:inline">{fullName}</span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => router.push("/pos")}>
          <ArrowLeft className="h-4 w-4" /> Back to POS
        </Button>
      </header>

      <div className="flex-1 overflow-hidden">
        <ReturnScreen />
      </div>
    </div>
  );
}
