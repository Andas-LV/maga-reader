"use client";

import { useCallback, useEffect, useState } from "react";
import { Shuffle, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedSection {
  number: number;
  title: string;
  body: string;
  fileName: string;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseSections(
  text: string,
  fileName: string,
): ParsedSection[] {
  const sections: ParsedSection[] = [];
  // Split on lines that start with "N. " (numbered section headers)
  const parts = text.split(/^(\d+)\.\s+(.+)$/m);
  // parts: [preamble, num1, title1, body1, num2, title2, body2, ...]
  for (let i = 1; i + 2 < parts.length; i += 3) {
    const num = parseInt(parts[i], 10);
    const title = parts[i + 1].trim();
    const body = parts[i + 2].trim();
    if (num > 0 && title) {
      sections.push({ number: num, title, body, fileName });
    }
  }
  return sections;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  sections: ParsedSection[];
  onClose: () => void;
};

export function TicketDrawer({ sections, onClose }: Props) {
  const [ticket, setTicket] = useState<ParsedSection[]>([]);
  const [count, setCount] = useState(2);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const draw = useCallback(
    (n: number) => {
      if (!sections.length) return;
      const shuffled = [...sections].sort(() => Math.random() - 0.5);
      setTicket(shuffled.slice(0, n));
      setRevealed(new Set());
    },
    [sections],
  );

  const toggleReveal = (idx: number) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  useEffect(() => {
    draw(count);
  // draw on first open only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const fileNames = [...new Set(sections.map((s) => s.fileName))];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-zinc-800">

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 px-5 py-4">
          <span className="text-2xl">🎲</span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-zinc-100">Случайный билет</div>
            <div className="truncate text-xs text-zinc-500">
              {sections.length} вопросов из {fileNames.length}{" "}
              {fileNames.length === 1 ? "файла" : "файлов"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Ticket questions */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {ticket.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-600">
              Нажмите «Вытащить билет»
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {ticket.map((section, idx) => {
                const isRevealed = revealed.has(idx);
                return (
                  <div key={`${section.fileName}-${section.number}`}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded bg-blue-600/20 px-2 py-0.5 text-xs font-semibold text-blue-400">
                        Вопрос {idx + 1}
                      </span>
                      <span className="text-xs text-zinc-600">
                        #{section.number} · {section.fileName}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold leading-snug text-zinc-100">
                      {section.number}. {section.title}
                    </h3>

                    {section.body && (
                      <>
                        {isRevealed ? (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                            {section.body}
                          </p>
                        ) : (
                          <button
                            onClick={() => toggleReveal(idx)}
                            className="mt-3 rounded-lg border border-zinc-700 px-4 py-1.5 text-xs text-zinc-500 transition-colors hover:border-blue-500 hover:text-blue-400"
                          >
                            Показать ответ
                          </button>
                        )}
                        {isRevealed && (
                          <button
                            onClick={() => toggleReveal(idx)}
                            className="mt-2 text-xs text-zinc-600 hover:text-zinc-400"
                          >
                            Скрыть
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-3 border-t border-zinc-800 px-5 py-3">
          {/* Questions per ticket selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Вопросов:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`h-7 w-7 rounded text-sm font-medium transition-colors ${
                  count === n
                    ? "bg-blue-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            onClick={() => draw(count)}
            className="ml-auto flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 active:bg-blue-700"
          >
            <Shuffle className="h-4 w-4" />
            Вытащить билет
          </button>
        </div>
      </div>
    </div>
  );
}
