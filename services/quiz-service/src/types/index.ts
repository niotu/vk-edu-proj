import { Request } from 'express';

export type UserRole = 'MEMBER' | 'ORGANIZER';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
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

export interface CreateQuizInput {
  title: string;
  description?: string;
  category?: string;
  questionTimeSec?: number;
}

export interface UpdateQuizInput {
  title?: string;
  description?: string | null;
  category?: string | null;
  questionTimeSec?: number;
}
