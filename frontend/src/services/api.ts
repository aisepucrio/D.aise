import type {
  ApiProject,
  ApiPrompt,
  ApiPromptsPayload,
  ApiLlmConfig,
  ApiModels,
  ApiGenerateReadmeResponse,
  ApiUpdateReadmeResponse,
} from "@/types/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8765";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string; message?: string })?.error ??
        (body as { message?: string })?.message ??
        `HTTP ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function getProjects(): Promise<ApiProject[]> {
  return req("/projects/");
}

export async function chooseLocalRepository(): Promise<{
  status: number;
  message: string;
  project?: ApiProject;
}> {
  // Not using req() because 409 (project already exists) still returns the project
  const res = await fetch(`${BASE}/projects/choose_local_repository`, {
    headers: { "Content-Type": "application/json" },
  });
  return res.json() as Promise<{ status: number; message: string; project?: ApiProject }>;
}

export function importGithub(
  url: string,
  githubToken?: string,
): Promise<{ status: number; message: string; project?: ApiProject }> {
  return req("/projects/import_github", {
    method: "POST",
    body: JSON.stringify({ url, github_token: githubToken ?? "" }),
  });
}

export function cloneRepository(
  url: string,
  githubToken?: string,
): Promise<{ status: number; message: string; project?: ApiProject }> {
  return req("/projects/clone_repository", {
    method: "POST",
    body: JSON.stringify({
      url,
      github_token: githubToken ?? "",
    }),
  });
}

export function saveProject(
  data: Partial<ApiProject> & { folder_name: string },
): Promise<{ message: string; saved_path: string; project: ApiProject }> {
  return req("/projects/save_project", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteProject(folderName: string): Promise<{ message: string }> {
  return req(`/projects/${folderName}`, { method: "DELETE" });
}

export function analyzeWithLlm(
  folderName: string,
  llmConfig: object,
): Promise<Record<string, unknown>> {
  return req(`/projects/${folderName}/analyze_with_llm`, {
    method: "POST",
    body: JSON.stringify({ llm_config: llmConfig }),
  });
}

export function generateReadme(data: {
  folder_name: string;
  name: string;
  description: string;
  language: string;
  framework: string;
  path: string;
  dependence_file_name: string;
  tree: boolean;
  llm_config: object;
  commit_options?: string[];
}): Promise<ApiGenerateReadmeResponse> {
  return req("/projects/generate_readme", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateReadme(data: {
  folder_name: string;
  name: string;
  description: string;
  path: string;
  language: string;
  framework: string;
  dependence_file_name: string;
  commit_options: string[];
  range_type: string;
  start_date?: string;
  end_date?: string;
  llm_config: object;
}): Promise<ApiUpdateReadmeResponse> {
  return req("/projects/update_readme", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function applyReadme(data: {
  folder_project: string;
  path: string;
  readme_text: string;
}): Promise<{ message: string; readme_path: string }> {
  return req("/projects/apply_readme", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function applyReadmeGithub(data: {
  folder_name: string;
  readme_content: string;
  commit_title?: string;
  commit_message?: string;
  llm_config?: object;
}): Promise<{ message: string; url: string }> {
  return req("/projects/apply_readme_github", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function gitCommitReadme(data: {
  path: string;
  commit_title: string;
  commit_message: string;
}): Promise<{ message: string; commit_hash: string }> {
  return req("/projects/git_commit_readme", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function undoCommit(data: {
  folder_name: string;
  path: string;
  commit_hash: string;
}): Promise<{ status: string; message: string; reverted_commit: string }> {
  return req("/projects/undo_commit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function openFolder(path: string): Promise<{ status: string; message: string }> {
  return req("/projects/open_folder", {
    method: "POST",
    body: JSON.stringify({ path }),
  });
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

export function getPrompts(): Promise<ApiPromptsPayload> {
  return req("/prompts/get_all");
}

export function createPrompt(data: {
  id?: string;
  name: string;
  type: string;
  description?: string;
  content: string;
  is_active?: boolean;
}): Promise<{ status: number; data?: ApiPrompt; error?: string }> {
  return req("/prompts/create_prompt", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function setDefaultPrompt(
  promptId: string,
  type: string,
): Promise<{
  success: boolean;
  data?: { type: string; prompt_id: string };
  error?: string;
}> {
  return req("/prompts/set_default", {
    method: "POST",
    body: JSON.stringify({ prompt_id: promptId, type }),
  });
}

export function deletePrompt(promptId: string): Promise<{ message: string }> {
  return req(`/prompts/delete/${promptId}`, { method: "DELETE" });
}

// ─── LLM Config ───────────────────────────────────────────────────────────────

export function getLlmConfig(): Promise<ApiLlmConfig> {
  return req("/models/api/llm-config");
}

export function saveLlmConfig(
  data: Partial<ApiLlmConfig>,
): Promise<{ message: string; config: ApiLlmConfig }> {
  return req("/models/api/llm-config", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getModels(): Promise<ApiModels> {
  return req("/models/api/models");
}

export function checkGithubReadme(
  folderName: string,
): Promise<{ has_readme: boolean }> {
  return req(`/projects/${folderName}/check_github_readme`, { method: "POST" });
}

export function refreshTree(
  folderName: string,
): Promise<{ changed: boolean; tree: string; has_readme?: boolean }> {
  return req(`/projects/${folderName}/refresh_tree`, { method: "POST" });
}
