"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Folder, Loader2, Monitor } from "lucide-react";
import { chooseLocalRepository, importGithub, cloneRepository } from "@/services/api";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocalMode = process.env.NEXT_PUBLIC_APP_MODE === "local";

  async function handleSelectLocal() {
    setError(null);
    setIsLoadingLocal(true);
    try {
      const res = await chooseLocalRepository();
      if (res.project) {
        router.push(`/projects/${encodeURIComponent(res.project.folder_name)}`);
      } else {
        setError(res.message ?? "Nenhuma pasta selecionada.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao selecionar pasta.");
    } finally {
      setIsLoadingLocal(false);
    }
  }

  async function handleImportGithub() {
    const url = inputValue.trim();
    if (!url) {
      setError("Cole a URL do repositório GitHub no campo acima.");
      return;
    }
    setError(null);
    setIsLoadingGithub(true);
    try {
      const res = await importGithub(url);
      if (res.project) {
        router.push(`/projects/${encodeURIComponent(res.project.folder_name)}`);
      } else {
        setError(res.message ?? "Erro ao importar repositório.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao importar repositório.");
    } finally {
      setIsLoadingGithub(false);
    }
  }

  async function handleCloneRepository() {
    const url = inputValue.trim();
    if (!url) {
      setError("Cole a URL do repositório GitHub no campo acima.");
      return;
    }
    setError(null);
    setIsLoadingGithub(true);
    try {
      const res = await cloneRepository(url);
      if (res.project) {
        router.push(`/projects/${encodeURIComponent(res.project.folder_name)}`);
      } else {
        setError(res.message ?? "Erro ao clonar repositório.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao clonar repositório.");
    } finally {
      setIsLoadingGithub(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-10">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-stroke bg-surface-card/90 px-3 py-1.5">
            <span
              className="size-2 shrink-0 rounded-full bg-brand shadow-[0_0_10px_rgb(34_197_94_/_0.85)]"
              aria-hidden
            />
            <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-zinc-300 sm:text-xs">
              SYSTEM: READY TO DOCUMENT
            </span>
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100 md:text-5xl lg:text-6xl">
          Transform Code to{" "}
          <span className="text-brand">D.aise</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          D.aise intelligently maps your repository&apos;s architecture,
          generating high-performance documentation and READMEs in seconds.
        </p>
      </div>

      <section
        className="mt-12 w-full max-w-2xl rounded-xl border border-stroke bg-surface-card p-6 shadow-glow-brand md:p-8"
        aria-label="Iniciar fluxo de projeto"
      >
        <div className="rounded-lg border border-stroke bg-surface-input px-3 py-1 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
          <div className="flex min-w-0 items-center gap-2 py-2.5">
            <Folder
              className="size-5 shrink-0 text-zinc-500"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              type="text"
              name="repository-path"
              placeholder="Paste GitHub repository URL..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImportGithub()}
              className="min-w-0 flex-1 border-0 bg-transparent py-0.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-0"
              autoComplete="off"
              disabled={isLoadingLocal || isLoadingGithub}
            />
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-rose-400">{error}</p>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {isLocalMode ? (
            <button
              type="button"
              onClick={handleSelectLocal}
              disabled={isLoadingLocal || isLoadingGithub}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:flex-1"
            >
              {isLoadingLocal ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              ) : null}
              Select Local Project
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleImportGithub}
            disabled={isLoadingLocal || isLoadingGithub}
            // className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-stroke bg-black/30 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:flex-1"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-violet-500/40 bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:flex-1"
          >
            {isLoadingGithub ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
            ) : null}
            Import data from Github API
          </button>

          <button
            type="button"
            onClick={handleCloneRepository}
            disabled={isLoadingLocal || isLoadingGithub}
            // className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand/40 bg-brand/10 px-5 py-2.5 text-sm font-medium text-brand transition hover:bg-brand/20 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:flex-1"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500 px-5 py-2.5 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:flex-1"
          >
            Clone Repository
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm">
          <button
            type="button"
            onClick={handleSelectLocal}
            disabled={isLoadingLocal || isLoadingGithub}
            className="flex items-center gap-2 text-zinc-400 transition hover:text-zinc-200 disabled:opacity-50"
          >
            <Monitor className="size-5" strokeWidth={1.75} aria-hidden />
            Local
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-zinc-400 transition hover:text-zinc-200"
          >
            <GitHubIcon className="size-5" />
            GitHub
          </a>
        </div>
      </section>
    </div>
  );
}
