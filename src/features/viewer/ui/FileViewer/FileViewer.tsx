"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Download, ChevronUp, ChevronDown, ChevronLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import Loading from "@/shared/components/Loading/Loading";
import {
  AUDIO_EXTS,
  DOC_EXTS,
  FileEntry,
  getExt,
  IMG_EXTS,
  PDF_EXTS,
  TEXT_EXTS,
} from "../../model/types";
import { AudioPlayer } from "./AudioPlayer";
import { Lightbox } from "./Lightbox";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentState =
  | { type: "pdf"; url: string }
  | { type: "image"; url: string }
  | { type: "audio"; url: string }
  | { type: "docx"; html: string }
  | { type: "text"; content: string }
  | { type: "unsupported"; url: string; ext: string }
  | { type: "error"; message: string };

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Inject <mark data-match> only into text nodes, not inside HTML tags
function highlightHtmlText(html: string, query: string): string {
  if (!query.trim()) return html;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");
  return html.replace(/(<[^>]*>)|([^<]+)/g, (match, tag, text) => {
    if (tag) return tag;
    if (text) return text.replace(re, (m: string) => `<mark data-match>${m}</mark>`);
    return match;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  file: FileEntry | null;
  onViewed: (path: string) => void;
  highlightQuery?: string;
  onBack?: () => void;
};

export function FileViewer({ file, onViewed, highlightQuery = "", onBack }: Props) {
  const [content, setContent] = useState<ContentState | null>(null);
  const [loadedFile, setLoadedFile] = useState<FileEntry | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [matchIndex, setMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const prevUrl = useRef<string | null>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  const isLoading = file !== null && loadedFile !== file;

  useEffect(() => {
    if (!file) return;

    if (prevUrl.current) {
      URL.revokeObjectURL(prevUrl.current);
      prevUrl.current = null;
    }

    setMatchIndex(0);
    setTotalMatches(0);

    const ext = getExt(file.name);
    let cancelled = false;

    (async () => {
      try {
        const fileObj = await file.handle.getFile();
        let next: ContentState;

        if (PDF_EXTS.has(ext)) {
          const url = URL.createObjectURL(fileObj);
          prevUrl.current = url;
          next = { type: "pdf", url };
        } else if (IMG_EXTS.has(ext)) {
          const url = URL.createObjectURL(fileObj);
          prevUrl.current = url;
          next = { type: "image", url };
        } else if (AUDIO_EXTS.has(ext)) {
          const url = URL.createObjectURL(fileObj);
          prevUrl.current = url;
          next = { type: "audio", url };
        } else if (DOC_EXTS.has(ext)) {
          next = { type: "docx", html: await convertDocx(fileObj) };
        } else if (TEXT_EXTS.has(ext)) {
          next = { type: "text", content: await fileObj.text() };
        } else {
          const url = URL.createObjectURL(fileObj);
          prevUrl.current = url;
          next = { type: "unsupported", url, ext };
        }

        if (!cancelled) {
          setContent(next);
          setLoadedFile(file);
          onViewed(file.path);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setContent({
            type: "error",
            message: e instanceof Error ? e.message : "Неизвестная ошибка",
          });
          setLoadedFile(file);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (prevUrl.current) {
        URL.revokeObjectURL(prevUrl.current);
        prevUrl.current = null;
      }
    };
  }, [file, onViewed]);

  // Count matches and scroll to first one when content or query changes
  useEffect(() => {
    const el = contentAreaRef.current;
    if (!el) return;

    const marks = el.querySelectorAll<HTMLElement>("[data-match]");
    setTotalMatches(marks.length);
    setMatchIndex(marks.length > 0 ? 1 : 0);

    marks.forEach((m, i) => {
      m.style.background = i === 0 ? "#f59e0b" : "#fde04780";
      m.style.color = i === 0 ? "#1c1917" : "";
      m.style.borderRadius = "2px";
      m.style.padding = "0 1px";
    });

    if (marks.length > 0) {
      marks[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, highlightQuery]);

  const goTo = useCallback(
    (delta: 1 | -1) => {
      const el = contentAreaRef.current;
      if (!el) return;
      const marks = el.querySelectorAll<HTMLElement>("[data-match]");
      if (!marks.length) return;

      const next = ((matchIndex - 1 + delta + marks.length) % marks.length) + 1;
      setMatchIndex(next);

      marks.forEach((m, i) => {
        m.style.background = i === next - 1 ? "#f59e0b" : "#fde04780";
        m.style.color = i === next - 1 ? "#1c1917" : "";
      });

      marks[next - 1].scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [matchIndex]
  );

  // Keyboard navigation: F3 / Shift+F3
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        goTo(e.shiftKey ? -1 : 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goTo]);

  const q = highlightQuery.trim();
  const showNav = q.length > 0 && (content?.type === "text" || content?.type === "docx");

  const highlightedHtml =
    showNav && content
      ? content.type === "text"
        ? highlightHtmlText(
            `<pre style="white-space:pre-wrap;word-break:break-word;padding:1.5rem;font-family:monospace;font-size:0.875rem;color:#d4d4d8">${escapeHtml(content.content)}</pre>`,
            q
          )
        : highlightHtmlText(content.html, q)
      : null;

  if (!file) {
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
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-sm">
        {onBack && (
          <button
            onClick={onBack}
            className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <span className="truncate font-medium text-zinc-200">{file.name}</span>
        <span className="ml-1 truncate text-xs text-zinc-600">{file.path}</span>

        {showNav && (
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="text-xs text-zinc-400">
              {totalMatches === 0
                ? "Нет совпадений"
                : `${matchIndex} / ${totalMatches}`}
            </span>
            <button
              onClick={() => goTo(-1)}
              disabled={totalMatches === 0}
              className="rounded p-0.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-30"
              title="Предыдущее (Shift+F3)"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => goTo(1)}
              disabled={totalMatches === 0}
              className="rounded p-0.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-30"
              title="Следующее (F3)"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div ref={contentAreaRef} className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <Loading />}

        {!isLoading && content?.type === "pdf" && (
          <iframe
            src={content.url}
            title={file.name}
            className="h-full w-full border-none"
            style={{ minHeight: "calc(100vh - 96px)" }}
          />
        )}

        {!isLoading && content?.type === "audio" && (
          <AudioPlayer url={content.url} name={file.name} />
        )}

        {!isLoading && content?.type === "image" && (
          <div className="flex h-full items-center justify-center bg-zinc-950 p-6">
            <img
              src={content.url}
              alt={file.name}
              className="max-h-full max-w-full cursor-zoom-in rounded object-contain shadow-2xl"
              onClick={() => setLightboxSrc(content.url)}
            />
          </div>
        )}

        {!isLoading && content?.type === "docx" && (
          <div className="p-2 sm:p-8">
            <div
              className="mx-auto max-w-3xl rounded bg-white p-4 text-zinc-900 shadow-lg sm:p-10"
              style={{
                fontFamily: "'Times New Roman', serif",
                lineHeight: 1.8,
                fontSize: 14,
              }}
              dangerouslySetInnerHTML={{ __html: highlightedHtml ?? content.html }}
            />
          </div>
        )}

        {!isLoading && content?.type === "text" && (
          highlightedHtml ? (
            <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
          ) : (
            <pre className="whitespace-pre-wrap break-words p-6 font-mono text-sm text-zinc-300">
              {content.content}
            </pre>
          )
        )}

        {!isLoading && content?.type === "unsupported" && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-zinc-600">
            <div className="text-5xl">📎</div>
            <p className="text-sm">
              Формат{" "}
              <strong className="text-zinc-400">.{content.ext}</strong>{" "}
              не отображается в браузере
            </p>
            <a href={content.url} download={file.name}>
              <Button size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Скачать файл
              </Button>
            </a>
          </div>
        )}

        {!isLoading && content?.type === "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-red-400">
            <div className="text-4xl">⚠️</div>
            <p className="text-sm">{content.message}</p>
          </div>
        )}
      </div>

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}

// ─── DOCX conversion ──────────────────────────────────────────────────────────

async function convertDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = (await import("mammoth/mammoth.browser")) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m: any = mod.default ?? mod;

  try {
    const result = await m.convertToHtml(
      { arrayBuffer: buf },
      {
        convertImage: m.images.imgElement(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          async (image: any) => {
            try {
              const base64 = await image.readAsBase64String();
              return { src: `data:${image.contentType};base64,${base64}` };
            } catch {
              return { src: "" };
            }
          },
        ),
      },
    );
    if (result.value) return result.value;
  } catch {
    /* fall through */
  }

  try {
    const result = await m.extractRawText({ arrayBuffer: buf });
    if (result.value) {
      return `<div style="white-space:pre-wrap">${escapeHtml(result.value)}</div>`;
    }
  } catch {
    /* fall through */
  }

  return extractDocxXml(buf);
}

async function extractDocxXml(buf: ArrayBuffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);

  const entry = zip.file("word/document.xml");
  if (!entry) throw new Error("Не удалось найти word/document.xml в этом DOCX");

  const xml = await entry.async("text");

  const text = xml
    .replace(/<w:br[^>]*\/?>/gi, "\n")
    .replace(/<\/w:p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) throw new Error("Документ пустой или не содержит текста");

  return `<div style="white-space:pre-wrap">${escapeHtml(text)}</div>`;
}
