"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Lock } from "lucide-react";
import { getLlmConfig, getModels } from "@/services/api";
import type { ApiLlmConfig, ApiModels } from "@/types/api";

export type ModelSelection = { provider: string; model: string };

// Ordem e rótulos dos provedores disponíveis.
const PROVIDERS: { id: string; label: string }[] = [
  { id: "gemini", label: "Google Gemini" },
  { id: "openai", label: "OpenAI" },
  { id: "ollama", label: "Ollama (Local)" },
];

function isConfigured(config: ApiLlmConfig | null, provider: string): boolean {
  if (!config) return false;
  if (provider === "gemini") return !!config.gemini?.hasKey;
  if (provider === "openai") return !!config.openai?.hasKey;
  if (provider === "ollama")
    return !!(config.ollama?.committedEndpoint || config.ollama?.endpoint);
  return false;
}

export type ModelPickerProps = {
  value: ModelSelection;
  onChange: (value: ModelSelection) => void;
  /** Chamado quando termina de carregar, informando se há algum provedor utilizável. */
  onReady?: (hasUsableProvider: boolean) => void;
};

/**
 * Seleção de PROVEDOR de IA (Gemini, OpenAI ou Ollama). Só os provedores com
 * credencial configurada (via getLlmConfig) ficam selecionáveis — os demais
 * aparecem travados. O modelo específico é resolvido a partir da configuração
 * salva em LLM Configs (ou o primeiro modelo do provedor, como padrão).
 */
export default function ModelPicker({ value, onChange, onReady }: ModelPickerProps) {
  const [models, setModels] = useState<ApiModels | null>(null);
  const [config, setConfig] = useState<ApiLlmConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getModels(), getLlmConfig()])
      .then(([m, c]) => {
        if (!alive) return;
        setModels(m);
        setConfig(c);
      })
      .catch(() => alive && setError("Falha ao carregar configuração."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const configuredMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const p of PROVIDERS) map[p.id] = isConfigured(config, p.id);
    return map;
  }, [config]);

  // Resolve o modelo a usar para um provedor: o salvo (se for o mesmo provedor)
  // ou o primeiro modelo disponível do provedor.
  function modelFor(provider: string): string {
    const opts = models?.[provider] ?? [];
    const saved = config?.__lastSavedConfig;
    if (
      saved?.provider === provider &&
      saved.model &&
      opts.some((o) => o.value === saved.model)
    ) {
      return saved.model;
    }
    return opts[0]?.value ?? "";
  }

  // Seleção padrão ao carregar: provedor salvo (se configurado) ou o primeiro
  // provedor configurado.
  useEffect(() => {
    if (loading || !models) return;
    const anyConfigured = PROVIDERS.some((p) => configuredMap[p.id]);
    onReady?.(anyConfigured);

    if (value.provider && configuredMap[value.provider]) return; // já válido

    const saved = config?.__lastSavedConfig?.provider;
    if (saved && configuredMap[saved]) {
      onChange({ provider: saved, model: modelFor(saved) });
      return;
    }
    const first = PROVIDERS.find((p) => configuredMap[p.id]);
    onChange(
      first
        ? { provider: first.id, model: modelFor(first.id) }
        : { provider: "", model: "" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, models, config]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-stroke bg-black/30 px-4 py-3 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" strokeWidth={2} />
        Carregando provedores…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-4 py-2.5 text-sm text-rose-400">
        {error}
      </p>
    );
  }

  const anyConfigured = PROVIDERS.some((p) => configuredMap[p.id]);

  return (
    <div>
      {!anyConfigured ? (
        <p className="mb-2 rounded-lg border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
          Nenhum provedor configurado. Configure uma credencial em{" "}
          <span className="font-semibold">Perfil → LLM Configs</span> para poder
          gerar.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {PROVIDERS.map((p) => {
          const configured = configuredMap[p.id];
          const active = configured && value.provider === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!configured}
              onClick={() => onChange({ provider: p.id, model: modelFor(p.id) })}
              title={!configured ? "Provedor sem credencial configurada" : undefined}
              className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition ${
                !configured
                  ? "cursor-not-allowed border-stroke/60 bg-black/20 text-zinc-600"
                  : active
                    ? "border-brand/50 bg-brand/10 text-brand"
                    : "border-stroke bg-surface-input text-zinc-300 hover:text-zinc-100"
              }`}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-medium">{p.label}</span>
                {active ? (
                  <Check className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                ) : !configured ? (
                  <Lock className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                ) : null}
              </span>
              <span
                className={`text-[10px] font-medium uppercase tracking-wide ${
                  configured ? "text-brand/80" : "text-zinc-600"
                }`}
              >
                {configured ? "configurado" : "não configurado"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
