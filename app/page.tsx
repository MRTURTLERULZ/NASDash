import Link from 'next/link';
import StorageStats from '@/components/StorageStats';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">NAS Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage your local storage and files</p>
      </div>

      <div className="mb-6">
        <StorageStats />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <Link
          href="/files"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Browse Files →
        </Link>
      </div>
    </div>
  );
}

