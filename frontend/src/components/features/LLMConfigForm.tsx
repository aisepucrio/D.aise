"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  HardDrive,
  Loader2,
  Plus,
  Save,
} from "lucide-react";
import { type SelectOption } from "@/components/ui/Select";
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

type StorageMode = "cloud" | "local";

export default function LLMConfigForm() {
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [storageMode, setStorageMode] = useState<StorageMode>("cloud");
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

  function storageModeOf(cfg: ApiLlmConfig | null, prov: string): StorageMode {
    if (prov === "gemini") return cfg?.gemini?.storageMode ?? "cloud";
    if (prov === "openai") return cfg?.openai?.storageMode ?? "cloud";
    return "cloud";
  }

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
        setStorageMode(storageModeOf(config, savedProvider));

        // Segredos (gemini/openai) nunca voltam da API — o campo começa vazio e
        // só é enviado se o usuário digitar um novo. Ollama endpoint não é segredo.
        if (savedProvider === "ollama") {
          setApiKey(config.ollama?.endpoint ?? "");
        } else {
          setApiKey("");
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

        // Campo de credencial: só o endpoint do Ollama é conhecido; segredos vazios.
        const newCredential =
          provider === "ollama"
            ? (savedConfig.ollama?.committedEndpoint ?? "")
            : "";
        setApiKey(newCredential);

        const newMode = storageModeOf(savedConfig, provider);
        setStorageMode(newMode);

        // Auto-save apenas quando a troca foi feita pelo usuário (não no load).
        if (providerChangedByUser.current) {
          providerChangedByUser.current = false;
          persist({ provider, model: newModel, apiKey: newCredential, storageMode: newMode });
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
      storageMode: StorageMode;
    }>,
  ) {
    const cfg = { provider, model, apiKey, temperature, tokens, storageMode, ...overrides };

    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    // Só envia o segredo se o usuário digitou um novo (campo não vazio). Assim a
    // máscara nunca sobrescreve a credencial salva; o storageMode sempre vai
    // junto, permitindo migrar cloud <-> local sem reenviar o segredo.
    const secret = (cfg.apiKey ?? "").trim();
    const providerKey: Record<string, object> = {};
    if (cfg.provider === "gemini" || cfg.provider === "openai") {
      const obj: Record<string, unknown> = { storageMode: cfg.storageMode };
      if (secret) {
        obj.apiKey = secret;
        obj.committedApiKey = secret;
      }
      providerKey[cfg.provider] = obj;
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
      setApiKey(cfg.provider === "ollama" ? cfg.apiKey : "");
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

  function handleStorageModeChange(mode: StorageMode) {
    if (mode === storageMode) return;
    setStorageMode(mode);
    persist({ storageMode: mode });
  }

  const isOllama = provider === "ollama";
  const secretInfo = provider === "openai" ? savedConfig?.openai : savedConfig?.gemini;
  const hasSavedKey = !isOllama && !!secretInfo?.hasKey;
  const maskedKey = secretInfo?.maskedKey ?? "";
  const credentialLabel = isOllama ? "Ollama endpoint" : "API key";
  const credentialPlaceholder = isOllama
    ? "http://localhost:11434"
    : hasSavedKey
      ? `${maskedKey} — digite para trocar`
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
          <FieldLabel>LLM provider</FieldLabel>
          <div className="flex gap-2">
            {PROVIDER_OPTIONS.map((p) => {
              const active = p.value === provider;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleProviderChange(p.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "border-brand/50 bg-brand/10 text-brand"
                      : "border-stroke bg-surface-input text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
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
              {apiKey || hasSavedKey ? (
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

          {!isOllama ? (
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStorageModeChange("cloud")}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                    storageMode === "cloud"
                      ? "border-brand/50 bg-brand/10 text-brand"
                      : "border-stroke bg-surface-input text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Cloud className="size-3.5" strokeWidth={1.75} aria-hidden />
                  Nuvem (criptografado)
                </button>
                <button
                  type="button"
                  onClick={() => handleStorageModeChange("local")}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                    storageMode === "local"
                      ? "border-brand/50 bg-brand/10 text-brand"
                      : "border-stroke bg-surface-input text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <HardDrive className="size-3.5" strokeWidth={1.75} aria-hidden />
                  Local (apenas no servidor)
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">
                {storageMode === "cloud"
                  ? "A credencial é cifrada e guardada no banco."
                  : "A credencial fica só no host, fora do banco."}
              </p>
            </div>
          ) : null}
        </div>

        {modelOptions.length > 0 ? (
          <div>
            <FieldLabel>{`Model (${modelOptions.length} disponíveis)`}</FieldLabel>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-stroke bg-surface-input">
              {modelOptions.map((m) => {
                const active = m.value === model;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => handleModelChange(m.value)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-stroke/60 px-4 py-2.5 text-left text-sm transition last:border-b-0 ${
                      active ? "bg-brand/10 text-brand" : "text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="font-medium">{m.label}</span>
                    {active ? <Check className="size-4 shrink-0" strokeWidth={2} aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
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
            <FieldLabel>Max output tokens (0 = sem limite)</FieldLabel>
            <input
              type="number"
              min={0}
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
