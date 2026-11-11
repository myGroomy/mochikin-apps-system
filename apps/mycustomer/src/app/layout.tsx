import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { cn } from "@/lib/utils";

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'MYCUSTOMER Jangan sampai pelanggan lupa balik lagi',
  description: 'Catatan kasir yang jadi database pelanggan & pelacak retensi bisnis F&B.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/brand-assets/mycustomer-icon.png',
  },
  openGraph: {
    title: 'MYCUSTOMER Pelacak Retensi Bisnis F&B',
    description: 'Jangan sampai pelanggan lupa balik lagi. Rekam transaksi kasir jadi database pelanggan otomatis.',
    images: [
      {
        url: '/brand-assets/mycustomer-logo.png',
        width: 1400,
        height: 328,
        alt: 'MYCUSTOMER Logo',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="font-sans" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
