"use client";

import { useEffect, useRef } from "react";
import { usePosSessionStore } from "@/stores/posSessionStore";
import { frappeApi } from "@/lib/api";
import { HEARTBEAT_INTERVAL_MS } from "@/config/constants";

export function useSessionHeartbeat() {
  const openingEntry = usePosSessionStore((s) => s.openingEntry);
  const isSessionOpen = usePosSessionStore((s) => s.isSessionOpen);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!isSessionOpen || !openingEntry) return;

    const sendHeartbeat = () => {
      frappeApi
        .sessionHeartbeat(openingEntry, "idle")
        .catch(() => {});
    };

    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSessionOpen, openingEntry]);
}
