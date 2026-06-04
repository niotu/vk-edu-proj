import { SessionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, HTTP_STATUS } from '../utils/errors';

export class HistoryService {
  async listOrganized(organizerId: string) {
    return prisma.quizSession.findMany({
      where: {
        organizerId,
        status: SessionStatus.FINISHED,
      },
      orderBy: { endedAt: 'desc' },
      include: {
        quiz: { select: { id: true, title: true, category: true } },
        result: true,
        _count: { select: { participants: true } },
      },
    });
  }

  async listParticipated(userId: string) {
    const participations = await prisma.sessionParticipant.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      include: {
        session: {
          include: {
            quiz: { select: { id: true, title: true, category: true } },
            result: true,
          },
        },
      },
    });

    return participations
      .filter((p) => p.session.status === SessionStatus.FINISHED)
      .map((p) => ({
        sessionId: p.sessionId,
        joinedAt: p.joinedAt,
        totalScore: p.totalScore,
        session: p.session,
      }));
  }

  async getSessionDetail(sessionId: string, userId: string) {
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: true,
        result: true,
        participants: { orderBy: { totalScore: 'desc' } },
      },
    });

    if (!session) {
      throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND, 'SESSION_NOT_FOUND');
    }

    const isOrganizer = session.organizerId === userId;
    const isParticipant = session.participants.some((p) => p.userId === userId);

    if (!isOrganizer && !isParticipant) {
      throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN, 'FORBIDDEN');
    }

    return session;
  }
}

export const historyService = new HistoryService();
