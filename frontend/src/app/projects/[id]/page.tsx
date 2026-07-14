"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  File,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import UpdateReadmeModal, {
  type UpdateReadmeFormData,
} from "@/components/features/UpdateReadmeModal";
import GenerateReadmeModal, {
  type GenerateReadmeFormData,
} from "@/components/features/GenerateReadmeModal";
import ReadmeResultSection from "@/components/features/ReadmeResultSection";
import ReadmeDiffSection from "@/components/features/ReadmeDiffSection";
import type { FolderNode, TreeNode } from "../tree-types";
import type { ApiProject } from "@/types/api";
import {
  analyzeWithLlm,
  generateReadme,
  getLlmConfig,
  getProjects,
  openFolder,
  refreshTree,
  saveProject,
  updateReadme,
} from "@/services/api";
import { parseAsciiTree } from "@/utils/tree-parser";

/* ——— Árvore de ficheiros ——— */

function FolderRow({
  node,
  depth,
}: {
  node: FolderNode;
  depth: number;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-1.5 rounded py-0.5 text-left font-mono text-xs text-zinc-300 transition hover:bg-white/5"
      >
        {isOpen ? (
          <ChevronDown
            className="size-3.5 shrink-0 text-brand"
            strokeWidth={2}
            aria-hidden
          />
        ) : (
          <ChevronRight
            className="size-3.5 shrink-0 text-brand"
            strokeWidth={2}
            aria-hidden
          />
        )}

        <Folder
          className="size-3.5 shrink-0 text-brand/90"
          strokeWidth={1.75}
          aria-hidden
        />

        <span className="text-brand">{node.name}</span>
      </button>

      {isOpen && node.children.length > 0 ? (
        <div style={{ paddingLeft: 12 }}>
          <FileTreeRows nodes={node.children} depth={depth + 1} />
        </div>
      ) : null}
    </div>
  );
}

function FileTreeRows({
  nodes,
  depth = 0,
}: {
  nodes: TreeNode[];
  depth?: number;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node, i) => (
        <li key={`${node.kind}-${node.name}-${i}`}>
          {node.kind === "folder" ? (
            <FolderRow node={node} depth={depth} />
          ) : (
            <div
              className={`flex items-center gap-1.5 rounded py-0.5 pl-1 font-mono text-xs transition ${
                node.active
                  ? "bg-white/5 text-zinc-100 ring-1 ring-white/5"
                  : "text-zinc-400 hover:bg-white/5"
              }`}
            >
              {depth > 0 ? (
                <ChevronRight
                  className="size-3 shrink-0 text-zinc-600"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : (
                <span className="w-3 shrink-0" aria-hidden />
              )}

              <File
                className="size-3.5 shrink-0 text-zinc-500"
                strokeWidth={1.75}
                aria-hidden
              />

              <span
                className={node.active ? "text-zinc-100" : "text-zinc-400"}
              >
                {node.name}
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

type TreeRefreshState = "idle" | "loading" | "unchanged" | "updated" | "error";

function FileStructurePanel({
  root,
  onRefresh,
  refreshState,
}: {
  root: FolderNode | null;
  onRefresh: () => void;
  refreshState: TreeRefreshState;
}) {
  const refreshMsg: Record<TreeRefreshState, { text: string; color: string } | null> = {
    idle: null,
    loading: null,
    unchanged: { text: "No changes detected.", color: "text-zinc-500" },
    updated: { text: "Tree updated successfully.", color: "text-brand" },
    error: { text: "Failed to refresh tree.", color: "text-rose-400" },
  };
  const msg = refreshMsg[refreshState];

  return (
    <div className="flex max-h-[min(700px,calc(100vh-8rem))] min-h-0 flex-col overflow-hidden rounded-xl border border-stroke bg-surface-card">
      <div className="flex shrink-0 items-center justify-between border-b border-stroke px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-brand">
          File structure
        </span>
        {/* {isGithub ? ( */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshState === "loading"}
            // title="Refresh tree from GitHub"
            title="Refresh tree"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50"
          >
            {refreshState === "loading" ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <GitBranch className="size-3.5" strokeWidth={1.75} />
            )}
            {refreshState === "loading" ? "Refreshing…" : "Refresh tree"}
          </button>
        {/* ) : null} */}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto p-4">
        {root ? (
          <FileTreeRows nodes={[root]} />
        ) : (
          <p className="text-sm text-zinc-500">
            Select a project from the sidebar to load its file tree.
          </p>
        )}
      </div>
      {msg ? (
        <div className="shrink-0 border-t border-stroke px-4 py-2">
          <p className={`text-xs ${msg.color}`}>{msg.text}</p>
        </div>
      ) : null}
    </div>
  );
}

/* ——— Página ——— */

type Dependency = { name: string };

const inputClass =
  "w-full rounded-lg border border-stroke bg-surface-input px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";
const labelClass =
  "mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-500";

function ProjectsDashboardContent({ projectId }: { projectId: string }) {
  // projectId = folder_name, vindo do segmento dinâmico /projects/[id]

  const isLocalMode = process.env.NEXT_PUBLIC_APP_MODE === "local";

  // Full project from backend
  const [project, setProject] = useState<ApiProject | null>(null);

  // Form state
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [mainFile, setMainFile] = useState("");
  const [rootPath, setRootPath] = useState("");
  const [language, setLanguage] = useState("");
  const [framework, setFramework] = useState("");
  const [hasReadme, setHasReadme] = useState(false);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [newDepName, setNewDepName] = useState("");
  const [fileTreeRoot, setFileTreeRoot] = useState<FolderNode | null>(null);

  // UI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [treeRefreshState, setTreeRefreshState] = useState<TreeRefreshState>("idle");

  // Modals / inline result
  const [isUpdateReadmeModalOpen, setIsUpdateReadmeModalOpen] = useState(false);
  const [isGenerateReadmeModalOpen, setIsGenerateReadmeModalOpen] = useState(false);
  const [readmeText, setReadmeText] = useState("");
  const [oldReadmeText, setOldReadmeText] = useState("");
  const [pathCopied, setPathCopied] = useState(false);

  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load project when URL param changes
  useEffect(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
    setIsAnalyzing(false);
    setError(null);
    setReadmeText("");
    setOldReadmeText("");
    setTreeRefreshState("idle");

    if (!projectId) {
      setProject(null);
      setProjectName("");
      setDescription("");
      setMainFile("");
      setRootPath("");
      setLanguage("");
      setFramework("");
      setHasReadme(false);
      setDependencies([]);
      setFileTreeRoot(null);
      return;
    }

    setIsLoading(true);
    getProjects()
      .then((projects) => {
        const found = projects.find((p) => p.folder_name === projectId);
        if (!found) {
          setError("Projeto não encontrado.");
          setProject(null);
          return;
        }
        populateForm(found);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Erro ao carregar projeto.");
      })
      .finally(() => setIsLoading(false));
  }, [projectId]);

  function populateForm(p: ApiProject) {
    setProject(p);
    setProjectName(p.name ?? "");
    setDescription(p.description ?? "");
    setMainFile(p.main_file ?? "");
    setRootPath(p.path ?? "");
    setLanguage(p.language ?? "");
    setFramework(p.framework ?? "");
    setHasReadme(!!p.has_readme);
    const depFiles = p.dependence_file_name
      ? p.dependence_file_name.split(",").map((s) => s.trim()).filter(Boolean).map((name) => ({ name }))
      : [];
    setDependencies(depFiles);
    setNewDepName("");
    if (p.tree) {
      setFileTreeRoot(parseAsciiTree(p.tree, p.name || p.folder_name));
    } else {
      setFileTreeRoot(null);
    }
  }

  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    };
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!project || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const llmConfig = await getLlmConfig();
      const result = await analyzeWithLlm(project.folder_name, llmConfig);

      // Map LLM response fields to form (handles both snake_case and camelCase)
      const r = result as Record<string, unknown>;
      if (r.name ?? r.projectName)
        setProjectName(String(r.name ?? r.projectName ?? ""));
      if (r.description) setDescription(String(r.description));
      if (r.main_file ?? r.mainFile)
        setMainFile(String(r.main_file ?? r.mainFile ?? ""));
      if (r.language) setLanguage(String(r.language));
      if (r.framework) setFramework(String(r.framework));
      if (typeof (r.has_readme ?? r.hasReadme) === "boolean")
        setHasReadme(!!(r.has_readme ?? r.hasReadme));
      const depFiles = Array.isArray(r.dependency_files)
        ? (r.dependency_files as string[]).map((d) => ({ name: String(d) }))
        : [];
      setDependencies(depFiles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao analisar projeto.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [project, isAnalyzing]);

  function handleCreateReadme() {
    if (!project) return;
    if (hasReadme) {
      if (!window.confirm("A README already exists. Do you want to overwrite or create another?")) return;
    }
    setIsGenerateReadmeModalOpen(true);
  }

  async function handleGenerateReadmeSubmit(formData: GenerateReadmeFormData) {
    if (!project) return;
    setIsGenerating(true);
    setError(null);
    try {
      const llmConfig = await getLlmConfig();
      const commitOptions: string[] = [
        ...(formData.includeCommitsTitleDesc ? ["title_description"] : []),
        ...(formData.includeCommitsDiffs ? ["diffs"] : []),
      ];
      const res = await generateReadme({
        folder_name: project.folder_name,
        name: formData.includeName ? projectName : "",
        description: formData.includeDescription ? description : "",
        language: formData.includeLanguage ? language : "",
        framework: formData.includeFramework ? framework : "",
        path: rootPath,
        dependence_file_name: formData.includeDependenceFile
          ? dependencies.map((d) => d.name).join(", ")
          : "",
        tree: formData.includeTree,
        commit_options: commitOptions.length > 0 ? commitOptions : undefined,
        llm_config: llmConfig,
      });
      setOldReadmeText("");
      setReadmeText(res.content ?? "");
      setIsGenerateReadmeModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar README.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleUpdateReadmeSubmit(formData: UpdateReadmeFormData) {
    if (!project) return;
    setIsUpdating(true);
    setError(null);
    try {
      const llmConfig = await getLlmConfig();
      const res = await updateReadme({
        folder_name: project.folder_name,
        name: projectName,
        description,
        path: rootPath,
        language,
        framework,
        dependence_file_name: dependencies.map((d) => d.name).join(", "),
        commit_options: formData.commitOptions,
        range_type: formData.rangeType,
        start_date: formData.startDate,
        end_date: formData.endDate,
        llm_config: llmConfig,
      });
      const oldReadme =
        typeof res.content === "object" ? (res.content.old_readme ?? "") : "";
      const updated =
        typeof res.content === "object"
          ? res.content.updated_readme
          : String(res.content ?? "");
      setOldReadmeText(oldReadme);
      setReadmeText(updated);
      setIsUpdateReadmeModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar README.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleCopyPath() {
    await navigator.clipboard.writeText(rootPath);
    setPathCopied(true);
    setTimeout(() => setPathCopied(false), 2000);
  }

  async function handleOpenFolder() {
    if (!rootPath) return;
    try {
      await openFolder(rootPath);
    } catch {
      // silently ignore — OS will show its own error if path is invalid
    }
  }

  async function handleRefreshTree() {
    if (!project) return;
    setTreeRefreshState("loading");
    try {
      const res = await refreshTree(project.folder_name);
      if (res.has_readme !== undefined) {
        setHasReadme(res.has_readme);
        setProject((prev) => prev ? { ...prev, has_readme: res.has_readme } : prev);
      }
      if (res.changed) {
        setFileTreeRoot(parseAsciiTree(res.tree, project.name || project.folder_name));
        setProject((prev) => prev ? { ...prev, tree: res.tree } : prev);
        setTreeRefreshState("updated");
      } else {
        setTreeRefreshState("unchanged");
      }
    } catch {
      setTreeRefreshState("error");
    }
    setTimeout(() => setTreeRefreshState("idle"), 4000);
  }

  async function handleSaveProject() {
    if (!project) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await saveProject({
        folder_name: project.folder_name,
        id: project.id,
        name: projectName,
        description,
        main_file: mainFile,
        path: rootPath,
        language,
        framework,
        has_readme: hasReadme,
        dependence_file_name: dependencies.map((d) => d.name).join(", "),
        source: project.source,
        github_repo: project.github_repo,
        tree: project.tree,
      });
      setProject(res.project);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar projeto.");
    } finally {
      setIsSaving(false);
    }
  }

  const addDependency = useCallback(() => {
    const name = newDepName.trim();
    if (!name) return;
    setDependencies((prev) => [
      ...prev.filter((d) => d.name !== name),
      { name },
    ]);
    setNewDepName("");
  }, [newDepName]);

  const removeDependency = useCallback((name: string) => {
    setDependencies((prev) => prev.filter((d) => d.name !== name));
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background-app p-6 md:px-8 md:py-4">
      {error ? (
        <div className="mb-4 rounded-lg border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" strokeWidth={2} />
          Carregando projeto…
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Coluna esquerda: árvore — max-h no card; scroll interno */}
          <div className="col-span-1 flex flex-col lg:col-span-4">
            <FileStructurePanel
              root={fileTreeRoot}
              // isGithub={project?.source === "github"}
              onRefresh={handleRefreshTree}
              refreshState={treeRefreshState}
            />
          </div>

          {/* Coluna direita — altura = só conteúdo (nada de flex-1) */}
          <div className="col-span-1 flex flex-col gap-3 lg:col-span-8">
            {/* begin */}
             {/* Action cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col rounded-xl border border-stroke bg-surface-card p-4">
                <div className="mb-3 flex h-6 w-6 items-center justify-center rounded-lg bg-black/40 text-blue-400 ring-1 ring-white/5">
                  <FileText className="size-5" strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Generate documentation
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                  Automated README generation.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleCreateReadme}
                    disabled={isGenerating || !project}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-stroke bg-black/30 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isGenerating ? (
                      <Loader2
                        className="size-4 animate-spin shrink-0"
                        strokeWidth={2}
                      />
                    ) : (
                      <FilePlus
                        className="size-4 shrink-0 text-zinc-400"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    )}
                    {isGenerating ? "Generating…" : "Create README"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUpdateReadmeModalOpen(true)}
                    disabled={isUpdating || !project || !hasReadme}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-stroke bg-black/30 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <RefreshCw
                      className="size-4 shrink-0 text-zinc-400"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    Update README
                  </button>
                  {project ? (
                    <p className={`text-xs ${hasReadme ? "text-brand" : "text-zinc-500"}`}>
                      {hasReadme
                        ? "This project already has a README."
                        : "No README found in this project."}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col rounded-xl border border-stroke bg-surface-card p-4">
                <div className="mb-3 flex h-6 w-6 items-center justify-center rounded-lg bg-black/40 text-brand ring-1 ring-white/5">
                  <Sparkles className="size-5" strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Analyze with LLM
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                  Your synthetic engine that will parse your entire project
                  structure to suggest project metadata and core dependencies.
                </p>
                <div className="mt-auto pt-4">
                  <button
                    type="button"
                    onClick={runAnalysis}
                    disabled={isAnalyzing || !project}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 py-2.5 text-sm font-semibold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                    ) : (
                      <Zap className="size-4" strokeWidth={1.75} aria-hidden />
                    )}
                    {isAnalyzing ? "Analyzing…" : "Start analysis"}
                  </button>
                </div>
              </div>
            </div>
            {/* end */}
            {/* Metadados + dependências */}
            <div className="flex flex-col rounded-xl border border-stroke bg-surface-card p-6">
              <h2 className="mb-6 text-sm font-semibold text-zinc-100">
                Project Metadata
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-1">
                  <label htmlFor="project-name" className={labelClass}>
                    Project name
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-1">
                  <label htmlFor="main-file" className={labelClass}>
                    Main file
                  </label>
                  <div className="relative">
                    <Link2
                      className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <input
                      id="main-file"
                      type="text"
                      value={mainFile}
                      onChange={(e) => setMainFile(e.target.value)}
                      className={`${inputClass} pl-9 font-mono text-xs`}
                      placeholder="/src/…"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="description" className={labelClass}>
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-y`}
                  />
                </div>
                {isLocalMode && project?.source !== "github" ? (
                  <div className="md:col-span-2">
                    <label htmlFor="root-path" className={labelClass}>
                      Root path
                    </label>
                    <div className="relative">
                      <input
                        id="root-path"
                        type="text"
                        value={rootPath}
                        readOnly
                        disabled
                        className={`${inputClass} cursor-not-allowed pr-16 font-mono text-xs text-zinc-500 opacity-90`}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-1.5">
                        <button
                          type="button"
                          onClick={handleCopyPath}
                          title="Copy path"
                          className="flex size-7 items-center justify-center rounded text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
                        >
                          {pathCopied ? (
                            <Check className="size-3.5 text-brand" strokeWidth={2} />
                          ) : (
                            <Copy className="size-3.5" strokeWidth={1.75} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenFolder}
                          title="Open in explorer"
                          className="flex size-7 items-center justify-center rounded text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
                        >
                          <FolderOpen className="size-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div>
                  <label htmlFor="framework" className={labelClass}>
                    Framework
                  </label>
                  <input
                    id="framework"
                    type="text"
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. React 18.2"
                  />
                </div>
                <div>
                  <label htmlFor="language" className={labelClass}>
                    Language
                  </label>
                  <input
                    id="language"
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. TypeScript 5.0"
                  />
                </div>
                <div className="md:col-span-2">
                  <span className={labelClass}>Has README</span>
                  <div className="flex gap-3 pt-0.5">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="radio"
                        name="has-readme"
                        checked={hasReadme === true}
                        onChange={() => setHasReadme(true)}
                        className="border-zinc-600 bg-black/50 text-brand focus:ring-brand"
                      />
                      Yes
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="radio"
                        name="has-readme"
                        checked={hasReadme === false}
                        onChange={() => setHasReadme(false)}
                        className="border-zinc-600 bg-black/50 text-brand focus:ring-brand"
                      />
                      No
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-stroke pt-6">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Core dependencies
                </h3>
                <div className="mb-3 flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="dep-name" className={labelClass}>
                      name
                    </label>
                    <input
                      id="dep-name"
                      value={newDepName}
                      onChange={(e) => setNewDepName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addDependency()}
                      className={inputClass}
                      placeholder="e.g. package.json"
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addDependency}
                    className="shrink-0 rounded-lg border border-stroke bg-black/30 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
                  >
                    Add
                  </button>
                </div>
                {dependencies.length > 0 ? (
                  <ul className="space-y-2">
                    {dependencies.map((dep) => (
                      <li
                        key={dep.name}
                        className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-black/30 px-3 py-2.5"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <Box
                            className="size-4 shrink-0 text-brand"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                          <span className="truncate font-mono text-sm text-zinc-200">
                            {dep.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDependency(dep.name)}
                          className="shrink-0 rounded-md p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-rose-400"
                          aria-label={`Remove ${dep.name}`}
                        >
                          <Trash2
                            className="size-4"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500">No dependencies yet.</p>
                )}
              </div>

              <div className="mt-6 flex justify-end border-t border-stroke pt-6">
                <button
                  type="button"
                  onClick={handleSaveProject}
                  disabled={isSaving || !project}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                  ) : null}
                  {isSaving ? "Saving…" : "Save project"}
                </button>
              </div>
            </div>

           

          </div>
        </div>

        {/* Inline README result — full width below the grid */}
        {readmeText && project ? (
          <div className="mt-6">
            {oldReadmeText ? (
              <ReadmeDiffSection
                oldReadmeText={oldReadmeText}
                newReadmeText={readmeText}
                project={project}
              />
            ) : (
              <ReadmeResultSection readmeText={readmeText} project={project} onReadmeCreated={handleRefreshTree} />
            )}
          </div>
        ) : null}
        </>
      )}

      <GenerateReadmeModal
        open={isGenerateReadmeModalOpen}
        onClose={() => { setIsGenerateReadmeModalOpen(false); setError(null); }}
        onSubmit={handleGenerateReadmeSubmit}
        isSubmitting={isGenerating}
        submitError={isGenerateReadmeModalOpen ? error : null}
      />

      <UpdateReadmeModal
        open={isUpdateReadmeModalOpen}
        onClose={() => { setIsUpdateReadmeModalOpen(false); setError(null); }}
        onSubmit={handleUpdateReadmeSubmit}
        isSubmitting={isUpdating}
        submitError={isUpdateReadmeModalOpen ? error : null}
      />

    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  // key={id} força remount ao trocar de projeto — evita vazamento de estado de UI
  return <ProjectsDashboardContent key={id} projectId={id} />;
}
