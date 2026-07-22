jest.mock('../lib/prisma', () => ({
  prisma: { quizSession: { findFirst: jest.fn() } },
}));

import { generateUniqueRoomCode } from './roomCode';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

const findFirst = prisma.quizSession.findFirst as jest.Mock;

describe('generateUniqueRoomCode', () => {
  it('returns a code of the configured length when it is free', async () => {
    findFirst.mockResolvedValueOnce(null);
    const code = await generateUniqueRoomCode();
    expect(code).toHaveLength(env.roomCodeLength);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it('retries when a code collides with an active session', async () => {
    findFirst.mockResolvedValueOnce({ id: 'taken' }).mockResolvedValueOnce(null);
    const code = await generateUniqueRoomCode();
    expect(code).toHaveLength(env.roomCodeLength);
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all attempts', async () => {
    findFirst.mockResolvedValue({ id: 'taken' });
    await expect(generateUniqueRoomCode()).rejects.toThrow('Failed to generate unique room code');
  });
});
