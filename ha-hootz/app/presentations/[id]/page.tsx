"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Presentation, Question, ScoringConfig } from "@/types";
import { getPresentationById, savePresentation } from "@/lib/storage";
import { generateId, getDefaultScoringConfig } from "@/lib/utils";
import QuestionList from "@/components/QuestionList";
import QuestionEditor from "@/components/QuestionEditor";
import Modal from "@/components/Modal";
import Loading from "@/components/Loading";
import Link from "next/link";

export default function PresentationEditor() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "new";

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
  const [savedPresentationId, setSavedPresentationId] = useState<string | null>(
    null
  );
  const [starting, setStarting] = useState(false);
  const [showScoringConfig, setShowScoringConfig] = useState(false);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>(
    getDefaultScoringConfig()
  );
  const [showStreakBonusInfo, setShowStreakBonusInfo] = useState(false);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<
    number | null
  >(null);

  const loadPresentation = useCallback(async () => {
    try {
      setLoading(true);
      if (isNew) {
        setPresentation({
          id: "new",
          userId: session?.user?.id || "",
          title: "",
          description: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          questions: [],
          scoringConfig: getDefaultScoringConfig(),
        });
        setTitle("");
        setDescription("");
        setScoringConfig(getDefaultScoringConfig());
      } else {
        const loaded = await getPresentationById(id);
        if (loaded) {
          setPresentation(loaded);
          setTitle(loaded.title);
          setDescription(loaded.description || "");
          setScoringConfig(loaded.scoringConfig || getDefaultScoringConfig());
        } else {
          router.push("/");
        }
      }
    } catch (err: any) {
      console.error("Error loading presentation:", err);
      if (err.message?.includes("Unauthorized")) {
        router.push("/auth/signin");
      } else {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }, [id, isNew, session, router]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    loadPresentation();
  }, [status, session, loadPresentation]);

  // Update selectedQuestionIndex when presentation loads or changes
  useEffect(() => {
    if (presentation) {
      if (presentation.questions.length > 0 && selectedQuestionIndex === null) {
        setSelectedQuestionIndex(0);
      } else if (presentation.questions.length === 0) {
        setSelectedQuestionIndex(null);
      } else if (
        selectedQuestionIndex !== null &&
        selectedQuestionIndex >= presentation.questions.length
      ) {
        // If selected index is out of bounds, reset to last question or null
        setSelectedQuestionIndex(
          presentation.questions.length > 0
            ? presentation.questions.length - 1
            : null
        );
      }
    }
  }, [presentation?.questions.length, presentation?.id, selectedQuestionIndex]);

  const handleSave = async () => {
    if (!presentation) return;
    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    try {
      setSaving(true);
      const updated: Presentation = {
        ...presentation,
        title: title.trim(),
        description: description.trim(),
        scoringConfig: scoringConfig,
        updatedAt: new Date().toISOString(),
      };

      const saved = await savePresentation(updated);
      setPresentation(saved);
      setSavedPresentationId(saved.id);

      // Show success modal instead of redirecting
      setShowSaveSuccessModal(true);
    } catch (err: any) {
      const errorMessage =
        err?.message || err?.toString() || "Failed to save presentation";
      console.error("Error saving presentation:", err);
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionUpdate = async (question: Question) => {
    if (!presentation) return;

    const isNew = presentation.id === "new";
    const hasTitle = presentation.title.trim().length > 0;

    // If presentation is new and has no title, just update local state
    if (isNew && !hasTitle) {
      const updated: Presentation = {
        ...presentation,
        questions: presentation.questions.map((q) =>
          q.id === question.id ? question : q
        ),
        updatedAt: new Date().toISOString(),
      };
      setPresentation(updated);
      return;
    }

    // Otherwise, save to database
    try {
      const updated: Presentation = {
        ...presentation,
        questions: presentation.questions.map((q) =>
          q.id === question.id ? question : q
        ),
        updatedAt: new Date().toISOString(),
      };
      const saved = await savePresentation(updated);
      setPresentation(saved);
    } catch (err: any) {
      alert(err.message || "Failed to update question");
    }
  };

  const handleQuestionAdd = async (question: Question) => {
    if (!presentation) return;

    const isNew = presentation.id === "new";
    const hasTitle = presentation.title.trim().length > 0;

    // If presentation is new and has no title, just update local state
    if (isNew && !hasTitle) {
      const newQuestion: Question = {
        ...question,
        id: generateId(),
      };
      const updated: Presentation = {
        ...presentation,
        questions: [...presentation.questions, newQuestion],
        updatedAt: new Date().toISOString(),
      };
      setPresentation(updated);
      return;
    }

    // Otherwise, save to database
    try {
      const newQuestion: Question = {
        ...question,
        id: generateId(),
      };
      const updated: Presentation = {
        ...presentation,
        questions: [...presentation.questions, newQuestion],
        updatedAt: new Date().toISOString(),
      };
      const saved = await savePresentation(updated);
      setPresentation(saved);
    } catch (err: any) {
      alert(err.message || "Failed to add question");
    }
  };

  const handleQuestionDelete = async (questionId: string) => {
    if (!presentation) return;

    const isNew = presentation.id === "new";
    const hasTitle = presentation.title.trim().length > 0;

    // If presentation is new and has no title, just update local state
    if (isNew && !hasTitle) {
      const updated: Presentation = {
        ...presentation,
        questions: presentation.questions.filter((q) => q.id !== questionId),
        updatedAt: new Date().toISOString(),
      };
      setPresentation(updated);
      return;
    }

    // Otherwise, save to database
    try {
      const updated: Presentation = {
        ...presentation,
        questions: presentation.questions.filter((q) => q.id !== questionId),
        updatedAt: new Date().toISOString(),
      };
      const saved = await savePresentation(updated);
      setPresentation(saved);
    } catch (err: any) {
      alert(err.message || "Failed to delete question");
    }
  };

  const handleStartPresentation = async () => {
    if (!presentation || presentation.id === "new") {
      alert("Please save the presentation before starting.");
      return;
    }

    if (presentation.questions.length === 0) {
      alert(
        "Please add at least one question before starting the presentation."
      );
      return;
    }

    try {
      setStarting(true);
      const response = await fetch("/api/sessions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          presentationId: presentation.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start presentation");
      }

      // Close the save success modal
      setShowSaveSuccessModal(false);

      // Navigate to host dashboard
      if (data.sessionCode) {
        router.push(`/host/${data.sessionCode}`);
      } else {
        alert(
          `Game session started! Session ID: ${data.sessionId}\n\nPlease note the session code.`
        );
      }
    } catch (error: any) {
      console.error("Error starting presentation:", error);
      alert(error.message || "Failed to start presentation. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  if (status === "loading" || loading) {
    return <Loading />;
  }

  if (!session || !presentation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0B1020] text-[#E5E7EB]">
      {/* Header */}
      <div className="border-b border-[#6366F1]/20 bg-[#1A1F35]/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-[#6366F1]/10 rounded-lg transition-colors"
            >
              <span className="text-[#E5E7EB]">←</span>
            </Link>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent text-2xl font-semibold outline-none border-b-2 border-transparent hover:border-[#6366F1]/30 focus:border-[#6366F1] transition-colors px-2 text-[#E5E7EB]"
              placeholder="New Presentation"
            />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-[#E5E7EB]/60">Autosaved</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-indigo hover:bg-indigo/90 text-white rounded-lg flex items-center gap-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Question List Navigation */}
        <div className="w-80 border-r border-[#6366F1]/20 bg-[#1A1F35]/30 p-4 overflow-y-auto">
          <button
            onClick={() => {
              const newQuestion: Question = {
                id: generateId(),
                type: "multiple-choice",
                text: "New Question",
                options: [
                  { id: generateId(), text: "Option A", isCorrect: false },
                  { id: generateId(), text: "Option B", isCorrect: false },
                  { id: generateId(), text: "Option C", isCorrect: false },
                  { id: generateId(), text: "Option D", isCorrect: false },
                ],
              };
              handleQuestionAdd(newQuestion);
              setSelectedQuestionIndex(presentation.questions.length);
            }}
            className="w-full mb-4 px-4 py-3 bg-indigo hover:bg-indigo/90 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <span>+</span>
            <span>Add Question</span>
          </button>

          <div className="space-y-2">
            {presentation.questions.map((question, index) => (
              <div
                key={question.id}
                onClick={() => setSelectedQuestionIndex(index)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedQuestionIndex === index
                    ? "bg-[#6366F1] text-white"
                    : "bg-[#0B1020]/50 hover:bg-[#0B1020] text-[#E5E7EB]/70"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs opacity-60">
                    Question {index + 1}
                  </span>
                </div>
                <p className="text-sm truncate">
                  {question.text || "New Question"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Question Editor */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            {selectedQuestionIndex !== null &&
            presentation.questions[selectedQuestionIndex] ? (
              <>
                <div className="mb-8">
                  <label className="block text-sm text-[#E5E7EB]/60 mb-2">
                    Question Text
                  </label>
                  <QuestionEditor
                    question={presentation.questions[selectedQuestionIndex]}
                    onSave={(question) => {
                      handleQuestionUpdate(question);
                    }}
                    onCancel={() => {}}
                    onDelete={() => {
                      if (selectedQuestionIndex !== null) {
                        handleQuestionDelete(
                          presentation.questions[selectedQuestionIndex].id
                        );
                        if (presentation.questions.length > 1) {
                          setSelectedQuestionIndex(
                            Math.max(0, selectedQuestionIndex - 1)
                          );
                        } else {
                          setSelectedQuestionIndex(null);
                        }
                      }
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-[#E5E7EB]/60 text-lg mb-4">
                  No question selected. Add a question to get started!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scoring Configuration - Moved to Modal or Collapsible */}
      <div className="hidden">
        {/* Scoring Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <button
            onClick={() => setShowScoringConfig(!showScoringConfig)}
            className="w-full flex justify-between items-center text-left"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Scoring Configuration
            </h2>
            <span className="text-gray-500 dark:text-gray-400">
              {showScoringConfig ? "▼" : "▶"}
            </span>
          </button>

          {showScoringConfig && (
            <div className="mt-6 space-y-6">
              {/* Base Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base Points per Correct Answer
                </label>
                <input
                  type="number"
                  min="1"
                  value={scoringConfig.basePoints}
                  onChange={(e) =>
                    setScoringConfig({
                      ...scoringConfig,
                      basePoints: parseInt(e.target.value) || 100,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Points awarded for each correct answer
                </p>
              </div>

              {/* Time-Based Bonus */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time-Based Bonus
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Award bonus points based on how quickly players answer
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoringConfig.timeBonusEnabled}
                      onChange={(e) =>
                        setScoringConfig({
                          ...scoringConfig,
                          timeBonusEnabled: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {scoringConfig.timeBonusEnabled && (
                  <div className="ml-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Maximum Time Bonus Points
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={scoringConfig.maxTimeBonus}
                      onChange={(e) =>
                        setScoringConfig({
                          ...scoringConfig,
                          maxTimeBonus: parseInt(e.target.value) || 50,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Maximum bonus points for answering immediately (bonus
                      decreases as time passes)
                    </p>
                  </div>
                )}
              </div>

              {/* Streak Bonus */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Streak Bonus
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowStreakBonusInfo(true)}
                        className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title="Learn how Streak Bonus works"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Award bonus points for consecutive correct answers
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoringConfig.streakBonusEnabled}
                      onChange={(e) =>
                        setScoringConfig({
                          ...scoringConfig,
                          streakBonusEnabled: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {scoringConfig.streakBonusEnabled && (
                  <div className="ml-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Streak Thresholds (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={scoringConfig.streakThresholds.join(", ")}
                        onChange={(e) => {
                          const thresholds = e.target.value
                            .split(",")
                            .map((s) => parseInt(s.trim()))
                            .filter((n) => !isNaN(n) && n > 0);
                          if (thresholds.length > 0) {
                            setScoringConfig({
                              ...scoringConfig,
                              streakThresholds: thresholds,
                              // Adjust bonus values array length if needed
                              streakBonusValues:
                                thresholds.length ===
                                scoringConfig.streakBonusValues.length
                                  ? scoringConfig.streakBonusValues
                                  : thresholds.map(
                                      (_, i) =>
                                        scoringConfig.streakBonusValues[i] || 10
                                    ),
                            });
                          }
                        }}
                        placeholder="3, 5, 7"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Number of consecutive correct answers required (e.g., 3,
                        5, 7)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bonus Values (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={scoringConfig.streakBonusValues.join(", ")}
                        onChange={(e) => {
                          const values = e.target.value
                            .split(",")
                            .map((s) => parseInt(s.trim()))
                            .filter((n) => !isNaN(n) && n >= 0);
                          if (
                            values.length > 0 &&
                            values.length ===
                              scoringConfig.streakThresholds.length
                          ) {
                            setScoringConfig({
                              ...scoringConfig,
                              streakBonusValues: values,
                            });
                          }
                        }}
                        placeholder="10, 25, 50"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Bonus points for each threshold (must match number of
                        thresholds)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <QuestionList
          questions={presentation.questions}
          onUpdate={handleQuestionUpdate}
          onAdd={handleQuestionAdd}
          onDelete={handleQuestionDelete}
        />
      </div>

      {/* Save Success Modal */}
      <Modal
        isOpen={showSaveSuccessModal}
        onClose={() => {
          setShowSaveSuccessModal(false);
          // If it was a new presentation, update the URL
          if (isNew && savedPresentationId) {
            router.replace(`/presentations/${savedPresentationId}`);
          }
        }}
        title="Presentation Saved!"
      >
        <div>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            What would you like to do next?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleStartPresentation}
              disabled={
                starting || !presentation || presentation.questions.length === 0
              }
              className="px-6 py-3 bg-success text-white rounded-lg hover:bg-success/90 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {starting ? "Starting..." : "Start Presentation"}
            </button>
            <button
              onClick={() => {
                router.push("/");
              }}
              className="px-6 py-3 bg-indigo text-white rounded-lg hover:bg-indigo/90 font-medium transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                setShowSaveSuccessModal(false);
                // If it was a new presentation, update the URL
                if (isNew && savedPresentationId) {
                  router.replace(`/presentations/${savedPresentationId}`);
                }
              }}
              className="px-6 py-3 bg-card-bg border border-indigo/30 text-text-light rounded-lg hover:bg-indigo/10 font-medium transition-colors"
            >
              Continue Editing
            </button>
          </div>
        </div>
      </Modal>

      {/* Streak Bonus Info Modal */}
      <Modal
        isOpen={showStreakBonusInfo}
        onClose={() => setShowStreakBonusInfo(false)}
        title="How Streak Bonus Works"
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              What is Streak Bonus?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Streak Bonus rewards players for answering multiple questions
              correctly in a row. The more consecutive correct answers, the
              bigger the bonus!
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              How to Set It Up
            </h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <p className="font-medium mb-1">1. Streak Thresholds:</p>
                <p>
                  Enter the number of consecutive correct answers needed to
                  trigger each bonus level.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Example:{" "}
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    3, 5, 7
                  </code>{" "}
                  means bonuses at 3, 5, and 7+ consecutive correct answers
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">2. Bonus Values:</p>
                <p>
                  Enter the bonus points awarded for each threshold. Must match
                  the number of thresholds.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Example:{" "}
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    10, 25, 50
                  </code>{" "}
                  means 10 points at 3 correct, 25 at 5 correct, 50 at 7+
                  correct
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Example Scenario:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>
                Thresholds:{" "}
                <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
                  3, 5, 7
                </code>
              </li>
              <li>
                Bonus Values:{" "}
                <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
                  10, 25, 50
                </code>
              </li>
              <li>
                Player answers 3 questions correctly → Gets 10 bonus points
              </li>
              <li>
                Player answers 5 questions correctly → Gets 25 bonus points
              </li>
              <li>
                Player answers 7+ questions correctly → Gets 50 bonus points
              </li>
              <li className="mt-2 font-medium">
                If player gets one wrong, streak resets to 0
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Tip:</strong> Make sure the number of bonus values matches
              the number of thresholds. For example, if you have 3 thresholds,
              you need 3 bonus values.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
