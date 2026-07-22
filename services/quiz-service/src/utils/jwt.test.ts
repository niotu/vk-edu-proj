import jwt from 'jsonwebtoken';
import { verifyAccessToken } from './jwt';
import { env } from '../config/env';

describe('jwt utils', () => {
  const payload = { sub: 'user-1', email: 'a@b.com', name: 'Alice' };

  it('verifies a token signed with the shared secret', () => {
    const token = jwt.sign(payload, env.jwtSecret);
    expect(verifyAccessToken(token)).toMatchObject(payload);
  });

  it('rejects a token signed with the wrong secret', () => {
    const token = jwt.sign(payload, 'wrong-secret');
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it('rejects garbage input', () => {
    expect(() => verifyAccessToken('not-a-jwt')).toThrow();
  });
});
