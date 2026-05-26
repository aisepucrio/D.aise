"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { GitCommit, Loader2, X } from "lucide-react";

export type CommitGithubModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (title: string, message: string) => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  defaultTitle?: string;
};

const inputClass =
  "w-full rounded-lg border border-stroke bg-black/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

export default function CommitGithubModal({
  open,
  onClose,
  onConfirm,
  isSubmitting = false,
  submitError,
  defaultTitle = "docs: update README",
}: CommitGithubModalProps) {
  const idPrefix = useId();
  const titleId = `${idPrefix}-title`;
  const [commitTitle, setCommitTitle] = useState(defaultTitle);
  const [commitMessage, setCommitMessage] = useState("");

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
    onConfirm(commitTitle.trim(), commitMessage.trim());
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
        className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-white/5 bg-[#0f0f10] shadow-2xl ring-1 ring-white/5"
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
            Commit to GitHub
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

        <form className="px-6 py-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor={`${idPrefix}-commit-title`}
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Commit title <span className="text-rose-400">*</span>
            </label>
            <input
              id={`${idPrefix}-commit-title`}
              type="text"
              required
              value={commitTitle}
              onChange={(e) => setCommitTitle(e.target.value)}
              className={inputClass}
              placeholder="e.g. docs: update README"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor={`${idPrefix}-commit-message`}
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Commit message <span className="text-zinc-600">(optional)</span>
            </label>
            <textarea
              id={`${idPrefix}-commit-message`}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={3}
              className={`${inputClass} resize-y`}
              placeholder="Optional extended description…"
            />
          </div>

          {submitError ? (
            <p className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-4 py-2.5 text-sm text-rose-400">
              {submitError}
            </p>
          ) : null}

          <div className="flex gap-2 border-t border-stroke pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-stroke bg-black/30 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !commitTitle.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-black transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              ) : (
                <GitCommit className="size-4" strokeWidth={1.75} />
              )}
              {isSubmitting ? "Committing…" : "Confirm commit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
