"use client";

import { useState } from "react";
import { Award, Check, ChevronDown, RotateCcw, X, XCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Quiz } from "../../model/types";
import { BlockResult, QuestionResult, QuizResult } from "../../model/scoring";

type Props = {
  quiz: Quiz;
  result: QuizResult;
  onRestart: () => void;
};

function fmtScore(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

function PassBadge({ passed }: { passed: boolean | null }) {
  if (passed == null) return null;
  return passed ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/40 px-2.5 py-1 text-xs font-medium text-emerald-400">
      <Check className="h-3.5 w-3.5" /> Пройдено
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-950/50 px-2.5 py-1 text-xs font-medium text-red-400">
      <XCircle className="h-3.5 w-3.5" /> Не пройдено
    </span>
  );
}

export function QuizResults({ quiz, result, onRestart }: Props) {
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);

  return (
    <div className="flex h-screen flex-col overflow-y-auto bg-zinc-950">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6">
        {/* Overall summary */}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
          <Award className="h-8 w-8 text-blue-400" />
          <div>
            <div className="text-3xl font-bold text-zinc-100">
              {fmtScore(result.totalScore)}{" "}
              <span className="text-lg font-normal text-zinc-500">/ {result.totalQuestions}</span>
            </div>
            <div className="mt-0.5 text-sm text-zinc-500">{result.percent.toFixed(1)}% правильных ответов</div>
          </div>

          {(result.grantPassed != null || result.paidPassed != null) && (
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              {result.grantPassed != null && (
                <div className="flex items-center gap-2 rounded-xl bg-zinc-950/60 px-3 py-1.5">
                  <span className="text-zinc-400">Грант (≥{quiz.meta.grantThreshold})</span>
                  <PassBadge passed={result.grantPassed} />
                </div>
              )}
              {result.paidPassed != null && (
                <div className="flex items-center gap-2 rounded-xl bg-zinc-950/60 px-3 py-1.5">
                  <span className="text-zinc-400">Платное (≥{quiz.meta.paidThreshold})</span>
                  <PassBadge passed={result.paidPassed} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Per-block breakdown */}
        <div className="flex flex-col gap-3">
          {result.blockResults.map((blockResult) => (
            <BlockCard
              key={blockResult.block.number}
              blockResult={blockResult}
              expanded={expandedBlock === blockResult.block.number}
              onToggle={() =>
                setExpandedBlock((cur) =>
                  cur === blockResult.block.number ? null : blockResult.block.number,
                )
              }
            />
          ))}
        </div>

        <Button onClick={onRestart} variant="outline" className="w-full">
          <RotateCcw className="h-4 w-4" />
          Пройти тест заново / загрузить другой
        </Button>
      </div>
    </div>
  );
}

function BlockCard({
  blockResult,
  expanded,
  onToggle,
}: {
  blockResult: BlockResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { block, questionResults, score, passed } = blockResult;
  const max = questionResults.length;
  const pct = max > 0 ? (score / max) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-200">
            Блок {block.number}. {block.title}
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full ${passed ? "bg-emerald-600" : "bg-red-600"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold text-zinc-200">
            {fmtScore(score)}{" "}
            <span className="font-normal text-zinc-500">
              / {max} · мин. {block.minScore}
            </span>
          </div>
        </div>
        <PassBadge passed={passed} />
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-zinc-800 px-4 py-4">
          {questionResults.map((qr) => (
            <QuestionReview key={qr.question.number} qr={qr} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionReview({ qr }: { qr: QuestionResult }) {
  const { question, selected, correct, points, isFullyCorrect } = qr;
  const correctSet = new Set(correct);
  const selectedSet = new Set(selected);

  return (
    <div className="rounded-lg bg-zinc-950/50 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug text-zinc-200">
          {question.number}. {question.text}
        </h4>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${
            isFullyCorrect
              ? "bg-emerald-900/40 text-emerald-400"
              : points > 0
                ? "bg-amber-900/40 text-amber-400"
                : "bg-red-950/50 text-red-400"
          }`}
        >
          {fmtScore(points)} б.
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {question.options.map((option, i) => {
          const isCorrect = correctSet.has(i);
          const isSelected = selectedSet.has(i);
          const letter = String.fromCharCode(65 + i);

          let style = "border-zinc-800 text-zinc-400";
          if (isCorrect && isSelected) style = "border-emerald-700 bg-emerald-900/20 text-emerald-300";
          else if (isCorrect) style = "border-emerald-800/60 text-emerald-400";
          else if (isSelected) style = "border-red-800/60 bg-red-950/20 text-red-300";

          return (
            <div key={i} className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${style}`}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold bg-zinc-900/80">
                {letter}
              </span>
              <span className="flex-1 leading-snug">{option}</span>
              {isCorrect && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
              {isSelected && !isCorrect && <X className="h-3.5 w-3.5 shrink-0 text-red-400" />}
            </div>
          );
        })}
      </div>

      {selected.length === 0 && (
        <div className="mt-1.5 text-xs text-zinc-600">Вы не дали ответ на этот вопрос</div>
      )}
    </div>
  );
}
