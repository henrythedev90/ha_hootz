"use client";

import { Question } from "@/types";
import QuestionEditor from "./QuestionEditor";
import { useState } from "react";

interface QuestionListProps {
  questions: Question[];
  onUpdate: (question: Question) => void;
  onDelete: (questionId: string) => void;
  onAdd: (question: Question) => void;
}

export default function QuestionList({
  questions,
  onUpdate,
  onDelete,
  onAdd,
}: QuestionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-text-light">
          Questions ({questions.length})
        </h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
          }}
          className="px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 font-medium"
        >
          + Add Question
        </button>
      </div>

      {isAdding && (
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
      )}

      {questions.map((question) => (
        <div key={question.id}>
          {editingId === question.id ? (
            <QuestionEditor
              question={question}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={() => handleDelete(question.id)}
            />
          ) : (
            <div className="bg-card-bg rounded-lg shadow-md p-6 mb-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-indigo/20 text-indigo rounded text-xs font-medium">
                      {question.type === "multiple-choice"
                        ? "Multiple Choice"
                        : "True/False"}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-text-light mb-2">
                    {question.text}
                  </h3>
                  <div className="space-y-1">
                    {question.options.map((option) => (
                      <div
                        key={option.id}
                        className={`text-sm ${
                          option.isCorrect
                            ? "text-success font-medium"
                            : "text-text-light/50"
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
                  className="ml-4 px-4 py-2 bg-indigo text-white rounded-md hover:bg-indigo/90 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {questions.length === 0 && !isAdding && (
        <div className="text-center py-12 bg-card-bg rounded-lg shadow-md">
          <p className="text-text-light/50">
            No questions yet. Click "Add Question" to get started!
          </p>
        </div>
      )}
    </div>
  );
}
