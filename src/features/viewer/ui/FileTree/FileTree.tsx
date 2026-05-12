"use client";

import { useEffect, useState } from "react";
import Loading from "@/shared/components/Loading/Loading";
import { FileEntry, FSEntry, loadDirEntries } from "../../model/types";
import { SearchResults } from "./SearchResults";
import { TreeFile } from "./TreeFile";
import { TreeFolder } from "./TreeFolder";
import { FileIcon } from "./FileIcon";

type Props = {
  rootHandle: FileSystemDirectoryHandle | null;
  searchQuery: string;
  fileIndex: FileEntry[];
  indexBuilt: boolean;
  selectedFile: FileEntry | null;
  viewedPaths: Set<string>;
  onSelect: (entry: FileEntry) => void;
  onIndexed: (entries: FileEntry[]) => void;
};

export function FileTree({
  rootHandle,
  searchQuery,
  fileIndex,
  indexBuilt,
  selectedFile,
  viewedPaths,
  onSelect,
  onIndexed,
}: Props) {
  const [rootEntries, setRootEntries] = useState<FSEntry[]>([]);
  const [loadedHandle, setLoadedHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const loading = rootHandle !== null && loadedHandle !== rootHandle;

  useEffect(() => {
    if (!rootHandle) return;
    let cancelled = false;
    loadDirEntries(rootHandle).then((entries) => {
      if (cancelled) return;
      setRootEntries(entries);
      setLoadedHandle(rootHandle);
      const files = entries
        .filter((e) => e.kind === "file")
        .map((e) => ({
          name: e.name,
          handle: e.handle as FileSystemFileHandle,
          path: e.name,
        }));
      if (files.length) onIndexed(files);
    });
    return () => {
      cancelled = true;
    };
  }, [rootHandle, onIndexed]);

  if (searchQuery.trim()) {
    return (
      <SearchResults
        query={searchQuery}
        index={fileIndex}
        indexBuilt={indexBuilt}
        selectedPath={selectedFile?.path ?? null}
        viewedPaths={viewedPaths}
        onSelect={onSelect}
      />
    );
  }

  // Input mode: files loaded via <input>, no real directory handle
  if (!rootHandle) {
    if (fileIndex.length === 0) {
      return (
        <div className="p-6 text-center text-xs text-zinc-600">
          Файлы не выбраны
        </div>
      );
    }
    return (
      <div className="py-1">
        <div className="px-3 py-1 text-xs text-zinc-600">
          {fileIndex.length} файлов
        </div>
        {fileIndex.map((entry) => (
          <div
            key={entry.path}
            className={`mx-1 cursor-pointer rounded px-3 py-1.5 transition-colors ${
              selectedFile?.path === entry.path
                ? "bg-blue-600/30"
                : "hover:bg-zinc-800"
            }`}
            onClick={() => onSelect(entry)}
          >
            <div className="flex items-center gap-1.5 text-sm">
              <FileIcon name={entry.name} />
              <span className="truncate text-zinc-300">{entry.name}</span>
              {viewedPaths.has(entry.path) && (
                <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              )}
            </div>
            <div className="truncate pl-5 text-xs text-zinc-600">
              {entry.path}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (loading) return <Loading />;

  return (
    <div className="py-1">
      {rootEntries.map((entry) =>
        entry.kind === "directory" ? (
          <TreeFolder
            key={entry.name}
            name={entry.name}
            handle={entry.handle as FileSystemDirectoryHandle}
            depth={0}
            path={entry.name}
            selectedPath={selectedFile?.path ?? null}
            viewedPaths={viewedPaths}
            onSelect={onSelect}
            onIndexed={onIndexed}
          />
        ) : (
          <TreeFile
            key={entry.name}
            name={entry.name}
            handle={entry.handle as FileSystemFileHandle}
            depth={0}
            path={entry.name}
            isSelected={selectedFile?.path === entry.name}
            isViewed={viewedPaths.has(entry.name)}
            onSelect={onSelect}
          />
        ),
      )}
    </div>
  );
}
