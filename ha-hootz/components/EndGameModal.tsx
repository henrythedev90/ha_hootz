"use client";

import { useRouter } from "next/navigation";
import Modal from "./Modal";

interface EndGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sessionCode: string;
}

export default function EndGameModal({
  isOpen,
  onClose,
  onConfirm,
  sessionCode,
}: EndGameModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="End Game" size="md">
      <div className="space-y-4">
        <p className="text-text-light/70">
          Are you sure you want to end the game? All players will be
          disconnected.
        </p>
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-deep-navy text-text-light rounded-md hover:bg-deep-navy/80 transition-colors font-medium border border-indigo/30"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-error text-white rounded-md hover:bg-error/90 transition-colors font-medium"
          >
            End Game
          </button>
        </div>
      </div>
    </Modal>
  );
}

