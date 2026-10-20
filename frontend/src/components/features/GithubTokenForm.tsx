"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  HardDrive,
  Loader2,
  Save,
} from "lucide-react";
import { getLlmConfig, saveLlmConfig } from "@/services/api";

type StorageMode = "cloud" | "local";

export default function GithubTokenForm() {
  const [token, setToken] = useState("");
  const [hasSavedToken, setHasSavedToken] = useState(false);
  const [maskedToken, setMaskedToken] = useState("");
  const [storageMode, setStorageMode] = useState<StorageMode>("cloud");
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLlmConfig()
      .then((config) => {
        setHasSavedToken(!!config.github?.hasKey);
        setMaskedToken(config.github?.maskedKey ?? "");
        setStorageMode(config.github?.storageMode ?? "cloud");
      })
      .catch(() => setError("Falha ao carregar o token."))
      .finally(() => setIsLoading(false));
  }, []);

  async function persist(mode: StorageMode, newToken?: string) {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const github: Record<string, unknown> = { storageMode: mode };
      const secret = (newToken ?? "").trim();
      if (secret) {
        github.token = secret;
        github.committedToken = secret;
      }
      const res = await saveLlmConfig({ github });
      setHasSavedToken(!!res.config.github?.hasKey);
      setMaskedToken(res.config.github?.maskedKey ?? "");
      setStorageMode(res.config.github?.storageMode ?? mode);
      setToken("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar o token.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    persist(storageMode, token);
  }

  function handleStorageModeChange(mode: StorageMode) {
    if (mode === storageMode) return;
    setStorageMode(mode);
    persist(mode, token);
  }

  return (
    <div className="rounded-xl border border-stroke bg-surface-card p-6 md:p-8">
      <h2 className="text-lg font-semibold text-zinc-100">Token do GitHub</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Necessário para importar repositórios privados e para dar commit/push do README.
      </p>

      {isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" strokeWidth={2} />
          Carregando…
        </div>
      ) : (
        <form onSubmit={handleSave} className="mt-6">
          {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}

          <div className="flex rounded-lg border border-stroke bg-surface-input shadow-sm transition-colors focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={hasSavedToken ? `${maskedToken} — digite para trocar` : "ghp_…"}
              className="min-w-0 flex-1 border-0 bg-transparent px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted focus:outline-none focus:ring-0"
              autoComplete="off"
            />
            <div className="flex shrink-0 items-center gap-1 border-l border-stroke pr-2 pl-1">
              {token || hasSavedToken ? (
                <CheckCircle2 className="size-5 text-brand" strokeWidth={1.75} aria-hidden />
              ) : null}
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-800/80 hover:text-zinc-200"
                aria-label={showToken ? "Ocultar" : "Mostrar"}
              >
                {showToken ? <EyeOff className="size-4" strokeWidth={1.75} /> : <Eye className="size-4" strokeWidth={1.75} />}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStorageModeChange("cloud")}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                storageMode === "cloud"
                  ? "border-brand/50 bg-brand/10 text-brand"
                  : "border-stroke bg-surface-input text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Cloud className="size-3.5" strokeWidth={1.75} aria-hidden />
              Nuvem
            </button>
            <button
              type="button"
              onClick={() => handleStorageModeChange("local")}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                storageMode === "local"
                  ? "border-brand/50 bg-brand/10 text-brand"
                  : "border-stroke bg-surface-input text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <HardDrive className="size-3.5" strokeWidth={1.75} aria-hidden />
              Local
            </button>
          </div>

          <p className="mt-2 text-xs text-zinc-500">
            {storageMode === "cloud" ? "Cifrado e guardado no banco. " : "Guardado só no host, fora do banco. "}
            Precisa de um token?{" "}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              Gerar no GitHub
            </a>
          </p>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" strokeWidth={2} /> : <Save className="size-4" strokeWidth={1.75} />}
              {isSaving ? "Salvando…" : "Salvar"}
            </button>
            {saveSuccess ? (
              <span className="flex items-center gap-1.5 text-sm text-brand">
                <CheckCircle2 className="size-4" strokeWidth={2} />
                Salvo!
              </span>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
