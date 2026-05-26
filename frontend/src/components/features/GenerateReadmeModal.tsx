"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

export type GenerateReadmeFormData = {
  includeName: boolean;
  includeDescription: boolean;
  includeLanguage: boolean;
  includeFramework: boolean;
  includeTree: boolean;
  includeCommitsTitleDesc: boolean;
  includeCommitsDiffs: boolean;
  includeDependenceFile: boolean;
};

type FormState = GenerateReadmeFormData;

const initialFormState: FormState = {
  includeName: false,
  includeDescription: false,
  includeLanguage: false,
  includeFramework: false,
  includeTree: true,
  includeCommitsTitleDesc: false,
  includeCommitsDiffs: false,
  includeDependenceFile: true,
};

function FormCheckboxRow({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  id: string;
}) {
  return (
    <label htmlFor={id} className="group flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
          checked
            ? "border-brand bg-brand"
            : "border-zinc-600 bg-black/50 group-hover:border-zinc-500"
        }`}
        aria-hidden
      >
        {checked ? (
          <Check className="size-2.5 text-zinc-950" strokeWidth={3.5} aria-hidden />
        ) : null}
      </span>
      <span
        className={`text-sm leading-snug transition ${
          checked ? "text-zinc-100" : "text-zinc-400 group-hover:text-white"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

export type GenerateReadmeModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: GenerateReadmeFormData) => void;
  isSubmitting?: boolean;
  submitError?: string | null;
};

export default function GenerateReadmeModal({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  submitError,
}: GenerateReadmeModalProps) {
  const idPrefix = useId();
  const titleId = `${idPrefix}-title`;
  const [state, setState] = useState<FormState>(initialFormState);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) setState(initialFormState);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleEscape);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = prev;
    };
  }, [open, handleEscape]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(state);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default bg-black/70 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(90dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/5 bg-[#0f0f10] shadow-2xl ring-1 ring-white/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-4">
          <h2
            id={titleId}
            className="text-base font-semibold tracking-tight text-zinc-100"
          >
            Generate README
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-5 text-sm text-zinc-400">
            Select the information you want to include in the README generation:
          </p>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <FormCheckboxRow
              id={`${idPrefix}-name`}
              label="Project name"
              checked={state.includeName}
              onChange={(v) => setState((s) => ({ ...s, includeName: v }))}
            />
            <FormCheckboxRow
              id={`${idPrefix}-desc`}
              label="Description"
              checked={state.includeDescription}
              onChange={(v) => setState((s) => ({ ...s, includeDescription: v }))}
            />
            <FormCheckboxRow
              id={`${idPrefix}-lang`}
              label="Language"
              checked={state.includeLanguage}
              onChange={(v) => setState((s) => ({ ...s, includeLanguage: v }))}
            />
            <FormCheckboxRow
              id={`${idPrefix}-fw`}
              label="Framework"
              checked={state.includeFramework}
              onChange={(v) => setState((s) => ({ ...s, includeFramework: v }))}
            />
            <FormCheckboxRow
              id={`${idPrefix}-tree`}
              label="Tree"
              checked={state.includeTree}
              onChange={(v) => setState((s) => ({ ...s, includeTree: v }))}
            />
            <FormCheckboxRow
              id={`${idPrefix}-commits-title`}
              label="Commits (title and description)"
              checked={state.includeCommitsTitleDesc}
              onChange={(v) => setState((s) => ({ ...s, includeCommitsTitleDesc: v }))}
            />
            <FormCheckboxRow
              id={`${idPrefix}-commits-diff`}
              label="Commits (Diff)"
              checked={state.includeCommitsDiffs}
              onChange={(v) => setState((s) => ({ ...s, includeCommitsDiffs: v }))}
            />
            <FormCheckboxRow
              id={`${idPrefix}-dep`}
              label="Dependence file"
              checked={state.includeDependenceFile}
              onChange={(v) => setState((s) => ({ ...s, includeDependenceFile: v }))}
            />

            <div className="border-t border-stroke pt-5 space-y-3">
              {submitError ? (
                <p className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-4 py-2.5 text-sm text-rose-400">
                  {submitError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 py-2.5 text-sm font-semibold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                ) : null}
                {isSubmitting ? "Generating…" : "Generate README"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
