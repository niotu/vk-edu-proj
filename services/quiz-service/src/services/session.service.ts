import {
  Prisma,
  QuizStatus,
  SessionStatus,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { emitToRoom } from '../lib/broadcast';
import {
  clearQuestionTimer,
  getQuestionEndsAt,
  isQuestionOpen,
  scheduleQuestionTimer,
} from '../lib/sessionState';
import { generateUniqueRoomCode } from '../utils/roomCode';
import { calculatePoints } from '../utils/scoring';
import { AppError, HTTP_STATUS } from '../utils/errors';

const ACTIVE_STATUSES: SessionStatus[] = [
  SessionStatus.LOBBY,
  SessionStatus.ACTIVE,
  SessionStatus.QUESTION_OPEN,
  SessionStatus.QUESTION_CLOSED,
];

const sessionWithQuiz = {
  quiz: { select: { id: true, title: true, organizerId: true, status: true } },
  _count: { select: { participants: true } },
} satisfies Prisma.QuizSessionInclude;

function publicOptions(options: { id: string; text: string; orderIndex: number }[]) {
  return options.map(({ id, text, orderIndex }) => ({ id, text, orderIndex }));
}

export class SessionService {
  async create(organizerId: string, quizId: string) {
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, organizerId },
    });

    if (!quiz) {
      throw new AppError('Quiz not found', HTTP_STATUS.NOT_FOUND, 'QUIZ_NOT_FOUND');
    }

    if (quiz.status !== QuizStatus.PUBLISHED) {
      throw new AppError(
        'Only published quizzes can be started as a session',
        HTTP_STATUS.BAD_REQUEST,
        'QUIZ_NOT_PUBLISHED'
      );
    }

    const roomCode = await generateUniqueRoomCode();

    return prisma.quizSession.create({
      data: {
        quizId,
        organizerId,
        roomCode,
        status: SessionStatus.LOBBY,
      },
      include: sessionWithQuiz,
    });
  }

  async getByRoomCode(roomCode: string) {
    const normalized = roomCode.trim().toUpperCase();
    const session = await prisma.quizSession.findFirst({
      where: { roomCode: normalized },
      include: {
        ...sessionWithQuiz,
        result: true,
      },
    });

    if (!session) {
      throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND, 'SESSION_NOT_FOUND');
    }

    return session;
  }

  async join(sessionId: string, userId: string) {
    const session = await this.getSessionOrThrow(sessionId);

    if (session.status === SessionStatus.FINISHED) {
      throw new AppError('Session has ended', HTTP_STATUS.BAD_REQUEST, 'SESSION_FINISHED');
    }

    const participant = await prisma.sessionParticipant.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      create: { sessionId, userId },
      update: {},
    });

    const refreshed = await prisma.quizSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: sessionWithQuiz,
    });

    await this.emitRoomState(refreshed);

    return { session: refreshed, participant };
  }

  async start(sessionId: string, organizerId: string) {
    const session = await this.assertOrganizer(sessionId, organizerId);

    if (session.status !== SessionStatus.LOBBY) {
      throw new AppError(
        'Session can only be started from lobby',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_STATUS'
      );
    }

    const updated = await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.ACTIVE,
        startedAt: new Date(),
      },
      include: sessionWithQuiz,
    });

    emitToRoom(updated.roomCode, 'session:started', {
      sessionId: updated.id,
      quizTitle: updated.quiz.title,
    });
    await this.emitRoomState(updated);

    return updated;
  }

  async showQuestion(sessionId: string, questionId: string, organizerId: string) {
    const session = await this.assertOrganizer(sessionId, organizerId);

    if (
      session.status !== SessionStatus.ACTIVE &&
      session.status !== SessionStatus.QUESTION_CLOSED
    ) {
      throw new AppError(
        'Cannot show question in current session state',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_STATUS'
      );
    }

    const question = await prisma.question.findFirst({
      where: { id: questionId, quizId: session.quizId },
      include: { options: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!question) {
      throw new AppError('Question not found', HTTP_STATUS.NOT_FOUND, 'QUESTION_NOT_FOUND');
    }

    clearQuestionTimer(sessionId);

    const timeLimitSec = question.timeLimitSec ?? 30;
    const endsAt = new Date(Date.now() + timeLimitSec * 1000);

    const updated = await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.QUESTION_OPEN,
        currentQuestionId: questionId,
      },
      include: sessionWithQuiz,
    });

    scheduleQuestionTimer(sessionId, questionId, endsAt, () => {
      void this.closeQuestion(sessionId, organizerId, true);
    });

    emitToRoom(updated.roomCode, 'question:opened', {
      question: {
        id: question.id,
        text: question.text,
        type: question.type,
        imageUrl: question.imageUrl,
        choiceMode: question.choiceMode,
        orderIndex: question.orderIndex,
        timeLimitSec,
      },
      options: publicOptions(question.options),
      endsAt: endsAt.toISOString(),
    });

    return { session: updated, question, endsAt };
  }

  async closeQuestion(sessionId: string, organizerId: string, auto = false) {
    const session = auto
      ? await this.getSessionOrThrow(sessionId)
      : await this.assertOrganizer(sessionId, organizerId);

    if (session.status !== SessionStatus.QUESTION_OPEN) {
      if (auto) return session;
      throw new AppError(
        'No open question to close',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_STATUS'
      );
    }

    clearQuestionTimer(sessionId);

    const updated = await prisma.quizSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.QUESTION_CLOSED },
      include: sessionWithQuiz,
    });

    const questionId = session.currentQuestionId!;
    emitToRoom(updated.roomCode, 'question:closed', { questionId });

    const leaderboard = await this.buildLeaderboard(sessionId);
    emitToRoom(updated.roomCode, 'leaderboard:update', { entries: leaderboard });

    return updated;
  }

  async submitAnswer(
    sessionId: string,
    userId: string,
    questionId: string,
    selectedOptionIds: string[]
  ) {
    const session = await this.getSessionOrThrow(sessionId);

    if (session.status !== SessionStatus.QUESTION_OPEN) {
      throw new AppError('Question is not open', HTTP_STATUS.BAD_REQUEST, 'QUESTION_CLOSED');
    }

    if (!isQuestionOpen(sessionId)) {
      throw new AppError('Answer time has expired', HTTP_STATUS.BAD_REQUEST, 'QUESTION_CLOSED');
    }

    if (session.currentQuestionId !== questionId) {
      throw new AppError('This is not the active question', HTTP_STATUS.BAD_REQUEST, 'WRONG_QUESTION');
    }

    await this.ensureParticipant(sessionId, userId);

    const existing = await prisma.participantAnswer.findUnique({
      where: {
        sessionId_userId_questionId: { sessionId, userId, questionId },
      },
    });

    if (existing) {
      throw new AppError(
        'Answer already submitted',
        HTTP_STATUS.CONFLICT,
        'ANSWER_ALREADY_SUBMITTED'
      );
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });

    if (!question) {
      throw new AppError('Question not found', HTTP_STATUS.NOT_FOUND, 'QUESTION_NOT_FOUND');
    }

    const validIds = new Set(question.options.map((o) => o.id));
    for (const id of selectedOptionIds) {
      if (!validIds.has(id)) {
        throw new AppError('Invalid answer option', HTTP_STATUS.BAD_REQUEST, 'INVALID_OPTION');
      }
    }

    const { isCorrect, pointsAwarded } = calculatePoints(
      question.choiceMode,
      question.options,
      selectedOptionIds
    );

    const [answer, participant] = await prisma.$transaction([
      prisma.participantAnswer.create({
        data: {
          sessionId,
          userId,
          questionId,
          selectedOptionIds,
          isCorrect,
          pointsAwarded,
        },
      }),
      prisma.sessionParticipant.update({
        where: { sessionId_userId: { sessionId, userId } },
        data: { totalScore: { increment: pointsAwarded } },
      }),
    ]);

    emitToRoom(session.roomCode, 'answer:received', { userId, questionId });

    return {
      isCorrect: answer.isCorrect,
      pointsAwarded: answer.pointsAwarded,
      totalScore: participant.totalScore,
    };
  }

  async end(sessionId: string, organizerId: string) {
    const session = await this.assertOrganizer(sessionId, organizerId);

    if (session.status === SessionStatus.FINISHED) {
      throw new AppError('Session already finished', HTTP_STATUS.BAD_REQUEST, 'SESSION_FINISHED');
    }

    clearQuestionTimer(sessionId);

    const leaderboard = await this.buildLeaderboard(sessionId);

    const [updated, result] = await prisma.$transaction([
      prisma.quizSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.FINISHED,
          endedAt: new Date(),
        },
        include: sessionWithQuiz,
      }),
      prisma.quizResult.upsert({
        where: { sessionId },
        create: {
          sessionId,
          leaderboard: leaderboard as unknown as Prisma.InputJsonValue,
        },
        update: {
          leaderboard: leaderboard as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      }),
    ]);

    emitToRoom(updated.roomCode, 'session:finished', {
      leaderboard,
      resultId: result.id,
    });
    emitToRoom(updated.roomCode, 'leaderboard:update', { entries: leaderboard });
    await this.emitRoomState(updated);

    return { session: updated, result, leaderboard };
  }

  async getLeaderboard(sessionId: string) {
    await this.getSessionOrThrow(sessionId);
    const entries = await this.buildLeaderboard(sessionId);
    return { entries };
  }

  async buildLeaderboard(sessionId: string) {
    const participants = await prisma.sessionParticipant.findMany({
      where: { sessionId },
      orderBy: [{ totalScore: 'desc' }, { joinedAt: 'asc' }],
    });

    return participants.map((p, index) => ({
      userId: p.userId,
      score: p.totalScore,
      rank: index + 1,
    }));
  }

  private async emitRoomState(
    session: { id: string; roomCode: string; status: SessionStatus; quiz: { title: string }; _count: { participants: number } }
  ) {
    emitToRoom(session.roomCode, 'room:state', {
      session: {
        id: session.id,
        roomCode: session.roomCode,
        status: session.status,
        quizTitle: session.quiz.title,
      },
      participantsCount: session._count.participants,
    });
  }

  private async getSessionOrThrow(sessionId: string) {
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: sessionWithQuiz,
    });

    if (!session) {
      throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND, 'SESSION_NOT_FOUND');
    }

    return session;
  }

  private async assertOrganizer(sessionId: string, organizerId: string) {
    const session = await this.getSessionOrThrow(sessionId);

    if (session.organizerId !== organizerId) {
      throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN, 'FORBIDDEN');
    }

    return session;
  }

  private async ensureParticipant(sessionId: string, userId: string) {
    const participant = await prisma.sessionParticipant.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });

    if (!participant) {
      throw new AppError('Join the session first', HTTP_STATUS.BAD_REQUEST, 'NOT_JOINED');
    }
  }

  getActiveQuestionDeadline(sessionId: string): string | null {
    const endsAt = getQuestionEndsAt(sessionId);
    return endsAt ? endsAt.toISOString() : null;
  }
}

export const sessionService = new SessionService();
