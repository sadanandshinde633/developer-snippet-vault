import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../src/lib/auth';

describe('Authentication & Security Suite', () => {
  it('should securely hash and verify passwords using bcrypt', async () => {
    const rawPassword = 'SecretDeveloperPass123!';
    const hashed = await hashPassword(rawPassword);

    expect(hashed).not.toBe(rawPassword);
    expect(hashed.length).toBeGreaterThan(20);

    const isMatch = await verifyPassword(rawPassword, hashed);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword('WrongPassword', hashed);
    expect(isWrong).toBe(false);
  });

  it('should sign and verify JWT tokens for authenticated users', () => {
    const session = {
      id: 'usr_abc123',
      email: 'coder@example.com',
      name: 'Ada Lovelace',
    };

    const token = signToken(session);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const verified = verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(session.id);
    expect(verified?.email).toBe(session.email);
    expect(verified?.name).toBe(session.name);
  });

  it('should return null when verifying invalid or tampered tokens', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature';
    const verified = verifyToken(invalidToken);
    expect(verified).toBeNull();
  });
});
