"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Presentation, Question, ScoringConfig } from "@/types";
import { getPresentationById, savePresentation } from "@/lib/storage";
import { generateId, getDefaultScoringConfig } from "@/lib/utils";
import PresentationEditorHeader from "@/components/PresentationEditorHeader";
import PresentationDetailsForm from "@/components/PresentationDetailsForm";
import ScoringConfigurationPanel from "@/components/ScoringConfigurationPanel";
import QuestionNavigationSidebar from "@/components/QuestionNavigationSidebar";
import QuestionList from "@/components/QuestionList";
import QuestionViewModal from "@/components/QuestionViewModal";
import SaveSuccessModal from "@/components/SaveSuccessModal";
import StreakBonusInfoModal from "@/components/StreakBonusInfoModal";
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

  const handleQuestionReorder = async (fromIndex: number, toIndex: number) => {
    if (!presentation) return;

    const isNew = presentation.id === "new";
    const hasTitle = presentation.title.trim().length > 0;

    // Reorder questions
    const reorderedQuestions = [...presentation.questions];
    const [movedQuestion] = reorderedQuestions.splice(fromIndex, 1);
    reorderedQuestions.splice(toIndex, 0, movedQuestion);

    // If presentation is new and has no title, just update local state
    if (isNew && !hasTitle) {
      const updated: Presentation = {
        ...presentation,
        questions: reorderedQuestions,
        updatedAt: new Date().toISOString(),
      };
      setPresentation(updated);
      // Update selected index if it was affected by the reorder
      if (selectedQuestionIndex !== null) {
        if (selectedQuestionIndex === fromIndex) {
          setSelectedQuestionIndex(toIndex);
        } else if (
          selectedQuestionIndex > fromIndex &&
          selectedQuestionIndex <= toIndex
        ) {
          setSelectedQuestionIndex(selectedQuestionIndex - 1);
        } else if (
          selectedQuestionIndex < fromIndex &&
          selectedQuestionIndex >= toIndex
        ) {
          setSelectedQuestionIndex(selectedQuestionIndex + 1);
        }
      }
      return;
    }

    // Otherwise, save to database
    try {
      const updated: Presentation = {
        ...presentation,
        questions: reorderedQuestions,
        updatedAt: new Date().toISOString(),
      };
      const saved = await savePresentation(updated);
      setPresentation(saved);
      // Update selected index if it was affected by the reorder
      if (selectedQuestionIndex !== null) {
        if (selectedQuestionIndex === fromIndex) {
          setSelectedQuestionIndex(toIndex);
        } else if (
          selectedQuestionIndex > fromIndex &&
          selectedQuestionIndex <= toIndex
        ) {
          setSelectedQuestionIndex(selectedQuestionIndex - 1);
        } else if (
          selectedQuestionIndex < fromIndex &&
          selectedQuestionIndex >= toIndex
        ) {
          setSelectedQuestionIndex(selectedQuestionIndex + 1);
        }
      }
    } catch (err: any) {
      alert(err.message || "Failed to reorder questions");
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
      <PresentationEditorHeader
        saving={saving}
        isSaved={!!presentation && presentation.id !== "new"}
        onSave={handleSave}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Title/Description and Scoring Configuration Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="lg:col-span-2">
            <PresentationDetailsForm
              title={title}
              description={description}
              questionDuration={scoringConfig.questionDuration || 30}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onQuestionDurationChange={(duration) =>
                setScoringConfig({
                  ...scoringConfig,
                  questionDuration: duration,
                })
              }
            />
          </div>

          <div className="lg:col-span-2">
            <ScoringConfigurationPanel
              scoringConfig={scoringConfig}
              onConfigChange={setScoringConfig}
              onShowStreakBonusInfo={() => setShowStreakBonusInfo(true)}
            />
          </div>
        </div>

        {/* Questions Section */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <QuestionNavigationSidebar
            questions={presentation.questions}
            selectedQuestionIndex={selectedQuestionIndex}
            onSelectQuestion={(index) => {
              setSelectedQuestionIndex(index);
              setViewingQuestionIndex(index);
              setShowQuestionModal(true);
            }}
            onReorder={handleQuestionReorder}
          />

          {/* Question List Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1 bg-[#1A1F35] rounded-xl p-4 lg:p-6 border border-[#6366F1]/20"
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
