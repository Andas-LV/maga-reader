"use client";

import { useEffect, useState } from "react";
import Loading from "@/shared/components/Loading/Loading";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileText,
  Folder,
  FolderOpen,
  ImageIcon,
} from "lucide-react";
import {
  DOC_EXTS,
  FileEntry,
  FSEntry,
  getExt,
  IMG_EXTS,
  loadDirEntries,
  PDF_EXTS,
} from "./types";

// ─── Icon helpers ───────────────────────────────────────────────────────────

function FileIcon({ name }: { name: string }) {
  const ext = getExt(name);
  if (PDF_EXTS.has(ext))
    return <FileText className="h-3.5 w-3.5 shrink-0 text-red-400" />;
  if (IMG_EXTS.has(ext))
    return <ImageIcon className="h-3.5 w-3.5 shrink-0 text-emerald-400" />;
  if (DOC_EXTS.has(ext))
    return <FileText className="h-3.5 w-3.5 shrink-0 text-blue-400" />;
  return <File className="h-3.5 w-3.5 shrink-0 text-zinc-500" />;
}

// ─── TreeFile ────────────────────────────────────────────────────────────────

function TreeFile({
  name,
  handle,
  depth,
  path,
  isSelected,
  isViewed,
  onSelect,
}: {
  name: string;
  handle: FileSystemFileHandle;
  depth: number;
  path: string;
  isSelected: boolean;
  isViewed: boolean;
  onSelect: (entry: FileEntry) => void;
}) {
  return (
    <div
      className={`mx-1 flex cursor-pointer items-center gap-1.5 rounded px-2 py-[3px] text-sm transition-colors ${
        isSelected
          ? "bg-blue-600/30 text-blue-300"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      }`}
      style={{ paddingLeft: 8 + depth * 14 }}
      title={name}
      onClick={() => onSelect({ name, handle, path })}
    >
      <FileIcon name={name} />
      <span className="truncate">{name}</span>
      {isViewed && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
      )}
    </div>
  );
}

// ─── TreeFolder ──────────────────────────────────────────────────────────────

function TreeFolder({
  name,
  handle,
  depth,
  path,
  selectedPath,
  viewedPaths,
  onSelect,
  onIndexed,
}: {
  name: string;
  handle: FileSystemDirectoryHandle;
  depth: number;
  path: string;
  selectedPath: string | null;
  viewedPaths: Set<string>;
  onSelect: (entry: FileEntry) => void;
  onIndexed: (entries: FileEntry[]) => void;
}) {
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

// ─── SearchResults ────────────────────────────────────────────────────────────

function SearchResults({
  query,
  index,
  indexBuilt,
  selectedPath,
  viewedPaths,
  onSelect,
}: {
  query: string;
  index: FileEntry[];
  indexBuilt: boolean;
  selectedPath: string | null;
  viewedPaths: Set<string>;
  onSelect: (entry: FileEntry) => void;
}) {
  const q = query.toLowerCase();
  const matches = index.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 200);

  return (
    <div className="py-1">
      <div className="px-3 py-1 text-xs text-zinc-600">
        {matches.length} совпадений
        {!indexBuilt && index.length > 0 && " (только открытые папки)"}
      </div>
      {matches.length === 0 ? (
        <div className="px-3 py-6 text-center text-sm text-zinc-600">
          {index.length === 0
            ? "Сначала откройте папки или нажмите «Индексировать»"
            : "Ничего не найдено"}
        </div>
      ) : (
        matches.map((f, i) => (
          <div
            key={i}
            className={`mx-1 cursor-pointer rounded px-3 py-1.5 transition-colors ${
              selectedPath === f.path
                ? "bg-blue-600/30"
                : "hover:bg-zinc-800"
            }`}
            onClick={() => onSelect(f)}
          >
            <div className="flex items-center gap-1.5 text-sm">
              <FileIcon name={f.name} />
              <span className="truncate text-zinc-300">{f.name}</span>
              {viewedPaths.has(f.path) && (
                <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              )}
            </div>
            <div className="truncate pl-5 text-xs text-zinc-600">{f.path}</div>
          </div>
        ))
      )}
      {matches.length === 200 && (
        <div className="px-3 py-1 text-xs text-zinc-600">
          Показаны первые 200 — уточните запрос
        </div>
      )}
    </div>
  );
}

// ─── FileTree (public) ────────────────────────────────────────────────────────

type FileTreeProps = {
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
}: FileTreeProps) {
  const [rootEntries, setRootEntries] = useState<FSEntry[]>([]);
  // Track which handle's entries are loaded — loading is derived, not set in the effect
  const [loadedHandle, setLoadedHandle] = useState<FileSystemDirectoryHandle | null>(null);
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

  if (loading) {
    return <Loading />;
  }

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
