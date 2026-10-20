"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isLogin = mode === "login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsBusy(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
        router.replace("/");
      } else {
        await register(email.trim(), password, name.trim());
        await login(email.trim(), password);
        router.replace("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação.");
    } finally {
      setIsBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-stroke bg-surface-input px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-app px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            Transform Code to <span className="text-brand">D.aise</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {isLogin ? "Entre na sua conta para continuar." : "Crie uma conta para começar."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-stroke bg-surface-card p-6 shadow-glow-brand md:p-8"
        >
          <div className="flex flex-col gap-4">
            {!isLogin ? (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                  Nome
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className={inputClass}
                  autoComplete="name"
                />
              </div>
            ) : null}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className={inputClass}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            {notice ? <p className="text-sm text-brand">{notice}</p> : null}

            <button
              type="submit"
              disabled={isBusy}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              ) : isLogin ? (
                <LogIn className="size-4" strokeWidth={2} />
              ) : (
                <UserPlus className="size-4" strokeWidth={2} />
              )}
              {isLogin ? "Entrar" : "Criar conta"}
            </button>
          </div>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-400">
          {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isLogin ? "register" : "login");
              setError(null);
              setNotice(null);
            }}
            className="font-medium text-brand hover:underline"
          >
            {isLogin ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </div>
    </div>
  );
}
