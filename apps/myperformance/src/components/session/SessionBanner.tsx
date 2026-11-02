'use client';

import { useSession } from '@/components/session/SessionProvider';
import { RefreshCw } from 'lucide-react';

/**
 * Slim, dismissible-by-login notice shown when no launcher session is present.
 * Keeps personal-data pages honest instead of rendering zeros.
 */
export function SessionBanner() {
  const { authenticated, status, refresh } = useSession();

  if (status !== 'ready' || authenticated) return null;

  return (
    <div className="border-b border-warning/30 bg-warning/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-2.5 text-xs text-base-content/80 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold">Sesi Launcher tidak ditemukan.</span>{' '}
          Data pribadi tidak dapat dimuat sampai kamu membuka MyPerformance dari Launcher.
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex min-h-[32px] items-center gap-1.5 self-start rounded-md border border-base-300 bg-base-100 px-2.5 py-1 font-semibold text-base-content/70 transition-colors hover:text-base-content sm:self-auto"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          Coba lagi
        </button>
      </div>
    </div>
  );
}
