import type { Metadata } from 'next';
import './globals.css';
import { CabangProvider } from '@/lib/CabangContext';
import { AuthProvider } from '@/lib/AuthContext';
import { ToastProvider } from '@/lib/ToastContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import { TourProvider } from '@/lib/TourContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { PageTransition } from '@/components/PageTransition';

export const metadata: Metadata = {
  title: 'Stokis - Sistem Stock Opname Multi Cabang',
  description: 'Sistem Stock Opname Multi Cabang dengan isolasi database Google Sheets dan laporan otomatis XLSX & WhatsApp',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body data-theme="stokis" className="min-h-screen flex flex-col antialiased bg-base-200 text-base-content font-sans">
        <AuthProvider>
          <CabangProvider>
            <ToastProvider>
              <LanguageProvider>
                <AuthGuard>
                  <TourProvider>
                    <a
                      href="#main-content"
                      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-content focus:text-sm font-semibold"
                    >
                      Lewati ke konten utama
                    </a>
                    <Navbar />
                    <main id="main-content" className="flex-1 w-full overflow-x-clip">
                      <PageTransition>{children}</PageTransition>
                    </main>
                  </TourProvider>
                </AuthGuard>
              </LanguageProvider>
            </ToastProvider>
          </CabangProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
