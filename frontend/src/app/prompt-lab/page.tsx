"use client";

import { useMemo } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/Select";
import {
  PROMPT_TYPE_ORDER,
  usePromptLab,
} from "@/context/PromptLabContext";

const ALL_VARIABLES = [
  { id: 1, name: "name", description: "Nome do projeto." },
  { id: 2, name: "folder_name", description: "Nome da pasta do projeto." },
  { id: 3, name: "description", description: "Descrição do projeto." },
  { id: 4, name: "tree", description: "Árvore de arquivos do repositório." },
  { id: 5, name: "language", description: "Linguagem principal." },
  { id: 6, name: "framework", description: "Framework utilizado." },
  {
    id: 7,
    name: "dependence_file_name",
    description: "Nome do arquivo de dependências (ex: package.json).",
  },
  {
    id: 8,
    name: "dependence_file_content",
    description: "Conteúdo do arquivo de dependências (ex: package.json).",
  },
  { id: 9, name: "commits", description: "Histórico de commits recentes." },
  { id: 10, name: "diff", description: "Diff das alterações recentes." },
  { id: 11, name: "readme_content", description: "Conteúdo atual do README." },
] as const;

type VariableName = (typeof ALL_VARIABLES)[number]["name"];

const REQUIRED_VARIABLES_BY_TYPE: Record<string, VariableName[]> = {
  "Analyze Project": ["tree"],
  "Create README": [
    "name",
    "folder_name",
    "description",
    "language",
    "framework",
    "dependence_file_content",
    "tree",
    "commits",
  ],
  "Update README": [
    "readme_content",
    "name",
    "description",
    "language",
    "framework",
    "dependence_file_name",
    "dependence_file_content",
    "tree",
    "commits",
  ],
};

const PROMPT_TYPE_OPTIONS: SelectOption[] = PROMPT_TYPE_ORDER.map((t) => ({
  value: t,
  label: t,
}));

export default function PromptLabPage() {
  const {
    isLibraryOpen,
    promptName,
    setPromptName,
    shortDescription,
    setShortDescription,
    promptType,
    setPromptType,
    promptContent,
    setPromptContent,
    promptId,
    removePrompt,
    newPrompt,
    saveCurrentPrompt,
    isSaving,
    saveError,
  } = usePromptLab();

  // Required variables for the currently selected prompt type.
  const requiredVariables = useMemo(() => {
    const names = REQUIRED_VARIABLES_BY_TYPE[promptType] ?? [];
    return names
      .map((name) => ALL_VARIABLES.find((v) => v.name === name))
      .filter(Boolean) as (typeof ALL_VARIABLES)[number][];
  }, [promptType]);

  const detectedCount = useMemo(
    () =>
      requiredVariables.filter((v) =>
        promptContent.includes(`{{${v.name}}}`),
      ).length,
    [requiredVariables, promptContent],
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-8 md:px-10 md:py-10">
      {isLibraryOpen ? (
        <span className="sr-only">Prompt Library aberta</span>
      ) : null}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 md:text-4xl">
            Prompt Lab
          </h1>
          <p className="mt-2 max-w-2xl text-base text-zinc-400">
            Engineer high-performance prompts with real-time variable injection
            and version control.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={saveCurrentPrompt}
            disabled={isSaving}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              <Save className="size-4" strokeWidth={1.75} />
            )}
            {isSaving ? "Saving…" : "Save"}
          </button>
          {saveError ? (
            <p className="text-xs text-rose-400">{saveError}</p>
          ) : null}
        </div>
      </header>

      <div className="mb-6">
        {promptId ? (
          <div>
            <h2 className="text-xl font-semibold text-zinc-200">
              Edit prompt
            </h2>

            <p className="mt-1 font-mono text-xs text-zinc-500">
              ID: {promptId}
            </p>
          </div>
        ) : (
          <h2 className="text-xl font-semibold text-zinc-200">
            Create new prompt
          </h2>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <label
              htmlFor="prompt-name"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-brand"
            >
              Prompt name
            </label>
            <input
              id="prompt-name"
              type="text"
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              placeholder="e.g., Customer Support Optimizer v2"
              className="w-full rounded-lg border border-stroke bg-surface-input px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted shadow-sm transition-colors focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div>
            <label
              htmlFor="prompt-type"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-brand"
            >
              Prompt type
            </label>
            <Select
              id="prompt-type"
              value={promptType}
              onChange={setPromptType}
              options={PROMPT_TYPE_OPTIONS}
            />
          </div>

          <div>
            <label
              htmlFor="short-description"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-brand"
            >
              Short description
            </label>
            <textarea
              id="short-description"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Briefly describe the intent of this model interaction..."
              rows={3}
              className="w-full resize-y rounded-lg border border-stroke bg-surface-input px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div>
            <label
              htmlFor="prompt-content"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-brand"
            >
              Prompt content
            </label>
            <textarea
              id="prompt-content"
              value={promptContent}
              onChange={(e) => setPromptContent(e.target.value)}
              placeholder="Write your prompt here. Use {{variable_name}} for variables."
              className="min-h-[400px] w-full resize-y overflow-y-auto rounded-lg border border-stroke bg-black/40 px-4 py-3 font-mono text-sm leading-relaxed text-zinc-100 placeholder:text-muted focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
        </div>

        <aside className="lg:col-span-1">
          {/* <div className="sticky top-24 space-y-4"> */}
          <div className=" top-24 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-brand">
                Available variables
              </h2>
              <span className="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                {detectedCount} detected
              </span>
            </div>

            <ul className="space-y-3">
              {requiredVariables.map((v) => {
                const used = promptContent.includes(`{{${v.name}}}`);
                return (
                  <li key={v.id}>
                    <div
                      className={`rounded-lg border p-4 transition-colors ${used
                        ? "border-brand bg-brand/5 shadow-[0_0_0_1px_rgb(34_197_94_/_0.15)]"
                        : "border-stroke bg-black/30 shadow-sm"
                        }`}
                    >
                      <h3
                        className={`font-mono text-sm font-semibold ${used ? "text-brand" : "text-zinc-400"
                          }`}
                      >
                        {`{{${v.name}}}`}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                        {v.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
      {promptId ? (
        <div className="mt-10 flex justify-end">
          <button
            type="button"
            onClick={async () => {
              const confirmed = window.confirm(
                "Are you sure you want to delete this prompt?\n\nThis action cannot be undone.",
              );

              if (!confirmed) return;

              await removePrompt(promptId);
              newPrompt();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
