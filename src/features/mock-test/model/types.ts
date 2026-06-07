export type AnswerMode = "single" | "multiple";

export interface QuizQuestion {
  number: number;
  text: string;
  options: string[];
  /** Indices (0-based) of correct options, filled in from the answer key */
  correct: number[];
}

export interface QuizBlock {
  number: number;
  title: string;
  questionCount: number;
  optionCount: number;
  mode: AnswerMode;
  /** For "multiple" blocks — how many options may be correct, e.g. 1..3 */
  minCorrect?: number;
  maxCorrect?: number;
  minScore: number;
  questions: QuizQuestion[];
}

export interface QuizMeta {
  title: string;
  subtitle: string;
  totalQuestions: number;
  durationMinutes: number | null;
  grantThreshold: number | null;
  paidThreshold: number | null;
}

export interface Quiz {
  meta: QuizMeta;
  blocks: QuizBlock[];
}

/** User's selections: questionKey -> set of selected option indices */
export type QuizAnswers = Record<string, Set<number>>;

export function questionKey(blockNumber: number, questionNumber: number): string {
  return `${blockNumber}-${questionNumber}`;
}
