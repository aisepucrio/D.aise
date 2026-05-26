"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Download, GitCommit, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ApiProject } from "@/types/api";
import {
  applyReadme,
  applyReadmeGithub,
  gitCommitReadme,
} from "@/services/api";
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

type Tab = "markdown" | "preview";
type ActionState = "idle" | "loading" | "success" | "error";

function ReadmePane({
  title,
  value,
  onChange,
  onCopy,
  onDownload,
  onApply,
  onCommit,
  isApplying,
  isCommitting,
  applySuccess,
  commitSuccess,
  copied,
  isLocal,
  isGithub,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  onCopy: () => void;
  onDownload: () => void;
  onApply?: () => void;
  onCommit?: () => void;
  isApplying?: boolean;
  isCommitting?: boolean;
  applySuccess?: boolean;
  commitSuccess?: boolean;
  copied?: boolean;
  isLocal: boolean;
  isGithub: boolean;
}) {
  const [tab, setTab] = useState<Tab>("preview");

  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-stroke bg-black/20">
      {/* Pane header + tabs */}
      <div className="shrink-0 border-b border-stroke px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              {title}
            </span>

            <div className="flex">
              {(["markdown", "preview"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`border-b-2 px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition ${
                    tab === t
                      ? "border-brand text-brand"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t === "markdown" ? "Markdown" : "Preview"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-black/30 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
            >
              {copied ? (
                <Check className="size-4 text-brand" strokeWidth={2} />
              ) : (
                <Copy className="size-4" strokeWidth={1.75} />
              )}

              {copied ? "Copied!" : "Copy"}
            </button>

            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-black/30 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
            >
              <Download className="size-4" strokeWidth={1.75} />
              Download
            </button>

            {isLocal ? (
              <button
                type="button"
                onClick={onApply}
                disabled={isApplying}
                className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-black/30 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/5 disabled:opacity-60"
              >
                {isApplying ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                ) : applySuccess ? (
                  <Check className="size-4 text-brand" strokeWidth={2} />
                ) : null}

                {applySuccess ? "Applied!" : "Apply"}
              </button>
            ) : null}

            {isGithub ? (
              <button
                type="button"
                onClick={onCommit}
                disabled={isCommitting}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand/90 disabled:opacity-60"
              >
                {isCommitting ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                ) : commitSuccess ? (
                  <Check className="size-4" strokeWidth={2} />
                ) : (
                  <GitCommit className="size-4" strokeWidth={1.75} />
                )}

                {commitSuccess ? "Committed!" : "Commit"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {tab === "markdown" ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-[560px] w-full resize-none rounded-lg border border-stroke bg-black/40 px-4 py-3 font-mono text-xs leading-relaxed text-zinc-200 focus:outline-none"
            aria-label={`${title} (markdown)`}
          />
        ) : (
          <div className="h-[560px] overflow-y-auto rounded-lg border border-stroke bg-black/40 px-5 py-4 prose prose-invert prose-sm max-w-none text-zinc-200 prose-headings:text-zinc-100 prose-headings:font-semibold prose-a:text-brand prose-code:text-brand prose-code:bg-white/5 prose-code:rounded prose-code:px-1 prose-pre:bg-black/60 prose-pre:border prose-pre:border-stroke">
            {/* <ReactMarkdown>{text}</ReactMarkdown> */}
            <ReactMarkdown>{value}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export type ReadmeDiffSectionProps = {
  oldReadmeText: string;
  newReadmeText: string;
  project: ApiProject;
};

export default function ReadmeDiffSection({
  oldReadmeText,
  newReadmeText,
  project,
}: ReadmeDiffSectionProps) {
  const [oldApplyState, setOldApplyState] = useState<ActionState>("idle");

  const [newApplyState, setNewApplyState] = useState<ActionState>("idle");

  const [oldCommitState, setOldCommitState] = useState<ActionState>("idle");

  const [newCommitState, setNewCommitState] = useState<ActionState>("idle");

  const [commitError, setCommitError] = useState<string | null>(null);

  const [oldCopied, setOldCopied] = useState(false);
  const [newCopied, setNewCopied] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  const [editableOldReadme, setEditableOldReadme] = useState(oldReadmeText);
  const [editableNewReadme, setEditableNewReadme] = useState(newReadmeText);

  const [activeCommitPane, setActiveCommitPane] = useState<
    "old" | "new" | null
  >(null);

  const [activeApplyPane, setActiveApplyPane] = useState<"old" | "new" | null>(
    null,
  );

  const applyModalOpen = activeApplyPane !== null;

  const commitModalOpen = activeCommitPane !== null;

  useEffect(() => {
    setEditableOldReadme(oldReadmeText);
    setEditableNewReadme(newReadmeText);
  }, [oldReadmeText, newReadmeText]);

  useEffect(() => {
    setOldApplyState("idle");
    setNewApplyState("idle");

    setOldCommitState("idle");
    setNewCommitState("idle");

    setActiveCommitPane(null);

    setCommitError(null);

    setOldCopied(false);
    setNewCopied(false);

    setActionError(null);
  }, [newReadmeText]);

  const sectionRef = useCallback((node: HTMLDivElement | null) => {
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function handleDownload(text: string, filename: string) {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  async function handleCopy(text: string, pane: "old" | "new") {
    await navigator.clipboard.writeText(text);

    if (pane === "old") {
      setOldCopied(true);

      setTimeout(() => {
        setOldCopied(false);
      }, 2000);

      return;
    }

    setNewCopied(true);

    setTimeout(() => {
      setNewCopied(false);
    }, 2000);
  }

  async function handleApply(readme: string, pane: "old" | "new") {
    if (pane === "old") {
      setOldApplyState("loading");
    } else {
      setNewApplyState("loading");
    }

    setActionError(null);

    try {
      await applyReadme({
        folder_project: project.folder_name,
        path: project.path,
        readme_text: readme,
      });

      if (pane === "old") {
        setOldApplyState("success");
      } else {
        setNewApplyState("success");
      }

      setCommitError(null);
      setActiveCommitPane(pane);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Erro ao aplicar README.",
      );

      if (pane === "old") {
        setOldApplyState("error");
      } else {
        setNewApplyState("error");
      }
    }
  }

  async function handleLocalCommit(
    pane: "old" | "new",
    title: string,
    message: string,
  ) {
    if (pane === "old") {
      setOldCommitState("loading");
    } else {
      setNewCommitState("loading");
    }

    setCommitError(null);

    try {
      await gitCommitReadme({
        path: project.path,
        commit_title: title,
        commit_message: message,
      });

      if (pane === "old") {
        setOldCommitState("success");
      } else {
        setNewCommitState("success");
      }

      setActiveCommitPane(null);
    } catch (e) {
      setCommitError(e instanceof Error ? e.message : "Erro ao criar commit.");

      if (pane === "old") {
        setOldCommitState("error");
      } else {
        setNewCommitState("error");
      }
    }
  }

  async function handleCommitGithub(
    readme: string,
    pane: "old" | "new",
    title: string,
    message: string,
  ) {
    if (pane === "old") {
      setOldCommitState("loading");
    } else {
      setNewCommitState("loading");
    }

    setCommitError(null);

    try {
      await applyReadmeGithub({
        folder_name: project.folder_name,
        readme_content: readme,
        commit_title: title,
        commit_message: message,
      });

      if (pane === "old") {
        setOldCommitState("success");
      } else {
        setNewCommitState("success");
      }

      setActiveCommitPane(null);
    } catch (e) {
      setCommitError(
        e instanceof Error ? e.message : "Erro ao aplicar no GitHub.",
      );

      if (pane === "old") {
        setOldCommitState("error");
      } else {
        setNewCommitState("error");
      }
    }
  }

  const isLocal = project.source === "local";
  const isGithub = project.source === "github";

  return (
    <div
      ref={sectionRef}
      className="flex flex-col rounded-xl border border-stroke bg-surface-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center border-b border-stroke px-6 py-4">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-brand">
          README Comparison
        </span>
      </div>

      {/* Split panes */}
      <div className="flex gap-4 p-6">
        {/* <ReadmePane title="Current README" text={oldReadmeText} /> */}
        <ReadmePane
          title="Current README"
          value={editableOldReadme}
          onChange={setEditableOldReadme}
          onCopy={() => handleCopy(editableOldReadme, "old")}
          onDownload={() =>
            handleDownload(editableOldReadme, "README-current.md")
          }
          // onApply={() => handleApply(editableOldReadme, "old")}
          onApply={() => {
            if (project.has_readme) {
              setActiveApplyPane("old");
              return;
            }

            handleApply(editableOldReadme, "old");
          }}
          onCommit={() => {
            console.log("open old");
            setCommitError(null);
            setActiveCommitPane("old");
          }}
          isApplying={oldApplyState === "loading"}
          isCommitting={oldCommitState === "loading"}
          applySuccess={oldApplyState === "success"}
          commitSuccess={oldCommitState === "success"}
          copied={oldCopied}
          isLocal={isLocal}
          isGithub={isGithub}
        />
        {/* <ReadmePane title="Updated README" text={newReadmeText} /> */}
        <ReadmePane
          title="Updated README"
          value={editableNewReadme}
          onChange={setEditableNewReadme}
          onCopy={() => handleCopy(editableNewReadme, "new")}
          onDownload={() =>
            handleDownload(editableNewReadme, "README-updated.md")
          }
          onApply={() => {
            if (project.has_readme) {
              setActiveApplyPane("new");
              return;
            }

            handleApply(editableNewReadme, "new");
          }}
          onCommit={() => {
            console.log("open new");
            setCommitError(null);
            setActiveCommitPane("new");
          }}
          isApplying={newApplyState === "loading"}
          isCommitting={newCommitState === "loading"}
          applySuccess={newApplyState === "success"}
          commitSuccess={newCommitState === "success"}
          copied={newCopied}
          isLocal={isLocal}
          isGithub={isGithub}
        />
      </div>

      {/* Error */}
      {actionError ? (
        <p className="shrink-0 px-6 pb-2 text-sm text-rose-400">
          {actionError}
        </p>
      ) : null}

      <CommitGithubModal
        open={commitModalOpen}
        onClose={() => setActiveCommitPane(null)}
        onConfirm={(title, message) => {
          if (!activeCommitPane) return;

          if (isLocal) {
            handleLocalCommit(activeCommitPane, title, message);
            return;
          }

          if (activeCommitPane === "old") {
            handleCommitGithub(editableOldReadme, "old", title, message);
            return;
          }

          handleCommitGithub(editableNewReadme, "new", title, message);
        }}
        isSubmitting={
          oldCommitState === "loading" || newCommitState === "loading"
        }
        submitError={commitError}
      />

      <OverwriteReadmeModal
        open={applyModalOpen}
        onClose={() => setActiveApplyPane(null)}
        onConfirm={async () => {
          if (activeApplyPane === "old") {
            await handleApply(editableOldReadme, "old");
          }

          if (activeApplyPane === "new") {
            await handleApply(editableNewReadme, "new");
          }

          setActiveApplyPane(null);
        }}
      />
    </div>
  );
}
