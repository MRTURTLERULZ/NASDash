import { NextRequest, NextResponse } from 'next/server';
import { createSession, clearSessionCookie } from '@/lib/auth';
import { cookies } from 'next/headers';

const DASH_USERNAME = process.env.DASH_USERNAME || 'admin';
const DASH_PASSWORD = process.env.DASH_PASSWORD || 'changeme';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (username === DASH_USERNAME && password === DASH_PASSWORD) {
      const token = await createSession(username);
      const cookieStore = await cookies();
      
      cookieStore.set({
        name: 'nas-dashboard-session',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

