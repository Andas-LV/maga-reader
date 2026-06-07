"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Grid3x3, X, Flag } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Quiz, QuizAnswers, QuizBlock, QuizQuestion, questionKey } from "../../model/types";

type FlatQuestion = {
  block: QuizBlock;
  question: QuizQuestion;
  globalIndex: number;
};

type Props = {
  quiz: Quiz;
  onFinish: (answers: QuizAnswers) => void;
  onExit: () => void;
};

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function QuizRunner({ quiz, onFinish, onExit }: Props) {
  const flat = useMemo<FlatQuestion[]>(() => {
    const list: FlatQuestion[] = [];
    let i = 0;
    for (const block of quiz.blocks) {
      for (const question of block.questions) {
        list.push({ block, question, globalIndex: i++ });
      }
    }
    return list;
  }, [quiz]);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    quiz.meta.durationMinutes != null ? quiz.meta.durationMinutes * 60 : null,
  );
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish(answers);
  };

  useEffect(() => {
    if (secondsLeft == null) return;
    if (secondsLeft <= 0) {
      finish();
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => (s == null ? null : s - 1)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const current = flat[index];
  const key = questionKey(current.block.number, current.question.number);
  const selected = answers[key] ?? new Set<number>();
  const answeredCount = Object.values(answers).filter((s) => s.size > 0).length;

  const toggleOption = (optionIndex: number) => {
    setAnswers((prev) => {
      const next = { ...prev };
      const set = new Set(prev[key] ?? []);
      if (current.block.mode === "single") {
        set.clear();
        set.add(optionIndex);
      } else if (set.has(optionIndex)) {
        set.delete(optionIndex);
      } else {
        set.add(optionIndex);
      }
      next[key] = set;
      return next;
    });
  };

  const goTo = (i: number) => {
    if (i < 0 || i >= flat.length) return;
    setIndex(i);
    setPaletteOpen(false);
  };

  const isLast = index === flat.length - 1;
  const lowOnTime = secondsLeft != null && secondsLeft <= 5 * 60;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950">
      {/* Header */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2.5">
        <button
          onClick={onExit}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          title="Выйти из теста"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-200">
            Блок {current.block.number}. {current.block.title}
          </div>
          <div className="text-xs text-zinc-500">
            Вопрос {current.question.number} из {current.block.questions.length} в блоке · {index + 1}/
            {flat.length} всего · отвечено {answeredCount}
          </div>
        </div>

        {secondsLeft != null && (
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold tabular-nums ${
              lowOnTime ? "bg-red-950/60 text-red-400" : "bg-zinc-800 text-zinc-300"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            {formatTime(secondsLeft)}
          </span>
        )}

        <Button size="sm" variant="outline" onClick={() => setPaletteOpen((v) => !v)} className="shrink-0">
          <Grid3x3 className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline">Вопросы</span>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Question palette */}
        {paletteOpen && (
          <div className="flex w-full max-w-xs shrink-0 flex-col overflow-hidden border-r border-zinc-800 bg-zinc-900">
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {quiz.blocks.map((block) => (
                <div key={block.number} className="mb-4">
                  <div className="mb-2 truncate text-xs font-medium text-zinc-400">
                    Блок {block.number}. {block.title}
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {block.questions.map((q) => {
                      const fIdx = flat.findIndex(
                        (f) => f.block.number === block.number && f.question.number === q.number,
                      );
                      const isAnswered = (answers[questionKey(block.number, q.number)]?.size ?? 0) > 0;
                      const isCurrent = fIdx === index;
                      return (
                        <button
                          key={q.number}
                          onClick={() => goTo(fIdx)}
                          className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors ${
                            isCurrent
                              ? "bg-blue-600 text-white"
                              : isAnswered
                                ? "bg-emerald-900/50 text-emerald-400"
                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          }`}
                        >
                          {q.number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6 sm:px-6">
            <div>
              <span className="rounded bg-blue-600/20 px-2 py-0.5 text-xs font-semibold text-blue-400">
                Вопрос {current.question.number}
              </span>
              {current.block.mode === "multiple" && (
                <span className="ml-2 text-xs text-zinc-500">
                  Можно отметить несколько вариантов
                </span>
              )}
              <h2 className="mt-3 text-lg font-semibold leading-snug text-zinc-100">
                {current.question.text}
              </h2>
            </div>

            <div className="flex flex-col gap-2">
              {current.question.options.map((option, optionIndex) => {
                const isSelected = selected.has(optionIndex);
                const letter = String.fromCharCode(65 + optionIndex);
                return (
                  <button
                    key={optionIndex}
                    onClick={() => toggleOption(optionIndex)}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-500/10 text-zinc-100"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                        isSelected ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"
                      } ${current.block.mode === "single" ? "rounded-full" : ""}`}
                    >
                      {letter}
                    </span>
                    <span className="leading-relaxed">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer navigation */}
      <footer className="flex shrink-0 items-center gap-2 border-t border-zinc-800 bg-zinc-900 px-3 py-2.5">
        <Button size="sm" variant="outline" onClick={() => goTo(index - 1)} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" />
          Назад
        </Button>

        <div className="mx-auto h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${((index + 1) / flat.length) * 100}%` }}
          />
        </div>

        {isLast ? (
          <Button size="sm" onClick={() => setConfirmFinish(true)} className="shrink-0">
            <Flag className="h-4 w-4" />
            Завершить
          </Button>
        ) : (
          <Button size="sm" onClick={() => goTo(index + 1)} className="shrink-0">
            Далее
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </footer>

      {/* Confirm finish dialog */}
      {confirmFinish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setConfirmFinish(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-5 shadow-2xl ring-1 ring-zinc-800">
            <div className="text-base font-semibold text-zinc-100">Завершить тест?</div>
            <p className="mt-1.5 text-sm text-zinc-400">
              Отвечено на {answeredCount} из {flat.length} вопросов.{" "}
              {answeredCount < flat.length && "На оставшиеся вопросы баллы начислены не будут."}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmFinish(false)}>
                Продолжить
              </Button>
              <Button className="flex-1" onClick={finish}>
                Завершить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
