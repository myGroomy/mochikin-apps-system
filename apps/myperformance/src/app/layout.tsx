import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'MyPerformance — Points Engine & CARE Scorecard',
  description: 'Modul performansi terpadu ekosistem MOCHIKIN-APPS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" data-theme="stokis">
      <body className="min-h-screen bg-base-100 text-base-content antialiased relative pb-16 md:pb-0">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
