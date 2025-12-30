"use client";

import { useState } from "react";

interface Question {
  text: string;
  A: string;
  B: string;
  C: string;
  D: string;
  correct: "A" | "B" | "C" | "D";
}

interface AnswerDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
}

interface Player {
  playerId: string;
  name: string;
}

interface AnswerRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  answerDistribution: AnswerDistribution;
  currentIndex: number;
  questionCount: number;
  onPrevious: () => void;
  onNext: () => void;
  canNavigate: boolean;
  connected: boolean;
  players?: Player[];
  playerScores?: Record<string, number>;
  onRevealWinner?: (
    leaderboard: Array<{ playerId: string; name: string; score: number }>
  ) => void;
  onEndGame?: () => void;
}

export default function AnswerRevealModal({
  isOpen,
  onClose,
  question,
  answerDistribution,
  currentIndex,
  questionCount,
  onPrevious,
  onNext,
  canNavigate,
  connected,
  players = [],
  playerScores = {},
  onRevealWinner,
  onEndGame,
}: AnswerRevealModalProps) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [winnerRevealed, setWinnerRevealed] = useState(false);

  if (!isOpen || !question) return null;

  // Check if we're on the last question
  const isLastQuestion = questionCount > 0 && currentIndex >= questionCount - 1;

  // Prepare leaderboard data
  const leaderboard = players
    .map((player) => ({
      ...player,
      score: playerScores[player.playerId] || 0,
    }))
    .sort((a, b) => b.score - a.score);

  // Get the winner (player with highest score)
  const winner = leaderboard.length > 0 ? leaderboard[0] : null;
  // Check if there's a tie (multiple players with the same highest score)
  const isTie =
    leaderboard.length > 1 &&
    leaderboard[0].score > 0 &&
    leaderboard[0].score === leaderboard[1].score;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-card-bg rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-text-light mb-2">
                {showLeaderboard
                  ? winnerRevealed
                    ? "🏆 Winner!"
                    : "Leaderboard"
                  : "Answer Revealed"}
              </h2>
              {!showLeaderboard && (
                <p className="text-text-light/70">
                  Question {currentIndex + 1} of {questionCount}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-text-light/50 hover:text-text-light transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {showLeaderboard ? (
            /* Leaderboard View */
            <div className="mb-6">
              {winnerRevealed && winner && (
                <div className="mb-8 text-center">
                  <div className="bg-gradient-to-r from-cyan via-indigo to-cyan rounded-lg p-8 shadow-lg border-4 border-cyan/50">
                    <div className="text-6xl mb-4">🏆</div>
                    {isTie ? (
                      <>
                        <h3 className="text-3xl font-bold text-white mb-2">
                          It's a Tie!
                        </h3>
                        <p className="text-xl text-white/90 mb-4">
                          Multiple winners with {winner.score} points!
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-3xl font-bold text-white mb-2">
                          Congratulations!
                        </h3>
                        <p className="text-2xl text-white/90 mb-2">
                          {winner.name}
                        </p>
                        <p className="text-xl text-white/90">
                          Wins with {winner.score} points!
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {leaderboard.length === 0 ? (
                  <p className="text-center text-text-light/50 py-8">
                    No players yet
                  </p>
                ) : (
                  leaderboard.map((player, index) => {
                    const rank = index + 1;
                    const isTopThree = rank <= 3;
                    const isWinner = winnerRevealed && rank === 1 && !isTie;
                    return (
                      <div
                        key={player.playerId}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isWinner
                            ? "bg-cyan/20 border-cyan shadow-lg scale-105"
                            : isTopThree
                            ? rank === 1
                              ? "bg-cyan/20 border-cyan"
                              : rank === 2
                              ? "bg-card-bg border-indigo/30"
                              : "bg-cyan/10 border-cyan/50"
                            : "bg-deep-navy border-indigo/30"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`text-2xl font-bold ${
                              isWinner
                                ? "text-cyan"
                                : isTopThree
                                ? rank === 1
                                  ? "text-cyan"
                                  : rank === 2
                                  ? "text-text-light/50"
                                  : "text-cyan/70"
                                : "text-text-light/50"
                            }`}
                          >
                            {isWinner ? "👑" : `#${rank}`}
                          </div>
                          <span
                            className={`flex-1 text-lg font-semibold ${
                              isWinner
                                ? "text-cyan"
                                : "text-text-light"
                            }`}
                          >
                            {player.name}
                            {isWinner && (
                              <span className="ml-2 text-cyan/70">
                                - Winner!
                              </span>
                            )}
                          </span>
                          <span
                            className={`text-xl font-bold ${
                              isWinner
                                ? "text-cyan"
                                : "text-indigo"
                            }`}
                          >
                            {player.score} pts
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Question */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-text-light mb-4">
                  {question.text}
                </h3>

                {/* Answer Options with Correct Answer Highlighted */}
                <div className="space-y-3 mb-6">
                  {(["A", "B", "C", "D"] as const).map((option) => {
                    const isCorrect = question.correct === option;
                    return (
                      <div
                        key={option}
                        className={`p-4 rounded-lg border-2 ${
                          isCorrect
                            ? "bg-success/20 border-success"
                            : "bg-deep-navy border-indigo/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-text-light">
                            {option}:
                          </span>
                          <span className="text-text-light flex-1">
                            {question[option]}
                          </span>
                          {isCorrect && (
                            <span className="text-success font-semibold">
                              ✓ Correct
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Answer Distribution */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-text-light mb-4">
                  Answer Distribution
                </h4>
                <div className="space-y-3">
                  {(["A", "B", "C", "D"] as const).map((option) => {
                    const count = answerDistribution[option];
                    const total = Object.values(answerDistribution).reduce(
                      (a, b) => a + b,
                      0
                    );
                    const percentage =
                      total > 0 ? Math.round((count / total) * 100) : 0;
                    const isCorrect = question.correct === option;

                    return (
                      <div key={option} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span
                            className={`font-medium ${
                              isCorrect
                                ? "text-success"
                                : "text-text-light"
                            }`}
                          >
                            {option}
                            {isCorrect && " (Correct)"}
                          </span>
                          <span className="text-text-light/50">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-deep-navy rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              isCorrect ? "bg-success" : "bg-indigo"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-indigo/30">
            {showLeaderboard ? (
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLeaderboard(false)}
                  disabled={winnerRevealed}
                  className="px-6 py-3 bg-indigo text-white rounded-md hover:bg-indigo/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Back to Answer
                </button>
                {winnerRevealed && (
                  <button
                    onClick={() => {
                      if (onEndGame) {
                        onEndGame();
                      } else {
                        onClose();
                      }
                    }}
                    className="ml-auto px-6 py-3 bg-error text-white rounded-md hover:bg-error/90 transition-colors font-medium"
                  >
                    End Game
                  </button>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    onPrevious();
                    onClose(); // Close modal when navigating
                  }}
                  disabled={
                    !connected ||
                    currentIndex === 0 ||
                    (questionCount > 0 && currentIndex >= questionCount)
                  }
                  className="px-6 py-3 bg-deep-navy text-text-light rounded-md hover:bg-deep-navy/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium border border-indigo/30"
                >
                  ← Previous Question
                </button>
                <button
                  onClick={() => {
                    setShowLeaderboard(true);
                    if (isLastQuestion) {
                      setWinnerRevealed(true);
                      // Emit winner-revealed event to all players
                      if (onRevealWinner) {
                        onRevealWinner(leaderboard);
                      } else {
                        console.warn("⚠️ onRevealWinner callback not provided");
                      }
                    }
                  }}
                  className="px-6 py-3 bg-indigo text-white rounded-md hover:bg-indigo/90 transition-colors font-medium"
                >
                  {isLastQuestion ? "🏆 Reveal Winner" : "View Leaderboard"}
                </button>
                <button
                  onClick={() => {
                    onNext();
                    onClose(); // Close modal when navigating
                  }}
                  disabled={
                    !connected ||
                    questionCount === 0 ||
                    currentIndex >= questionCount - 1
                  }
                  className="px-6 py-3 bg-deep-navy text-text-light rounded-md hover:bg-deep-navy/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium border border-indigo/30"
                >
                  Next Question →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
