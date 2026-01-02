"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Question } from "@/types";
import { GripVertical } from "lucide-react";

interface QuestionNavigationSidebarProps {
  questions: Question[];
  selectedQuestionIndex: number | null;
  onSelectQuestion: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export default function QuestionNavigationSidebar({
  questions,
  selectedQuestionIndex,
  onSelectQuestion,
  onReorder,
}: QuestionNavigationSidebarProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex && onReorder) {
      onReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-[#6366F1]/20 bg-[#1A1F35]/30 p-4 overflow-y-auto max-h-[300px] lg:max-h-[calc(100vh-300px)] rounded-lg"
    >
      <div className="sticky top-0 z-10 bg-[#1A1F35]/30">
        <h1 className="w-full px-4 py-3 bg-[#6366F1] hover:bg-[#5558E3] rounded-lg flex items-center justify-center gap-2 transition-colors text-lg font-semibold text-[#E5E7EB] mb-4">
          Question Bank
        </h1>
      </div>

      <div className="space-y-2">
        {questions.map((question, index) => (
          <motion.div
            key={question.id}
            whileHover={draggedIndex === null ? { x: 4 } : {}}
            className="relative"
          >
            <div
              draggable={!!onReorder}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectQuestion(index)}
              className={`group p-4 rounded-lg cursor-pointer transition-all relative ${
                selectedQuestionIndex === index
                  ? "bg-[#6366F1] text-white"
                  : "bg-[#6366F1]/50 hover:bg-[#1A1F35]/90 text-[#E5E7EB]/70"
              } ${
                draggedIndex === index
                  ? "opacity-50 scale-95"
                  : dragOverIndex === index
                  ? "border-2 border-[#6366F1] scale-105"
                  : ""
              }`}
            >
              {onReorder && (
                <div
                  className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-[#E5E7EB]/40 hover:text-[#E5E7EB]/60"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical className="w-4 h-4" />
                </div>
              )}
              <div className="flex items-center justify-between mb-1 pl-6">
                <span className="text-sm opacity-60 text-[#E5E7EB]/70">
                  Question {index + 1}
                </span>
              </div>
              <p className="text-sm truncate text-[#0b1020] group-hover:text-[#E5E7EB] pl-6 transition-colors">
                {question.text || "Untitled Question"}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
