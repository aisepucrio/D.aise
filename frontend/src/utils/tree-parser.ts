import type { FolderNode, FileNode } from "@/app/projects/tree-types";

// The backend tree format (from project_model.py get_tree()):
// - No root folder line — starts directly with children
// - Each indent level = 4 chars: "│   " (pipe + 3 spaces) or "    " (4 spaces)
// - Connectors: "├── " (non-last) or "└── " (last)
//
// Example:
//   ├── src
//   │   ├── components
//   │   │   └── Button.tsx
//   │   └── App.tsx
//   └── README.md

function getDepth(line: string): number {
  let depth = 0;
  let i = 0;
  while (i + 3 < line.length) {
    const chunk = line.slice(i, i + 4);
    if (chunk === "│   " || chunk === "    ") {
      depth++;
      i += 4;
    } else {
      break;
    }
  }
  return depth;
}

function getName(line: string): string {
  return line.replace(/^[│├└─\s]+/, "").trim();
}

export function parseAsciiTree(raw: string, rootName: string): FolderNode {
  const root: FolderNode = { kind: "folder", name: rootName, children: [] };
  const lines = raw.split("\n").filter((l) => l.trim() !== "");
  if (!lines.length) return root;

  const items = lines.map((line, i) => {
    const depth = getDepth(line);
    const name = getName(line);
    const nextDepth = i + 1 < lines.length ? getDepth(lines[i + 1]) : -1;
    const isFolder = nextDepth > depth;
    return { depth, name, isFolder };
  });

  const stack: { node: FolderNode; depth: number }[] = [
    { node: root, depth: -1 },
  ];

  for (const { depth, name, isFolder } of items) {
    if (!name) continue;
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;

    if (isFolder) {
      const folder: FolderNode = { kind: "folder", name, children: [] };
      parent.children.push(folder);
      stack.push({ node: folder, depth });
    } else {
      parent.children.push({ kind: "file", name } as FileNode);
    }
  }

  return root;
}
