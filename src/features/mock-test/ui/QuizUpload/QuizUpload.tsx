"use client";

import { useState } from "react";
import { FileText, Loader2, Upload, AlertTriangle, ListChecks, Clock, Target } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { extractTextFromFile, FileEntry } from "@/features/viewer";
import { buildQuiz } from "../../model/parseQuiz";
import { Quiz } from "../../model/types";

type Props = {
  onReady: (quiz: Quiz) => void;
};

async function readDocxText(file: File): Promise<string> {
  const entry: FileEntry = {
    name: file.name,
    path: file.name,
    handle: { getFile: async () => file } as unknown as FileSystemFileHandle,
  };
  return extractTextFromFile(entry);
}

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export function QuizUpload({ onReady }: Props) {
  const [questionsFile, setQuestionsFile] = useState<File | null>(null);
  const [answersFile, setAnswersFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  const canBuild = questionsFile && answersFile && !busy;

  const handleBuild = async () => {
    if (!questionsFile || !answersFile) return;
    setBusy(true);
    setError(null);
    try {
      const [qText, aText] = await Promise.all([
        readDocxText(questionsFile),
        readDocxText(answersFile),
      ]);
      const built = buildQuiz(qText, aText);
      if (!built.blocks.length || !built.blocks.some((b) => b.questions.length)) {
        setError("Не удалось распознать вопросы в файле — проверьте формат документа.");
        setQuiz(null);
        return;
      }
      setQuiz(built);
    } catch (e) {
      console.error(e);
      setError("Не получилось обработать файлы. Убедитесь, что это .docx документы.");
      setQuiz(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-10">
      <div className="text-center">
        <div className="text-2xl">📝</div>
        <h1 className="mt-2 text-lg font-semibold text-zinc-100">Пробное тестирование</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Загрузите файл с вопросами и файл с правильными ответами (.docx), чтобы пройти тест в формате,
          близком к реальному экзамену.
        </p>
      </div>

      <FilePickRow
        label="Файл с вопросами"
        hint="Документ без отметок правильных ответов"
        file={questionsFile}
        onPick={async () => {
          const f = await pickFile(".docx,.doc");
          if (f) {
            setQuestionsFile(f);
            setQuiz(null);
            setError(null);
          }
        }}
      />

      <FilePickRow
        label="Файл с ответами"
        hint="Тот же тест, но с отметками «✓ Ответ: …»"
        file={answersFile}
        onPick={async () => {
          const f = await pickFile(".docx,.doc");
          if (f) {
            setAnswersFile(f);
            setQuiz(null);
            setError(null);
          }
        }}
      />

      <Button onClick={handleBuild} disabled={!canBuild} className="w-full">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Обрабатываю файлы…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Разобрать тест
          </>
        )}
      </Button>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2.5 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {quiz && (
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div>
            <div className="font-semibold text-zinc-100">{quiz.meta.title}</div>
            {quiz.meta.subtitle && <div className="text-xs text-zinc-500">{quiz.meta.subtitle}</div>}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5 text-blue-400" />
              {quiz.blocks.reduce((s, b) => s + b.questions.length, 0)} вопросов · {quiz.blocks.length}{" "}
              {quiz.blocks.length === 1 ? "блок" : "блока"}
            </span>
            {quiz.meta.durationMinutes != null && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                {Math.floor(quiz.meta.durationMinutes / 60)} ч {quiz.meta.durationMinutes % 60} мин
              </span>
            )}
            {(quiz.meta.grantThreshold != null || quiz.meta.paidThreshold != null) && (
              <span className="inline-flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-blue-400" />
                Проходной: {quiz.meta.grantThreshold != null ? `грант ≥${quiz.meta.grantThreshold}` : ""}
                {quiz.meta.grantThreshold != null && quiz.meta.paidThreshold != null ? " · " : ""}
                {quiz.meta.paidThreshold != null ? `платное ≥${quiz.meta.paidThreshold}` : ""}
              </span>
            )}
          </div>

          <ul className="flex flex-col gap-1.5 text-sm">
            {quiz.blocks.map((block) => (
              <li
                key={block.number}
                className="flex items-center justify-between gap-3 rounded-lg bg-zinc-950/60 px-3 py-2"
              >
                <span className="min-w-0 truncate text-zinc-300">
                  Блок {block.number}. {block.title}
                </span>
                <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500">
                  {block.questions.length} вопр. ·{" "}
                  {block.mode === "single"
                    ? `${block.optionCount || "?"} вар., 1 правильный`
                    : `неск. правильных${block.maxCorrect ? ` (до ${block.maxCorrect})` : ""}`}
                  {block.minScore ? ` · мин. ${block.minScore}` : ""}
                </span>
              </li>
            ))}
          </ul>

          <Button onClick={() => onReady(quiz)} className="w-full">
            Начать тестирование
          </Button>
        </div>
      )}
    </div>
  );
}

function FilePickRow({
  label,
  hint,
  file,
  onPick,
}: {
  label: string;
  hint: string;
  file: File | null;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-3.5 text-left transition-colors hover:border-blue-500/60 hover:bg-zinc-900"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-zinc-200">{label}</div>
        <div className="truncate text-xs text-zinc-500">{file ? file.name : hint}</div>
      </div>
      {file && <span className="shrink-0 text-xs text-emerald-500">✓ выбран</span>}
    </button>
  );
}
