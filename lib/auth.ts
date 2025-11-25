import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-in-production';
const SESSION_COOKIE_NAME = 'nas-dashboard-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Create a secret key for JWT
const secretKey = new TextEncoder().encode(SESSION_SECRET);

/**
 * Creates a session token and sets it as an HTTP-only cookie
 */
export async function createSession(username: string): Promise<string> {
  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);

  return token;
}

/**
 * Verifies a session token and returns the username if valid
 */
export async function verifySession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload.username as string;
  } catch {
    return null;
  }
}

/**
 * Gets the current session from cookies
 */
export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }

  return await verifySession(token);
}

/**
 * Clears the session cookie
 */
export function clearSessionCookie() {
  // This will be handled in the route handler
  return SESSION_COOKIE_NAME;
}

