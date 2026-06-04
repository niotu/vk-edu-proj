import { Prisma, QuizStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { CreateQuizInput, UpdateQuizInput } from '../types';
import { AppError, HTTP_STATUS } from '../utils/errors';

const quizInclude = {
  questions: {
    orderBy: { orderIndex: 'asc' as const },
    include: {
      options: { orderBy: { orderIndex: 'asc' as const } },
    },
  },
};

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

    return prisma.quiz.create({
      data: {
        organizerId,
        title,
        description: input.description?.trim() || null,
        category: input.category?.trim() || null,
        questionTimeSec,
        status: QuizStatus.DRAFT,
      },
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
