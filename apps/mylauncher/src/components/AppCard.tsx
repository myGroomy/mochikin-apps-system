'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

export interface AppCardProps {
  id: string;
  name: string;
  title: string;
  description?: string;
  icon_url?: string;
  url: string;
  version?: string;
  category?: string;
  disabled?: boolean;
}

export function AppCard({
  id,
  name,
  title,
  description,
  icon_url,
  url,
  version,
  category,
  disabled = false,
}: AppCardProps) {
  const cardContent = (
    <div
      className={`flex flex-col h-full p-6 border rounded-lg transition-all ${
        disabled
          ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
          : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100 cursor-pointer'
      }`}
    >
      {/* Icon */}
      <div className="mb-4">
        {icon_url ? (
          <img
            src={icon_url}
            alt={title}
            className="w-12 h-12 rounded object-contain"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded flex items-center justify-center text-white text-lg font-bold">
            {title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-grow">
          {description}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-gray-100">
        <span className="capitalize bg-gray-100 px-2 py-1 rounded">
          {category || 'app'}
        </span>
        {version && <span>{version}</span>}
      </div>

      {/* Status badge */}
      {disabled && (
        <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
          Coming Soon
        </div>
      )}
    </div>
  );

  if (disabled) {
    return <div className="relative">{cardContent}</div>;
  }

  return (
    <Link href={url} target="_blank" rel="noopener noreferrer">
      <div className="relative">{cardContent}</div>
    </Link>
  );
}
