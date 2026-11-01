// app/maintenance/page.tsx
// Halaman yang ditampilkan saat maintenance_mode = TRUE dan user bukan admin.

import { Wrench } from 'lucide-react';
import Link from 'next/link';

export default function MaintenancePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <div className="max-w-md text-center">
        <Wrench className="mx-auto h-12 w-12 text-ink-muted" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold text-ink">Sedang maintenance</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Aplikasi sedang dalam perawatan. Silakan coba lagi nanti.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-canvas transition-colors"
          >
            Masuk sebagai Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
