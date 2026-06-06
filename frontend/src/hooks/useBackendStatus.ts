// src/hooks/useBackendStatus.ts
// Shared hook for backend health polling

import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export type BackendStatus = "unknown" | "checking" | "online" | "offline";

async function pingHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${API_BASE}/api/health`, { signal: controller.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

export function useBackendStatus(pollIntervalMs = 30000) {
  const [status, setStatus] = useState<BackendStatus>("unknown");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    setStatus("checking");
    const ok = await pingHealth();
    setStatus(ok ? "online" : "offline");
    return ok;
  }, []);

  useEffect(() => {
    check();
    intervalRef.current = setInterval(check, pollIntervalMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [check, pollIntervalMs]);

  return { status, check };
}
