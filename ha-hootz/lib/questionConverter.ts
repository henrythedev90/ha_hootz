import { Question } from "@/types";
import { TriviaQuestion } from "./types";

/**
 * Converts a Question from the presentation format to TriviaQuestion format for Redis
 * Only supports multiple-choice questions with exactly 4 options
 */
export function convertQuestionToTrivia(
  question: Question,
  startTime: number,
  duration: number
): TriviaQuestion | null {
  if (question.type !== "multiple-choice") {
    return null; // Only multiple-choice supported for now
  }

  if (question.options.length !== 4) {
    return null; // Must have exactly 4 options
  }

  // Find the correct answer index
  const correctIndex = question.options.findIndex((opt) => opt.isCorrect);
  if (correctIndex === -1) {
    return null; // Must have a correct answer
  }

  // Map index to letter (A, B, C, D)
  const correctLetter = ["A", "B", "C", "D"][correctIndex] as
    | "A"
    | "B"
    | "C"
    | "D";

  return {
    text: question.text,
    A: question.options[0]?.text || "",
    B: question.options[1]?.text || "",
    C: question.options[2]?.text || "",
    D: question.options[3]?.text || "",
    correct: correctLetter,
    startTime,
    duration,
  };
}

/**
 * Converts a TriviaQuestion back to Question format
 */
export function convertTriviaToQuestion(
  triviaQuestion: TriviaQuestion,
  questionId: string
): Question {
  const options = [
    {
      id: `${questionId}-A`,
      text: triviaQuestion.A,
      isCorrect: triviaQuestion.correct === "A",
    },
    {
      id: `${questionId}-B`,
      text: triviaQuestion.B,
      isCorrect: triviaQuestion.correct === "B",
    },
    {
      id: `${questionId}-C`,
      text: triviaQuestion.C,
      isCorrect: triviaQuestion.correct === "C",
    },
    {
      id: `${questionId}-D`,
      text: triviaQuestion.D,
      isCorrect: triviaQuestion.correct === "D",
    },
  ];

  return {
    id: questionId,
    type: "multiple-choice",
    text: triviaQuestion.text,
    timeLimit: triviaQuestion.duration,
    options,
  };
}
