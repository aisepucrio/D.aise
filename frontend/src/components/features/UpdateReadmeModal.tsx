"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

type CommitRange = "last" | "date";

export type UpdateReadmeFormData = {
  commitOptions: string[];
  rangeType: string;
  startDate?: string;
  endDate?: string;
};

const dateInputClass =
  "update-readme-date w-full rounded-lg border border-stroke bg-black/50 px-3 py-2.5 text-sm text-zinc-100 accent-brand [color-scheme:dark] focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

type FormState = {
  commitsTitleDescription: boolean;
  commitsDiffs: boolean;
  commitRange: CommitRange;
  dateFrom: string;
  dateTo: string;
  resProjectName: boolean;
  resDescription: boolean;
  resLanguage: boolean;
  resFramework: boolean;
  resDependenceFile: boolean;
};

const initialFormState: FormState = {
  commitsTitleDescription: true,
  commitsDiffs: false,
  commitRange: "last",
  dateFrom: "",
  dateTo: "",
  resProjectName: false,
  resDescription: false,
  resLanguage: false,
  resFramework: false,
  resDependenceFile: true,
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
    <label
      htmlFor={id}
      className="group flex cursor-pointer items-start gap-3"
    >
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
          <Check
            className="size-2.5 text-zinc-950"
            strokeWidth={3.5}
            aria-hidden
          />
        ) : null}
      </span>
      <span
        className={`text-sm leading-snug transition ${
          checked
            ? "text-zinc-100"
            : "text-zinc-400 group-hover:text-white"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

function FormRadioRow({
  selected,
  onSelect,
  name,
  label,
  id,
}: {
  selected: boolean;
  onSelect: () => void;
  name: string;
  label: string;
  id: string;
}) {
  return (
    <label htmlFor={id} className="group flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="radio"
        className="sr-only"
        name={name}
        checked={selected}
        onChange={() => onSelect()}
      />
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
          selected
            ? "border-brand bg-brand"
            : "border-zinc-600 bg-black/50 group-hover:border-zinc-500"
        }`}
        aria-hidden
      >
        {selected ? <span className="h-1.5 w-1.5 rounded-full bg-zinc-950" /> : null}
      </span>
      <span
        className={`text-sm leading-snug transition ${
          selected
            ? "text-zinc-100"
            : "text-zinc-400 group-hover:text-white"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

export type UpdateReadmeModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateReadmeFormData) => void;
  isSubmitting?: boolean;
  submitError?: string | null;
};

export default function UpdateReadmeModal({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  submitError,
}: UpdateReadmeModalProps) {
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
    const commitOptions: string[] = [];
    if (state.commitsTitleDescription) commitOptions.push("title_description");
    if (state.commitsDiffs) commitOptions.push("diffs");

    const rangeType = state.commitRange === "last" ? "since_last_readme" : "date_range";

    onSubmit({
      commitOptions,
      rangeType,
      startDate: state.commitRange === "date" ? state.dateFrom : undefined,
      endDate: state.commitRange === "date" ? state.dateTo : undefined,
    });
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
        className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/5 bg-[#0f0f10] shadow-2xl ring-1 ring-white/5"
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
            Update README
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
          <form className="space-y-7" onSubmit={handleSubmit}>
            <section>
              <h3 className="text-sm font-semibold text-zinc-100">Commits</h3>
              <div className="mt-3 space-y-3">
                <FormCheckboxRow
                  id={`${idPrefix}-c-title-desc`}
                  label="Title + Description"
                  checked={state.commitsTitleDescription}
                  onChange={(v) =>
                    setState((s) => ({ ...s, commitsTitleDescription: v }))
                  }
                />
                <FormCheckboxRow
                  id={`${idPrefix}-c-diffs`}
                  label="Commit diffs"
                  checked={state.commitsDiffs}
                  onChange={(v) => setState((s) => ({ ...s, commitsDiffs: v }))}
                />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-zinc-100">Commit range</h3>
              <div className="mt-3 space-y-3">
                <FormRadioRow
                  id={`${idPrefix}-r-last`}
                  name={`${idPrefix}-commit-range`}
                  label="Since the last modification of the README"
                  selected={state.commitRange === "last"}
                  onSelect={() =>
                    setState((s) => ({ ...s, commitRange: "last" as CommitRange }))
                  }
                />
                <FormRadioRow
                  id={`${idPrefix}-r-date`}
                  name={`${idPrefix}-commit-range`}
                  label="Date range"
                  selected={state.commitRange === "date"}
                  onSelect={() =>
                    setState((s) => ({ ...s, commitRange: "date" as CommitRange }))
                  }
                />
              </div>
              {state.commitRange === "date" ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`${idPrefix}-date-from`}
                      className="mb-1.5 block text-xs font-medium text-zinc-500"
                    >
                      From
                    </label>
                    <input
                      id={`${idPrefix}-date-from`}
                      type="date"
                      value={state.dateFrom}
                      onChange={(e) =>
                        setState((s) => ({ ...s, dateFrom: e.target.value }))
                      }
                      className={dateInputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${idPrefix}-date-to`}
                      className="mb-1.5 block text-xs font-medium text-zinc-500"
                    >
                      To
                    </label>
                    <input
                      id={`${idPrefix}-date-to`}
                      type="date"
                      value={state.dateTo}
                      onChange={(e) =>
                        setState((s) => ({ ...s, dateTo: e.target.value }))
                      }
                      className={dateInputClass}
                    />
                  </div>
                </div>
              ) : null}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-zinc-100">Other resources</h3>
              <div className="mt-3 space-y-3">
                <FormCheckboxRow
                  id={`${idPrefix}-o-name`}
                  label="Project name"
                  checked={state.resProjectName}
                  onChange={(v) => setState((s) => ({ ...s, resProjectName: v }))}
                />
                <FormCheckboxRow
                  id={`${idPrefix}-o-desc`}
                  label="Description"
                  checked={state.resDescription}
                  onChange={(v) => setState((s) => ({ ...s, resDescription: v }))}
                />
                <FormCheckboxRow
                  id={`${idPrefix}-o-lang`}
                  label="Language"
                  checked={state.resLanguage}
                  onChange={(v) => setState((s) => ({ ...s, resLanguage: v }))}
                />
                <FormCheckboxRow
                  id={`${idPrefix}-o-fw`}
                  label="Framework"
                  checked={state.resFramework}
                  onChange={(v) => setState((s) => ({ ...s, resFramework: v }))}
                />
                <FormCheckboxRow
                  id={`${idPrefix}-o-dep`}
                  label="Dependence file"
                  checked={state.resDependenceFile}
                  onChange={(v) =>
                    setState((s) => ({ ...s, resDependenceFile: v }))
                  }
                />
              </div>
            </section>

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
                {isSubmitting ? "Generating…" : "Update README"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
