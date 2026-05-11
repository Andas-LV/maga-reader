import { useMemo } from "react";
import { FileEntry } from "../../model/types";
import { FileIcon } from "./FileIcon";

type ContentMatch = {
  entry: FileEntry;
  snippet: string;
};

function getSnippet(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return "";
  const from = Math.max(0, idx - 70);
  const to = Math.min(text.length, idx + query.length + 70);
  return (from > 0 ? "…" : "") + text.slice(from, to) + (to < text.length ? "…" : "");
}

type Props = {
  query: string;
  contentIndex: Map<string, string>;
  contentIndexBuilt: boolean;
  contentIndexing: boolean;
  indexingProgress: { done: number; total: number };
  selectedPath: string | null;
  viewedPaths: Set<string>;
  fileIndex: FileEntry[];
  onSelect: (entry: FileEntry) => void;
  onBuildIndex: () => void;
};

export function ContentSearch({
  query,
  contentIndex,
  contentIndexBuilt,
  contentIndexing,
  indexingProgress,
  selectedPath,
  viewedPaths,
  fileIndex,
  onSelect,
  onBuildIndex,
}: Props) {
  const matches = useMemo<ContentMatch[]>(() => {
    if (!query.trim() || !contentIndexBuilt) return [];
    const q = query.toLowerCase();
    const results: ContentMatch[] = [];

    for (const entry of fileIndex) {
      const text = contentIndex.get(entry.path);
      if (!text || !text.toLowerCase().includes(q)) continue;
      results.push({ entry, snippet: getSnippet(text, query) });
      if (results.length >= 100) break;
    }

    return results;
  }, [query, contentIndex, contentIndexBuilt, fileIndex]);

  if (contentIndexing) {
    const pct =
      indexingProgress.total > 0
        ? Math.round((indexingProgress.done / indexingProgress.total) * 100)
        : 0;
    return (
      <div className="flex flex-col gap-2 p-4">
        <div className="text-xs text-zinc-400">
          Индексирование… {indexingProgress.done} / {indexingProgress.total}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (!contentIndexBuilt) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <p className="text-xs text-zinc-500">
          Для поиска по содержимому нужно&nbsp;проиндексировать текстовые и Word‑файлы
        </p>
        <button
          onClick={onBuildIndex}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-blue-500"
        >
          Индексировать содержимое
        </button>
      </div>
    );
  }

  // Index built, no query yet
  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center gap-3 p-4 text-center">
        <p className="text-xs text-zinc-500">
          {contentIndex.size} файлов проиндексировано
        </p>
        <button
          onClick={onBuildIndex}
          className="text-xs text-zinc-600 underline hover:text-zinc-400"
        >
          Переиндексировать
        </button>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-zinc-600">Ничего не найдено</div>
    );
  }

  return (
    <div className="py-1">
      <div className="px-3 py-1 text-xs text-zinc-600">
        {matches.length} файлов{matches.length === 100 && " (первые 100)"}
      </div>

      {matches.map(({ entry, snippet }, i) => (
        <div
          key={i}
          className={`mx-1 cursor-pointer rounded px-3 py-2 transition-colors ${
            selectedPath === entry.path ? "bg-blue-600/30" : "hover:bg-zinc-800"
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
          <div className="truncate pl-5 text-xs text-zinc-600">{entry.path}</div>
          {snippet && (
            <div className="mt-0.5 line-clamp-2 pl-5 text-xs text-zinc-500">
              {snippet}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
