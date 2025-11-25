import { NextResponse } from 'next/server';
import { getStorageStats } from '@/lib/fileService';

export async function GET() {
  try {
    const stats = await getStorageStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get storage stats' },
      { status: 500 }
    );
  }
}

