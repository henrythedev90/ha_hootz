"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Question } from "@/types";

interface QuestionNavigationSidebarProps {
  questions: Question[];
  selectedQuestionIndex: number | null;
  onAddQuestion: () => void;
  onSelectQuestion: (index: number) => void;
}

export default function QuestionNavigationSidebar({
  questions,
  selectedQuestionIndex,
  onAddQuestion,
  onSelectQuestion,
}: QuestionNavigationSidebarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="w-80 border-r border-[#6366F1]/20 bg-[#1A1F35]/30 p-4 overflow-y-auto max-h-[calc(100vh-300px)]"
    >
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onAddQuestion}
        className="w-full mb-4 px-4 py-3 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        <Plus className="w-5 h-5" />
        <span>Add Question</span>
      </motion.button>

      <div className="space-y-2">
        {questions.map((question, index) => (
          <motion.div
            key={question.id}
            whileHover={{ x: 4 }}
            onClick={() => onSelectQuestion(index)}
            className={`p-4 rounded-lg cursor-pointer transition-all ${
              selectedQuestionIndex === index
                ? "bg-[#6366F1] text-white"
                : "bg-[#0B1020]/50 hover:bg-[#0B1020] text-[#E5E7EB]/70"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs opacity-60">Question {index + 1}</span>
            </div>
            <p className="text-sm truncate">
              {question.text || "Untitled Question"}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

