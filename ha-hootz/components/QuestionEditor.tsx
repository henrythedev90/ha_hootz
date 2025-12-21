'use client';

import { useState } from 'react';
import { Question, QuestionType, AnswerOption } from '@/types';
import { generateId } from '@/lib/utils';

interface QuestionEditorProps {
  question: Question;
  onSave: (question: Question) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function QuestionEditor({ question, onSave, onCancel, onDelete }: QuestionEditorProps) {
  const [editedQuestion, setEditedQuestion] = useState<Question>(question);
  const [newOptionText, setNewOptionText] = useState('');

  const handleTypeChange = (type: QuestionType) => {
    if (type === 'true-false') {
      setEditedQuestion({
        ...editedQuestion,
        type,
        options: [
          { id: generateId(), text: 'True', isCorrect: editedQuestion.options[0]?.isCorrect || false },
          { id: generateId(), text: 'False', isCorrect: editedQuestion.options[1]?.isCorrect || false },
        ],
      });
    } else {
      setEditedQuestion({ ...editedQuestion, type });
    }
  };

  const handleAddOption = () => {
    if (!newOptionText.trim()) return;
    
    setEditedQuestion({
      ...editedQuestion,
      options: [
        ...editedQuestion.options,
        { id: generateId(), text: newOptionText.trim(), isCorrect: false },
      ],
    });
    setNewOptionText('');
  };

  const handleUpdateOption = (optionId: string, updates: Partial<AnswerOption>) => {
    setEditedQuestion({
      ...editedQuestion,
      options: editedQuestion.options.map(opt =>
        opt.id === optionId ? { ...opt, ...updates } : opt
      ),
    });
  };

  const handleDeleteOption = (optionId: string) => {
    setEditedQuestion({
      ...editedQuestion,
      options: editedQuestion.options.filter(opt => opt.id !== optionId),
    });
  };

  const handleSave = () => {
    if (!editedQuestion.text.trim()) {
      alert('Question text is required');
      return;
    }
    if (editedQuestion.options.length < 2) {
      alert('At least 2 answer options are required');
      return;
    }
    if (!editedQuestion.options.some(opt => opt.isCorrect)) {
      alert('At least one correct answer is required');
      return;
    }
    onSave(editedQuestion);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Question Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="multiple-choice"
              checked={editedQuestion.type === 'multiple-choice'}
              onChange={() => handleTypeChange('multiple-choice')}
              className="mr-2"
            />
            Multiple Choice
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="true-false"
              checked={editedQuestion.type === 'true-false'}
              onChange={() => handleTypeChange('true-false')}
              className="mr-2"
            />
            True/False
          </label>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Question Text
        </label>
        <textarea
          value={editedQuestion.text}
          onChange={(e) => setEditedQuestion({ ...editedQuestion, text: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          rows={3}
          placeholder="Enter your question..."
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Answer Options
        </label>
        <div className="space-y-2 mb-3">
          {editedQuestion.options.map((option) => (
            <div key={option.id} className="flex items-center gap-2">
              <input
                type="text"
                value={option.text}
                onChange={(e) => handleUpdateOption(option.id, { text: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={editedQuestion.type === 'true-false'}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={option.isCorrect}
                  onChange={(e) => handleUpdateOption(option.id, { isCorrect: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Correct</span>
              </label>
              {editedQuestion.type === 'multiple-choice' && (
                <button
                  onClick={() => handleDeleteOption(option.id)}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
        {editedQuestion.type === 'multiple-choice' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newOptionText}
              onChange={(e) => setNewOptionText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Add new option..."
            />
            <button
              onClick={handleAddOption}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
            >
              Add Option
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        {onDelete && (
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
          >
            Delete Question
          </button>
        )}
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Save Question
        </button>
      </div>
    </div>
  );
}

