"use client";

import { motion } from "framer-motion";
import Modal from "./Modal";

interface SaveSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  onGoToDashboard: () => void;
  onContinueEditing: () => void;
  starting: boolean;
  canStart: boolean;
}

export default function SaveSuccessModal({
  isOpen,
  onClose,
  onStart,
  onGoToDashboard,
  onContinueEditing,
  starting,
  canStart,
}: SaveSuccessModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Presentation Saved!">
      <div>
        <p className="text-[#E5E7EB]/80 mb-6">
          What would you like to do next?
        </p>
        <div className="flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            disabled={!canStart || starting}
            className="px-6 py-3 bg-[#22C55E] hover:bg-[#1DB954] text-white rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {starting ? "Starting..." : "Start Presentation"}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onGoToDashboard}
            className="px-6 py-3 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onContinueEditing}
            className="px-6 py-3 bg-[#1A1F35] hover:bg-[#0B1020] text-[#E5E7EB] rounded-lg font-medium transition-colors border border-[#6366F1]/20"
          >
            Continue Editing
          </motion.button>
        </div>
      </div>
    </Modal>
  );
}

