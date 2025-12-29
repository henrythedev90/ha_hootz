"use client";

import { useState } from "react";
import { Presentation } from "@/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PresentationCardProps {
  presentation: Presentation;
  onDelete: (id: string) => void;
}

export default function PresentationCard({
  presentation,
  onDelete,
}: PresentationCardProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const handleStartPresentation = async () => {
    if (presentation.questions.length === 0) {
      alert(
        "Please add at least one question before starting the presentation."
      );
      return;
    }

    // Log scoring configuration before starting
    console.log("🎮 Starting presentation with scoring config:", {
      presentationId: presentation.id,
      presentationTitle: presentation.title,
      hasScoringConfig: !!presentation.scoringConfig,
      scoringConfig: presentation.scoringConfig || "Using defaults",
      timeBonusEnabled: presentation.scoringConfig?.timeBonusEnabled ?? false,
      streakBonusEnabled:
        presentation.scoringConfig?.streakBonusEnabled ?? false,
    });

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

  return (
    <div className="bg-[#1A1F35] rounded-xl p-6 border border-[#6366F1]/20 hover:border-[#6366F1]/40 transition-all cursor-pointer group hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(99,102,241,0.2)]">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-[#E5E7EB] mb-2 group-hover:text-[#22D3EE] transition-colors">
            {presentation.title}
          </h3>
          {presentation.description && (
            <p className="text-[#E5E7EB]/60 text-sm mb-2">
              {presentation.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-[#E5E7EB]/60">
            <span>{presentation.questions.length} questions</span>
            <span>•</span>
            <span>Updated {formatDate(presentation.updatedAt)}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleStartPresentation}
          disabled={starting || presentation.questions.length === 0}
          className="flex-1 px-4 py-2 bg-indigo hover:bg-indigo/90 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          title={
            presentation.questions.length === 0
              ? "Add at least one question to start"
              : "Start Presentation"
          }
        >
          {starting ? "Starting..." : "Host"}
        </button>
        <Link
          href={`/presentations/${presentation.id}`}
          className="px-4 py-2 bg-card-bg hover:bg-indigo/10 border border-indigo/30 text-text-light rounded-lg transition-colors text-sm font-medium"
        >
          Edit
        </Link>
        <button
          onClick={() => onDelete(presentation.id)}
          className="px-4 py-2 bg-card-bg hover:bg-error/10 border border-error/30 text-error rounded-lg transition-colors text-sm font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
