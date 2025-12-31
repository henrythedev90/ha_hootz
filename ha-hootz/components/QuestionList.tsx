"use client";

import { Question } from "@/types";
import QuestionEditor from "./QuestionEditor";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

interface QuestionListProps {
  questions: Question[];
  onUpdate: (question: Question) => void;
  onDelete: (questionId: string) => void;
  onAdd: (question: Question) => void;
  editQuestionId?: string | null;
}

export default function QuestionList({
  questions,
  onUpdate,
  onDelete,
  onAdd,
  editQuestionId,
}: QuestionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Sync with external editQuestionId prop
  useEffect(() => {
    if (editQuestionId) {
      setEditingId(editQuestionId);
      setIsAdding(false);
    }
  }, [editQuestionId]);

  const handleEdit = (question: Question) => {
    setEditingId(question.id);
    setIsAdding(false);
  };

  const handleSave = (question: Question) => {
    if (isAdding) {
      onAdd(question);
      setIsAdding(false);
    } else {
      onUpdate(question);
      setEditingId(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
  };

  const handleDelete = (questionId: string) => {
    onDelete(questionId);
    if (editingId === questionId) {
      setEditingId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-[#E5E7EB]">
          Questions ({questions.length})
        </h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
          }}
          className="px-4 py-2 bg-[#22C55E] hover:bg-[#1DB954] text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Question</span>
        </motion.button>
      </div>

      {isAdding && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <QuestionEditor
            question={{
              id: "new",
              type: "multiple-choice",
              text: "",
              options: [],
            }}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </motion.div>
      )}

      {questions.map((question, index) => (
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          {editingId === question.id ? (
            <QuestionEditor
              question={question}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={() => handleDelete(question.id)}
            />
          ) : (
            <div className="bg-[#0B1020]/50 rounded-lg p-4 mb-4 border border-[#6366F1]/20 hover:border-[#6366F1]/40 transition-all">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 bg-[#6366F1]/30 text-[#22D3EE] text-xs rounded font-medium">
                      Q{index + 1}
                    </span>
                    <span className="px-2 py-1 bg-[#6366F1]/20 text-[#6366F1] rounded text-xs font-medium">
                      {question.type === "multiple-choice"
                        ? "Multiple Choice"
                        : "True/False"}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-[#E5E7EB] mb-3">
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
                <button
                  onClick={() => handleEdit(question)}
                  className="ml-4 px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          )}
        </motion.div>
      ))}

      {questions.length === 0 && !isAdding && (
        <div className="text-center py-12 text-[#E5E7EB]/60">
          <p>No questions yet. Click "Add Question" to get started!</p>
        </div>
      )}
    </div>
  );
}
