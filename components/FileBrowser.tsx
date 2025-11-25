'use client';

import { useState } from 'react';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size: number | null;
  modified: string;
  path: string;
}

interface FileBrowserProps {
  items: FileItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export default function FileBrowser({
  items,
  currentPath,
  onNavigate,
  onRefresh,
}: FileBrowserProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleDownload = (item: FileItem) => {
    window.location.href = `/api/files/download?path=${encodeURIComponent(item.path)}`;
  };

  const handleDelete = async (item: FileItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    setDeleting(item.path);
    setError('');

    try {
      const response = await fetch(
        `/api/files/delete?path=${encodeURIComponent(item.path)}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        This directory is empty
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {items.map((item) => (
            <li key={item.path} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {item.type === 'directory' ? (
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <button
                      onClick={() => {
                        if (item.type === 'directory') {
                          onNavigate(item.path);
                        }
                      }}
                      className={`text-sm font-medium ${
                        item.type === 'directory'
                          ? 'text-indigo-600 hover:text-indigo-900 cursor-pointer'
                          : 'text-gray-900'
                      }`}
                    >
                      {item.name}
                    </button>
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <span className="mr-4">
                        {item.size !== null ? formatBytes(item.size) : '-'}
                      </span>
                      <span>{formatDate(item.modified)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {item.type === 'file' && (
                    <button
                      onClick={() => handleDownload(item)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      title="Download"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={deleting === item.path}
                    className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete"
                  >
                    {deleting === item.path ? (
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

