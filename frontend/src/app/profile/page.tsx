"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  History,
  Loader2,
  Lock,
  Save,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  changePassword,
  getAccountGeneration,
  getAccountHistory,
  updateProfile,
} from "@/services/api";
import type { ApiGeneration } from "@/types/api";
import DataPrivacySection from "@/components/features/DataPrivacySection";
import GithubTokenForm from "@/components/features/GithubTokenForm";
import LLMConfigForm from "@/components/features/LLMConfigForm";
import { SlidersHorizontal } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-lg border border-stroke bg-surface-input px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-stroke bg-surface-card p-6 md:p-8">{children}</div>;
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="text-brand">{icon}</span>
      <h2 className="text-lg font-semibold text-zinc-100">{children}</h2>
    </div>
  );
}

// ─── Perfil (nome/email) ─────────────────────────────────────────────────────
function ProfileForm() {
  const { user, applyUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOk(false);
    setError(null);
    try {
      const res = await updateProfile({ name, email });
      applyUser(res.user);
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle icon={<UserIcon className="size-5" strokeWidth={1.75} />}>Perfil</SectionTitle>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-name" className={labelClass}>Nome</label>
          <input id="p-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="p-email" className={labelClass}>E-mail</label>
          <input id="p-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-brand/90 disabled:opacity-70">
            {busy ? <Loader2 className="size-4 animate-spin" strokeWidth={2} /> : <Save className="size-4" strokeWidth={1.75} />}
            Salvar
          </button>
          {ok ? <span className="text-sm text-brand">Salvo!</span> : null}
          {error ? <span className="text-sm text-rose-400">{error}</span> : null}
        </div>
      </form>
    </Card>
  );
}

// ─── Senha ───────────────────────────────────────────────────────────────────
function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOk(false);
    setError(null);
    try {
      await changePassword({ current_password: current, new_password: next });
      setOk(true);
      setCurrent("");
      setNext("");
      setTimeout(() => setOk(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao trocar a senha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle icon={<Lock className="size-5" strokeWidth={1.75} />}>Senha</SectionTitle>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-cur" className={labelClass}>Senha atual</label>
          <input id="p-cur" type="password" className={inputClass} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </div>
        <div>
          <label htmlFor="p-new" className={labelClass}>Nova senha</label>
          <input id="p-new" type="password" className={inputClass} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-brand/90 disabled:opacity-70">
            {busy ? <Loader2 className="size-4 animate-spin" strokeWidth={2} /> : <Save className="size-4" strokeWidth={1.75} />}
            Trocar senha
          </button>
          {ok ? <span className="text-sm text-brand">Senha alterada!</span> : null}
          {error ? <span className="text-sm text-rose-400">{error}</span> : null}
        </div>
      </form>
    </Card>
  );
}

// ─── Detalhe técnico de uma geração ──────────────────────────────────────────
function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-stroke/60 bg-black/30 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-xs text-zinc-200 break-words">
        {value === null || value === undefined || value === "" ? "—" : value}
      </div>
    </div>
  );
}

function CodeBlock({
  label,
  text,
  maxHeight = "max-h-80",
}: {
  label: string;
  text: string;
  maxHeight?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="rounded-lg border border-stroke bg-black/40">
      <div className="flex items-center justify-between border-b border-stroke px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
        >
          {copied ? (
            <Check className="size-3.5 text-brand" strokeWidth={2} />
          ) : (
            <Copy className="size-3.5" strokeWidth={1.75} />
          )}
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <pre
        className={`${maxHeight} overflow-auto px-3 py-2.5 font-mono text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words`}
      >
{text || "(vazio)"}
      </pre>
    </div>
  );
}

function GenerationDetail({ gen }: { gen: ApiGeneration }) {
  const when = new Date(gen.created_at).toLocaleString("pt-BR");
  const inputs = gen.inputs ?? {};
  const inputEntries = Object.entries(inputs);

  return (
    <div className="space-y-4">
      {/* Parâmetros da execução */}
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-brand">
          Parâmetros da execução
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Meta label="Operação" value={gen.operation} />
          <Meta label="Provider" value={gen.provider} />
          <Meta label="Modelo" value={gen.model} />
          <Meta
            label="Temperature"
            value={gen.temperature != null ? gen.temperature.toFixed(2) : null}
          />
          <Meta
            label="Max output tokens"
            value={gen.max_output_tokens ?? null}
          />
          <Meta label="Tokens entrada" value={gen.input_tokens ?? null} />
          <Meta label="Tokens saída" value={gen.output_tokens ?? null} />
          <Meta
            label="Duração"
            value={gen.duration_ms != null ? `${gen.duration_ms} ms` : null}
          />
          <Meta
            label="Status"
            value={
              <span
                className={
                  gen.status === "success" ? "text-brand" : "text-rose-300"
                }
              >
                {gen.status}
              </span>
            }
          />
          <Meta label="Data" value={when} />
          <Meta label="Prompt ID" value={gen.prompt_id ?? null} />
          <Meta label="Generation ID" value={gen.id} />
        </div>
      </div>

      {/* Erro, se houver */}
      {gen.error_message ? (
        <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
          <span className="font-semibold">Erro:</span> {gen.error_message}
        </div>
      ) : null}

      {/* Inputs enviados ao gerador */}
      {inputEntries.length > 0 ? (
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-brand">
            Inputs do gerador
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {inputEntries.map(([k, v]) => (
              <Meta
                key={k}
                label={k}
                value={
                  typeof v === "boolean"
                    ? v
                      ? "sim"
                      : "não"
                    : Array.isArray(v)
                      ? v.length
                        ? v.join(", ")
                        : "—"
                      : v === null || v === undefined
                        ? null
                        : String(v)
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Prompt enviado à LLM (o pedido pelo pesquisador) */}
      <CodeBlock
        label="Prompt enviado à LLM"
        text={gen.prompt_rendered ?? ""}
        maxHeight="max-h-96"
      />

      {/* README proposto */}
      <CodeBlock label="README proposto (saída da LLM)" text={gen.output ?? ""} />

      {/* README anterior, se houver */}
      {gen.previous_readme ? (
        <CodeBlock label="README anterior (antes da geração)" text={gen.previous_readme} />
      ) : null}

      {/* Avaliação de qualidade, se houver */}
      {gen.rating != null || gen.quality_note ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <Meta label="Rating" value={gen.rating != null ? `${gen.rating}/5` : null} />
          <div className="sm:col-span-3">
            <Meta label="Nota de qualidade" value={gen.quality_note ?? null} />
          </div>
        </div>
      ) : null}

      {/* Decisões humanas (aprovação / reprovação) */}
      {gen.decisions.length > 0 ? (
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-brand">
            Decisões
          </div>
          <div className="space-y-2">
            {gen.decisions.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-stroke/60 bg-black/30 px-3 py-2 font-mono text-[11px] text-zinc-300"
              >
                <span
                  className={`rounded px-1.5 py-0.5 font-semibold ${
                    d.decision === "approved"
                      ? "bg-brand/15 text-brand"
                      : "bg-rose-500/15 text-rose-300"
                  }`}
                >
                  {d.decision === "approved" ? "aprovado" : "reprovado"}
                </span>
                {d.apply_target ? <span>alvo: {d.apply_target}</span> : null}
                {d.commit_hash ? <span>commit: {d.commit_hash.slice(0, 10)}</span> : null}
                {d.commit_url ? (
                  <a
                    href={d.commit_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand underline"
                  >
                    link
                  </a>
                ) : null}
                {d.note ? <span className="text-zinc-400">“{d.note}”</span> : null}
                <span className="text-zinc-500">
                  {new Date(d.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Histórico de gerações ───────────────────────────────────────────────────
function HistoryRow({ gen }: { gen: ApiGeneration }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ApiGeneration | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !detail) {
      setLoading(true);
      try {
        setDetail(await getAccountGeneration(gen.id));
      } catch {
        /* silencioso */
      } finally {
        setLoading(false);
      }
    }
  }

  const when = new Date(gen.created_at).toLocaleString("pt-BR");
  const opLabel =
    gen.operation === "create_readme" ? "Criar README"
    : gen.operation === "update_readme" ? "Atualizar README"
    : gen.operation;

  return (
    <div className="border-b border-stroke last:border-0">
      <button type="button" onClick={toggle} className="flex w-full items-center gap-3 py-3 text-left hover:bg-white/[0.02]">
        {open ? <ChevronDown className="size-4 shrink-0 text-brand" /> : <ChevronRight className="size-4 shrink-0 text-zinc-500" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-zinc-100">
            <span className="font-medium">{opLabel}</span>
            {gen.project ? <span className="font-mono text-xs text-zinc-400">· {gen.project}</span> : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-zinc-500">
            <span>{when}</span>
            <span>{gen.provider}{gen.model ? `/${gen.model}` : ""}</span>
            {gen.duration_ms != null ? <span>{gen.duration_ms} ms</span> : null}
            {gen.input_tokens != null || gen.output_tokens != null ? (
              <span>{gen.input_tokens ?? "?"}→{gen.output_tokens ?? "?"} tok</span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {gen.decisions.map((d) => (
            <span key={d.id}
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                d.decision === "approved"
                  ? "bg-brand/15 text-brand"
                  : "bg-rose-500/15 text-rose-300"
              }`}>
              {d.decision === "approved" ? `aprovado${d.apply_target ? `·${d.apply_target}` : ""}` : "reprovado"}
            </span>
          ))}
        </div>
      </button>
      {open ? (
        <div className="pb-4 pl-7">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="size-3.5 animate-spin" /> carregando…</div>
          ) : detail ? (
            <GenerationDetail gen={detail} />
          ) : (
            <p className="text-xs text-zinc-500">Não foi possível carregar o detalhe.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function HistorySection() {
  const [items, setItems] = useState<ApiGeneration[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAccountHistory().then(setItems).catch((e) =>
      setError(e instanceof Error ? e.message : "Falha ao carregar histórico."),
    );
  }, []);

  return (
    <Card>
      <SectionTitle icon={<History className="size-5" strokeWidth={1.75} />}>Histórico de gerações</SectionTitle>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {items === null && !error ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" /> carregando…</div>
      ) : items && items.length === 0 ? (
        <p className="text-sm text-zinc-400">Nenhuma geração ainda. Gere um README em um projeto para ver o histórico aqui.</p>
      ) : items ? (
        <div>{items.map((g) => <HistoryRow key={g.id} gen={g} />)}</div>
      ) : null}
    </Card>
  );
}

type Tab = "user" | "history" | "github" | "llm";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "user", label: "Usuário", icon: <UserIcon className="size-4" strokeWidth={1.75} /> },
  { id: "history", label: "Histórico", icon: <History className="size-4" strokeWidth={1.75} /> },
  { id: "github", label: "GitHub", icon: <GithubIcon className="size-4" /> },
  { id: "llm", label: "LLM Configs", icon: <SlidersHorizontal className="size-4" strokeWidth={1.75} /> },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("user");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 md:px-10 md:py-10">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Configurações</h1>
      {user ? <p className="mt-1 text-sm text-zinc-400">{user.email}</p> : null}

      {/* Abas */}
      <div className="mt-6 flex gap-1 border-b border-stroke">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "border-brand text-brand"
                  : "border-transparent text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo */}
      <div className="mt-8 space-y-8">
        {tab === "user" ? (
          <>
            <ProfileForm />
            <PasswordForm />
            <DataPrivacySection />
          </>
        ) : null}

        {tab === "history" ? <HistorySection /> : null}

        {tab === "github" ? <GithubTokenForm /> : null}

        {tab === "llm" ? <LLMConfigForm /> : null}
      </div>
    </div>
  );
}
