"use client";

import { motion } from "framer-motion";
import { Question } from "@/types";
import Modal from "./Modal";
import { Trash2 } from "lucide-react";

interface QuestionViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  questionNumber: number;
  onEdit: () => void;
  onDelete: () => void;
}

export default function QuestionViewModal({
  isOpen,
  onClose,
  question,
  questionNumber,
  onEdit,
  onDelete,
}: QuestionViewModalProps) {
  if (!question) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Question ${questionNumber}`} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 bg-[#6366F1]/30 text-[#22D3EE] text-xs rounded font-medium">
            Q{questionNumber}
          </span>
          <span className="px-2 py-1 bg-[#6366F1]/20 text-[#6366F1] rounded text-xs font-medium">
            {question.type === "multiple-choice"
              ? "Multiple Choice"
              : "True/False"}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-medium text-[#E5E7EB] mb-4">
            {question.text}
          </h3>
          <div className="space-y-2">
            {question.options.map((option) => (
              <div
                key={option.id}
                className={`text-sm px-3 py-2 rounded ${
                  option.isCorrect
                    ? "bg-[#22C55E]/20 text-[#22C55E] font-medium"
                    : "bg-[#1A1F35] text-[#E5E7EB]/60"
                }`}
              >
                {option.isCorrect ? "✓ " : "○ "}
                {option.text}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-[#6366F1]/20">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="px-4 py-2 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/30 text-[#EF4444] rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Question</span>
          </motion.button>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-4 py-2 bg-[#1A1F35] hover:bg-[#0B1020] text-[#E5E7EB] rounded-lg transition-colors border border-[#6366F1]/20"
            >
              Close
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onEdit();
                onClose();
              }}
              className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg transition-colors"
            >
              Edit Question
            </motion.button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

