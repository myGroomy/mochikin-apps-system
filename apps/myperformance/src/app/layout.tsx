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
      <body className={`min-h-screen antialiased ${GeistSans.variable} ${GeistMono.variable} bg-canvas text-foreground selection:bg-accent/20 selection:text-accent-deep`}>
        <SessionProvider>
          <SessionBanner />
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" richColors />
        </SessionProvider>
      </body>
    </html>
  );
}
