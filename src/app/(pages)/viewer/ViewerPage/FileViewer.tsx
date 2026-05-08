"use client";

import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import Loading from "@/shared/components/Loading/Loading";
import {
  DOC_EXTS,
  FileEntry,
  getExt,
  IMG_EXTS,
  PDF_EXTS,
  TEXT_EXTS,
} from "./types";

// ─── State types ──────────────────────────────────────────────────────────────

type ViewerState =
  | { type: "welcome" }
  | { type: "loading" }
  | { type: "pdf"; url: string }
  | { type: "image"; url: string }
  | { type: "docx"; html: string }
  | { type: "text"; content: string }
  | { type: "unsupported"; url: string }
  | { type: "error"; message: string };

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  src,
  onClose,
}: {
  src: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!src) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        className="absolute right-4 top-4 text-white/60 transition-colors hover:text-white"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>
      <img
        src={src}
        alt=""
        className="max-h-[95vh] max-w-[95vw] rounded object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── FileViewer ───────────────────────────────────────────────────────────────

export function FileViewer({
  file,
  onViewed,
}: {
  file: FileEntry | null;
  onViewed: (path: string) => void;
}) {
  const [state, setState] = useState<ViewerState>({ type: "welcome" });
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!file) {
      setState({ type: "welcome" });
      return;
    }

    if (prevUrl.current) {
      URL.revokeObjectURL(prevUrl.current);
      prevUrl.current = null;
    }

    setState({ type: "loading" });
    const ext = getExt(file.name);

    (async () => {
      try {
        const fileObj = await file.handle.getFile();

        if (PDF_EXTS.has(ext)) {
          const url = URL.createObjectURL(fileObj);
          prevUrl.current = url;
          setState({ type: "pdf", url });
        } else if (IMG_EXTS.has(ext)) {
          const url = URL.createObjectURL(fileObj);
          prevUrl.current = url;
          setState({ type: "image", url });
        } else if (DOC_EXTS.has(ext)) {
          const buf = await fileObj.arrayBuffer();
          const mammoth = await import("mammoth");
          const result = await mammoth.default.convertToHtml({ arrayBuffer: buf });
          setState({
            type: "docx",
            html: result.value || "<p>Документ пустой или не удалось извлечь текст.</p>",
          });
        } else if (TEXT_EXTS.has(ext)) {
          const text = await fileObj.text();
          setState({ type: "text", content: text });
        } else {
          const url = URL.createObjectURL(fileObj);
          prevUrl.current = url;
          setState({ type: "unsupported", url });
        }
        onViewed(file.path);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Неизвестная ошибка";
        setState({ type: "error", message: msg });
      }
    })();

    return () => {
      if (prevUrl.current) {
        URL.revokeObjectURL(prevUrl.current);
        prevUrl.current = null;
      }
    };
  }, [file, onViewed]);

  if (!file || state.type === "welcome") {
    return (
      <div className="flex h-full flex-col items-center justify-center text-zinc-600">
        <div className="mb-4 text-6xl">📂</div>
        <h2 className="mb-2 text-lg font-medium text-zinc-500">
          Выберите файл
        </h2>
        <p className="text-sm">Откройте папку слева и кликните на файл</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Filename bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-sm">
        <span className="truncate font-medium text-zinc-200">{file.name}</span>
        <span className="ml-1 truncate text-xs text-zinc-600">{file.path}</span>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        {state.type === "loading" && <Loading />}

        {state.type === "pdf" && (
          <iframe
            src={state.url}
            title={file.name}
            className="w-full flex-1 border-none"
            style={{ minHeight: "calc(100vh - 96px)" }}
          />
        )}

        {state.type === "image" && (
          <div className="flex flex-1 items-center justify-center bg-zinc-950 p-6">
            <img
              src={state.url}
              alt={file.name}
              className="max-h-[calc(100vh-140px)] max-w-full cursor-zoom-in rounded object-contain shadow-2xl"
              onClick={() => setLightboxSrc(state.url)}
            />
          </div>
        )}

        {state.type === "docx" && (
          <div className="p-8">
            <div
              className="mx-auto max-w-3xl rounded bg-white p-10 text-zinc-900 shadow-lg"
              style={{ fontFamily: "'Times New Roman', serif", lineHeight: 1.8, fontSize: 14 }}
              dangerouslySetInnerHTML={{ __html: state.html }}
            />
          </div>
        )}

        {state.type === "text" && (
          <pre className="p-6 font-mono text-sm text-zinc-300 whitespace-pre-wrap break-words">
            {state.content}
          </pre>
        )}

        {state.type === "unsupported" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-zinc-600">
            <div className="text-5xl">📎</div>
            <p className="text-sm">
              Формат{" "}
              <strong className="text-zinc-400">.{getExt(file.name)}</strong>{" "}
              не отображается в браузере
            </p>
            <a href={state.url} download={file.name}>
              <Button size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Скачать файл
              </Button>
            </a>
          </div>
        )}

        {state.type === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-red-400">
            <div className="text-4xl">⚠️</div>
            <p className="text-sm">{state.message}</p>
          </div>
        )}
      </div>

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
