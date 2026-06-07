import { AnswerMode, Quiz, QuizBlock, QuizMeta, QuizQuestion } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BLOCK_HEADER_RE = /^БЛОК\s+(\d+)\.\s*(.+)$/gm;
const QUESTION_RE = /^(\d+)\.\s+(.+)$/m;
const OPTION_PREFIX_RE = /^[A-EА-Е][)\.]\s*/;
const ANSWER_LINE_RE = /✓\s*Ответ\s*:\s*([A-EА-Е](?:\s*[,;]\s*[A-EА-Е])*)/i;

// Cyrillic look-alikes that sometimes slip into copy-pasted answer keys
const CYRILLIC_TO_LATIN: Record<string, string> = { А: "A", В: "B", С: "C", Е: "E" };

function letterToIndex(letter: string): number {
  const upper = letter.toUpperCase();
  const normalised = CYRILLIC_TO_LATIN[upper] ?? upper;
  return normalised.charCodeAt(0) - 65;
}

function splitBlockSegments(text: string): { number: number; title: string; body: string }[] {
  const matches = [...text.matchAll(BLOCK_HEADER_RE)];
  const segments: { number: number; title: string; body: string }[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    segments.push({
      number: parseInt(match[1], 10),
      title: match[2].trim(),
      body: text.slice(start, end),
    });
  }

  return segments;
}

/** Splits a block body into question entries: [{ number, text, body }] */
function splitQuestions(body: string): { number: number; text: string; body: string }[] {
  const lines = body.split("\n");
  const entries: { number: number; text: string; body: string }[] = [];
  let current: { number: number; text: string; lines: string[] } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    const m = line.match(QUESTION_RE);
    if (m) {
      if (current) {
        entries.push({ number: current.number, text: current.text, body: current.lines.join("\n") });
      }
      current = { number: parseInt(m[1], 10), text: m[2].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    entries.push({ number: current.number, text: current.text, body: current.lines.join("\n") });
  }

  return entries;
}

function parseOptionLines(body: string): string[] {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !ANSWER_LINE_RE.test(l) && !l.startsWith("⚠"))
    .map((l) => l.replace(OPTION_PREFIX_RE, "").trim());
}

// ─── Block metadata line parsing ─────────────────────────────────────────────
// e.g. "50 вопросов • 4 варианта ответа • 1 правильный • Минимум: 25 баллов"
//   or "20 вопросов • Один или несколько правильных ответов (от 1 до 3) • Минимум: 7 баллов"

function parseBlockMeta(headerBody: string): {
  questionCount: number;
  optionCount: number;
  mode: AnswerMode;
  minCorrect?: number;
  maxCorrect?: number;
  minScore: number;
} {
  const questionCount = parseInt(headerBody.match(/(\d+)\s*вопрос/)?.[1] ?? "0", 10);
  const optionCount = parseInt(headerBody.match(/(\d+)\s*вариант/)?.[1] ?? "0", 10);
  const minScore = parseInt(headerBody.match(/Минимум\s*:\s*(\d+)/)?.[1] ?? "0", 10);

  const range = headerBody.match(/от\s*(\d+)\s*до\s*(\d+)/i);
  const isMultiple = /неск[оа]льк[оа]\s+правильн/i.test(headerBody) || !!range;

  return {
    questionCount,
    optionCount,
    mode: isMultiple ? "multiple" : "single",
    minCorrect: range ? parseInt(range[1], 10) : isMultiple ? 1 : undefined,
    maxCorrect: range ? parseInt(range[2], 10) : undefined,
    minScore,
  };
}

// ─── Meta (header) parsing ───────────────────────────────────────────────────

function parseMeta(text: string): QuizMeta {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const title = lines[0] ?? "Пробный тест";
  const subtitle = lines[1] ?? "";

  const totalQuestions = parseInt(text.match(/\|\s*(\d+)\s*вопрос[а-я]*\s*\|/)?.[1] ?? "0", 10);

  const durationMatch = text.match(/(\d+)\s*ч(?:[а-я]*)?\s*(\d+)?\s*мин/);
  let durationMinutes: number | null = null;
  if (durationMatch) {
    const hours = parseInt(durationMatch[1], 10);
    const minutes = durationMatch[2] ? parseInt(durationMatch[2], 10) : 0;
    durationMinutes = hours * 60 + minutes;
  }

  const grantMatch = text.match(/гранта\s*:\s*[≥>=]*\s*(\d+)/i);
  const paidMatch = text.match(/платного\s*:\s*[≥>=]*\s*(\d+)/i);

  return {
    title,
    subtitle,
    totalQuestions,
    durationMinutes,
    grantThreshold: grantMatch ? parseInt(grantMatch[1], 10) : null,
    paidThreshold: paidMatch ? parseInt(paidMatch[1], 10) : null,
  };
}

// ─── Questions parsing ───────────────────────────────────────────────────────

export function parseQuestionBlocks(text: string): QuizBlock[] {
  const segments = splitBlockSegments(text);
  const blocks: QuizBlock[] = [];

  for (const segment of segments) {
    // The metadata line is the first non-empty line of the segment body
    const firstLineEnd = segment.body.indexOf("\n");
    const metaLine = segment.body.slice(0, firstLineEnd === -1 ? undefined : firstLineEnd);
    const meta = parseBlockMeta(metaLine.trim() ? metaLine : segment.body);

    const questionEntries = splitQuestions(segment.body);
    const questions: QuizQuestion[] = questionEntries.map((entry) => ({
      number: entry.number,
      text: entry.text,
      options: parseOptionLines(entry.body),
      correct: [],
    }));

    blocks.push({
      number: segment.number,
      title: segment.title,
      questionCount: meta.questionCount || questions.length,
      optionCount: meta.optionCount || questions[0]?.options.length || 0,
      mode: meta.mode,
      minCorrect: meta.minCorrect,
      maxCorrect: meta.maxCorrect,
      minScore: meta.minScore,
      questions,
    });
  }

  return blocks;
}

// ─── Answer key parsing ──────────────────────────────────────────────────────

/** Maps "blockNumber-questionNumber" -> array of correct option indices (0-based) */
export function parseAnswerKey(text: string): Map<string, number[]> {
  const segments = splitBlockSegments(text);
  const key = new Map<string, number[]>();

  for (const segment of segments) {
    const questionEntries = splitQuestions(segment.body);
    for (const entry of questionEntries) {
      const m = entry.body.match(ANSWER_LINE_RE);
      if (!m) continue;
      const letters = m[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      const indices = letters.map(letterToIndex).filter((i) => i >= 0);
      key.set(`${segment.number}-${entry.number}`, indices);
    }
  }

  return key;
}

// ─── Top-level: build the full quiz from questions text + answers text ──────

export function buildQuiz(questionsText: string, answersText: string): Quiz {
  const meta = parseMeta(questionsText);
  const blocks = parseQuestionBlocks(questionsText);
  const answerKey = parseAnswerKey(answersText);

  for (const block of blocks) {
    for (const question of block.questions) {
      question.correct = answerKey.get(`${block.number}-${question.number}`) ?? [];
    }
  }

  return { meta, blocks };
}
