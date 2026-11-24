export interface FolderRef {
  id: string;
  parentId: string | null;
  name: string;
}

export interface FolderTreeNode<T extends FolderRef> {
  folder: T;
  children: FolderTreeNode<T>[];
}

/** Returns every descendant id of a folder, excluding the folder itself. */
export function folderDescendants(folders: FolderRef[], rootId: string): string[] {
  const result: string[] = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const folder of folders) {
      if (folder.parentId === current && !result.includes(folder.id)) {
        result.push(folder.id);
        queue.push(folder.id);
      }
    }
  }
  return result;
}

export function buildFolderTree<T extends FolderRef>(folders: T[]): FolderTreeNode<T>[] {
  const nodes = new Map<string, FolderTreeNode<T>>(
    folders.map((folder) => [folder.id, { folder, children: [] }]),
  );
  const roots: FolderTreeNode<T>[] = [];

  for (const node of nodes.values()) {
    const parentId = node.folder.parentId;
    if (parentId && nodes.has(parentId)) nodes.get(parentId)?.children.push(node);
    else roots.push(node);
  }

  return roots;
}

export function wouldCreateCycle(folders: FolderRef[], folderId: string, newParentId: string | null): boolean {
  if (!newParentId) return false;
  if (newParentId === folderId) return true;
  return folderDescendants(folders, folderId).includes(newParentId);
}
