"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createPrompt,
  deletePrompt,
  getPrompts,
  setDefaultPrompt,
} from "@/services/api";
import type { ApiPrompt } from "@/types/api";

export type PromptLabType =
  | "Analyze Project"
  | "Create README"
  | "Update README";

export type SavedPrompt = {
  id: string;
  name: string;
  description: string;
  type: PromptLabType;
  content: string;
  lastUpdated: string;
  isFavorite: boolean;
};

export const PROMPT_TYPE_ORDER: PromptLabType[] = [
  "Analyze Project",
  "Create README",
  "Update README",
];

// Backend type strings → frontend display labels
const BACKEND_TO_FRONTEND_TYPE: Record<string, PromptLabType> = {
  analyze_project: "Analyze Project",
  create_readme: "Create README",
  update_readme: "Update README",
};

const FRONTEND_TO_BACKEND_TYPE: Record<string, string> = {
  "Analyze Project": "analyze_project",
  "Create README": "create_readme",
  "Update README": "update_readme",
};

function toSavedPrompt(p: ApiPrompt): SavedPrompt {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    type: BACKEND_TO_FRONTEND_TYPE[p.type] ?? "Analyze Project",
    content: p.content,
    lastUpdated: p.updated_at ?? p.created_at ?? "",
    isFavorite: false, // not stored in backend; local-only field
  };
}

type PromptLabContextValue = {
  isLibraryOpen: boolean;
  toggleLibrary: () => void;
  closeLibrary: () => void;
  savedPrompts: SavedPrompt[];
  promptName: string;
  setPromptName: (v: string) => void;
  shortDescription: string;
  setShortDescription: (v: string) => void;
  promptType: string;
  setPromptType: (v: string) => void;
  promptContent: string;
  setPromptContent: (v: string) => void;
  promptId: string | null;
  loadSavedPrompt: (prompt: SavedPrompt) => void;
  newPrompt: () => void;
  saveCurrentPrompt: () => Promise<void>;
  removePrompt: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  duplicatePrompt: (id: string) => Promise<void>;
  isSaving: boolean;
  saveError: string | null;
};

const PromptLabContext = createContext<PromptLabContextValue | null>(null);

export function usePromptLab() {
  const ctx = useContext(PromptLabContext);
  if (!ctx) {
    throw new Error("usePromptLab must be used within PromptLabProvider");
  }
  return ctx;
}

const DEFAULT_TYPE: PromptLabType = "Analyze Project";

export function PromptLabProvider({ children }: { children: ReactNode }) {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [promptName, setPromptName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [promptType, setPromptType] = useState<string>(DEFAULT_TYPE);
  const [promptContent, setPromptContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load prompts from backend on mount
  useEffect(() => {
    getPrompts()
      .then((res) => {
        if (res.data?.prompts) {
          const defaults = res.data.defaults ?? {};
          const list = Object.values(res.data.prompts).map((p) => ({
            ...toSavedPrompt(p),
            isFavorite: defaults[p.type] === p.id,
          }));
          setSavedPrompts(list);
        }
      })
      .catch(() => setSavedPrompts([]));
  }, []);

  const toggleLibrary = useCallback(() => {
    setIsLibraryOpen((o) => !o);
  }, []);

  const closeLibrary = useCallback(() => setIsLibraryOpen(false), []);

  const loadSavedPrompt = useCallback((prompt: SavedPrompt) => {
    setPromptId(prompt.id);
    setPromptName(prompt.name);
    setShortDescription(prompt.description);
    setPromptType(prompt.type);
    setPromptContent(prompt.content);
    // setIsLibraryOpen(false);
  }, []);

  const newPrompt = useCallback(() => {
    setPromptId(null);
    setPromptName("");
    setShortDescription("");
    setPromptType(DEFAULT_TYPE);
    setPromptContent("");
    setIsLibraryOpen(false);
  }, []);

  const saveCurrentPrompt = useCallback(async () => {
    if (!promptName.trim()) {
      setSaveError("O nome do prompt é obrigatório.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await createPrompt({
        id: promptId ?? undefined,
        name: promptName,
        type: FRONTEND_TO_BACKEND_TYPE[promptType] ?? "analyze_project",
        description: shortDescription,
        content: promptContent,
        is_active: true,
      });
      if (res.data) {
        // const saved = toSavedPrompt(res.data);

        const existing = savedPrompts.find((p) => p.id === res.data!.id);

        const saved = {
          ...toSavedPrompt(res.data),
          isFavorite: existing?.isFavorite ?? false,
        };
        setPromptId(saved.id);
        setSavedPrompts((prev) => {
          const idx = prev.findIndex((p) => p.id === saved.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [...prev, saved];
        });
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erro ao salvar prompt.");
    } finally {
      setIsSaving(false);
    }
  }, [promptId, promptName, promptType, shortDescription, promptContent, savedPrompts]);

  const removePrompt = useCallback(async (id: string) => {
    try {
      await deletePrompt(id);
      setSavedPrompts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erro ao excluir prompt.");
    }
  }, []);

  const duplicatePrompt = useCallback(
    async (id: string) => {
      try {
        const original = savedPrompts.find((p) => p.id === id);

        if (!original) return;

        const res = await createPrompt({
          name: `${original.name} (Copy)`,
          type: FRONTEND_TO_BACKEND_TYPE[original.type],
          description: original.description,
          content: original.content,
          is_active: true,
        });

        if (res.data) {
          const duplicated = toSavedPrompt(res.data);

          setSavedPrompts((prev) => [...prev, duplicated]);

          // seleciona automaticamente o prompt duplicado
          setPromptId(duplicated.id);
          setPromptName(duplicated.name);
          setShortDescription(duplicated.description);
          setPromptType(duplicated.type);
          setPromptContent(duplicated.content);
        }
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "Erro ao duplicar prompt.",
        );
      }
    },
    [savedPrompts],
  );

  const toggleFavorite = useCallback((id: string) => {
    setSavedPrompts((prev) => {
      const target = prev.find((p) => p.id === id);
      if (!target) return prev;
      const updated = prev.map((p) => {
        if (p.type !== target.type) return p;
        return { ...p, isFavorite: p.id === id };
      });
      // Persist to backend (fire-and-forget)
      setDefaultPrompt(
        id,
        FRONTEND_TO_BACKEND_TYPE[target.type] ?? target.type,
      ).catch(() => { });
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({
      isLibraryOpen,
      toggleLibrary,
      closeLibrary,
      savedPrompts,
      promptId,
      promptName,
      setPromptName,
      shortDescription,
      setShortDescription,
      promptType,
      setPromptType,
      promptContent,
      setPromptContent,
      loadSavedPrompt,
      newPrompt,
      saveCurrentPrompt,
      removePrompt,
      duplicatePrompt,
      toggleFavorite,
      isSaving,
      saveError,
    }),
    [
      isLibraryOpen,
      toggleLibrary,
      closeLibrary,
      savedPrompts,
      promptId,
      promptName,
      shortDescription,
      promptType,
      promptContent,
      loadSavedPrompt,
      newPrompt,
      saveCurrentPrompt,
      removePrompt,
      toggleFavorite,
      isSaving,
      saveError,
    ],
  );

  return (
    <PromptLabContext.Provider value={value}>
      {children}
    </PromptLabContext.Provider>
  );
}
