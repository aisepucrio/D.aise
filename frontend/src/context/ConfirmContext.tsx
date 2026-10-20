"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type Pending = {
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
};

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ opts, resolve })),
    [],
  );

  const close = useCallback(
    (result: boolean) => {
      setPending((p) => {
        p?.resolve(result);
        return null;
      });
    },
    [],
  );

  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending, close]);

  const opts = pending?.opts;
  const danger = opts?.danger;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4"
          onClick={() => close(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-stroke bg-surface-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              {danger ? (
                <span className="mt-0.5 text-rose-400">
                  <AlertTriangle className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
              ) : null}
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-zinc-100">{opts?.title}</h2>
                {opts?.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{opts.description}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
              >
                {opts?.cancelLabel ?? "Cancelar"}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  danger
                    ? "bg-rose-600 text-white hover:bg-rose-500"
                    : "bg-brand text-black hover:bg-brand/90"
                }`}
              >
                {opts?.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
