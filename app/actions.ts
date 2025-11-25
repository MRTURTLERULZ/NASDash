'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { clearSessionCookie } from '@/lib/auth';

export async function logout() {
  const cookieStore = await cookies();
  const cookieName = clearSessionCookie();
  cookieStore.delete(cookieName);
  redirect('/login');
}

