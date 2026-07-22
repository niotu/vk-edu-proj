import { hashPassword, verifyPassword } from './password';

describe('password utils', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('secret12');
    expect(hash).not.toBe('secret12');
    expect(await verifyPassword('secret12', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('secret12');
    expect(await verifyPassword('wrong-pass', hash)).toBe(false);
  });
});
