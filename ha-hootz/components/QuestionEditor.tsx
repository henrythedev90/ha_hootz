"use client";

import { useState } from "react";
import { Question, AnswerOption } from "@/types";
import { generateId } from "@/lib/utils";
import { motion } from "framer-motion";
import { Trash2, X } from "lucide-react";

interface QuestionEditorProps {
  question: Question;
  onSave: (question: Question) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function QuestionEditor({
  question,
  onSave,
  onCancel,
  onDelete,
}: QuestionEditorProps) {
  const [editedQuestion, setEditedQuestion] = useState<Question>(question);
  const [newOptionText, setNewOptionText] = useState("");

  const handleAddOption = () => {
    if (!newOptionText.trim()) return;

    setEditedQuestion({
      ...editedQuestion,
      options: [
        ...editedQuestion.options,
        { id: generateId(), text: newOptionText.trim(), isCorrect: false },
      ],
    });
    setNewOptionText("");
  };

  const handleUpdateOption = (
    optionId: string,
    updates: Partial<AnswerOption>
  ) => {
    setEditedQuestion({
      ...editedQuestion,
      options: editedQuestion.options.map((opt) =>
        opt.id === optionId ? { ...opt, ...updates } : opt
      ),
    });
  };

  const handleDeleteOption = (optionId: string) => {
    setEditedQuestion({
      ...editedQuestion,
      options: editedQuestion.options.filter((opt) => opt.id !== optionId),
    });
  };

  const handleSave = () => {
    if (!editedQuestion.text.trim()) {
      alert("Question text is required");
      return;
    }
    if (editedQuestion.options.length < 2) {
      alert("At least 2 answer options are required");
      return;
    }
    if (!editedQuestion.options.some((opt) => opt.isCorrect)) {
      alert("At least one correct answer is required");
      return;
    }
    onSave(editedQuestion);
  };

  return (
    <div className="bg-[#0B1020]/50 rounded-lg p-6 mb-4 border border-[#6366F1]/20">
      <div className="mb-4">
        <label className="block text-sm text-[#E5E7EB]/80 mb-2">
          Question Text
        </label>
        <textarea
          value={editedQuestion.text}
          onChange={(e) =>
            setEditedQuestion({ ...editedQuestion, text: e.target.value })
          }
          className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-4 py-3 text-[#E5E7EB] placeholder-[#E5E7EB]/30 outline-none transition-all resize-none"
          rows={3}
          placeholder="Enter your question..."
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm text-[#E5E7EB]/80 mb-3">
          Answer Options
        </label>
        <div className="space-y-3 mb-3">
          {editedQuestion.options.map((option) => (
            <div key={option.id} className="flex gap-3 items-center">
              <input
                type="radio"
                checked={option.isCorrect}
                onChange={(e) =>
                  handleUpdateOption(option.id, {
                    isCorrect: e.target.checked,
                  })
                }
                className="w-5 h-5 accent-[#22C55E] cursor-pointer"
              />
              <input
                type="text"
                value={option.text}
                onChange={(e) =>
                  handleUpdateOption(option.id, { text: e.target.value })
                }
                className="flex-1 bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-4 py-3 text-[#E5E7EB] placeholder-[#E5E7EB]/30 outline-none transition-all"
                placeholder="Enter option text..."
              />
              <button
                onClick={() => handleDeleteOption(option.id)}
                className="p-2 hover:bg-[#EF4444]/10 text-[#EF4444] rounded-lg transition-colors"
                title="Delete option"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newOptionText}
            onChange={(e) => setNewOptionText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddOption()}
            className="flex-1 bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-4 py-3 text-[#E5E7EB] placeholder-[#E5E7EB]/30 outline-none transition-all"
            placeholder="Add new option..."
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddOption}
            className="px-4 py-2 bg-[#22C55E] hover:bg-[#1DB954] text-white rounded-lg text-sm font-medium transition-colors"
          >
            Add Option
          </motion.button>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        {onDelete && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDelete}
            className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Question</span>
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCancel}
          className="px-4 py-2 bg-[#1A1F35] hover:bg-[#0B1020] text-[#E5E7EB] rounded-lg text-sm font-medium transition-colors border border-[#6366F1]/20 flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          <span>Cancel</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg text-sm font-medium transition-colors"
        >
          Save Question
        </motion.button>
      </div>
    </div>
  );
}
