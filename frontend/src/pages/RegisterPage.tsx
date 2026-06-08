import React, { useState } from "react";
import Logo from "../components/ui/Logo";
import { useAuth } from "../contexts/AuthContext";
import { useT } from "../i18n/LanguageContext";

interface Props {
  onGoLogin: () => void;
}

export default function RegisterPage({ onGoLogin }: Props) {
  const { t } = useT();
  const { register, loading, error, clearError } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteKey, setInviteKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const errorMsg =
    localError === "passwordMismatch" ? t.passwordMismatch :
    localError === "passwordMinLength" ? t.passwordMinLength :
    error === "emailTaken" ? t.emailTaken :
    error === "invalidKey" ? t.invalidKey :
    error === "authError" ? t.authError :
    error === "networkError" ? "Connessione non disponibile" :
    localError ?? error ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    if (password.length < 6) { setLocalError("passwordMinLength"); return; }
    if (password !== confirm) { setLocalError("passwordMismatch"); return; }
    await register(name.trim(), email.trim().toLowerCase(), password, inviteKey.trim() || undefined);
  };

  const clear = () => { setLocalError(null); clearError(); };

  return (
    <div className="min-h-screen bg-court-night flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center gap-3 mb-10">
          <Logo variant="icon" size="xl" />
          <div className="text-center">
            <h1 className="font-head text-2xl text-baseline tracking-tight">{t.registerTitle}</h1>
            <p className="text-fog/50 text-sm mt-1">{t.registerSubtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {errorMsg && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm text-center">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-fog/60 uppercase tracking-wide">{t.fullName}</label>
            <input type="text" autoComplete="name" placeholder={t.namePlaceholder} value={name}
              onChange={e => { clear(); setName(e.target.value); }} required
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-baseline placeholder:text-fog/30 text-sm focus:outline-none focus:border-ace-lime/50 focus:bg-white/[0.06] transition-all" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-fog/60 uppercase tracking-wide">{t.email}</label>
            <input type="email" autoComplete="email" placeholder={t.emailPlaceholder} value={email}
              onChange={e => { clear(); setEmail(e.target.value); }} required
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-baseline placeholder:text-fog/30 text-sm focus:outline-none focus:border-ace-lime/50 focus:bg-white/[0.06] transition-all" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-fog/60 uppercase tracking-wide">{t.password}</label>
            <input type="password" autoComplete="new-password" placeholder="••••••" value={password}
              onChange={e => { clear(); setPassword(e.target.value); }} required
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-baseline placeholder:text-fog/30 text-sm focus:outline-none focus:border-ace-lime/50 focus:bg-white/[0.06] transition-all" />
            <span className="text-[11px] text-fog/35 pl-1">{t.passwordMinLength}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-fog/60 uppercase tracking-wide">{t.confirmPassword}</label>
            <input type="password" autoComplete="new-password" placeholder="••••••" value={confirm}
              onChange={e => { clear(); setConfirm(e.target.value); }} required
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-baseline placeholder:text-fog/30 text-sm focus:outline-none focus:border-ace-lime/50 focus:bg-white/[0.06] transition-all" />
          </div>

          {/* Invite key toggle */}
          <button type="button" onClick={() => setShowKey(v => !v)}
            className="flex items-center gap-2 text-xs text-ace-lime/70 hover:text-ace-lime transition-colors self-start">
            <span className={`w-3 h-3 rounded border border-ace-lime/50 flex items-center justify-center text-[8px] ${showKey ? "bg-ace-lime/20" : ""}`}>
              {showKey ? "✓" : ""}
            </span>
            {t.haveInviteKey}
          </button>

          {showKey && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-fog/60 uppercase tracking-wide">{t.inviteKey}</label>
                <span className="text-[11px] text-ace-lime/50">{t.inviteKeyOptional}</span>
              </div>
              <input type="text" placeholder={t.inviteKeyPlaceholder} value={inviteKey}
                onChange={e => { clear(); setInviteKey(e.target.value.toUpperCase()); }}
                className="w-full bg-white/[0.04] border border-ace-lime/20 rounded-xl px-4 py-3 text-baseline placeholder:text-fog/30 text-sm font-mono focus:outline-none focus:border-ace-lime/50 focus:bg-white/[0.06] transition-all" />
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-ace-lime text-court-night font-bold text-sm tracking-wide hover:bg-ace-lime/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? t.registering : t.register}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-fog/40">
          {t.alreadyAccount}{" "}
          <button onClick={onGoLogin} className="text-ace-lime font-semibold hover:underline">{t.login}</button>
        </p>
      </div>
    </div>
  );
}
