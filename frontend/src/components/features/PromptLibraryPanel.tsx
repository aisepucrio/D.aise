"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Copy, Filter, Star, X } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import {
  PROMPT_TYPE_ORDER,
  usePromptLab,
  type PromptLabType,
  type SavedPrompt,
} from "@/context/PromptLabContext";

type ActiveFilter = "All" | PromptLabType;

const FILTER_MENU_OPTIONS: ActiveFilter[] = ["All", ...PROMPT_TYPE_ORDER];

function groupByType(
  prompts: SavedPrompt[],
): Record<PromptLabType, SavedPrompt[]> {
  const map = {
    "Analyze Project": [] as SavedPrompt[],
    "Create README": [] as SavedPrompt[],
    "Update README": [] as SavedPrompt[],
  };
  for (const p of prompts) {
    map[p.type].push(p);
  }
  return map;
}

export default function PromptLibraryPanel() {
  const pathname = usePathname();
  const isPromptLab =
    pathname === "/prompt-lab" || pathname.startsWith("/prompt-lab/");
  // const { isLibraryOpen, closeLibrary, loadSavedPrompt, savedPrompts, toggleFavorite, promptId, } = usePromptLab();
  const {
    loadSavedPrompt,
    savedPrompts,
    toggleFavorite,
    promptId,
    removePrompt,
    duplicatePrompt,
    newPrompt,
  } = usePromptLab();
  // const { collapsed } = useSidebar();

  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("All");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const [openSections, setOpenSections] = useState<
    Record<PromptLabType, boolean>
  >({
    "Analyze Project": true,
    "Create README": false,
    "Update README": false,
  });

  function toggleSection(type: PromptLabType) {
    setOpenSections((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  }


  // useEffect(() => {
  //   if (!isLibraryOpen) setIsFilterMenuOpen(false);
  // }, [isLibraryOpen]);

  // useEffect(() => {
  //   if (!isPromptLab || !isLibraryOpen) return;
  //   function onKey(e: KeyboardEvent) {
  //     if (e.key === "Escape") closeLibrary();
  //   }
  //   document.addEventListener("keydown", onKey);
  //   return () => document.removeEventListener("keydown", onKey);
  // }, [isPromptLab, isLibraryOpen, closeLibrary]);

  // if (!isPromptLab || !isLibraryOpen) return null;
  if (!isPromptLab) return null;

  const grouped = groupByType(savedPrompts);
  const typesToRender: PromptLabType[] =
    activeFilter === "All" ? [...PROMPT_TYPE_ORDER] : [activeFilter];

  return (
    // <div className="relative" aria-live="polite">
    //   {/* Backdrop: área à direita da sidebar; z-40 abaixo do painel e do header (z-50) */}
    // <div
    //   className={`fixed top-16 right-0 bottom-0 z-40 bg-black/60 backdrop-blur-sm transition-[left] duration-300 ease-out ${
    //     collapsed ? "left-16" : "left-64"
    //   }`}
    //   aria-hidden
    //   onClick={closeLibrary}
    // />
    <aside
      // className="fixed left-64 top-16 z-50 flex h-[calc(100vh-4rem)] w-72 flex-col border-r border-stroke bg-surface-card shadow-2xl shadow-black/50 ring-1 ring-white/5"
      // className="relative z-50 flex h-full w-72 flex-col border-r border-stroke bg-surface-card shadow-2xl shadow-black/50 ring-1 ring-white/5"
      // className="relative z-50 flex h-[calc(100vh-4rem)] w-72 flex-col border-r border-stroke bg-surface-card shadow-2xl shadow-black/50 ring-1 ring-white/5"
      // className="flex h-full w-full flex-col bg-surface-card"
      className="flex w-full flex-col bg-surface-card"
      aria-label="Prompt Library"
    >
      <div className="relative z-[60] shrink-0 border-b border-stroke">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-100">
            Library
          </h2>
          <button
            type="button"
            aria-label="Filtrar por tipo de prompt"
            aria-expanded={isFilterMenuOpen}
            aria-haspopup="true"
            onClick={() => setIsFilterMenuOpen((open) => !open)}
            className="rounded-md p-1 text-brand transition-colors hover:bg-zinc-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Filter className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        {isFilterMenuOpen ? (
          <div
            className="absolute left-2 right-2 top-full z-[70] mt-1 rounded-md border border-stroke bg-surface-card py-1 shadow-lg shadow-black/40"
            role="menu"
          >
            {FILTER_MENU_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                role="menuitem"
                onClick={() => {
                  setActiveFilter(option);
                  setIsFilterMenuOpen(false);
                }}
                className={`flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-800/80 ${activeFilter === option
                  ? "font-medium text-brand"
                  : "text-zinc-300"
                  }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {typesToRender.map((type) => {
          const items = grouped[type];
          if (!items.length) return null;
          return (
            <section key={type} className="mb-4 last:mb-0">
              <button
                type="button"
                onClick={() => toggleSection(type)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-white/5"
              >
                <span
                  className={`text-xs transition-transform ${openSections[type] ? "rotate-90" : ""
                    }`}
                >
                  ▶
                </span>

                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {type}
                </span>
              </button>

              {openSections[type] && (
                <ul className="mt-1 space-y-1">
                  {items.map((prompt) => (
                    <li key={prompt.id}>
                      <div
                        className={`flex w-full items-start gap-1 rounded-lg px-1 py-1 transition-colors ${prompt.id === promptId
                          ? "bg-brand/10 ring-1 ring-brand/30"
                          : "hover:bg-white/5"
                          }`}
                      >
                        {" "}
                        <button
                          type="button"
                          aria-label={
                            prompt.isFavorite
                              ? "Remover dos favoritos"
                              : "Marcar como favorito desta categoria"
                          }
                          aria-pressed={prompt.isFavorite}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(prompt.id);
                          }}
                          className="mt-0.5 shrink-0 rounded-md p-1 text-zinc-600 transition-colors hover:bg-zinc-800/80 hover:text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                          <Star
                            className={`size-4 ${prompt.isFavorite
                              ? "fill-brand text-brand"
                              : "text-zinc-600"
                              }`}
                            strokeWidth={prompt.isFavorite ? 0 : 1.75}
                            aria-hidden
                          />
                        </button>
                        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => loadSavedPrompt(prompt)}
                            className="min-w-0 flex-1 rounded-md px-1 py-1.5 text-left"
                          >
                            <span
                              className={`block text-sm font-medium ${prompt.id === promptId
                                ? "text-white"
                                : prompt.isFavorite
                                  ? "text-brand"
                                  : "text-zinc-300"
                                }`}
                            >
                              {prompt.name}
                            </span>

                            <span className="mt-0.5 block text-[10px] text-zinc-500">
                              {new Date(prompt.lastUpdated).toLocaleDateString(
                                "pt-BR",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </button>

                          <div className="flex items-center gap-1 pr-1">
                            <button
                              title="Duplicate prompt"
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                // console.log("duplicate", prompt.id);
                                await duplicatePrompt(prompt.id);
                              }}
                              className="rounded-md p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                            >
                              <Copy className="size-3.5" />
                            </button>

                            <button
                              title="Delete prompt"
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const confirmed = window.confirm(
                                  "Are you sure you want to delete this prompt?\n\nThis action cannot be undone.",
                                );

                                if (!confirmed) return;

                                await removePrompt(prompt.id);

                                if (prompt.id === promptId) {
                                  newPrompt();
                                }
                              }}
                              className="rounded-md p-1 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </aside>
    // </div>
  );
}
