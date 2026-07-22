import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwt';
import { Role } from '@prisma/client';

describe('jwt utils', () => {
  const accessPayload = { sub: 'user-1', email: 'a@b.com', name: 'Alice', role: Role.MEMBER };

  it('signs and verifies an access token', () => {
    const token = signAccessToken(accessPayload);
    const decoded = verifyAccessToken(token);
    expect(decoded).toMatchObject(accessPayload);
  });

  it('signs and verifies a refresh token', () => {
    const token = signRefreshToken({ sub: 'user-1' });
    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe('user-1');
  });

  it('rejects a tampered access token', () => {
    const token = signAccessToken(accessPayload);
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('rejects garbage input', () => {
    expect(() => verifyRefreshToken('not-a-jwt')).toThrow();
  });
});
