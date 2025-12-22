"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Presentation } from "@/types";
import { getAllPresentations, deletePresentation } from "@/lib/storage";
import PresentationCard from "@/components/PresentationCard";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import Loading from "@/components/Loading";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [presentationToDelete, setPresentationToDelete] =
    useState<Presentation | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    loadPresentations();
  }, [session, status, router]);

  const loadPresentations = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAllPresentations();
      setPresentations(data);
    } catch (err: any) {
      setError(err.message || "Failed to load presentations");
      if (err.message?.includes("Unauthorized")) {
        router.push("/auth/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (presentation: Presentation) => {
    setPresentationToDelete(presentation);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!presentationToDelete) return;

    try {
      setDeleting(true);
      await deletePresentation(presentationToDelete.id);
      await loadPresentations();
      setDeleteModalOpen(false);
      setPresentationToDelete(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete presentation");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setPresentationToDelete(null);
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/auth/signin");
  };

  if (status === "loading" || loading) {
    return <Loading />;
  }

  if (!session) {
    return null;
  }

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
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {session.user.name || session.user.email}
              </p>
              <button
                onClick={handleSignOut}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sign out
              </button>
            </div>
            <Link
              href="/presentations/new"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg shadow-md transition-colors"
            >
              + New Presentation
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

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
                onDelete={() => handleDeleteClick(presentation)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {presentationToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title={presentationToDelete.title}
          itemName="presentation"
          description="This action cannot be undone. All questions and data will be permanently deleted."
          deleting={deleting}
        />
      )}
    </div>
  );
}
