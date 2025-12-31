"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Info, Plus } from "lucide-react";
import { Presentation, Question, ScoringConfig } from "@/types";
import { getPresentationById, savePresentation } from "@/lib/storage";
import { generateId, getDefaultScoringConfig } from "@/lib/utils";
import QuestionList from "@/components/QuestionList";
import QuestionViewModal from "@/components/QuestionViewModal";
import SaveSuccessModal from "@/components/SaveSuccessModal";
import StreakBonusInfoModal from "@/components/StreakBonusInfoModal";
import Modal from "@/components/Modal";
import Loading from "@/components/Loading";

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
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>(
    getDefaultScoringConfig()
  );
  const [showStreakBonusInfo, setShowStreakBonusInfo] = useState(false);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<
    number | null
  >(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [viewingQuestionIndex, setViewingQuestionIndex] = useState<
    number | null
  >(null);
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null);

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
      setEditQuestionId(null); // Clear edit mode after saving
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
      setEditQuestionId(null); // Clear edit mode after saving
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
      if (editQuestionId === questionId) {
        setEditQuestionId(null);
      }
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
      if (editQuestionId === questionId) {
        setEditQuestionId(null);
      }
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
      <div className="sticky top-0 z-50 border-b border-[#6366F1]/20 bg-[#1A1F35]/80 backdrop-blur-md shadow-lg px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/")}
              className="p-2 hover:bg-[#6366F1]/10 rounded-lg transition-colors flex items-center gap-2 text-[#22D3EE]"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </motion.button>
          </div>
          <div className="flex gap-2">
            {!saving && presentation && presentation.id !== "new" && (
              <span className="text-sm text-[#22C55E] self-center">
                ● Autosaved
              </span>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Presentation"}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Title/Description and Scoring Configuration Row */}
        <div className="grid grid-cols-4 gap-6">
          {/* Title and Description Section - 75% (3/4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-2 bg-[#1A1F35] rounded-xl p-6 border border-[#6366F1]/20"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#E5E7EB]/80 mb-2">
                  Presentation Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-4 py-3 text-[#E5E7EB] placeholder-[#E5E7EB]/30 outline-none transition-all"
                  placeholder="Enter presentation title..."
                />
              </div>
              <div>
                <label className="block text-sm text-[#E5E7EB]/80 mb-2">
                  Description{" "}
                  <span className="text-[#E5E7EB]/40">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-4 py-3 text-[#E5E7EB] placeholder-[#E5E7EB]/30 outline-none transition-all resize-none"
                  rows={3}
                  placeholder="Enter a description (optional)..."
                />
              </div>
            </div>
          </motion.div>

          {/* Scoring Configuration - 25% (1/4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-2 bg-[#1A1F35] rounded-xl p-6 border border-[#6366F1]/20"
          >
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <span className="text-sm">Scoring</span>
              <Info className="w-4 h-4 text-[#22D3EE]" />
            </h3>

            <div className="space-y-5">
              {/* Base Points */}
              <div>
                <label className="block text-xs text-[#E5E7EB]/80 mb-2">
                  Base Points
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
                  className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-3 py-2 text-[#E5E7EB] outline-none transition-all text-sm"
                />
                <p className="mt-1 text-xs text-[#E5E7EB]/50">
                  Per correct answer
                </p>
              </div>

              {/* Bonus Sections Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Time-Based Bonus */}
                <div className="p-3 bg-[#0B1020]/50 rounded-lg border border-[#6366F1]/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[#E5E7EB]">
                        Time Bonus
                      </span>
                      <Info className="w-3 h-3 text-[#22D3EE]/60" />
                    </div>
                    <button
                      onClick={() =>
                        setScoringConfig({
                          ...scoringConfig,
                          timeBonusEnabled: !scoringConfig.timeBonusEnabled,
                        })
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        scoringConfig.timeBonusEnabled
                          ? "bg-[#22D3EE]"
                          : "bg-[#1A1F35] border-2 border-[#6366F1]/30"
                      }`}
                    >
                      <motion.div
                        animate={{
                          x: scoringConfig.timeBonusEnabled ? 20 : 2,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                        }}
                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>
                  <p className="text-xs text-[#E5E7EB]/60 mb-2">
                    Bonus for quick answers
                  </p>
                  {scoringConfig.timeBonusEnabled && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2"
                    >
                      <label className="block text-xs text-[#E5E7EB]/80 mb-1">
                        Max Bonus
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
                        className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-3 py-2 text-[#E5E7EB] outline-none transition-all text-sm"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Streak Bonus */}
                <div className="p-3 bg-[#0B1020]/50 rounded-lg border border-[#6366F1]/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[#E5E7EB]">
                        Streak Bonus
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowStreakBonusInfo(true)}
                        className="text-[#22D3EE] hover:text-[#22D3EE]/80 transition-colors"
                        title="Learn how Streak Bonus works"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() =>
                        setScoringConfig({
                          ...scoringConfig,
                          streakBonusEnabled: !scoringConfig.streakBonusEnabled,
                        })
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        scoringConfig.streakBonusEnabled
                          ? "bg-[#22D3EE]"
                          : "bg-[#1A1F35] border-2 border-[#6366F1]/30"
                      }`}
                    >
                      <motion.div
                        animate={{
                          x: scoringConfig.streakBonusEnabled ? 20 : 2,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                        }}
                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>
                  <p className="text-xs text-[#E5E7EB]/60 mb-2">
                    Bonus for consecutive correct
                  </p>
                  {scoringConfig.streakBonusEnabled && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 space-y-3"
                    >
                      <div>
                        <label className="block text-xs text-[#E5E7EB]/80 mb-1">
                          Thresholds
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
                                          scoringConfig.streakBonusValues[i] ||
                                          10
                                      ),
                              });
                            }
                          }}
                          placeholder="3, 5, 7"
                          className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-3 py-2 text-[#E5E7EB] placeholder-[#E5E7EB]/30 outline-none transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#E5E7EB]/80 mb-1">
                          Bonus Values
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
                          className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-3 py-2 text-[#E5E7EB] placeholder-[#E5E7EB]/30 outline-none transition-all text-sm"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Questions Section */}
        <div className="flex gap-6">
          {/* Question Navigation Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-80 border-r border-[#6366F1]/20 bg-[#1A1F35]/30 p-4 overflow-y-auto max-h-[calc(100vh-300px)]"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const newQuestion: Question = {
                  id: generateId(),
                  type: "multiple-choice",
                  text: "",
                  options: [],
                };
                handleQuestionAdd(newQuestion);
                setSelectedQuestionIndex(presentation.questions.length);
              }}
              className="w-full mb-4 px-4 py-3 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Question</span>
            </motion.button>

            <div className="space-y-2">
              {presentation.questions.map((question, index) => (
                <motion.div
                  key={question.id}
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    setSelectedQuestionIndex(index);
                    setViewingQuestionIndex(index);
                    setShowQuestionModal(true);
                  }}
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
                    {question.text || "Untitled Question"}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Question List Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1 bg-[#1A1F35] rounded-xl p-6 border border-[#6366F1]/20"
          >
            <QuestionList
              questions={presentation.questions}
              onUpdate={handleQuestionUpdate}
              onAdd={handleQuestionAdd}
              onDelete={handleQuestionDelete}
              editQuestionId={editQuestionId}
            />
          </motion.div>
        </div>
      </div>

      {/* Question View Modal */}
      <QuestionViewModal
        isOpen={showQuestionModal}
        onClose={() => {
          setShowQuestionModal(false);
          setViewingQuestionIndex(null);
        }}
        question={
          viewingQuestionIndex !== null
            ? presentation.questions[viewingQuestionIndex]
            : null
        }
        questionNumber={(viewingQuestionIndex ?? 0) + 1}
        onEdit={() => {
          if (viewingQuestionIndex !== null) {
            const question = presentation.questions[viewingQuestionIndex];
            setEditQuestionId(question.id);
          }
        }}
        onDelete={() => {
          if (viewingQuestionIndex !== null) {
            const question = presentation.questions[viewingQuestionIndex];
            handleQuestionDelete(question.id);
            setViewingQuestionIndex(null);
          }
        }}
      />

      {/* Save Success Modal */}
      <SaveSuccessModal
        isOpen={showSaveSuccessModal}
        onClose={() => {
          setShowSaveSuccessModal(false);
          // If it was a new presentation, update the URL
          if (isNew && savedPresentationId) {
            router.replace(`/presentations/${savedPresentationId}`);
          }
        }}
        onStart={handleStartPresentation}
        onGoToDashboard={() => router.push("/")}
        onContinueEditing={() => {
          setShowSaveSuccessModal(false);
          // If it was a new presentation, update the URL
          if (isNew && savedPresentationId) {
            router.replace(`/presentations/${savedPresentationId}`);
          }
        }}
        starting={starting}
        canStart={!!presentation && presentation.questions.length > 0}
      />

      {/* Streak Bonus Info Modal */}
      <StreakBonusInfoModal
        isOpen={showStreakBonusInfo}
        onClose={() => setShowStreakBonusInfo(false)}
      />
    </div>
  );
}
