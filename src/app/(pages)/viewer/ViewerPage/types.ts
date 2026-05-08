export type FileEntry = {
  name: string;
  handle: FileSystemFileHandle;
  path: string;
};

export type FSEntry = {
  name: string;
  kind: "file" | "directory";
  // entries() yields FileSystemHandle; callers cast to the specific subtype
  handle: FileSystemHandle;
};

export const IMG_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
]);
export const DOC_EXTS = new Set(["docx", "doc"]);
export const PDF_EXTS = new Set(["pdf"]);
export const TEXT_EXTS = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "xml",
  "html",
  "css",
  "js",
  "ts",
]);

export function getExt(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase();
}

export async function loadDirEntries(
  handle: FileSystemDirectoryHandle,
): Promise<FSEntry[]> {
  const entries: FSEntry[] = [];
  for await (const [name, h] of handle.entries()) {
    entries.push({ name, kind: h.kind as "file" | "directory", handle: h });
  }
  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name, "ru", { sensitivity: "base" });
  });
  return entries;
}
