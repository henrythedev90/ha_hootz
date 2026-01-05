"use client";

import { motion } from "framer-motion";
import {
  Play,
  Eye,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

interface Question {
  text: string;
  A: string;
  B: string;
  C: string;
  D: string;
  correct: "A" | "B" | "C" | "D";
}

interface QuestionDisplayProps {
  question: Question | null;
  questionIndex: number;
  questionCount: number;
  isQuestionActive: boolean;
  answerRevealed: boolean;
  correctAnswer?: "A" | "B" | "C" | "D";
  isReviewMode: boolean;
  timeRemaining: number;
  endAt?: number;
  questionDuration?: number; // Duration in milliseconds
  answerDistribution: { A: number; B: number; C: number; D: number };
  connected: boolean;
  playerCount: number;
  answerCount: number;
  randomizeAnswers?: boolean;
  onStartQuestion: () => void;
  onRevealAnswer: () => void;
  onPreviousQuestion: () => void;
  onNextQuestion: () => void;
  onRevealWinner: () => void;
  onViewLeaderboard: () => void;
}

export default function QuestionDisplay({
  question,
  questionIndex,
  questionCount,
  isQuestionActive,
  answerRevealed,
  correctAnswer,
  isReviewMode,
  timeRemaining,
  endAt,
  questionDuration = 30000, // Default to 30 seconds in milliseconds
  answerDistribution,
  connected,
  playerCount,
  answerCount,
  randomizeAnswers = false,
  onStartQuestion,
  onRevealAnswer,
  onPreviousQuestion,
  onNextQuestion,
  onRevealWinner,
  onViewLeaderboard,
}: QuestionDisplayProps) {
  const isLastQuestion =
    questionCount > 0 && questionIndex >= questionCount - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card-bg rounded-xl p-8 border border-indigo/20"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-text-light/60">
            Question {questionIndex + 1} of {questionCount}
          </span>
          {isQuestionActive && !answerRevealed && (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-cyan">
                {timeRemaining}s
              </span>
              <div className="w-32 h-2 bg-deep-navy rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{
                    width: `${
                      endAt
                        ? Math.max(
                            0,
                            ((endAt - Date.now()) / questionDuration) * 100
                          )
                        : 0
                    }%`,
                  }}
                  className="h-full bg-linear-to-r from-cyan to-indigo"
                />
              </div>
            </div>
          )}
        </div>
        <h2 className="text-3xl font-semibold text-text-light">
          {question?.text || "No question loaded"}
        </h2>
      </div>

      {question && (
        <>
          {/* Notice about randomized answer order for players */}
          {randomizeAnswers && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-cyan/10 border border-cyan/30 rounded-lg flex items-start gap-3"
            >
              <Info className="w-5 h-5 text-cyan shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-text-light/90 font-medium mb-1">
                  Answer Order Notice
                </p>
                <p className="text-xs text-text-light/70">
                  Players see answer choices in a randomized order. The order
                  shown here (A, B, C, D) may differ from what each player sees
                  on their screen.
                </p>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            {(["A", "B", "C", "D"] as const).map((option) => {
              const isCorrect = answerRevealed && correctAnswer === option;
              const distribution = answerDistribution[option] || 0;
              const total = Object.values(answerDistribution).reduce(
                (a, b) => a + b,
                0
              );
              const percentage =
                total > 0 ? Math.round((distribution / total) * 100) : 0;

              return (
                <div
                  key={option}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    isCorrect
                      ? "bg-success/20 border-success"
                      : "bg-deep-navy/50 border-indigo/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-text-light">
                      {option}
                    </span>
                    {answerRevealed && (
                      <span className="text-sm text-text-light/60">
                        {percentage}%
                      </span>
                    )}
                  </div>
                  <p className="text-text-light">{question[option]}</p>
                  {answerRevealed && (
                    <div className="mt-3 h-2 bg-deep-navy/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full ${
                          isCorrect ? "bg-success" : "bg-indigo"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Control Buttons */}
      <div className="space-y-3">
        <div className="flex gap-3">
          {!isQuestionActive && !answerRevealed && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartQuestion}
              disabled={!connected || !question || isReviewMode}
              className="flex-1 px-6 py-3 bg-indigo hover:bg-indigo/90 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5" />
              <span>Start Question</span>
            </motion.button>
          )}
          {isQuestionActive && !answerRevealed && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRevealAnswer}
              disabled={
                !connected || playerCount === 0 || answerCount < playerCount
              }
              className="flex-1 px-6 py-3 bg-cyan hover:bg-cyan/90 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-5 h-5" />
              <span>Reveal Answer</span>
            </motion.button>
          )}
        </div>

        {/* Navigation Buttons */}
        {(answerRevealed || isReviewMode) && (
          <div className="space-y-3">
            <div className="flex justify-between items-center pt-4 border-t border-indigo/30">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPreviousQuestion}
                disabled={
                  !connected ||
                  questionIndex === 0 ||
                  (questionCount > 0 && questionIndex >= questionCount)
                }
                className="px-6 py-3 bg-[#1A1F35] hover:bg-[#252B44] border-2 border-[#6366F1]/30 hover:border-[#6366F1]/50 text-[#E5E7EB] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous Question</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={isLastQuestion ? onRevealWinner : onViewLeaderboard}
                className="px-6 py-3 bg-indigo hover:bg-indigo/90 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Trophy className="w-5 h-5" />
                <span>
                  {isLastQuestion ? "🏆 Reveal Winner" : "View Leaderboard"}
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onNextQuestion}
                disabled={
                  !connected ||
                  questionCount === 0 ||
                  questionIndex >= questionCount - 1
                }
                className="px-6 py-3 bg-[#1A1F35] hover:bg-[#252B44] border-2 border-[#6366F1]/30 hover:border-[#6366F1]/50 text-[#E5E7EB] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                <span>Next Question</span>
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
