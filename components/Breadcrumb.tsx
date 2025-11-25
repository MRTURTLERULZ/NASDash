'use client';

import Link from 'next/link';

interface BreadcrumbProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export default function Breadcrumb({ currentPath, onNavigate }: BreadcrumbProps) {
  const segments = currentPath.split('/').filter(Boolean);
  const paths: { name: string; path: string }[] = [
    { name: 'Root', path: '/' },
  ];

  let current = '';
  segments.forEach((segment) => {
    current += '/' + segment;
    paths.push({ name: segment, path: current });
  });

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {paths.map((item, index) => (
          <li key={item.path} className="flex items-center">
            {index > 0 && (
              <svg
                className="flex-shrink-0 h-5 w-5 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <button
              onClick={() => onNavigate(item.path)}
              className={`text-sm font-medium ${
                index === paths.length - 1
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.name}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

