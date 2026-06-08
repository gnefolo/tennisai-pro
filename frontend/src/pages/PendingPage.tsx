import React from "react";
import Logo from "../components/ui/Logo";
import { useAuth } from "../contexts/AuthContext";
import { useT } from "../i18n/LanguageContext";

export default function PendingPage() {
  const { t } = useT();
  const { user, logout, refreshUser } = useAuth();
  const [checking, setChecking] = React.useState(false);

  const handleCheck = async () => {
    setChecking(true);
    await refreshUser();
    setChecking(false);
  };

  return (
    <div className="min-h-screen bg-court-night flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">

        <div className="flex flex-col items-center gap-3 mb-8">
          <Logo variant="icon" size="xl" />
        </div>

        {/* Status icon */}
        <div className="w-16 h-16 rounded-full bg-clay-amber/10 border border-clay-amber/30 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-clay-amber">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 className="font-head text-2xl text-baseline tracking-tight mb-2">{t.pendingTitle}</h1>
        <p className="text-fog/60 text-sm mb-1">{t.pendingSubtitle}</p>
        <p className="text-fog/40 text-sm mb-8">{t.pendingNote}</p>

        {user && (
          <p className="text-fog/30 text-xs mb-6 font-mono">{user.email}</p>
        )}

        <div className="flex flex-col gap-3">
          <button onClick={handleCheck} disabled={checking}
            className="w-full py-3 rounded-xl bg-white/[0.06] border border-white/10 text-fog/70 text-sm font-semibold hover:bg-white/[0.09] transition-all disabled:opacity-50">
            {checking ? "Controllo in corso…" : "Controlla stato approvazione"}
          </button>
          <button onClick={logout}
            className="w-full py-3 rounded-xl text-fog/40 text-sm hover:text-red-400 transition-colors">
            {t.logout}
          </button>
        </div>
      </div>
    </div>
  );
}
