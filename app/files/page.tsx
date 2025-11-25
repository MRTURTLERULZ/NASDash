'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumb';
import FileUpload from '@/components/FileUpload';
import FileBrowser from '@/components/FileBrowser';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size: number | null;
  modified: string;
  path: string;
}

interface DirectoryListing {
  currentPath: string;
  items: FileItem[];
}

export default function FilesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentPath = searchParams.get('path') || '/';

  const fetchListing = useCallback(async (path: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/files/list?path=${encodeURIComponent(path)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load directory');
      }

      setListing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListing(currentPath);
  }, [currentPath, fetchListing]);

  const handleNavigate = (path: string) => {
    router.push(`/files?path=${encodeURIComponent(path)}`);
  };

  const handleUploadComplete = () => {
    fetchListing(currentPath);
  };

  if (loading && !listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Files</h1>
        {listing && (
          <Breadcrumb
            currentPath={listing.currentPath}
            onNavigate={handleNavigate}
          />
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {listing && (
        <>
          <FileUpload
            currentPath={listing.currentPath}
            onUploadComplete={handleUploadComplete}
          />
          <FileBrowser
            items={listing.items}
            currentPath={listing.currentPath}
            onNavigate={handleNavigate}
            onRefresh={() => fetchListing(currentPath)}
          />
        </>
      )}
    </div>
  );
}

