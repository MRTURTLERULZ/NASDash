import { NextRequest, NextResponse } from 'next/server';
import { listDirectory } from '@/lib/fileService';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path') || '/';

    const result = await listDirectory(path, session.folder, session.isAdmin);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list directory' },
      { status: 500 }
    );
  }
}

