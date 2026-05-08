import { File, FileText, ImageIcon } from "lucide-react";
import { AUDIO_EXTS, DOC_EXTS, getExt, IMG_EXTS, PDF_EXTS } from "../../model/types";

export function FileIcon({ name }: { name: string }) {
  const ext = getExt(name);
  if (PDF_EXTS.has(ext))
    return <FileText className="h-3.5 w-3.5 shrink-0 text-red-400" />;
  if (IMG_EXTS.has(ext))
    return <ImageIcon className="h-3.5 w-3.5 shrink-0 text-emerald-400" />;
  if (DOC_EXTS.has(ext))
    return <FileText className="h-3.5 w-3.5 shrink-0 text-blue-400" />;
  if (AUDIO_EXTS.has(ext))
    return <File className="h-3.5 w-3.5 shrink-0 text-purple-400" />;
  return <File className="h-3.5 w-3.5 shrink-0 text-zinc-500" />;
}
