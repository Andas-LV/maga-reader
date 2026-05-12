"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Database, FolderOpen, Search, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  canExtractText,
  clearFolderHandle,
  ContentSearch,
  extractTextFromFile,
  FileEntry,
  FileTree,
  FileViewer,
  loadFolderHandle,
  loadViewedPaths,
  markViewed,
  saveFolderHandle,
} from "@/features/viewer";

type SidebarTab = "files" | "content";

export function ViewerPage() {
  const [rootHandle, setRootHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [savedHandle, setSavedHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileIndex, setFileIndex] = useState<FileEntry[]>([]);
  const [indexBuilt, setIndexBuilt] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewedPaths, setViewedPaths] = useState<Set<string>>(new Set());
  const [panelWidth, setPanelWidth] = useState(280);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("files");

  // Content index state
  const [contentIndex, setContentIndex] = useState<Map<string, string>>(
    new Map(),
  );
  const [contentIndexBuilt, setContentIndexBuilt] = useState(false);
  const [contentIndexing, setContentIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState({
    done: 0,
    total: 0,
  });
  const [contentSearchQuery, setContentSearchQuery] = useState("");

  const isResizing = useRef(false);

  const hasApi =
    typeof window !== "undefined" && "showDirectoryPicker" in window;

  // ─── Restore persisted state on mount ────────────────────────────────────────

  useEffect(() => {
    loadFolderHandle()
      .then(async (handle) => {
        if (!handle) return;
        const perm = await handle.queryPermission({ mode: "read" });
        if (perm === "granted") setRootHandle(handle);
        else setSavedHandle(handle);
      })
      .catch(console.error);

    loadViewedPaths()
      .then((paths) => setViewedPaths(new Set(paths)))
      .catch(console.error);
  }, []);

  // ─── Open folder ──────────────────────────────────────────────────────────────

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
      setContentIndex(new Map());
      setContentIndexBuilt(false);
      setContentSearchQuery("");
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") console.error(e);
    }
  };

  // ─── Restore saved folder ─────────────────────────────────────────────────────

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

  // ─── Full file-name index build ───────────────────────────────────────────────

  const buildIndex = async () => {
    if (!rootHandle || indexing) return;
    setIndexing(true);
    const collected: FileEntry[] = [];

    async function walk(dir: FileSystemDirectoryHandle, parentPath: string) {
      for await (const [name, handle] of dir.entries()) {
        const path = parentPath ? `${parentPath} / ${name}` : name;
        if (handle.kind === "file") {
          collected.push({
            name,
            handle: handle as FileSystemFileHandle,
            path,
          });
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

  // ─── Build content (text) index ───────────────────────────────────────────────

  const buildContentIndex = useCallback(async () => {
    if (contentIndexing) return;

    const extractable = fileIndex.filter(canExtractText);
    setContentIndexing(true);
    setContentIndexBuilt(false);
    setIndexingProgress({ done: 0, total: extractable.length });

    const index = new Map<string, string>();
    let done = 0;

    for (const entry of extractable) {
      try {
        const text = await extractTextFromFile(entry);
        if (text.trim()) index.set(entry.path, text);
      } catch {
        // skip unreadable files
      }
      done++;
      // Batch UI updates every 5 files to avoid excessive re-renders
      if (done % 5 === 0 || done === extractable.length) {
        setIndexingProgress({ done, total: extractable.length });
      }
    }

    setContentIndex(index);
    setContentIndexBuilt(true);
    setContentIndexing(false);
  }, [fileIndex, contentIndexing]);

  // ─── Merge lazily discovered files into index ─────────────────────────────────

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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (sidebarTab !== "files") setSidebarTab("files");
              }}
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div
          className="flex shrink-0 flex-col overflow-hidden border-r border-zinc-800 bg-zinc-900"
          style={{ width: panelWidth }}
        >
          {/* Sidebar tabs — visible only when a folder is open */}
          {rootHandle && (
            <div className="flex shrink-0 border-b border-zinc-800">
              <button
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                  sidebarTab === "files"
                    ? "border-b-2 border-blue-500 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                onClick={() => setSidebarTab("files")}
              >
                Файлы
              </button>
              <button
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                  sidebarTab === "content"
                    ? "border-b-2 border-blue-500 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                onClick={() => setSidebarTab("content")}
              >
                Контент
              </button>
            </div>
          )}

          {/* Content search input — only in "content" tab */}
          {rootHandle && sidebarTab === "content" && (
            <div className="shrink-0 border-b border-zinc-800 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  className="w-full rounded border border-zinc-700 bg-zinc-950 py-1.5 pl-7 pr-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500"
                  placeholder="Поиск по содержимому…"
                  value={contentSearchQuery}
                  onChange={(e) => setContentSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Scrollable sidebar body */}
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            {!rootHandle ? (
              <div className="p-8 text-center text-sm text-zinc-600">
                Нажмите «Открыть папку» чтобы начать
              </div>
            ) : sidebarTab === "files" ? (
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
            ) : (
              <ContentSearch
                query={contentSearchQuery}
                contentIndex={contentIndex}
                contentIndexBuilt={contentIndexBuilt}
                contentIndexing={contentIndexing}
                indexingProgress={indexingProgress}
                selectedPath={selectedFile?.path ?? null}
                viewedPaths={viewedPaths}
                fileIndex={fileIndex}
                onSelect={setSelectedFile}
                onBuildIndex={buildContentIndex}
              />
            )}
          </div>
        </div>

        {/* ── Resizer ─────────────────────────────────────────────────────── */}
        <div
          className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-blue-500/30"
          onMouseDown={startResize}
        />

        {/* ── Right panel (viewer) ─────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <FileViewer file={selectedFile} onViewed={onViewed} highlightQuery={contentSearchQuery} />
        </div>
      </div>
    </div>
  );
}
