import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mochikin Service — Central Gateway & Identity",
  description: "Unified identity gateway and app launcher for Mochikin Apps ecosystem.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
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
      <body className="min-h-screen bg-canvas text-ink antialiased selection:bg-accent/20 selection:text-accent-deep">
        {children}
      </body>
    </html>
  );
}
