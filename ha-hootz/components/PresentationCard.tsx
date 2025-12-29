"use client";

import { useState } from "react";
import { Presentation } from "@/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Edit, Trash2 } from "lucide-react";

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

    // Start the presentation
    const scoringConfig = {
      timeBonusEnabled: presentation.scoringConfig?.timeBonusEnabled ?? false,
      streakBonusEnabled:
        presentation.scoringConfig?.streakBonusEnabled ?? false,
    };

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
    <div className="bg-card-bg rounded-xl p-6 border border-indigo/20 hover:border-indigo/40 transition-all cursor-pointer group hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(99,102,241,0.2)]">
      <h3 className="text-xl font-semibold mb-2 text-text-light group-hover:text-cyan transition-colors">
        {presentation.title}
      </h3>
      <p className="text-sm text-text-light/60 mb-4">
        {presentation.questions.length} questions • Updated{" "}
        {formatDate(presentation.updatedAt)}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleStartPresentation}
          disabled={starting || presentation.questions.length === 0}
          className="flex-1 px-4 py-2 bg-indigo hover:bg-indigo/90 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          title={
            presentation.questions.length === 0
              ? "Add at least one question to start"
              : "Start Presentation"
          }
        >
          <Play className="w-4 h-4" />
          <span>{starting ? "Starting..." : "Host"}</span>
        </button>
        <Link
          href={`/presentations/${presentation.id}`}
          className="px-4 py-2 bg-card-bg hover:bg-[#252B44] border border-indigo/30 text-text-light rounded-lg transition-colors flex items-center justify-center"
        >
          <Edit className="w-4 h-4" />
        </Link>
        <button
          onClick={() => onDelete(presentation.id)}
          className="px-4 py-2 bg-card-bg hover:bg-error/10 border border-error/30 text-error rounded-lg transition-colors flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
