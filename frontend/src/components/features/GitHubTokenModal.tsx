"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, Save, X } from "lucide-react";
import { getLlmConfig, saveLlmConfig } from "@/services/api";

interface Props {
  onClose: () => void;
}

export default function GitHubTokenModal({ onClose }: Props) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLlmConfig()
      .then((config) => setToken(config.github?.committedToken ?? ""))
      .catch(() => setError("Failed to load token."))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      await saveLlmConfig({ github: { token, committedToken: token } });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save token.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-1/2 top-[calc(100%+0.75rem)] z-50 w-96 -translate-x-1/2 rounded-xl border border-stroke bg-surface-card shadow-glow-brand">
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-100">GitHub Token</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-800/80 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="mb-4 text-xs text-zinc-500">
            Required to import private repositories and to commit READMEs to any repository.
          </p>

          {error ? <p className="mb-3 text-xs text-rose-400">{error}</p> : null}

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              Loading…
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <div className="flex rounded-lg border border-stroke bg-surface-input shadow-sm transition-colors focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_…"
                  className="min-w-0 flex-1 border-0 bg-transparent px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted focus:outline-none focus:ring-0"
                  autoComplete="off"
                />
                <div className="flex shrink-0 items-center gap-1 border-l border-stroke pr-2 pl-1">
                  {token ? (
                    <CheckCircle2 className="size-5 text-brand" strokeWidth={1.75} aria-hidden />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-800/80 hover:text-zinc-200"
                    aria-label={showToken ? "Hide token" : "Show token"}
                  >
                    {showToken ? (
                      <EyeOff className="size-4" strokeWidth={1.75} />
                    ) : (
                      <Eye className="size-4" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </div>

              <p className="mt-2 text-xs text-zinc-500">
                Need a token?{" "}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  Generate on GitHub
                </a>
              </p>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <Save className="size-4" strokeWidth={1.75} />
                  )}
                  {isSaving ? "Saving…" : "Save"}
                </button>
                {saveSuccess ? (
                  <span className="flex items-center gap-1.5 text-sm text-brand">
                    <CheckCircle2 className="size-4" strokeWidth={2} />
                    Saved!
                  </span>
                ) : null}
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
