import type { FolderNode } from "./tree-types";

export type ProjectMock = {
  projectName: string;
  description: string;
  mainFile: string;
  rootPath: string;
  language: string;
  framework: string;
  hasReadme: boolean;
  dependencies: { name: string }[];
  fileTree: FolderNode;
};

export const FILE_TREE_LUMINAL: FolderNode = {
  kind: "folder",
  name: "luminal-v2-core",
  children: [
    {
      kind: "folder",
      name: "src",
      children: [
        {
          kind: "folder",
          name: "components",
          children: [
            { kind: "file", name: "Header.tsx" },
            { kind: "file", name: "Sidebar.tsx" },
          ],
        },
        { kind: "folder", name: "assets", children: [] },
        { kind: "file", name: "App.tsx", active: true },
        { kind: "file", name: "index.ts" },
      ],
    },
    { kind: "file", name: "package.json" },
    { kind: "file", name: "tailwind.config.js" },
    { kind: "file", name: "README.md" },
  ],
};

const FILE_TREE_AISE_DOCS: FolderNode = {
  kind: "folder",
  name: "aise-docs",
  children: [
    {
      kind: "folder",
      name: "docs",
      children: [
        { kind: "file", name: "intro.md" },
        { kind: "file", name: "api.md", active: true },
      ],
    },
    { kind: "file", name: "package.json" },
    { kind: "file", name: "README.md" },
  ],
};

export const PROJECT_MOCKS: Record<string, ProjectMock> = {
  "1": {
    projectName: "luminal-v2-core",
    description: "Core services and UI shell for the Luminal platform.",
    mainFile: "/src/index.ts",
    rootPath: "~/developer/projects/active/luminal-v2-core",
    language: "TypeScript 5.0",
    framework: "React 18.2",
    hasReadme: true,
    dependencies: [
      { name: "react" },
      { name: "typescript" },
      { name: "vite" },
    ],
    fileTree: FILE_TREE_LUMINAL,
  },
  "2": {
    projectName: "aise-docs",
    description: "Public documentation site for D.aise and internal guides.",
    mainFile: "/docs/index.md",
    rootPath: "~/developer/projects/active/aise-docs",
    language: "Markdown / MDX",
    framework: "Next.js 16",
    hasReadme: true,
    dependencies: [
      { name: "next" },
      { name: "tailwindcss" },
      { name: "contentlayer" },
    ],
    fileTree: FILE_TREE_AISE_DOCS,
  },
};
