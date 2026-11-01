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
    <html lang="id" data-theme="mochikin">
      <body className="min-h-screen bg-base-200 text-base-content antialiased selection:bg-primary selection:text-primary-content">
        {children}
      </body>
    </html>
  );
}
