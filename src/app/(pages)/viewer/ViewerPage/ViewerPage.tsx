"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Database, FolderOpen, Search, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FileTree } from "./FileTree";
import { FileViewer } from "./FileViewer";
import { FileEntry } from "./types";
import {
  clearFolderHandle,
  loadFolderHandle,
  loadViewedPaths,
  markViewed,
  saveFolderHandle,
} from "./db";

export function ViewerPage() {
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [savedHandle, setSavedHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileIndex, setFileIndex] = useState<FileEntry[]>([]);
  const [indexBuilt, setIndexBuilt] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewedPaths, setViewedPaths] = useState<Set<string>>(new Set());
  const [panelWidth, setPanelWidth] = useState(280);
  const isResizing = useRef(false);

  const hasApi =
    typeof window !== "undefined" && "showDirectoryPicker" in window;

  // ─── Load persisted state on mount ──────────────────────────────────────────

  useEffect(() => {
    loadFolderHandle()
      .then(async (handle) => {
        if (!handle) return;
        const perm = await handle.queryPermission({ mode: "read" });
        if (perm === "granted") {
          setRootHandle(handle);
        } else {
          setSavedHandle(handle);
        }
      })
      .catch(console.error);

    loadViewedPaths()
      .then((paths) => setViewedPaths(new Set(paths)))
      .catch(console.error);
  }, []);

  // ─── Open folder ─────────────────────────────────────────────────────────────

  const openFolder = async () => {
    if (!hasApi) return;
    try {
      const handle = await window.showDirectoryPicker({ mode: "read" });
      await saveFolderHandle(handle);
      setRootHandle(handle);
      setSavedHandle(null);
      setSelectedFile(null);
      setFileIndex([]);
      setIndexBuilt(false);
      setSearchQuery("");
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") console.error(e);
    }
  };

  // ─── Restore saved folder (requires user gesture for requestPermission) ──────

  const restoreFolder = async () => {
    if (!savedHandle) return;
    try {
      const perm = await savedHandle.requestPermission({ mode: "read" });
      if (perm === "granted") {
        setRootHandle(savedHandle);
        setSavedHandle(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const dismissSaved = () => {
    setSavedHandle(null);
    clearFolderHandle().catch(console.error);
  };

  // ─── Build full index ─────────────────────────────────────────────────────────

  const buildIndex = async () => {
    if (!rootHandle || indexing) return;
    setIndexing(true);
    const collected: FileEntry[] = [];

    async function walk(dir: FileSystemDirectoryHandle, parentPath: string) {
      for await (const [name, handle] of dir.entries()) {
        const path = parentPath ? `${parentPath} / ${name}` : name;
        if (handle.kind === "file") {
          collected.push({ name, handle: handle as FileSystemFileHandle, path });
        } else {
          await walk(handle as FileSystemDirectoryHandle, path);
        }
      }
    }

    await walk(rootHandle, "");
    setFileIndex(collected);
    setIndexBuilt(true);
    setIndexing(false);
  };

  // ─── Merge newly discovered files into index ──────────────────────────────────

  const onIndexed = useCallback((entries: FileEntry[]) => {
    setFileIndex((prev) => {
      const existing = new Set(prev.map((f) => f.path));
      const fresh = entries.filter((e) => !existing.has(e.path));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, []);

  // ─── Mark file as viewed ──────────────────────────────────────────────────────

  const onViewed = useCallback((path: string) => {
    setViewedPaths((prev) => {
      if (prev.has(path)) return prev;
      const next = new Set(prev);
      next.add(path);
      return next;
    });
    markViewed(path).catch(console.error);
  }, []);

  // ─── Resize panel ─────────────────────────────────────────────────────────────

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const w = ev.clientX;
      if (w >= 160 && w <= 640) setPanelWidth(w);
    };
    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2.5">
        <span className="whitespace-nowrap text-base font-bold text-blue-400">
          📚 Папка Просмотр
        </span>

        <Button size="sm" onClick={openFolder} disabled={!hasApi}>
          <FolderOpen className="mr-1.5 h-4 w-4" />
          Открыть папку
        </Button>

        {rootHandle && (
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              className="h-8 border-zinc-700 bg-zinc-950 pl-8 text-sm"
              placeholder="Поиск по названию…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {rootHandle && (
          <span className="max-w-[200px] truncate text-xs text-zinc-500">
            📁 {rootHandle.name}
          </span>
        )}

        {fileIndex.length > 0 && (
          <span className="whitespace-nowrap text-xs text-zinc-600">
            {fileIndex.length} файлов
            {viewedPaths.size > 0 && (
              <span className="ml-1.5 text-emerald-600">
                · {viewedPaths.size} просмотрено
              </span>
            )}
          </span>
        )}

        {rootHandle && (
          <Button
            size="sm"
            variant="outline"
            onClick={buildIndex}
            disabled={indexing || indexBuilt}
            className="shrink-0 text-xs"
          >
            <Database className="mr-1.5 h-3.5 w-3.5" />
            {indexing
              ? "Индексирование…"
              : indexBuilt
                ? "Проиндексировано ✓"
                : "Индексировать всё"}
          </Button>
        )}

        {!hasApi && (
          <span className="text-xs text-red-400">
            ⚠️ Используйте Chrome или Edge
          </span>
        )}
      </header>

      {/* Restore banner */}
      {savedHandle && !rootHandle && (
        <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm">
          <span className="text-zinc-400">
            Последняя папка:{" "}
            <strong className="text-zinc-200">{savedHandle.name}</strong>
          </span>
          <Button size="sm" variant="outline" onClick={restoreFolder}>
            Открыть снова
          </Button>
          <button
            className="ml-auto text-zinc-600 transition-colors hover:text-zinc-400"
            onClick={dismissSaved}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Tree panel */}
        <div
          className="shrink-0 overflow-x-hidden overflow-y-auto border-r border-zinc-800 bg-zinc-900"
          style={{ width: panelWidth }}
        >
          {!rootHandle ? (
            <div className="p-8 text-center text-sm text-zinc-600">
              Нажмите «Открыть папку» чтобы начать
            </div>
          ) : (
            <FileTree
              rootHandle={rootHandle}
              searchQuery={searchQuery}
              fileIndex={fileIndex}
              indexBuilt={indexBuilt}
              selectedFile={selectedFile}
              viewedPaths={viewedPaths}
              onSelect={setSelectedFile}
              onIndexed={onIndexed}
            />
          )}
        </div>

        {/* Resize handle */}
        <div
          className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-blue-500/30"
          onMouseDown={startResize}
        />

        {/* Viewer panel */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <FileViewer file={selectedFile} onViewed={onViewed} />
        </div>
      </div>
    </div>
  );
}
