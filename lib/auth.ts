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
export async function createSession(username: string, folder: string, isAdmin: boolean): Promise<string> {
  const token = await new SignJWT({ username, folder, isAdmin })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);

  return token;
}

/**
 * Verifies a session token and returns session data if valid
 */
export async function verifySession(token: string): Promise<{ username: string; folder: string; isAdmin: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      username: payload.username as string,
      folder: (payload.folder as string) || '/',
      isAdmin: (payload.isAdmin as boolean) || false,
    };
  } catch {
    return null;
  }
}

/**
 * Gets just the username from session (for backward compatibility)
 */
export async function getSessionUsername(): Promise<string | null> {
  const session = await getSession();
  return session?.username || null;
}

/**
 * Gets the current session from cookies
 */
export async function getSession(): Promise<{ username: string; folder: string; isAdmin: boolean } | null> {
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

