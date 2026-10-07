import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { UserSession } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-developer-snippet-vault-secure-jwt-2026';
const COOKIE_NAME = 'snippet_vault_token';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: UserSession): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): UserSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Extracts and verifies the current authenticated user from:
 * 1. Authorization header (Bearer token)
 * 2. NextRequest cookies
 * 3. Next.js cookies() API
 */
export async function getCurrentUser(request?: NextRequest | Request): Promise<UserSession | null> {
  let token: string | undefined;

  // 1. Check Authorization header
  if (request) {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  // 2. Check Request Cookie if NextRequest
  if (!token && request && 'cookies' in request && typeof (request as NextRequest).cookies?.get === 'function') {
    const cookie = (request as NextRequest).cookies.get(COOKIE_NAME);
    if (cookie?.value) {
      token = cookie.value;
    }
  }

  // 3. Fallback to next/headers cookies()
  if (!token) {
    try {
      const cookieStore = cookies();
      const cookie = cookieStore.get(COOKIE_NAME);
      if (cookie?.value) {
        token = cookie.value;
      }
    } catch {
      // cookies() might not be available in all contexts (e.g., custom unit test without mock)
    }
  }

  if (!token) return null;

  return verifyToken(token);
}

export function getBaseUrl(request?: NextRequest | Request): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;

  if (request) {
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (host) return `${proto}://${host}`;
    if ('nextUrl' in request && (request as NextRequest).nextUrl?.origin) {
      return (request as NextRequest).nextUrl.origin;
    }
  }

  return 'http://localhost:3000';
}

export { COOKIE_NAME };
