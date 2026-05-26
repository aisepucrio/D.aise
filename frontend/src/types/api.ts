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

export type ApiLlmConfig = {
  __lastSavedConfig: {
    provider: string;
    model: string;
    temperature: number;
    tokens: string;
  };
  gemini: { apiKey: string; committedApiKey: string };
  openai: { apiKey: string; committedApiKey: string };
  ollama: { endpoint: string; committedEndpoint: string };
  github: { token: string; committedToken: string };
};

export type ApiModelOption = { value: string; label: string };
export type ApiModels = Record<string, ApiModelOption[]>;

export type ApiGenerateReadmeResponse = {
  content: string;
};

export type ApiUpdateReadmeResponse = {
  content: {
    old_readme: string;
    updated_readme: string;
  };
  path: string;
};
