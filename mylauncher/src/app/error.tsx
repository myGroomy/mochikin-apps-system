"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <AppShell>
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-amber mx-auto" />
          <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
          <p className="text-sm text-ink-soft">An unexpected error occurred.</p>
          <Button variant="outline" onClick={() => reset()}>
            Try Again
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
