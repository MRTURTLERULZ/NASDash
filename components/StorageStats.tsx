'use client';

import { useEffect, useState } from 'react';

interface StorageStats {
  total: number;
  used: number;
  free: number;
  fileCount: number;
  folderCount: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default function StorageStats() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/storage/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const usedPercent = stats.total > 0 ? (stats.used / stats.total) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Storage Overview</h2>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Used</span>
            <span>{formatBytes(stats.used)} / {formatBytes(stats.total)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-indigo-600 h-2.5 rounded-full"
              style={{ width: `${usedPercent}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {formatBytes(stats.free)} free ({usedPercent.toFixed(1)}% used)
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <div className="text-sm text-gray-600">Files</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.fileCount.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Folders</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.folderCount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

