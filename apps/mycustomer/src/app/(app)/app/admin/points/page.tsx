'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Halaman lama: Sistem Poin CRM sekarang jadi sub-tab di /app/admin
export default function MyCustomerAdminPointsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/admin?tab=points');
  }, [router]);

  return (
    <div className="flex min-h-[70dvh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
    </div>
  );
}
