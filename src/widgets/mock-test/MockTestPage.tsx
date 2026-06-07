"use client";

import { useState } from "react";
import {
  Quiz,
  QuizAnswers,
  QuizResult,
  QuizResults,
  QuizRunner,
  QuizUpload,
  scoreQuiz,
} from "@/features/mock-test";

type Stage =
  | { name: "upload" }
  | { name: "running"; quiz: Quiz }
  | { name: "results"; quiz: Quiz; result: QuizResult };

export function MockTestPage() {
  const [stage, setStage] = useState<Stage>({ name: "upload" });

  if (stage.name === "upload") {
    return <QuizUpload onReady={(quiz) => setStage({ name: "running", quiz })} />;
  }

  if (stage.name === "running") {
    return (
      <QuizRunner
        quiz={stage.quiz}
        onExit={() => setStage({ name: "upload" })}
        onFinish={(answers: QuizAnswers) =>
          setStage({ name: "results", quiz: stage.quiz, result: scoreQuiz(stage.quiz, answers) })
        }
      />
    );
  }

  return (
    <QuizResults
      quiz={stage.quiz}
      result={stage.result}
      onRestart={() => setStage({ name: "upload" })}
    />
  );
}
