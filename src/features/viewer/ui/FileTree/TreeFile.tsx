import { FileEntry } from "../../model/types";
import { FileIcon } from "./FileIcon";

type Props = {
  name: string;
  handle: FileSystemFileHandle;
  depth: number;
  path: string;
  isSelected: boolean;
  isViewed: boolean;
  onSelect: (entry: FileEntry) => void;
};

export function TreeFile({
  name,
  handle,
  depth,
  path,
  isSelected,
  isViewed,
  onSelect,
}: Props) {
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
