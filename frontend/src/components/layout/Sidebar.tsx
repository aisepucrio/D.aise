"use client";

import { Suspense, useEffect, useState } from "react";
import {
  useParams,
  usePathname,
  useRouter,
} from "next/navigation";
import {
  BookMarked,
  Folder,
  Search,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { usePromptLab } from "@/context/PromptLabContext";
import { useSidebar } from "@/context/SidebarContext";
import { deleteProject, getProjects } from "@/services/api";
import type { ApiProject } from "@/types/api";
import PromptLibraryPanel from "@/components/features/PromptLibraryPanel";


function SidebarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const selectedProjectId = params.id ?? null;

  const [projectsOpen, setProjectsOpen] = useState(false);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [search, setSearch] = useState("");

  const { collapsed, toggleCollapsed } = useSidebar();

  const isPromptLab =
    pathname === "/prompt-lab" ||
    pathname.startsWith("/prompt-lab/");

  // const { isLibraryOpen, toggleLibrary, newPrompt } =
  //   usePromptLab();
  const { newPrompt } = usePromptLab();

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, [selectedProjectId]);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  function handleProjectSelect(folderName: string) {
    if (selectedProjectId === folderName) {
      router.push("/projects");
    } else {
      router.push(`/projects/${encodeURIComponent(folderName)}`);
    }
  }

  async function handleDeleteProject(
    folderName: string,
    projectName: string,
  ) {
    if (!window.confirm(`Delete project "${projectName}"?`))
      return;

    try {
      await deleteProject(folderName);

      setProjects((prev) =>
        prev.filter((p) => p.folder_name !== folderName),
      );

      if (selectedProjectId === folderName) {
        router.push("/projects");
      }
    } catch { }
  }

  return (
    <aside
      className={`relative left-0  z-100 flex h-[calc(100vh-4rem)] flex-col border-r border-stroke bg-black transition-all duration-300 ${collapsed ? "w-16" : "w-64"
        }`}
    >
      <div className="flex items-center justify-end p-3">
        <button
          onClick={() => toggleCollapsed()}
          className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          {collapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-6">
        <nav
          className="flex flex-col gap-1"
          aria-label="Navegação lateral"
        >
          <div>
            <button
              type="button"
              onClick={() =>
                !collapsed &&
                setProjectsOpen((o) => !o)
              }
              className={`flex w-full items-center rounded-lg py-2.5 text-sm font-medium transition-colors ${projectsOpen
                ? "border-l-2 border-brand bg-surface-card/90 text-brand"
                : "border-l-2 border-transparent text-zinc-400 hover:bg-stroke/40 hover:text-zinc-100"
                } ${collapsed
                  ? "justify-center px-0"
                  : "gap-3 pl-3 pr-3"
                }`}
            >
              <Folder
                className={`size-5 shrink-0 ${projectsOpen
                  ? "text-brand"
                  : "text-zinc-400"
                  }`}
              />

              {!collapsed && (
                <span className="min-w-0 flex-1">
                  Projects
                </span>
              )}
            </button>

            {!collapsed && projectsOpen ? (
              <div className="ml-3 mt-3 space-y-3 border-l border-stroke/60 pl-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    type="search"
                    placeholder="Search"
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    className="w-full rounded-input border border-stroke bg-surface-input py-2 pl-9 pr-3 text-sm text-foreground"
                  />
                </div>

                <ul className="space-y-1">
                  {filteredProjects.map((project) => {
                    const isSelected =
                      selectedProjectId ===
                      project.folder_name;

                    return (
                      <li
                        key={project.folder_name}
                        className="group flex items-center gap-1"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleProjectSelect(
                              project.folder_name,
                            )
                          }
                          className={`flex min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors ${isSelected
                            ? "border border-brand/50 bg-surface-card/90 text-brand"
                            : "border border-transparent text-zinc-400 hover:bg-stroke/40 hover:text-zinc-100"
                            }`}
                        >
                          <span className="truncate font-mono">
                            {project.name}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteProject(
                              project.folder_name,
                              project.name,
                            )
                          }
                          className="shrink-0 rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:bg-rose-900/30 hover:text-rose-400 group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="w-full rounded-lg bg-brand py-2.5 text-center text-sm font-semibold text-black"
                >
                  + New Project
                </button>
              </div>
            ) : null}
          </div>

         {isPromptLab && !collapsed ? (
            // <div className="mt-4 flex flex-col gap-3 border-t border-stroke/60 pt-4">
              <div className="mt-6 flex flex-col gap-4 border-t-2 border-zinc-700/80 pt-5">
              {/* isso é o botao q abre o prompt lav menu. remover */}
              {/* <button
                type="button"
                onClick={toggleLibrary}
                className={`flex w-full items-center rounded-lg py-2.5 text-sm font-medium transition-colors ${
                  collapsed
                    ? "justify-center px-0"
                    : "gap-3 pl-3 pr-3"
                }`}
              >
                <BookMarked className="size-5 shrink-0" />

                {!collapsed && "Prompt Library"}
              </button> */}

              {!collapsed && (
                <button
                  type="button"
                  onClick={newPrompt}
                  className="w-full rounded-lg bg-brand py-2.5 text-center text-sm font-semibold text-black"
                >
                  + New Prompt
                </button>
              )}
              <PromptLibraryPanel />

            </div>
          ) : null}
        </nav>
      </div>
      {/* {isPromptLab && !collapsed && (
        <div className="border-t border-stroke/60">
          <PromptLibraryPanel />
        </div>
      )} */}
    </aside>
  );
}

export default function Sidebar() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SidebarInner />
    </Suspense>
  );
}