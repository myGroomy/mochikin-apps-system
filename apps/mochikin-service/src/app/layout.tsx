import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mochikin Services — Central Gateway & Identity",
  description: "Unified identity gateway and app launcher for Mochikin Apps ecosystem.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
