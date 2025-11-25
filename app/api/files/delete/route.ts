import { NextRequest, NextResponse } from 'next/server';
import { deleteItem } from '@/lib/fileService';

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      );
    }

    await deleteItem(path);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete item' },
      { status: 500 }
    );
  }
}

