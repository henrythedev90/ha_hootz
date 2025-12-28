"use client";

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
}: AnswerRevealModalProps) {
  if (!isOpen || !question) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Answer Revealed
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Question {currentIndex + 1} of {questionCount}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
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

          {/* Question */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
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
                        ? "bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-500"
                        : "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {option}:
                      </span>
                      <span className="text-gray-900 dark:text-white flex-1">
                        {question[option]}
                      </span>
                      {isCorrect && (
                        <span className="text-green-600 dark:text-green-400 font-semibold">
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
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
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
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {option}
                        {isCorrect && " (Correct)"}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          isCorrect ? "bg-green-600" : "bg-blue-600"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
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
              className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              ← Previous Question
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Close
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
              className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Next Question →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
