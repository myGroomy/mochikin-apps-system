"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Lock } from "lucide-react";
import type { App } from "@/lib/types";
import { resolveAppUrl } from "@/lib/constants";

interface AppLaunchViewProps {
  app: App | null;
  appId: string;
  deepLink?: string | null;
  handoffUrl?: string | null;
}

export function AppLaunchView({ app, appId, deepLink, handoffUrl }: AppLaunchViewProps) {
  const router = useRouter();
  const href = handoffUrl || (app ? resolveAppUrl(app.url, deepLink) : "#");

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      {app ? (
        <div className="text-center space-y-4">
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle className="text-lg">{app.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open {app.name}
              </a>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <Lock className="h-12 w-12 text-mist mx-auto" />
          <h2 className="text-xl font-bold text-ink">Akses Ditolak</h2>
          <p className="text-ink-soft">
            Anda tidak memiliki izin untuk mengakses {appId}.
          </p>
          <button
            className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
            onClick={() => router.push("/launcher")}
          >
            Kembali ke Beranda
          </button>
        </div>
      )}
    </div>
  );
}
