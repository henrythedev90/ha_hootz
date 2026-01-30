"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Presentation } from "@/types";
import { getAllPresentations, deletePresentation } from "@/lib/storage";
import PresentationCard from "@/components/PresentationCard";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import Loading from "@/components/Loading";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

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
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // Prevent duplicate calls
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    loadPresentations();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadPresentations and router are stable; avoid refetch on their identity change
  }, [session, status]);

  const loadPresentations = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAllPresentations();
      setPresentations(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load presentations";
      setError(message || "Failed to load presentations");
      if ((message || "").includes("Unauthorized")) {
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
      hasLoadedRef.current = false; // Reset to allow reload after delete
      await loadPresentations();
      setDeleteModalOpen(false);
      setPresentationToDelete(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete presentation");
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
    <div className="min-h-screen bg-deep-navy text-text-light p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-5xl font-bold mb-4 bg-linear-to-r from-indigo to-cyan bg-clip-text text-transparent">
                Ha-Hootz
              </h1>
              <p className="text-xl text-text-light/70">
                Live Trivia Made Easy
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-text-light/70">
                  {session.user.name || session.user.email}
                </p>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-cyan hover:text-cyan/80 hover:underline transition-colors"
                >
                  Sign out
                </button>
              </div>
              <motion.button
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 0 30px rgba(99, 102, 241, 0.3)",
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/presentations/new")}
                className="px-8 py-4 bg-indigo hover:bg-indigo/90 text-white rounded-xl flex items-center gap-3 transition-all"
              >
                <Plus className="w-6 h-6" />
                <span className="text-lg">Create Presentation</span>
              </motion.button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {presentations.length === 0 ? (
          <div className="text-center py-16 bg-card-bg rounded-xl shadow-md border border-indigo/20">
            <p className="text-text-light/60 text-lg mb-4">
              No presentations yet. Create your first one to get started!
            </p>
            <motion.button
              whileHover={{
                scale: 1.02,
                boxShadow: "0 0 30px rgba(99, 102, 241, 0.3)",
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/presentations/new")}
              className="px-8 py-4 bg-indigo hover:bg-indigo/90 text-white rounded-xl font-medium transition-all"
            >
              Create Presentation
            </motion.button>
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
