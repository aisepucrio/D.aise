"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  authLogin,
  authLogout,
  authMe,
  authRegister,
  getToken,
  setToken,
} from "@/services/api";
import type { ApiUser } from "@/types/api";

type Status = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: Status;
  user: ApiUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<ApiUser>;
  logout: () => Promise<void>;
  applyUser: (user: ApiUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<ApiUser | null>(null);

  // Ao montar: se há token, valida com /auth/me.
  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      setStatus("unauthenticated");
      return;
    }
    authMe()
      .then((res) => {
        if (cancelled) return;
        setUser(res.user);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setToken(null);
        setUser(null);
        setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Um 401 em qualquer chamada (token expirado/revogado) desloga na hora.
  useEffect(() => {
    function onUnauthorized() {
      setUser(null);
      setStatus("unauthenticated");
    }
    window.addEventListener("daise:unauthorized", onUnauthorized);
    return () => window.removeEventListener("daise:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authLogin({ email, password });
    setToken(res.token);
    setUser(res.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await authRegister({ email, password, name });
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authLogout();
    } catch {
      // ignora — vamos limpar o estado localmente de qualquer forma
    }
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const applyUser = useCallback((u: ApiUser) => setUser(u), []);

  const value = useMemo(
    () => ({ status, user, login, register, logout, applyUser }),
    [status, user, login, register, logout, applyUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
