import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const STORAGE_KEY = "tennisai_auth_token";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  token: string;
  is_admin: boolean;
  is_approved: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, inviteKey?: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: AuthUser = JSON.parse(stored);
        if (parsed.token && parsed.email) setUser(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((u: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail: string = data.detail || "";
        if (detail.includes("attesa")) setError("accountPending");
        else setError("authError");
        return false;
      }
      const data = await res.json();
      persist({
        id: data.user_id, name: data.user_name, email: data.user_email,
        token: data.access_token, is_admin: data.is_admin, is_approved: data.is_approved,
      });
      return true;
    } catch {
      setError("networkError");
      return false;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const register = useCallback(async (name: string, email: string, password: string, inviteKey?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, invite_key: inviteKey || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail: string = data.detail || "";
        if (detail.toLowerCase().includes("già registrata")) setError("emailTaken");
        else if (detail.toLowerCase().includes("chiave")) setError("invalidKey");
        else setError(detail || "authError");
        return false;
      }
      const data = await res.json();
      persist({
        id: data.user_id, name: data.user_name, email: data.user_email,
        token: data.access_token, is_admin: data.is_admin, is_approved: data.is_approved,
      });
      return true;
    } catch {
      setError("networkError");
      return false;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const updated: AuthUser = {
          ...user,
          name: data.name,
          is_admin: data.is_admin,
          is_approved: data.is_approved,
        };
        persist(updated);
      }
    } catch {
      // ignore
    }
  }, [user, persist]);

  if (!hydrated) return null;

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, clearError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const API_BASE_URL = API_BASE;
