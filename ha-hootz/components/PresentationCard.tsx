"use client";

import { Presentation } from "@/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface PresentationCardProps {
  presentation: Presentation;
  onDelete: (id: string) => void;
}

export default function PresentationCard({
  presentation,
  onDelete,
}: PresentationCardProps) {
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
          onClick={() => {
            // Future implementation - Start Presentation
            alert("Start Presentation feature coming soon!");
          }}
          disabled
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium cursor-not-allowed opacity-60 disabled:opacity-60"
          title="Start Presentation (Coming Soon)"
        >
          Start
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
