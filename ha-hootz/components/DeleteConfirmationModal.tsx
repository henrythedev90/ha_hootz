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
  countdown?: number;
}
//Make improvements on this component. Add a second tier to the modal to confirm the deletion. Type in the name of the presentation to confirm the deletion.
export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  description = "This action cannot be undone. All data will be permanently deleted.",
  deleting = false,
  playerMode = false,
  countdown,
}: DeleteConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div>
        <p className="text-text-light/70 mb-2">
          Are you sure you want to {playerMode ? "leave" : "cancel"} this{" "}
          {itemName}?
        </p>
        {playerMode ? null : (
          <p className="text-lg font-semibold text-text-light mb-4">
            &quot;{title}&quot;
          </p>
        )}
        {countdown !== undefined && countdown > 0 && (
          <div className="mb-4 p-3 bg-cyan/10 border border-cyan/30 rounded-lg">
            <p className="text-sm text-cyan font-semibold mb-1">
              ⏱️ Time is still running!
            </p>
            <p className="text-xs text-text-light/70">
              Game will start automatically in{" "}
              <span className="font-bold text-cyan">{countdown}</span>{" "}
              {countdown === 1 ? "second" : "seconds"} if you don&apos;t cancel.
            </p>
          </div>
        )}
        <p className="text-sm text-text-light/60 mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-6 py-2 bg-deep-navy text-text-light rounded-md hover:bg-deep-navy/80 transition-colors font-medium border border-indigo/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {playerMode ? "Stay" : "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-6 py-2 bg-error text-white rounded-md hover:bg-error/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? "Deleting..." : playerMode ? "Leave" : "Confirm Cancel"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
