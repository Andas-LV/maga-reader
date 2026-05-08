"use client";

import { useEffect, useState } from "react";
import Loading from "@/shared/components/Loading/Loading";
import { FileEntry, FSEntry, loadDirEntries } from "../../model/types";
import { SearchResults } from "./SearchResults";
import { TreeFile } from "./TreeFile";
import { TreeFolder } from "./TreeFolder";

type Props = {
  rootHandle: FileSystemDirectoryHandle;
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
  // Derived loading state: avoids synchronous setState in effect body
  const [loadedHandle, setLoadedHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const loading = loadedHandle !== rootHandle;

  useEffect(() => {
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
