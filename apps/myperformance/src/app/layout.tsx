import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { SessionProvider } from "@/components/session/SessionProvider";
import { SessionBanner } from "@/components/session/SessionBanner";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "MyPerformance — Akumulasi Poin, Leaderboard & CARE Scorecard",
  description: "Modul manajemen performa & sistem insentif staf ekosistem Mochikin.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={cn("font-sans", GeistSans.variable, GeistMono.variable)}
      data-scroll-behavior="smooth"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`min-h-screen font-sans antialiased bg-canvas text-foreground selection:bg-accent/20 selection:text-accent-deep`}>
        <SessionProvider>
          <SessionBanner />
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" richColors />
        </SessionProvider>
      </body>
    </html>
  );
}
