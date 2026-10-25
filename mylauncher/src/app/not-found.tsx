import { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Page Not Found — MOCHIKIN LAUNCHER",
};

export default function NotFoundPage() {
  return (
    <AppShell>
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-ink">404</h1>
          <p className="text-lg text-ink-soft">Page not found</p>
          <Link
            href="/launcher"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
