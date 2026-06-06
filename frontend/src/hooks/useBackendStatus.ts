// src/hooks/useBackendStatus.ts
// Backend health polling + keepalive (prevents Render sleep after 15 min inactivity)

import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export type BackendStatus = "unknown" | "checking" | "online" | "offline";

// Render free tier sleeps after ~15 min of inactivity — ping every 10 min to keep it awake
const KEEPALIVE_INTERVAL_MS = 10 * 60 * 1000;

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

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>("unknown");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Silent keepalive: only updates status if it changes (no "checking" flash)
  const silentPing = useCallback(async () => {
    const ok = await pingHealth();
    setStatus(prev => {
      if (ok && prev !== "online") return "online";
      if (!ok && prev === "online") return "offline";
      return prev;
    });
  }, []);

  // Explicit check: shows "checking" spinner in the badge (manual trigger)
  const check = useCallback(async () => {
    setStatus("checking");
    const ok = await pingHealth();
    setStatus(ok ? "online" : "offline");
    return ok;
  }, []);

  useEffect(() => {
    // Initial explicit check on mount
    check();
    // Keepalive: silent ping every 10 min to prevent Render from sleeping
    intervalRef.current = setInterval(silentPing, KEEPALIVE_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [check, silentPing]);

  return { status, check };
}
