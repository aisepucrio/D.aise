export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ApiAuthResponse = {
  token: string;
  user: ApiUser;
  expires_at: string;
};

export type ApiDecision = {
  id: string;
  decision: "approved" | "rejected";
  apply_target: string | null;
  commit_hash: string | null;
  commit_url: string | null;
  note: string | null;
  created_at: string;
};

export type ApiGeneration = {
  id: string;
  project?: string;
  operation: string;
  provider: string;
  model: string;
  temperature: number | null;
  max_output_tokens: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  duration_ms: number | null;
  status: string;
  error_message?: string | null;
  rating: number | null;
  quality_note?: string | null;
  prompt_id?: string | null;
  created_at: string;
  decisions: ApiDecision[];
  inputs?: Record<string, unknown>;
  // presentes só no detalhe:
  prompt_rendered?: string;
  output?: string;
  previous_readme?: string | null;
};

export type ApiProject = {
  id: string;
  name: string;
  folder_name: string;
  path: string;
  tree: string;
  description: string;
  language: string;
  framework: string;
  main_file: string;
  dependence_file_name: string;
  dependence_file_content: string;
  has_readme: boolean | undefined;
  source: "local" | "github";
  github_repo: string;
  readme: string;
  changelog: string;
  diff: string;
  commits: string;
};

export type ApiPrompt = {
  id: string;
  name: string;
  type: string;
  description: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ApiPromptsPayload = {
  status: number;
  data: {
    prompts: Record<string, ApiPrompt>;
    defaults: Record<string, string>;
  };
  error?: string;
};

// Credencial secreta: a API nunca devolve o segredo — apenas se existe (hasKey),
// uma máscara para exibição (maskedKey) e o modo de armazenamento (storageMode).
export type ApiSecretField = {
  apiKey?: string;
  committedApiKey?: string;
  token?: string;
  committedToken?: string;
  hasKey?: boolean;
  maskedKey?: string;
  storageMode?: "cloud" | "local";
};

export type ApiLlmConfig = {
  __lastSavedConfig: {
    provider: string;
    model: string;
    temperature: number;
    tokens: string;
  };
  gemini: ApiSecretField;
  openai: ApiSecretField;
  ollama: { endpoint: string; committedEndpoint: string };
  github: ApiSecretField;
};

export type ApiModelOption = { value: string; label: string };
export type ApiModels = Record<string, ApiModelOption[]>;

export type ApiGenerateReadmeResponse = {
  content: string;
  generation_id?: number;
  /** README atual do projeto (vazio se não houver), usado para o diff. */
  previous_readme?: string;
};

export type ApiUpdateReadmeResponse = {
  content: {
    old_readme: string;
    updated_readme: string;
  };
  path: string;
};
