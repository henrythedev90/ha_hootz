"use client";

import { useState, useEffect } from "react";
import { Presentation } from "@/types";
import { getAllPresentations, deletePresentation } from "@/lib/storage";
import PresentationCard from "@/components/PresentationCard";
import Link from "next/link";

export default function Home() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);

  useEffect(() => {
    setPresentations(getAllPresentations());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this presentation?")) {
      deletePresentation(id);
      setPresentations(getAllPresentations());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Ha Hootz
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create and manage your trivia game presentations
            </p>
          </div>
          <Link
            href="/presentations/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg shadow-md transition-colors"
          >
            + New Presentation
          </Link>
        </div>

        {presentations.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              No presentations yet. Create your first one to get started!
            </p>
            <Link
              href="/presentations/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Create Presentation
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presentations.map((presentation) => (
              <PresentationCard
                key={presentation.id}
                presentation={presentation}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
