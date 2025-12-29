"use client";

import Modal from "./Modal";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  description?: string;
  deleting?: boolean;
  playerMode?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  description = "This action cannot be undone. All data will be permanently deleted.",
  deleting = false,
  playerMode = false,
}: DeleteConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div>
        <p className="text-[var(--text-light)]/80 mb-2">
          Are you sure you want to {playerMode ? "leave" : "delete"} this{" "}
          {itemName}?
        </p>
        {playerMode ? null : (
          <p className="text-lg font-semibold text-[var(--text-light)] mb-4">
            "{title}"
          </p>
        )}
        <p className="text-sm text-[var(--text-light)]/60 mb-6">
          {description}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-6 py-2 bg-[var(--card-bg)] border border-[var(--indigo)]/30 text-[var(--text-light)] rounded-lg hover:bg-[var(--indigo)]/10 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-6 py-2 bg-[var(--error)] text-white rounded-lg hover:bg-[var(--error)]/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
