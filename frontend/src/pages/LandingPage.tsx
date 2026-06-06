// src/pages/LandingPage.tsx
// Landing page con selezione modalità e warm-up del backend

import React, { useCallback, useEffect, useRef, useState } from "react";
import Logo from "../components/ui/Logo";
import { TacticsIcon, LayersIcon, AIIcon } from "../components/ui/icons";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

type DashMode = "live" | "liveArchive" | "infosysDemo";
type BackendStatus = "unknown" | "checking" | "online" | "starting" | "offline";

interface LandingPageProps {
  onEnter: (mode: DashMode) => void;
}

async function pingBackend(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${API_BASE}/api/health`, { signal: controller.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

// Pre-loads both ML models on the backend so first point has no lag
async function warmupBackend(): Promise<void> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 90000);
    await fetch(`${API_BASE}/api/warmup`, { signal: controller.signal });
    clearTimeout(t);
  } catch {
    // fire-and-forget, ignore errors
  }
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [selected, setSelected] = useState<DashMode>("live");
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("unknown");
  const [startProgress, setStartProgress] = useState<number>(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
  };

  const checkOnce = useCallback(async (silent = false) => {
    if (!silent) setBackendStatus("checking");
    const ok = await pingBackend();
    if (ok) {
      stopPolling();
      setStartProgress(100);
      setBackendStatus("online");
      warmupBackend(); // fire-and-forget: pre-carica i modelli ML
    }
    return ok;
  }, []);

  // Check backend status on mount
  useEffect(() => {
    checkOnce(false);
    return stopPolling;
  }, [checkOnce]);

  const handleWakeUp = useCallback(async () => {
    setBackendStatus("starting");
    setStartProgress(0);

    // Animate progress bar while waiting
    progressRef.current = setInterval(() => {
      setStartProgress(p => {
        if (p >= 88) return p; // stall near end until backend replies
        return p + 1.2;
      });
    }, 800);

    // Poll every 5 seconds for up to 2 minutes
    const ok = await pingBackend();
    if (ok) {
      stopPolling();
      setStartProgress(100);
      setBackendStatus("online");
      warmupBackend();
      return;
    }

    pollingRef.current = setInterval(async () => {
      const alive = await pingBackend();
      if (alive) {
        stopPolling();
        setStartProgress(100);
        setBackendStatus("online");
        warmupBackend();
      }
    }, 5000);
  }, []);

  const statusColor: Record<BackendStatus, string> = {
    unknown: "bg-white/20 text-fog/60",
    checking: "bg-clay-amber/20 text-clay-amber",
    online: "bg-ace-lime/20 text-ace-lime",
    starting: "bg-clay-amber/20 text-clay-amber",
    offline: "bg-red-500/20 text-red-400",
  };

  const statusLabel: Record<BackendStatus, string> = {
    unknown: "—",
    checking: "Verifica in corso…",
    online: "Online",
    starting: "Avvio in corso…",
    offline: "Non raggiungibile",
  };

  const statusDot: Record<BackendStatus, string> = {
    unknown: "bg-white/30",
    checking: "bg-clay-amber animate-pulse",
    online: "bg-ace-lime",
    starting: "bg-clay-amber animate-pulse",
    offline: "bg-red-400",
  };

  const MODES: { id: DashMode; label: string; sub: string; Icon: React.FC<{ size?: number }> }[] = [
    { id: "live", label: "Live Match", sub: "Registra e analizza un match in tempo reale", Icon: TacticsIcon },
    { id: "liveArchive", label: "Archivio", sub: "Esplora i match registrati in precedenza", Icon: LayersIcon },
    { id: "infosysDemo", label: "Infosys Demo", sub: "Analytics avanzati su match Slam", Icon: AIIcon },
  ];

  return (
    <div className="min-h-screen bg-court-night flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background — campo da tennis visto dall'alto (proporzioni reali 78×36 ft) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.07]">
        <svg width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
          {/*
            Campo landscape: asse X = lunghezza (78 ft), asse Y = larghezza (36 ft)
            Scala: 700px / 78ft = 8.97 px/ft
            Court: x 50→750 (700px), y 139→461 (322px)
            Net: x=400 (centro) | Service lines: x=211 e x=589 (±21ft dal net)
            Singles sidelines: y=179 e y=421 (4.5ft = 40px dentro il doubles)
            Center service line: y=300 (metà larghezza), da x=211 a x=589
          */}

          {/* Superficie campo — fill subtile */}
          <rect x="50" y="139" width="700" height="322" fill="white" opacity="0.04" />

          {/* Boundary esterna (doubles) */}
          <rect x="50" y="139" width="700" height="322" fill="none" stroke="white" strokeWidth="2" />

          {/* Corsie doubles (alleys) — fill leggermente diverso */}
          <rect x="50" y="139" width="700" height="40" fill="white" opacity="0.03" />
          <rect x="50" y="421" width="700" height="40" fill="white" opacity="0.03" />

          {/* Singles sidelines */}
          <line x1="50" y1="179" x2="750" y2="179" stroke="white" strokeWidth="1.5" />
          <line x1="50" y1="421" x2="750" y2="421" stroke="white" strokeWidth="1.5" />

          {/* Rete — linea più spessa al centro */}
          <line x1="400" y1="133" x2="400" y2="467" stroke="white" strokeWidth="3" />
          {/* Paletti rete */}
          <rect x="396" y="128" width="8" height="10" rx="2" fill="white" opacity="0.9" />
          <rect x="396" y="462" width="8" height="10" rx="2" fill="white" opacity="0.9" />

          {/* Service lines (solo tra le singles sidelines) */}
          <line x1="211" y1="179" x2="211" y2="421" stroke="white" strokeWidth="1.5" />
          <line x1="589" y1="179" x2="589" y2="421" stroke="white" strokeWidth="1.5" />

          {/* Center service line (da service line a service line, al centro della larghezza) */}
          <line x1="211" y1="300" x2="589" y2="300" stroke="white" strokeWidth="1.5" />

          {/* Center marks sulle baselines (segmento perpendicolare corto) */}
          <line x1="50" y1="293" x2="50" y2="307" stroke="white" strokeWidth="2.5" />
          <line x1="750" y1="293" x2="750" y2="307" stroke="white" strokeWidth="2.5" />

          {/* Service box fill (leggero) per evidenziare le aree */}
          <rect x="211" y="179" width="189" height="121" fill="white" opacity="0.02" />
          <rect x="400" y="179" width="189" height="121" fill="white" opacity="0.02" />
          <rect x="211" y="300" width="189" height="121" fill="white" opacity="0.02" />
          <rect x="400" y="300" width="189" height="121" fill="white" opacity="0.02" />
        </svg>
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center gap-2 mb-10">
        <Logo variant="wordmark" size="lg" />
        <span className="font-head text-fog/50 text-sm tracking-widest uppercase">AI Tennis Analytics</span>
      </div>

      {/* Backend Status Card */}
      <div className="w-full max-w-md mb-6">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-fog/50 uppercase tracking-wider">Backend AI</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusColor[backendStatus]}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot[backendStatus]}`} />
              {statusLabel[backendStatus]}
            </span>
          </div>

          {/* Progress bar — shown only while starting */}
          {backendStatus === "starting" && (
            <div className="w-full h-1 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-clay-amber transition-all duration-700"
                style={{ width: `${startProgress}%` }}
              />
            </div>
          )}

          {backendStatus === "starting" && (
            <p className="text-[11px] text-fog/40 leading-relaxed">
              Il backend su Render può impiegare fino a 60 s al primo avvio dopo un periodo di inattività.
            </p>
          )}

          {(backendStatus === "unknown" || backendStatus === "offline" || backendStatus === "checking") && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleWakeUp}
                disabled={backendStatus === "checking"}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-clay-amber/40 bg-clay-amber/10 text-clay-amber text-[13px] font-semibold hover:bg-clay-amber/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {backendStatus === "checking" ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                )}
                {backendStatus === "checking" ? "Verifica…" : "Avvia Backend"}
              </button>
              <button
                onClick={() => checkOnce(false)}
                disabled={backendStatus === "checking"}
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-fog/40 text-[12px] hover:text-fog hover:border-white/20 transition-all disabled:opacity-40"
              >
                Ricontrolla
              </button>
            </div>
          )}

          {backendStatus === "online" && (
            <p className="text-[12px] text-ace-lime/70 leading-relaxed">
              Il motore AI è attivo e pronto. Puoi usare tutte le funzionalità in tempo reale.
            </p>
          )}
        </div>
      </div>

      {/* Mode Selection */}
      <div className="w-full max-w-md mb-8 flex flex-col gap-3">
        <span className="text-[12px] font-semibold text-fog/50 uppercase tracking-wider px-1">Scegli modalità</span>
        {MODES.map(({ id, label, sub, Icon }) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all text-left ${
              selected === id
                ? "border-ace-lime bg-ace-lime/10 shadow-[0_0_24px_rgba(212,255,58,0.12)]"
                : "border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
            }`}
          >
            <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
              selected === id ? "bg-ace-lime/20 text-ace-lime" : "bg-white/[0.06] text-fog/40"
            }`}>
              <Icon size={20} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className={`text-[14px] font-semibold ${selected === id ? "text-baseline" : "text-fog/70"}`}>
                {label}
              </span>
              <span className="text-[12px] text-fog/40">{sub}</span>
            </span>
            {selected === id && (
              <span className="ml-auto text-ace-lime">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => onEnter(selected)}
        className="w-full max-w-md px-6 py-4 rounded-2xl bg-ace-lime text-court-night font-bold text-[15px] tracking-wide hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_24px_rgba(212,255,58,0.25)] flex items-center justify-center gap-2"
      >
        Entra nella Dashboard
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
        </svg>
      </button>

      <p className="mt-6 text-[11px] text-fog/25 text-center">
        Puoi cambiare modalità in qualsiasi momento dalla dashboard
      </p>
    </div>
  );
};

export default LandingPage;
