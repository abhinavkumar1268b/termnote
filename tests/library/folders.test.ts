import { describe, expect, it } from "vitest";
import { buildFolderTree, folderDescendants, wouldCreateCycle } from "@/lib/folders/tree";

const folders = [
  { id: "a", parentId: null, name: "A" },
  { id: "b", parentId: "a", name: "B" },
  { id: "c", parentId: "b", name: "C" },
  { id: "d", parentId: null, name: "D" },
];

describe("folder hierarchy", () => {
  it("nests folders under the correct parent", () => {
    const tree = buildFolderTree(folders);
    expect(tree.map((node) => node.folder.id)).toEqual(["a", "d"]);
    expect(tree[0].children[0].folder.id).toBe("b");
    expect(tree[0].children[0].children[0].folder.id).toBe("c");
  });

  it("finds all descendants", () => {
    expect(folderDescendants(folders, "a")).toEqual(["b", "c"]);
    expect(folderDescendants(folders, "d")).toEqual([]);
  });

  it("prevents cycles when moving folders", () => {
    expect(wouldCreateCycle(folders, "a", "c")).toBe(true);
    expect(wouldCreateCycle(folders, "a", "a")).toBe(true);
    expect(wouldCreateCycle(folders, "c", "a")).toBe(false);
    expect(wouldCreateCycle(folders, "c", null)).toBe(false);
  });
});
