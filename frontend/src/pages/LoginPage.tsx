import React, { useState } from "react";
import Logo from "../components/ui/Logo";
import { useAuth } from "../contexts/AuthContext";
import { useT } from "../i18n/LanguageContext";

interface Props {
  onGoRegister: () => void;
}

export default function LoginPage({ onGoRegister }: Props) {
  const { t } = useT();
  const { login, loading, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const errorMsg =
    error === "authError" ? t.authError :
    error === "networkError" ? "Connessione non disponibile" :
    error ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(email.trim().toLowerCase(), password);
  };

  return (
    <div className="min-h-screen bg-court-night flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <Logo variant="icon" size="xl" />
          <div className="text-center">
            <h1 className="font-head text-2xl text-baseline tracking-tight">{t.loginTitle}</h1>
            <p className="text-fog/50 text-sm mt-1">{t.loginSubtitle}</p>
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

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-fog/60 uppercase tracking-wide">{t.email}</label>
            <input
              type="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={e => { clearError(); setEmail(e.target.value); }}
              required
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-baseline placeholder:text-fog/30 text-sm focus:outline-none focus:border-ace-lime/50 focus:bg-white/[0.06] transition-all"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-fog/60 uppercase tracking-wide">{t.password}</label>
              <span className="text-xs text-fog/40">{t.forgotPassword}</span>
            </div>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••"
              value={password}
              onChange={e => { clearError(); setPassword(e.target.value); }}
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
            {loading ? t.loggingIn : t.login}
          </button>
        </form>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-fog/40">
          {t.noAccount}{" "}
          <button
            onClick={onGoRegister}
            className="text-ace-lime font-semibold hover:underline"
          >
            {t.register}
          </button>
        </p>
      </div>
    </div>
  );
}
