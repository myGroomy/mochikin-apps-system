import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="id" data-theme="myperformance">
      <body className="min-h-screen bg-base-100 text-base-content antialiased">
        {children}
      </body>
    </html>
  );
}
