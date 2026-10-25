'use client';

import { useEffect, useState } from 'react';
import { AppCard, AppCardProps } from './AppCard';

export interface AppGridProps {
  apps?: AppCardProps[];
  loading?: boolean;
  error?: string;
  refreshInterval?: number; // in milliseconds
}

export function AppGrid({
  apps: initialApps,
  loading: initialLoading = false,
  error: initialError,
  refreshInterval = 300000, // 5 minutes default
}: AppGridProps) {
  const [apps, setApps] = useState<AppCardProps[]>(initialApps || []);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(initialError);

  // Fetch apps from API if not provided
  useEffect(() => {
    if (initialApps && initialApps.length > 0) {
      return; // Use provided apps
    }

    async function fetchApps() {
      setLoading(true);
      try {
        const response = await fetch('/api/apps');
        if (!response.ok) {
          throw new Error('Failed to fetch apps');
        }

        const data = await response.json();
        setApps(data.apps || []);
        setError(undefined);
      } catch (err) {
        console.error('❌ Failed to load apps:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchApps();

    // Set up refresh interval
    const interval = setInterval(fetchApps, refreshInterval);
    return () => clearInterval(interval);
  }, [initialApps, refreshInterval]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Failed to load apps
        </h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!apps || apps.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No apps available yet</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {apps.map((app) => (
          <AppCard key={app.id} {...app} />
        ))}
      </div>
    </div>
  );
}
