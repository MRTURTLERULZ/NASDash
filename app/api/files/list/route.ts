import { NextRequest, NextResponse } from 'next/server';
import { listDirectory } from '@/lib/fileService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path') || '/';

    const result = await listDirectory(path);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list directory' },
      { status: 500 }
    );
  }
}

