import { prisma } from '../lib/prisma';
import { SessionStatus } from '@prisma/client';
import { env } from '../config/env';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const ACTIVE_STATUSES: SessionStatus[] = [
  SessionStatus.LOBBY,
  SessionStatus.ACTIVE,
  SessionStatus.QUESTION_OPEN,
  SessionStatus.QUESTION_CLOSED,
];

function randomCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

export async function generateUniqueRoomCode(): Promise<string> {
  const length = env.roomCodeLength;
  for (let attempt = 0; attempt < 20; attempt++) {
    const roomCode = randomCode(length);
    const existing = await prisma.quizSession.findFirst({
      where: { roomCode, status: { in: ACTIVE_STATUSES } },
    });
    if (!existing) {
      return roomCode;
    }
  }
  throw new Error('Failed to generate unique room code');
}
