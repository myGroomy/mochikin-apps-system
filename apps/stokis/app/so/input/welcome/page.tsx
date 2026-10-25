'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WelcomeSOPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/so/input');
  }, [router]);

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-base-content/60">Mengarahkan ke Formulir SO...</span>
      </div>
    </div>
  );
}
