import React, { useState, useEffect, useCallback } from "react";
import { useAuth, API_BASE_URL } from "../contexts/AuthContext";
import { useT } from "../i18n/LanguageContext";

interface Props {
  onBack: () => void;
}

interface PendingUser { id: number; name: string; email: string; created_at: string }
interface InviteKey { id: number; code: string; note: string | null; is_used: boolean; used_at: string | null; created_at: string }
interface AppUser { id: number; name: string; email: string; is_admin: boolean; created_at: string }

type Tab = "requests" | "keys" | "users";

export default function AdminPage({ onBack }: Props) {
  const { t } = useT();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("requests");

  const [requests, setRequests] = useState<PendingUser[]>([]);
  const [keys, setKeys] = useState<InviteKey[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyNote, setKeyNote] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const headers = { Authorization: `Bearer ${user?.token}`, "Content-Type": "application/json" };

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      const paths: Record<Tab, string> = {
        requests: "/api/admin/requests",
        keys: "/api/admin/keys",
        users: "/api/admin/users",
      };
      const res = await fetch(`${API_BASE_URL}${paths[t]}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (t === "requests") setRequests(data);
        else if (t === "keys") setKeys(data);
        else setUsers(data);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => { load(tab); }, [tab]);

  const approve = async (userId: number) => {
    await fetch(`${API_BASE_URL}/api/admin/approve/${userId}`, { method: "POST", headers });
    setRequests(prev => prev.filter(u => u.id !== userId));
  };

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/api/admin/keys`, {
      method: "POST", headers,
      body: JSON.stringify({ note: keyNote || null }),
    });
    if (res.ok) {
      const key = await res.json();
      setKeys(prev => [key, ...prev]);
      setKeyNote("");
    }
  };

  const revokeKey = async (keyId: number) => {
    await fetch(`${API_BASE_URL}/api/admin/keys/${keyId}`, { method: "DELETE", headers });
    setKeys(prev => prev.filter(k => k.id !== keyId));
  };

  const copyKey = (key: InviteKey) => {
    navigator.clipboard.writeText(key.code).catch(() => {});
    setCopiedId(key.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("it-IT");

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "requests", label: t.pendingRequests, count: requests.length },
    { id: "keys", label: t.inviteKeys },
    { id: "users", label: t.allUsers },
  ];

  return (
    <div className="min-h-screen bg-court-night px-4 py-8">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-fog/60 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className="font-head text-xl text-baseline">{t.adminPanel}</h1>
            <p className="text-fog/40 text-xs">TennisAI Pro</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 mb-6">
          {tabs.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                tab === tb.id
                  ? "bg-ace-lime text-court-night"
                  : "text-fog/50 hover:text-fog"
              }`}>
              {tb.label}
              {tb.id === "requests" && requests.length > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${tab === "requests" ? "bg-court-night/30" : "bg-red-400/20 text-red-300"}`}>
                  {requests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-fog/30 text-sm py-8">Caricamento…</div>
        )}

        {/* ── Requests tab ── */}
        {tab === "requests" && !loading && (
          <div className="flex flex-col gap-3">
            {requests.length === 0 && (
              <div className="text-center text-fog/30 text-sm py-12">{t.noRequests}</div>
            )}
            {requests.map(u => (
              <div key={u.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-baseline text-sm">{u.name}</p>
                  <p className="text-fog/50 text-xs">{u.email}</p>
                  <p className="text-fog/30 text-xs mt-0.5">{fmt(u.created_at)}</p>
                </div>
                <button onClick={() => approve(u.id)}
                  className="px-4 py-2 rounded-xl bg-ace-lime text-court-night text-xs font-bold hover:bg-ace-lime/90 transition-all flex-shrink-0">
                  {t.approve}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Keys tab ── */}
        {tab === "keys" && !loading && (
          <div className="flex flex-col gap-4">
            {/* Create key form */}
            <form onSubmit={createKey} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex gap-2">
              <input type="text" placeholder={t.keyNotePlaceholder} value={keyNote}
                onChange={e => setKeyNote(e.target.value)}
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-baseline placeholder:text-fog/30 focus:outline-none focus:border-ace-lime/50 transition-all" />
              <button type="submit"
                className="px-4 py-2 rounded-xl bg-ace-lime text-court-night text-xs font-bold hover:bg-ace-lime/90 transition-all flex-shrink-0">
                {t.createKey}
              </button>
            </form>

            {keys.length === 0 && (
              <div className="text-center text-fog/30 text-sm py-8">{t.noKeys}</div>
            )}
            {keys.map(k => (
              <div key={k.id} className={`bg-white/[0.03] border rounded-xl p-4 ${k.is_used ? "border-white/[0.04] opacity-60" : "border-white/[0.06]"}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-baseline tracking-wider">{k.code}</p>
                    {k.note && <p className="text-fog/50 text-xs mt-0.5">{k.note}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                    k.is_used ? "bg-fog/10 text-fog/40" : "bg-ace-lime/10 text-ace-lime border border-ace-lime/20"
                  }`}>
                    {k.is_used ? t.usedKey : t.availableKey}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-fog/30 text-xs">{fmt(k.created_at)}{k.used_at ? ` · usata ${fmt(k.used_at)}` : ""}</p>
                  {!k.is_used && (
                    <div className="flex gap-2">
                      <button onClick={() => copyKey(k)}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs text-fog/70 hover:text-baseline transition-all">
                        {copiedId === k.id ? t.keyCopied : t.copyKey}
                      </button>
                      <button onClick={() => revokeKey(k.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-400/10 border border-red-400/20 text-xs text-red-400/70 hover:text-red-400 transition-all">
                        {t.revoke}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Users tab ── */}
        {tab === "users" && !loading && (
          <div className="flex flex-col gap-3">
            {users.length === 0 && (
              <div className="text-center text-fog/30 text-sm py-12">{t.noUsers}</div>
            )}
            {users.map(u => (
              <div key={u.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-baseline text-sm">{u.name}</p>
                    {u.is_admin && (
                      <span className="px-1.5 py-0.5 rounded-full bg-ace-lime/10 border border-ace-lime/20 text-ace-lime text-[10px] font-semibold">
                        {t.adminBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-fog/50 text-xs">{u.email}</p>
                  <p className="text-fog/30 text-xs mt-0.5">{fmt(u.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
