import { Quiz, QuizAnswers, QuizBlock, QuizQuestion, questionKey } from "./types";

export interface QuestionResult {
  question: QuizQuestion;
  selected: number[];
  correct: number[];
  /** Points earned for this question, 0..1 */
  points: number;
  isFullyCorrect: boolean;
}

export interface BlockResult {
  block: QuizBlock;
  questionResults: QuestionResult[];
  /** Sum of points across the block's questions (max = questionCount) */
  score: number;
  passed: boolean;
}

export interface QuizResult {
  blockResults: BlockResult[];
  totalScore: number;
  totalQuestions: number;
  percent: number;
  grantPassed: boolean | null;
  paidPassed: boolean | null;
}

/**
 * Scores a single question.
 * - Single-choice blocks: full point only if the one selected option is correct.
 * - Multiple-choice blocks: partial credit — each correctly marked option earns
 *   a share of the point, each incorrectly marked option subtracts the same
 *   share (floored at 0), matching the "every wrong mark lowers the score" rule.
 */
function scoreQuestion(question: QuizQuestion, selected: number[], mode: "single" | "multiple"): number {
  if (question.correct.length === 0) return 0;

  if (mode === "single") {
    return selected.length === 1 && question.correct.includes(selected[0]) ? 1 : 0;
  }

  const correctSet = new Set(question.correct);
  const correctlyMarked = selected.filter((i) => correctSet.has(i)).length;
  const incorrectlyMarked = selected.filter((i) => !correctSet.has(i)).length;
  const share = 1 / question.correct.length;
  const raw = (correctlyMarked - incorrectlyMarked) * share;

  return Math.max(0, Math.min(1, raw));
}

export function scoreQuiz(quiz: Quiz, answers: QuizAnswers): QuizResult {
  const blockResults: BlockResult[] = quiz.blocks.map((block) => {
    const questionResults: QuestionResult[] = block.questions.map((question) => {
      const selected = [...(answers[questionKey(block.number, question.number)] ?? new Set<number>())].sort(
        (a, b) => a - b,
      );
      const points = scoreQuestion(question, selected, block.mode);
      const correctSet = new Set(question.correct);
      const isFullyCorrect =
        selected.length === question.correct.length && selected.every((i) => correctSet.has(i));

      return { question, selected, correct: question.correct, points, isFullyCorrect };
    });

    const score = questionResults.reduce((sum, r) => sum + r.points, 0);

    return {
      block,
      questionResults,
      score,
      passed: score >= block.minScore,
    };
  });

  const totalScore = blockResults.reduce((sum, b) => sum + b.score, 0);
  const totalQuestions = quiz.blocks.reduce((sum, b) => sum + b.questions.length, 0);
  const percent = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;

  return {
    blockResults,
    totalScore,
    totalQuestions,
    percent,
    grantPassed: quiz.meta.grantThreshold != null ? totalScore >= quiz.meta.grantThreshold : null,
    paidPassed: quiz.meta.paidThreshold != null ? totalScore >= quiz.meta.paidThreshold : null,
  };
}
