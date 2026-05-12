"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Database, FileText, FolderOpen, Search, BookOpen, Upload, X } from "lucide-react";
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
type MobileView = "sidebar" | "viewer";

export function ViewerPage() {
  const [rootHandle, setRootHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [savedHandle, setSavedHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [inputFolderName, setInputFolderName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileIndex, setFileIndex] = useState<FileEntry[]>([]);
  const [indexBuilt, setIndexBuilt] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewedPaths, setViewedPaths] = useState<Set<string>>(new Set());
  const [panelWidth, setPanelWidth] = useState(280);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("files");

  // Mobile state
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  const [mobileView, setMobileView] = useState<MobileView>("sidebar");

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

  // Folder is "loaded" when either a real handle or input files are present
  const folderLoaded = rootHandle !== null || inputFolderName !== null;
  const folderDisplayName = rootHandle?.name ?? inputFolderName ?? "";

  // ─── Track mobile breakpoint ──────────────────────────────────────────────────

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

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

  // ─── Open folder via File System Access API (desktop) ────────────────────────

  const openFolder = async () => {
    if (!hasApi) return;
    try {
      const handle = await window.showDirectoryPicker({ mode: "read" });
      await saveFolderHandle(handle);
      setRootHandle(handle);
      setInputFolderName(null);
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

  // ─── Open files via <input> (mobile / Firefox / Safari) ──────────────────────

  const openFromInput = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    // webkitdirectory allows folder selection on Android Chrome and desktop
    input.setAttribute("webkitdirectory", "");
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      if (!files.length) return;

      const entries: FileEntry[] = files.map((file) => ({
        name: file.name,
        path: file.webkitRelativePath || file.name,
        // Minimal mock handle — only getFile() is ever called
        handle: {
          getFile: async () => file,
        } as unknown as FileSystemFileHandle,
      }));

      const folderName = files[0]?.webkitRelativePath
        ? files[0].webkitRelativePath.split("/")[0]
        : `${files.length} файлов`;

      setRootHandle(null);
      setInputFolderName(folderName);
      setSavedHandle(null);
      setFileIndex(entries);
      setIndexBuilt(true);
      setSelectedFile(null);
      setSearchQuery("");
      setContentIndex(new Map());
      setContentIndexBuilt(false);
      setContentSearchQuery("");
    };
    input.click();
  };

  // ─── Restore saved folder ─────────────────────────────────────────────────────

  const restoreFolder = async () => {
    if (!savedHandle) return;
    try {
      const perm = await savedHandle.requestPermission({ mode: "read" });
      if (perm === "granted") {
        setRootHandle(savedHandle);
        setInputFolderName(null);
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

  // ─── Full file-name index build (directory picker mode only) ─────────────────

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

  // ─── Select file (on mobile, switch to viewer) ────────────────────────────────

  const handleSelectFile = useCallback(
    (entry: FileEntry) => {
      setSelectedFile(entry);
      if (isMobile) setMobileView("viewer");
    },
    [isMobile],
  );

  // ─── Resize panel (desktop only) ─────────────────────────────────────────────

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

  const sidebarVisible = !isMobile || mobileView === "sidebar";
  const viewerVisible = !isMobile || mobileView === "viewer";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <span className="whitespace-nowrap text-sm font-bold text-blue-400">
          📚 <span className="hidden sm:inline">Папка Просмотр</span>
        </span>

        {/* Directory picker — desktop Chrome/Edge only */}
        {hasApi && (
          <Button size="sm" onClick={openFolder} className="shrink-0">
            <FolderOpen className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Открыть папку</span>
          </Button>
        )}

        {/* File input — works on all platforms including mobile */}
        <Button
          size="sm"
          variant={hasApi ? "outline" : "default"}
          onClick={openFromInput}
          className="shrink-0"
        >
          <Upload className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline">
            {hasApi ? "Загрузить файлы" : "Открыть файлы"}
          </span>
        </Button>

        {folderLoaded && (
          <div className="relative min-w-[120px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              className="h-8 border-zinc-700 bg-zinc-950 pl-8 text-sm"
              placeholder="Поиск по названию…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (sidebarTab !== "files") setSidebarTab("files");
                if (isMobile) setMobileView("sidebar");
              }}
            />
          </div>
        )}

        {folderLoaded && (
          <span className="hidden max-w-[160px] truncate text-xs text-zinc-500 md:block">
            📁 {folderDisplayName}
          </span>
        )}

        {fileIndex.length > 0 && (
          <span className="hidden whitespace-nowrap text-xs text-zinc-600 sm:block">
            {fileIndex.length} файлов
            {viewedPaths.size > 0 && (
              <span className="ml-1.5 text-emerald-600">
                · {viewedPaths.size} просмотрено
              </span>
            )}
          </span>
        )}

        {/* Index button — only for directory picker mode (input mode is pre-indexed) */}
        {rootHandle && (
          <Button
            size="sm"
            variant="outline"
            onClick={buildIndex}
            disabled={indexing || indexBuilt}
            className="hidden shrink-0 text-xs sm:flex"
          >
            <Database className="mr-1.5 h-3.5 w-3.5" />
            {indexing
              ? "Индексирование…"
              : indexBuilt
                ? "Проиндексировано ✓"
                : "Индексировать всё"}
          </Button>
        )}

        {!hasApi && !isMobile && (
          <span className="text-xs text-amber-500">
            ⚠️ Для папок — Chrome/Edge
          </span>
        )}
      </header>

      {/* ── Saved folder banner ──────────────────────────────────────────────── */}
      {savedHandle && !rootHandle && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm">
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

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── Left panel (sidebar) ─────────────────────────────────────────── */}
        <div
          className={`flex shrink-0 flex-col overflow-hidden border-r border-zinc-800 bg-zinc-900 ${
            sidebarVisible ? "flex" : "hidden"
          }`}
          style={isMobile ? { width: "100%" } : { width: panelWidth }}
        >
          {/* Mobile: folder name + index button inside sidebar */}
          {isMobile && folderLoaded && (
            <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">
                📁 {folderDisplayName}
              </span>
              {rootHandle && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={buildIndex}
                  disabled={indexing || indexBuilt}
                  className="shrink-0 text-xs"
                >
                  <Database className="h-3.5 w-3.5" />
                  <span className="ml-1">
                    {indexing ? "…" : indexBuilt ? "✓" : "Индекс"}
                  </span>
                </Button>
              )}
              {fileIndex.length > 0 && (
                <span className="whitespace-nowrap text-xs text-zinc-600">
                  {fileIndex.length} файлов
                </span>
              )}
            </div>
          )}

          {/* Sidebar tabs */}
          {folderLoaded && (
            <div className="flex shrink-0 border-b border-zinc-800">
              <button
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  sidebarTab === "files"
                    ? "border-b-2 border-blue-500 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                onClick={() => setSidebarTab("files")}
              >
                Файлы
              </button>
              <button
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
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

          {/* Content search input */}
          {folderLoaded && sidebarTab === "content" && (
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
            {!folderLoaded ? (
              <div className="p-8 text-center text-sm text-zinc-600">
                {hasApi
                  ? "Нажмите «Открыть папку» или «Загрузить файлы»"
                  : "Нажмите «Открыть файлы» чтобы начать"}
              </div>
            ) : sidebarTab === "files" ? (
              <FileTree
                rootHandle={rootHandle}
                searchQuery={searchQuery}
                fileIndex={fileIndex}
                indexBuilt={indexBuilt}
                selectedFile={selectedFile}
                viewedPaths={viewedPaths}
                onSelect={handleSelectFile}
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
                onSelect={handleSelectFile}
                onBuildIndex={buildContentIndex}
              />
            )}
          </div>
        </div>

        {/* ── Resizer (desktop only) ──────────────────────────────────────── */}
        {!isMobile && (
          <div
            className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-blue-500/30"
            onMouseDown={startResize}
          />
        )}

        {/* ── Right panel (viewer) ─────────────────────────────────────────── */}
        <div
          className={`flex min-w-0 flex-col overflow-hidden ${
            viewerVisible ? "flex-1" : "hidden"
          }`}
        >
          <FileViewer
            file={selectedFile}
            onViewed={onViewed}
            highlightQuery={contentSearchQuery}
            onBack={isMobile ? () => setMobileView("sidebar") : undefined}
          />
        </div>
      </div>

      {/* ── Mobile bottom tab bar ───────────────────────────────────────────── */}
      {isMobile && (
        <nav className="flex shrink-0 border-t border-zinc-800 bg-zinc-900">
          <button
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
              mobileView === "sidebar" && sidebarTab === "files"
                ? "text-blue-400"
                : "text-zinc-500"
            }`}
            onClick={() => {
              setSidebarTab("files");
              setMobileView("sidebar");
            }}
          >
            <FileText className="h-5 w-5" />
            Файлы
          </button>
          <button
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
              mobileView === "sidebar" && sidebarTab === "content"
                ? "text-blue-400"
                : "text-zinc-500"
            }`}
            onClick={() => {
              setSidebarTab("content");
              setMobileView("sidebar");
            }}
          >
            <Search className="h-5 w-5" />
            Контент
          </button>
          <button
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
              mobileView === "viewer"
                ? "text-blue-400"
                : selectedFile
                  ? "text-zinc-400"
                  : "text-zinc-700"
            }`}
            disabled={!selectedFile}
            onClick={() => selectedFile && setMobileView("viewer")}
          >
            <BookOpen className="h-5 w-5" />
            Просмотр
          </button>
        </nav>
      )}
    </div>
  );
}
