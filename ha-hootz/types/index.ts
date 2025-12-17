export type QuestionType = 'multiple-choice' | 'true-false';

export interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  timeLimit?: number; // in seconds
  points?: number;
  options: AnswerOption[];
}

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
}

