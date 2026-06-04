import { ChoiceMode, QuestionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AnswerOptionInput, CreateQuestionInput } from '../types';
import { AppError, HTTP_STATUS } from '../utils/errors';
import { quizService } from './quiz.service';

function parseQuestionType(value: string): QuestionType {
  const normalized = value?.toUpperCase();
  if (normalized === 'TEXT' || normalized === 'IMAGE') {
    return normalized as QuestionType;
  }
  throw new AppError('Invalid question type. Use TEXT or IMAGE', HTTP_STATUS.BAD_REQUEST, 'INVALID_TYPE');
}

function parseChoiceMode(value: string): ChoiceMode {
  const normalized = value?.toUpperCase();
  if (normalized === 'SINGLE' || normalized === 'MULTIPLE') {
    return normalized as ChoiceMode;
  }
  throw new AppError(
    'Invalid choice mode. Use SINGLE or MULTIPLE',
    HTTP_STATUS.BAD_REQUEST,
    'INVALID_CHOICE_MODE'
  );
}

function validateOptions(options: AnswerOptionInput[], choiceMode: ChoiceMode): void {
  if (!options?.length || options.length < 2) {
    throw new AppError(
      'At least two answer options are required',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_OPTIONS'
    );
  }

  const correctCount = options.filter((o) => o.isCorrect).length;

  if (choiceMode === ChoiceMode.SINGLE && correctCount !== 1) {
    throw new AppError(
      'SINGLE choice questions must have exactly one correct option',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_CORRECT_COUNT'
    );
  }

  if (choiceMode === ChoiceMode.MULTIPLE && correctCount < 1) {
    throw new AppError(
      'MULTIPLE choice questions must have at least one correct option',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_CORRECT_COUNT'
    );
  }
}

export class QuestionService {
  async create(quizId: string, organizerId: string, input: CreateQuestionInput) {
    const quiz = await quizService.getOwnedQuiz(quizId, organizerId);

    if (quiz.status !== 'DRAFT') {
      throw new AppError(
        'Questions can only be added to draft quizzes',
        HTTP_STATUS.BAD_REQUEST,
        'QUIZ_NOT_EDITABLE'
      );
    }

    const text = input.text?.trim();
    if (!text) {
      throw new AppError('Question text is required', HTTP_STATUS.BAD_REQUEST, 'INVALID_TEXT');
    }

    const type = parseQuestionType(input.type);
    const choiceMode = parseChoiceMode(input.choiceMode);
    validateOptions(input.options, choiceMode);

    if (type === QuestionType.IMAGE && !input.imageUrl?.trim()) {
      throw new AppError('imageUrl is required for IMAGE questions', HTTP_STATUS.BAD_REQUEST, 'INVALID_IMAGE');
    }

    const existing = await prisma.question.findUnique({
      where: {
        quizId_orderIndex: { quizId, orderIndex: input.orderIndex },
      },
    });

    if (existing) {
      throw new AppError(
        `Question with orderIndex ${input.orderIndex} already exists`,
        HTTP_STATUS.CONFLICT,
        'ORDER_INDEX_EXISTS'
      );
    }

    return prisma.question.create({
      data: {
        quizId,
        orderIndex: input.orderIndex,
        type,
        text,
        imageUrl: input.imageUrl?.trim() || null,
        choiceMode,
        timeLimitSec: input.timeLimitSec ?? quiz.questionTimeSec,
        options: {
          create: input.options.map((opt) => ({
            text: opt.text.trim(),
            isCorrect: opt.isCorrect,
            orderIndex: opt.orderIndex,
          })),
        },
      },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  async update(questionId: string, organizerId: string, input: Partial<CreateQuestionInput>) {
    const question = await this.getOwnedQuestion(questionId, organizerId);

    if (question.quiz.status !== 'DRAFT') {
      throw new AppError(
        'Questions can only be edited in draft quizzes',
        HTTP_STATUS.BAD_REQUEST,
        'QUIZ_NOT_EDITABLE'
      );
    }

    const data: {
      text?: string;
      type?: QuestionType;
      imageUrl?: string | null;
      choiceMode?: ChoiceMode;
      timeLimitSec?: number | null;
      orderIndex?: number;
    } = {};

    if (input.text !== undefined) {
      const text = input.text.trim();
      if (!text) {
        throw new AppError('Question text cannot be empty', HTTP_STATUS.BAD_REQUEST, 'INVALID_TEXT');
      }
      data.text = text;
    }

    if (input.type !== undefined) {
      data.type = parseQuestionType(input.type);
    }

    if (input.imageUrl !== undefined) {
      data.imageUrl = input.imageUrl?.trim() || null;
    }

    if (input.choiceMode !== undefined) {
      data.choiceMode = parseChoiceMode(input.choiceMode);
    }

    if (input.timeLimitSec !== undefined) {
      data.timeLimitSec = input.timeLimitSec;
    }

    if (input.orderIndex !== undefined && input.orderIndex !== question.orderIndex) {
      const conflict = await prisma.question.findUnique({
        where: {
          quizId_orderIndex: { quizId: question.quizId, orderIndex: input.orderIndex },
        },
      });
      if (conflict && conflict.id !== questionId) {
        throw new AppError(
          `Question with orderIndex ${input.orderIndex} already exists`,
          HTTP_STATUS.CONFLICT,
          'ORDER_INDEX_EXISTS'
        );
      }
      data.orderIndex = input.orderIndex;
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data,
      include: { options: { orderBy: { orderIndex: 'asc' } }, quiz: true },
    });

    const finalType = updated.type;
    if (finalType === QuestionType.IMAGE && !updated.imageUrl) {
      throw new AppError('imageUrl is required for IMAGE questions', HTTP_STATUS.BAD_REQUEST, 'INVALID_IMAGE');
    }

    return updated;
  }

  async delete(questionId: string, organizerId: string) {
    const question = await this.getOwnedQuestion(questionId, organizerId);

    if (question.quiz.status !== 'DRAFT') {
      throw new AppError(
        'Questions can only be deleted from draft quizzes',
        HTTP_STATUS.BAD_REQUEST,
        'QUIZ_NOT_EDITABLE'
      );
    }

    await prisma.question.delete({ where: { id: questionId } });
  }

  async replaceOptions(questionId: string, organizerId: string, options: AnswerOptionInput[]) {
    const question = await this.getOwnedQuestion(questionId, organizerId);

    if (question.quiz.status !== 'DRAFT') {
      throw new AppError(
        'Options can only be changed in draft quizzes',
        HTTP_STATUS.BAD_REQUEST,
        'QUIZ_NOT_EDITABLE'
      );
    }

    validateOptions(options, question.choiceMode);

    return prisma.$transaction(async (tx) => {
      await tx.answerOption.deleteMany({ where: { questionId } });
      await tx.answerOption.createMany({
        data: options.map((opt) => ({
          questionId,
          text: opt.text.trim(),
          isCorrect: opt.isCorrect,
          orderIndex: opt.orderIndex,
        })),
      });

      return tx.question.findUniqueOrThrow({
        where: { id: questionId },
        include: { options: { orderBy: { orderIndex: 'asc' } } },
      });
    });
  }

  private async getOwnedQuestion(questionId: string, organizerId: string) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { quiz: true, options: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!question || question.quiz.organizerId !== organizerId) {
      throw new AppError('Question not found', HTTP_STATUS.NOT_FOUND, 'QUESTION_NOT_FOUND');
    }

    return question;
  }
}

export const questionService = new QuestionService();
