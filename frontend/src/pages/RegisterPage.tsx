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
  const [localError, setLocalError] = useState<string | null>(null);

  const errorMsg =
    localError === "passwordMismatch" ? t.passwordMismatch :
    localError === "passwordMinLength" ? t.passwordMinLength :
    error === "emailTaken" ? t.emailTaken :
    error === "authError" ? t.authError :
    error === "networkError" ? "Connessione non disponibile" :
    localError ?? error ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    if (password.length < 6) { setLocalError("passwordMinLength"); return; }
    if (password !== confirm) { setLocalError("passwordMismatch"); return; }
    await register(name.trim(), email.trim().toLowerCase(), password);
  };

  return (
    <div className="min-h-screen bg-court-night flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <Logo variant="icon" size="xl" />
          <div className="text-center">
            <h1 className="font-head text-2xl text-baseline tracking-tight">{t.registerTitle}</h1>
            <p className="text-fog/50 text-sm mt-1">{t.registerSubtitle}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Error banner */}
          {errorMsg && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm text-center">
              {errorMsg}
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-fog/60 uppercase tracking-wide">{t.fullName}</label>
            <input
              type="text"
              autoComplete="name"
              placeholder={t.namePlaceholder}
              value={name}
              onChange={e => { setLocalError(null); clearError(); setName(e.target.value); }}
              required
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-baseline placeholder:text-fog/30 text-sm focus:outline-none focus:border-ace-lime/50 focus:bg-white/[0.06] transition-all"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-fog/60 uppercase tracking-wide">{t.email}</label>
            <input
              type="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={e => { setLocalError(null); clearError(); setEmail(e.target.value); }}
              required
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-baseline placeholder:text-fog/30 text-sm focus:outline-none focus:border-ace-lime/50 focus:bg-white/[0.06] transition-all"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-fog/60 uppercase tracking-wide">{t.password}</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••"
              value={password}
              onChange={e => { setLocalError(null); clearError(); setPassword(e.target.value); }}
              required
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-baseline placeholder:text-fog/30 text-sm focus:outline-none focus:border-ace-lime/50 focus:bg-white/[0.06] transition-all"
            />
            <span className="text-[11px] text-fog/35 pl-1">{t.passwordMinLength}</span>
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-fog/60 uppercase tracking-wide">{t.confirmPassword}</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••"
              value={confirm}
              onChange={e => { setLocalError(null); clearError(); setConfirm(e.target.value); }}
              required
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-baseline placeholder:text-fog/30 text-sm focus:outline-none focus:border-ace-lime/50 focus:bg-white/[0.06] transition-all"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-ace-lime text-court-night font-bold text-sm tracking-wide hover:bg-ace-lime/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t.registering : t.register}
          </button>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-fog/40">
          {t.alreadyAccount}{" "}
          <button
            onClick={onGoLogin}
            className="text-ace-lime font-semibold hover:underline"
          >
            {t.login}
          </button>
        </p>
      </div>
    </div>
  );
}
