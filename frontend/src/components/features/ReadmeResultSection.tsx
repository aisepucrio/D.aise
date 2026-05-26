"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Download, GitCommit, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ApiProject } from "@/types/api";
import { applyReadme, applyReadmeGithub, gitCommitReadme } from "@/services/api";
import CommitGithubModal from "./CommitGithubModal";

type OverwriteReadmeModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function OverwriteReadmeModal({
  open,
  onClose,
  onConfirm,
}: OverwriteReadmeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-xl border border-stroke bg-surface-card p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-zinc-100">
          Save README in project?
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          This will overwrite the current file in the local repository.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stroke bg-black/30 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand/90"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}


export type ReadmeResultSectionProps = {
  readmeText: string;
  project: ApiProject;
  onReadmeCreated?: () => void;
};

type ActionState = "idle" | "loading" | "success" | "error";
type Tab = "markdown" | "preview";

export default function ReadmeResultSection({
  readmeText,
  project,
  onReadmeCreated,
}: ReadmeResultSectionProps) {
  const [tab, setTab] = useState<Tab>("preview");
  const [applyState, setApplyState] = useState<ActionState>("idle");
  const [commitState, setCommitState] = useState<ActionState>("idle");
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editableReadme, setEditableReadme] = useState(readmeText);

  const [overwriteModalOpen, setOverwriteModalOpen] = useState(false);

  useEffect(() => {
    setEditableReadme(readmeText);
  }, [readmeText]);

  useEffect(() => {
    setTab("preview");
    setApplyState("idle");
    setCommitState("idle");
    setCommitModalOpen(false);
    setCommitError(null);
    setCopied(false);
    setActionError(null);
  }, [readmeText]);

  const sectionRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  function handleDownload() {
    const blob = new Blob([editableReadme], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    a.click();
    URL.revokeObjectURL(url);
  }


  async function handleLocalCommit(title: string, message: string) {
    setCommitState("loading");
    setCommitError(null);

    try {
      await gitCommitReadme({
        path: project.path,
        commit_title: title,
        commit_message: message,
      });

      setCommitState("success");
      setCommitModalOpen(false);
    } catch (e) {
      setCommitError(
        e instanceof Error ? e.message : "Erro ao criar commit.",
      );

      setCommitState("error");
    }
  }
  async function handleCopy() {
    // await navigator.clipboard.writeText(readmeText);
    await navigator.clipboard.writeText(editableReadme);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleApply() {
    setApplyState("loading");
    setActionError(null);

    try {
      await applyReadme({
        folder_project: project.folder_name,
        path: project.path,
        readme_text: editableReadme,
      });

      setApplyState("success");
      if (!project.has_readme) {
        onReadmeCreated?.();
      }
      setCommitError(null);
      setCommitModalOpen(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Erro ao aplicar README.");
      setApplyState("error");
    }
  }

  async function handleCommitGithub(title: string, message: string) {
    setCommitState("loading");
    setCommitError(null);
    try {
      await applyReadmeGithub({
        folder_name: project.folder_name,
        readme_content: readmeText,
        commit_title: title,
        commit_message: message,
      });
      setCommitState("success");
      setCommitModalOpen(false);
      if (!project.has_readme) {
        onReadmeCreated?.();
      }
    } catch (e) {
      setCommitError(e instanceof Error ? e.message : "Erro ao aplicar no GitHub.");
      setCommitState("error");
    }
  }

  const isLocal = project.source === "local";
  const isGithub = project.source === "github";

  return (
    <div
      ref={sectionRef}
      className="flex flex-col rounded-xl border border-stroke bg-surface-card overflow-hidden"
    >
      {/* Header + tabs */}
      {/* Header */}
      <div className="shrink-0 border-b border-stroke px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-brand">
              Generated README
            </span>

            {/* Tabs */}
            <div className="flex">
              {(["markdown", "preview"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`border-b-2 px-4 py-2 text-xs font-medium uppercase tracking-wide transition ${tab === t
                    ? "border-brand text-brand"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  {t === "markdown" ? "Markdown" : "Preview"}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {/* Copy */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-black/30 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
            >
              {copied ? (
                <Check className="size-4 text-brand" strokeWidth={2} />
              ) : (
                <Copy className="size-4" strokeWidth={1.75} />
              )}
              {copied ? "Copied!" : "Copy"}
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-black/30 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
            >
              <Download className="size-4" strokeWidth={1.75} />
              Download Markdown
            </button>

            {/* Apply local */}
            {isLocal ? (
              <button
                type="button"
                // onClick={handleApply}
                onClick={() => {
                  if (project.has_readme) {
                    setOverwriteModalOpen(true);
                    return;
                  }

                  handleApply();
                }}
                disabled={applyState === "loading"}
                className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-black/30 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/5 disabled:opacity-60"
              >
                {applyState === "loading" ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                ) : applyState === "success" ? (
                  <Check className="size-4 text-brand" strokeWidth={2} />
                ) : null}

                {applyState === "success" ? "Applied!" : "Apply to disk"}
              </button>
            ) : null}

            {/* Commit github */}
            {isGithub ? (
              <button
                type="button"
                onClick={() => {
                  setCommitError(null);
                  setCommitModalOpen(true);
                }}
                disabled={commitState === "loading"}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand/90 disabled:opacity-60"
              >
                {commitState === "loading" ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                ) : commitState === "success" ? (
                  <Check className="size-4" strokeWidth={2} />
                ) : (
                  <GitCommit className="size-4" strokeWidth={1.75} />
                )}

                {commitState === "success"
                  ? "Committed!"
                  : "Commit to GitHub"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        {tab === "markdown" ? (
          <textarea
            // readOnly
            value={editableReadme}
            onChange={(e) => setEditableReadme(e.target.value)}
            className="h-[600px] w-full resize-none rounded-lg border border-stroke bg-black/40 px-4 py-3 font-mono text-xs leading-relaxed text-zinc-200 focus:outline-none"
            aria-label="README gerado (markdown)"
          />
        ) : (
          <div className="h-[600px] overflow-y-auto rounded-lg border border-stroke bg-black/40 px-5 py-4 prose prose-invert prose-sm max-w-none text-zinc-200 prose-headings:text-zinc-100 prose-headings:font-semibold prose-a:text-brand prose-code:text-brand prose-code:bg-white/5 prose-code:rounded prose-code:px-1 prose-pre:bg-black/60 prose-pre:border prose-pre:border-stroke">
            <ReactMarkdown>{editableReadme}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Error */}
      {actionError ? (
        <p className="shrink-0 px-6 pb-2 text-sm text-rose-400">{actionError}</p>
      ) : null}


      <CommitGithubModal
        open={commitModalOpen}
        onClose={() => setCommitModalOpen(false)}
        // onConfirm={handleCommitGithub}
        onConfirm={isLocal ? handleLocalCommit : handleCommitGithub}
        isSubmitting={commitState === "loading"}
        submitError={commitError}
        defaultTitle="docs: create README"
      />

      <OverwriteReadmeModal
        open={overwriteModalOpen}
        onClose={() => setOverwriteModalOpen(false)}
        onConfirm={async () => {
          setOverwriteModalOpen(false);
          await handleApply();
        }}
      />
    </div>
  );
}
