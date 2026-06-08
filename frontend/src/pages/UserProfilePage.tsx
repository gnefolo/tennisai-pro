import React, { useState } from "react";
import Logo from "../components/ui/Logo";
import { useAuth, API_BASE_URL } from "../contexts/AuthContext";
import { useT } from "../i18n/LanguageContext";

interface Props {
  onBack: () => void;
}

export default function UserProfilePage({ onBack }: Props) {
  const { t } = useT();
  const { user, logout } = useAuth();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const joinedDate = user
    ? new Date().toLocaleDateString("it-IT", { year: "numeric", month: "long" })
    : "";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) { setPwMsg({ ok: false, text: t.passwordMinLength }); return; }
    setSaving(true);
    setPwMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ old_password: currentPw, new_password: newPw }),
      });
      if (res.ok) {
        setPwMsg({ ok: true, text: t.passwordChanged });
        setCurrentPw(""); setNewPw("");
      } else {
        const d = await res.json().catch(() => ({}));
        setPwMsg({ ok: false, text: d.detail || t.authError });
      }
    } catch {
      setPwMsg({ ok: false, text: "Connessione non disponibile" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-court-night px-4 py-8">
      <div className="max-w-sm mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-fog/60 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="font-head text-xl text-baseline">{t.myProfile}</h1>
        </div>

        {/* Profile card */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-ace-lime/10 border border-ace-lime/20 flex items-center justify-center">
              <span className="text-ace-lime font-bold text-lg">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-baseline">{user?.name}</p>
              <p className="text-fog/50 text-sm">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-fog/40 pt-3 border-t border-white/[0.06]">
            <span>{t.joinedAt}: {joinedDate}</span>
            {user?.is_admin && (
              <span className="px-2 py-0.5 rounded-full bg-ace-lime/10 border border-ace-lime/20 text-ace-lime font-semibold">
                {t.adminBadge}
              </span>
            )}
          </div>
        </div>

        {/* Change password */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-fog/60 uppercase tracking-wide mb-4">{t.changePassword}</h2>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            {pwMsg && (
              <div className={`px-3 py-2 rounded-xl text-xs text-center ${pwMsg.ok ? "bg-ace-lime/10 border border-ace-lime/30 text-ace-lime" : "bg-red-500/10 border border-red-400/30 text-red-300"}`}>
                {pwMsg.text}
              </div>
            )}
            <input type="password" placeholder={t.currentPassword} value={currentPw}
              onChange={e => setCurrentPw(e.target.value)} required
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-baseline placeholder:text-fog/30 text-sm focus:outline-none focus:border-ace-lime/50 transition-all" />
            <input type="password" placeholder={t.newPassword} value={newPw}
              onChange={e => setNewPw(e.target.value)} required
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-baseline placeholder:text-fog/30 text-sm focus:outline-none focus:border-ace-lime/50 transition-all" />
            <button type="submit" disabled={saving}
              className="w-full py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-fog/80 text-sm font-semibold hover:bg-white/[0.09] transition-all disabled:opacity-50">
              {saving ? "Salvataggio…" : t.saveChanges}
            </button>
          </form>
        </div>

        {/* Logout */}
        <button onClick={logout}
          className="w-full py-3 rounded-xl border border-red-400/20 text-red-400/70 text-sm font-semibold hover:bg-red-400/10 hover:text-red-400 transition-all">
          {t.logout}
        </button>
      </div>
    </div>
  );
}
