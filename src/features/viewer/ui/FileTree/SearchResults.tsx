import { FileEntry } from "../../model/types";
import { FileIcon } from "./FileIcon";

type Props = {
  query: string;
  index: FileEntry[];
  indexBuilt: boolean;
  selectedPath: string | null;
  viewedPaths: Set<string>;
  onSelect: (entry: FileEntry) => void;
};

export function SearchResults({
  query,
  index,
  indexBuilt,
  selectedPath,
  viewedPaths,
  onSelect,
}: Props) {
  const q = query.toLowerCase();
  const matches = index
    .filter((f) => f.name.toLowerCase().includes(q))
    .slice(0, 200);

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
              selectedPath === f.path ? "bg-blue-600/30" : "hover:bg-zinc-800"
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
