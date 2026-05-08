"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { FileEntry, FSEntry, loadDirEntries } from "../../model/types";
import { TreeFile } from "./TreeFile";

type Props = {
  name: string;
  handle: FileSystemDirectoryHandle;
  depth: number;
  path: string;
  selectedPath: string | null;
  viewedPaths: Set<string>;
  onSelect: (entry: FileEntry) => void;
  onIndexed: (entries: FileEntry[]) => void;
};

export function TreeFolder({
  name,
  handle,
  depth,
  path,
  selectedPath,
  viewedPaths,
  onSelect,
  onIndexed,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState<FSEntry[]>([]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      setLoading(true);
      setLoaded(true);
      const entries = await loadDirEntries(handle);
      setChildren(entries);
      setLoading(false);
      const files = entries
        .filter((e) => e.kind === "file")
        .map((e) => ({
          name: e.name,
          handle: e.handle as FileSystemFileHandle,
          path: `${path} / ${e.name}`,
        }));
      if (files.length) onIndexed(files);
    }
  };

  return (
    <div>
      <div
        className="mx-1 flex cursor-pointer items-center gap-1.5 rounded px-2 py-[3px] text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={toggle}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        )}
        {open ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
        )}
        <span className="truncate">{name}</span>
      </div>

      {open && (
        <div>
          {loading && (
            <div
              className="py-0.5 text-xs italic text-zinc-600"
              style={{ paddingLeft: 8 + (depth + 1) * 14 }}
            >
              Загрузка…
            </div>
          )}
          {children.map((child) =>
            child.kind === "directory" ? (
              <TreeFolder
                key={child.name}
                name={child.name}
                handle={child.handle as FileSystemDirectoryHandle}
                depth={depth + 1}
                path={`${path} / ${child.name}`}
                selectedPath={selectedPath}
                viewedPaths={viewedPaths}
                onSelect={onSelect}
                onIndexed={onIndexed}
              />
            ) : (
              <TreeFile
                key={child.name}
                name={child.name}
                handle={child.handle as FileSystemFileHandle}
                depth={depth + 1}
                path={`${path} / ${child.name}`}
                isSelected={selectedPath === `${path} / ${child.name}`}
                isViewed={viewedPaths.has(`${path} / ${child.name}`)}
                onSelect={onSelect}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
