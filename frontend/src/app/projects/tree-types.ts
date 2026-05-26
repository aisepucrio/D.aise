export type FileNode = { kind: "file"; name: string; active?: boolean };
export type FolderNode = {
  kind: "folder";
  name: string;
  children: TreeNode[];
};
export type TreeNode = FileNode | FolderNode;
