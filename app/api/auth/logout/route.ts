import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  const cookieStore = await cookies();
  const cookieName = clearSessionCookie();
  
  cookieStore.delete(cookieName);

  return NextResponse.json({ success: true });
}

