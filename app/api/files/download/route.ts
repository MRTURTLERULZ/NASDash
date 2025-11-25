import { NextRequest, NextResponse } from 'next/server';
import { getFileStats } from '@/lib/fileService';
import { getSession } from '@/lib/auth';
import { createReadStream } from 'fs';
import { Readable } from 'stream';

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
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      );
    }

    const fileStats = await getFileStats(path, session.folder, session.isAdmin);
    const fileStream = createReadStream(fileStats.path);

    // Convert Node stream to Web ReadableStream
    const stream = Readable.toWeb(fileStream) as ReadableStream;

    // Extract filename from path
    const filename = path.split('/').pop() || 'download';

    const headers = new Headers();
    headers.set('Content-Type', fileStats.mime);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Length', fileStats.size.toString());

    return new NextResponse(stream, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download file' },
      { status: 500 }
    );
  }
}

