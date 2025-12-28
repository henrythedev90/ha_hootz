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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {presentation.title}
          </h3>
          {presentation.description && (
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
              {presentation.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          title={
            presentation.questions.length === 0
              ? "Add at least one question to start"
              : "Start Presentation"
          }
        >
          {starting ? "Starting..." : "Start"}
        </button>
        <Link
          href={`/presentations/${presentation.id}`}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Edit
        </Link>
        <button
          onClick={() => onDelete(presentation.id)}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
