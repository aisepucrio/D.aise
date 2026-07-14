"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
} from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { getLlmConfig, getModels, saveLlmConfig } from "@/services/api";
import type { ApiLlmConfig, ApiModelOption } from "@/types/api";

const PROVIDER_OPTIONS: SelectOption[] = [
  { value: "gemini", label: "Google Gemini" },
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama (Local)" },
];

function FieldLabel({
  children,
  htmlFor,
}: {
  children: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted"
    >
      {children}
    </label>
  );
}

export default function LLMConfigForm() {
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [tokens, setTokens] = useState(4096);
  const [modelOptions, setModelOptions] = useState<SelectOption[]>([]);
  const [savedConfig, setSavedConfig] = useState<ApiLlmConfig | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // true quando o usuário troca o provider (vs. troca disparada no load inicial),
  // para auto-salvar só em mudanças intencionais.
  const providerChangedByUser = useRef(false);

  // Load config + models on mount
  useEffect(() => {
    Promise.all([getLlmConfig(), getModels()])
      .then(([config, models]) => {
        setSavedConfig(config);

        const savedProvider = config.__lastSavedConfig?.provider ?? "gemini";
        setProvider(savedProvider);
        setModel(config.__lastSavedConfig?.model ?? "");
        setTemperature(Number(config.__lastSavedConfig?.temperature ?? 0.7));
        setTokens(Number(config.__lastSavedConfig?.tokens ?? 4096));

        if (savedProvider === "ollama") {
          setApiKey(config.ollama?.endpoint ?? "");
        } else if (savedProvider === "gemini") {
          setApiKey(config.gemini?.committedApiKey ?? "");
        } else if (savedProvider === "openai") {
          setApiKey(config.openai?.committedApiKey ?? "");
        }

        const opts: SelectOption[] = (
          (models[savedProvider] as ApiModelOption[] | undefined) ?? []
        ).map((m) => ({ value: m.value, label: m.label }));
        setModelOptions(opts);
        if (opts.length && !config.__lastSavedConfig?.model) {
          setModel(opts[0].value);
        }
      })
      .catch(() => setError("Erro ao carregar configuração."))
      .finally(() => setIsLoading(false));
  }, []);

  // Update model options when provider changes (after initial load)
  useEffect(() => {
    if (isLoading || !savedConfig) return;
    getModels()
      .then((models) => {
        const opts: SelectOption[] = (
          (models[provider] as ApiModelOption[] | undefined) ?? []
        ).map((m) => ({ value: m.value, label: m.label }));
        setModelOptions(opts);

        // Resolve o modelo válido para o novo provider (mantém o atual se existir)
        const exists = opts.some((o) => o.value === model);
        const newModel = exists ? model : (opts[0]?.value ?? "");
        setModel(newModel);

        // Reset credential field
        let newCredential = "";
        if (provider === "ollama") {
          newCredential = savedConfig.ollama?.committedEndpoint ?? "";
        } else if (provider === "gemini") {
          newCredential = savedConfig.gemini?.committedApiKey ?? "";
        } else if (provider === "openai") {
          newCredential = savedConfig.openai?.committedApiKey ?? "";
        }
        setApiKey(newCredential);

        // Auto-save apenas quando a troca foi feita pelo usuário (não no load),
        // já com os valores resolvidos do novo provider.
        if (providerChangedByUser.current) {
          providerChangedByUser.current = false;
          persist({ provider, model: newModel, apiKey: newCredential });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  // Salva a configuração. Aceita overrides para evitar usar estado defasado
  // quando salvamos imediatamente após um setState (ex.: troca de modelo).
  async function persist(
    overrides?: Partial<{
      provider: string;
      model: string;
      apiKey: string;
      temperature: number;
      tokens: number;
    }>,
  ) {
    const cfg = { provider, model, apiKey, temperature, tokens, ...overrides };

    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    const providerKey: Record<string, object> = {};
    if (cfg.provider === "gemini") {
      providerKey.gemini = { apiKey: cfg.apiKey, committedApiKey: cfg.apiKey };
    } else if (cfg.provider === "openai") {
      providerKey.openai = { apiKey: cfg.apiKey, committedApiKey: cfg.apiKey };
    } else if (cfg.provider === "ollama") {
      providerKey.ollama = { endpoint: cfg.apiKey, committedEndpoint: cfg.apiKey };
    }

    const payload: Partial<ApiLlmConfig> = {
      __lastSavedConfig: {
        provider: cfg.provider,
        model: cfg.model,
        temperature: cfg.temperature,
        tokens: String(cfg.tokens),
      },
      ...providerKey,
    };

    try {
      const res = await saveLlmConfig(payload);
      setSavedConfig(res.config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar configuração.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await persist();
  }

  // Salva automaticamente ao trocar de modelo (passa o novo valor direto,
  // sem depender do setModel assíncrono).
  function handleModelChange(value: string) {
    setModel(value);
    persist({ model: value });
  }

  // Troca de provider: marca como intencional; o efeito em [provider] resolve
  // modelo/credencial e salva automaticamente.
  function handleProviderChange(value: string) {
    providerChangedByUser.current = true;
    setProvider(value);
  }

  const isOllama = provider === "ollama";
  const credentialLabel = isOllama ? "Ollama endpoint" : "API key";
  const credentialPlaceholder = isOllama
    ? "http://localhost:11434"
    : "Add API key…";

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" strokeWidth={2} />
        Carregando configuração…
      </div>
    );
  }

  return (
    <form
      className="rounded-xl border border-stroke bg-surface-card p-6 shadow-glow-brand md:p-8"
      onSubmit={handleSave}
    >
      {error ? (
        <p className="mb-4 text-sm text-rose-400">{error}</p>
      ) : null}

      <div className="space-y-6">
        <div>
          <FieldLabel htmlFor="llm-provider">LLM provider</FieldLabel>
          <Select
            id="llm-provider"
            value={provider}
            onChange={handleProviderChange}
            options={PROVIDER_OPTIONS}
          />
        </div>

        <div>
          <FieldLabel htmlFor="llm-credential">{credentialLabel}</FieldLabel>
          <div className="flex rounded-lg border border-stroke bg-surface-input shadow-sm transition-colors focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500">
            <input
              id="llm-credential"
              type={showPassword ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={() => persist()}
              placeholder={credentialPlaceholder}
              className="min-w-0 flex-1 border-0 bg-transparent px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted focus:outline-none focus:ring-0"
              autoComplete="off"
            />
            <div className="flex shrink-0 items-center gap-1 border-l border-stroke pr-2 pl-1">
              {apiKey ? (
                <CheckCircle2
                  className="size-5 text-brand"
                  strokeWidth={1.75}
                  aria-hidden
                />
              ) : (
                <Plus className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
              )}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-800/80 hover:text-zinc-200"
                aria-label={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" strokeWidth={1.75} />
                ) : (
                  <Eye className="size-4" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>
        </div>

        {modelOptions.length > 0 ? (
          <div>
            <FieldLabel htmlFor="llm-model">Model</FieldLabel>
            <Select
              id="llm-model"
              value={model}
              onChange={handleModelChange}
              options={modelOptions}
            />
          </div>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <FieldLabel>Temperature (0.0 – 1.0)</FieldLabel>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              onBlur={() => persist()}
              className="w-full min-h-[2.75rem] rounded-lg border border-stroke bg-surface-input px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-zinc-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <FieldLabel>Tokens</FieldLabel>
            <input
              type="number"
              value={tokens}
              onChange={(e) => setTokens(Number(e.target.value))}
              onBlur={() => persist()}
              className="w-full min-h-[2.75rem] rounded-lg border border-stroke bg-surface-input px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-zinc-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
        </div>

      </div>

      <div className="mt-8 flex items-center justify-center gap-3 border-t border-stroke pt-6">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={2} />
          ) : (
            <Save className="size-4" strokeWidth={1.75} />
          )}
          {isSaving ? "Saving…" : "Save changes"}
        </button>
        {saveSuccess ? (
          <span className="flex items-center gap-1.5 text-sm text-brand">
            <CheckCircle2 className="size-4" strokeWidth={2} />
            Salvo!
          </span>
        ) : null}
      </div>
    </form>
  );
}
