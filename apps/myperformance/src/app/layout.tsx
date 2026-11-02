import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { SessionProvider } from '@/components/session/SessionProvider';
import { SessionBanner } from '@/components/session/SessionBanner';

export const metadata: Metadata = {
  title: 'MyPerformance — Points Engine & CARE Scorecard',
  description: 'Modul performansi terpadu ekosistem MOCHIKIN-APPS',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" data-theme="stokis">
      <body className="min-h-screen bg-base-100 text-base-content antialiased relative pb-20 md:pb-0">
        <SessionProvider>
          <Navbar />
          <SessionBanner />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
