import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface AnswerOptionInput {
  text: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface CreateQuestionInput {
  orderIndex: number;
  type: 'TEXT' | 'IMAGE';
  text: string;
  imageUrl?: string | null;
  choiceMode: 'SINGLE' | 'MULTIPLE';
  timeLimitSec?: number | null;
  options: AnswerOptionInput[];
}

export interface ImportedQuizQuestionInput {
  statement: string;
  answers: string[];
  correct: string[];
  type?: 'TEXT' | 'IMAGE';
  imageUrl?: string | null;
  choiceMode?: 'SINGLE' | 'MULTIPLE';
  timeLimitSec?: number | null;
  orderIndex?: number;
}

export interface CreateQuizInput {
  title: string;
  description?: string;
  category?: string;
  questionTimeSec?: number;
  questions?: ImportedQuizQuestionInput[];
}

export interface UpdateQuizInput {
  title?: string;
  description?: string | null;
  category?: string | null;
  questionTimeSec?: number;
}
