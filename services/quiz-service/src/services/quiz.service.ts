import { ChoiceMode, Prisma, QuestionType, QuizStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { CreateQuizInput, ImportedQuizQuestionInput, UpdateQuizInput } from '../types';
import { AppError, HTTP_STATUS } from '../utils/errors';

const quizInclude = {
  questions: {
    orderBy: { orderIndex: 'asc' as const },
    include: {
      options: { orderBy: { orderIndex: 'asc' as const } },
    },
  },
};

type QuestionOptionCreateInput = {
  text: string;
  isCorrect: boolean;
  orderIndex: number;
};

type QuestionCreateInput = {
  orderIndex: number;
  type: QuestionType;
  text: string;
  imageUrl: string | null;
  choiceMode: ChoiceMode;
  timeLimitSec: number | null;
  options: { create: QuestionOptionCreateInput[] };
};

function parseQuestionType(value?: string): QuestionType {
  const normalized = value?.toUpperCase();
  if (normalized === 'TEXT' || normalized === 'IMAGE') {
    return normalized as QuestionType;
  }

  return QuestionType.TEXT;
}

function parseChoiceMode(value: string | undefined, correctCount: number): ChoiceMode {
  if (value) {
    const normalized = value.toUpperCase();
    if (normalized === 'SINGLE' || normalized === 'MULTIPLE') {
      return normalized as ChoiceMode;
    }
    throw new AppError('Invalid choiceMode. Use SINGLE or MULTIPLE', HTTP_STATUS.BAD_REQUEST, 'INVALID_CHOICE_MODE');
  }

  return correctCount === 1 ? ChoiceMode.SINGLE : ChoiceMode.MULTIPLE;
}

function normalizeImportedQuestion(question: ImportedQuizQuestionInput, index: number): QuestionCreateInput {
  const statement = question.statement?.trim();
  if (!statement) {
    throw new AppError('Each quiz question requires a statement', HTTP_STATUS.BAD_REQUEST, 'INVALID_QUESTION');
  }

  const answers = Array.isArray(question.answers)
    ? question.answers.map((answer) => String(answer).trim())
    : [];

  if (answers.length < 2 || answers.some((answer) => !answer)) {
    throw new AppError(
      'Each quiz question must include at least two non-empty answers',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_ANSWERS'
    );
  }

  const correctAnswers = Array.isArray(question.correct)
    ? question.correct.map((answer) => String(answer).trim()).filter(Boolean)
    : [];

  if (correctAnswers.length === 0) {
    throw new AppError(
      'Each quiz question must include at least one correct answer',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_CORRECT_ANSWERS'
    );
  }

  const correctSet = new Set(correctAnswers);
  if (![...correctSet].every((answer) => answers.includes(answer))) {
    throw new AppError(
      'Correct answers must match one of the provided answer options',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_CORRECT_ANSWERS'
    );
  }

  const choiceMode = parseChoiceMode(question.choiceMode, correctSet.size);
  if (choiceMode === ChoiceMode.SINGLE && correctSet.size !== 1) {
    throw new AppError(
      'SINGLE choice questions must have exactly one correct answer',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_CORRECT_COUNT'
    );
  }

  const options = answers.map((answer, optionIndex) => ({
    text: answer,
    isCorrect: correctSet.has(answer),
    orderIndex: optionIndex,
  }));

  return {
    orderIndex: question.orderIndex ?? index,
    type: parseQuestionType(question.type),
    text: statement,
    imageUrl: question.imageUrl?.trim() || null,
    choiceMode,
    timeLimitSec: question.timeLimitSec ?? null,
    options: { create: options },
  };
}

export class QuizService {
  async listByOrganizer(organizerId: string) {
    return prisma.quiz.findMany({
      where: { organizerId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { questions: true, sessions: true } },
      },
    });
  }

  async create(organizerId: string, input: CreateQuizInput) {
    const title = input.title?.trim();
    if (!title) {
      throw new AppError('Title is required', HTTP_STATUS.BAD_REQUEST, 'INVALID_TITLE');
    }

    const questionTimeSec = input.questionTimeSec ?? 30;
    if (questionTimeSec < 5 || questionTimeSec > 300) {
      throw new AppError(
        'questionTimeSec must be between 5 and 300',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_TIME'
      );
    }

    const importedQuestions = Array.isArray(input.questions)
      ? input.questions.map((question, index) => normalizeImportedQuestion(question, index))
      : [];

    return prisma.quiz.create({
      data: {
        organizerId,
        title,
        description: input.description?.trim() || null,
        category: input.category?.trim() || null,
        questionTimeSec,
        status: importedQuestions.length > 0 ? QuizStatus.PUBLISHED : QuizStatus.DRAFT,
        questions: importedQuestions.length > 0 ? { create: importedQuestions } : undefined,
      },
      include: quizInclude,
    });
  }

  async getById(quizId: string, organizerId: string) {
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, organizerId },
      include: quizInclude,
    });

    if (!quiz) {
      throw new AppError('Quiz not found', HTTP_STATUS.NOT_FOUND, 'QUIZ_NOT_FOUND');
    }

    return quiz;
  }

  async update(quizId: string, organizerId: string, input: UpdateQuizInput) {
    const quiz = await this.getOwnedQuiz(quizId, organizerId);

    if (quiz.status !== QuizStatus.DRAFT) {
      throw new AppError(
        'Only draft quizzes can be edited',
        HTTP_STATUS.BAD_REQUEST,
        'QUIZ_NOT_EDITABLE'
      );
    }

    const data: Prisma.QuizUpdateInput = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw new AppError('Title cannot be empty', HTTP_STATUS.BAD_REQUEST, 'INVALID_TITLE');
      }
      data.title = title;
    }

    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }

    if (input.category !== undefined) {
      data.category = input.category?.trim() || null;
    }

    if (input.questionTimeSec !== undefined) {
      if (input.questionTimeSec < 5 || input.questionTimeSec > 300) {
        throw new AppError(
          'questionTimeSec must be between 5 and 300',
          HTTP_STATUS.BAD_REQUEST,
          'INVALID_TIME'
        );
      }
      data.questionTimeSec = input.questionTimeSec;
    }

    return prisma.quiz.update({
      where: { id: quizId },
      data,
      include: quizInclude,
    });
  }

  async delete(quizId: string, organizerId: string) {
    const quiz = await this.getOwnedQuiz(quizId, organizerId);

    if (quiz.status !== QuizStatus.DRAFT) {
      throw new AppError(
        'Only draft quizzes can be deleted',
        HTTP_STATUS.BAD_REQUEST,
        'QUIZ_NOT_DELETABLE'
      );
    }

    await prisma.quiz.delete({ where: { id: quizId } });
  }

  async publish(quizId: string, organizerId: string) {
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, organizerId },
      include: { _count: { select: { questions: true } } },
    });

    if (!quiz) {
      throw new AppError('Quiz not found', HTTP_STATUS.NOT_FOUND, 'QUIZ_NOT_FOUND');
    }

    if (quiz.status !== QuizStatus.DRAFT) {
      throw new AppError(
        'Only draft quizzes can be published',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_STATUS'
      );
    }

    if (quiz._count.questions === 0) {
      throw new AppError(
        'Add at least one question before publishing',
        HTTP_STATUS.BAD_REQUEST,
        'NO_QUESTIONS'
      );
    }

    return prisma.quiz.update({
      where: { id: quizId },
      data: { status: QuizStatus.PUBLISHED },
      include: quizInclude,
    });
  }

  async getOwnedQuiz(quizId: string, organizerId: string) {
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, organizerId },
    });

    if (!quiz) {
      throw new AppError('Quiz not found', HTTP_STATUS.NOT_FOUND, 'QUIZ_NOT_FOUND');
    }

    return quiz;
  }
}

export const quizService = new QuizService();
