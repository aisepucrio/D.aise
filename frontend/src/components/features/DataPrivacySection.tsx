"use client";

import { useState } from "react";
import { AlertTriangle, KeyRound, Loader2 } from "lucide-react";
import { clearCredentials } from "@/services/api";
import { useConfirm } from "@/context/ConfirmContext";

function DangerRow({
  icon,
  title,
  description,
  buttonLabel,
  confirm,
  onConfirm,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  confirm: {
    title: string;
    description: string;
    confirmLabel: string;
  };
  onConfirm: () => Promise<{ message: string; removed: number }>;
}) {
  const ask = useConfirm();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const ok = await ask({
      title: confirm.title,
      description: confirm.description,
      confirmLabel: confirm.confirmLabel,
      danger: true,
    });
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await onConfirm();
      setResult(`${res.message} (${res.removed})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao executar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-rose-400">{icon}</span>
        <div>
          <p className="text-sm font-medium text-zinc-100">{title}</p>
          <p className="mt-0.5 max-w-md text-xs text-zinc-400">{description}</p>
          {result ? <p className="mt-1 text-xs text-brand">{result}</p> : null}
          {error ? <p className="mt-1 text-xs text-rose-400">{error}</p> : null}
        </div>
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-70"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" strokeWidth={2} /> : null}
        {buttonLabel}
      </button>
    </div>
  );
}

export default function DataPrivacySection() {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-surface-card p-6 md:p-8">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="size-5 text-rose-400" strokeWidth={1.75} aria-hidden />
        <h2 className="text-lg font-semibold text-zinc-100">Zona de perigo — Limpar dados</h2>
      </div>
      <p className="mb-2 text-sm text-zinc-400">
        Ações irreversíveis sobre os seus dados. Não deixam rastro.
      </p>

      <div>
        <DangerRow
          icon={<KeyRound className="size-5" strokeWidth={1.75} />}
          title="Limpar credenciais (chaves e tokens)"
          description="Remove todas as chaves e tokens (Gemini, OpenAI, GitHub, Ollama) do banco e do host — cifradas ou locais. Sem rastro."
          buttonLabel="Limpar credenciais"
          confirm={{
            title: "Apagar todas as credenciais?",
            description:
              "Isto remove todas as suas chaves e tokens (Gemini, OpenAI, GitHub, Ollama), do banco e do host. A ação é irreversível.",
            confirmLabel: "Apagar credenciais",
          }}
          onConfirm={clearCredentials}
        />
      </div>
    </div>
  );
}
