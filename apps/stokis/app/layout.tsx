import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { CabangProvider } from '@/lib/CabangContext';
import { AuthProvider } from '@/lib/AuthContext';
import { ToastProvider } from '@/lib/ToastContext';
import { TourProvider } from '@/lib/TourContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { PageTransition } from '@/components/PageTransition';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['600', '700'],
});

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
      <html lang="id" className={jakarta.variable}>
      <body data-theme="stokis" className="min-h-screen flex flex-col antialiased bg-base-200 text-base-content">
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
