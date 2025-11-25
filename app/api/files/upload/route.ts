import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/fileService';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
    const path = (formData.get('path') as string) || '/';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Upload all files
    const uploadPromises = files.map(file => uploadFile(file, path, session.folder, session.isAdmin));
    await Promise.all(uploadPromises);

    return NextResponse.json({ success: true, count: files.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload files' },
      { status: 500 }
    );
  }
}

