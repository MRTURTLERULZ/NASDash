import { NextResponse } from 'next/server';
import { getStorageStats } from '@/lib/fileService';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stats = await getStorageStats(session.folder, session.isAdmin);
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get storage stats' },
      { status: 500 }
    );
  }
}

