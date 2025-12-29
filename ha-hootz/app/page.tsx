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
    <div className="min-h-screen bg-[#0B1020] text-[#E5E7EB]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-bold mb-4 bg-linear-to-r from-[#6366F1] to-[#22D3EE] bg-clip-text text-transparent">
              Ha-Hootz
            </h1>
            <p className="text-xl text-[#E5E7EB]/70">Live Trivia Made Easy</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-[#E5E7EB]/60">
                {session.user.name || session.user.email}
              </p>
              <button
                onClick={handleSignOut}
                className="text-sm text-[#22D3EE] hover:text-[#22D3EE]/80 transition-colors"
              >
                Sign out
              </button>
            </div>
            <Link
              href="/presentations/new"
              className="px-8 py-4 bg-indigo hover:bg-indigo/90 text-white rounded-xl flex items-center gap-3 transition-all font-medium text-lg shadow-lg hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]"
            >
              <span>+</span>
              <span>Create Presentation</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {presentations.length === 0 ? (
          <div className="text-center py-16 bg-[#1A1F35] rounded-xl border border-[#6366F1]/20">
            <p className="text-[#E5E7EB]/70 text-lg mb-4">
              No presentations yet. Create your first one to get started!
            </p>
            <Link
              href="/presentations/new"
              className="inline-block px-8 py-4 bg-indigo hover:bg-indigo/90 text-white rounded-xl font-medium transition-colors"
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
