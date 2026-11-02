"use client";

import { useSession } from "@/components/session/SessionProvider";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function SessionBanner() {
  const { authenticated, status, refresh } = useSession();

  if (status !== "ready" || authenticated) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50/70 px-4 py-2.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <WarningCircle className="size-4 shrink-0 text-amber-600" />
          <p>
            <span className="font-semibold">Sesi Launcher tidak aktif.</span>{" "}
            Buka aplikasi dari Portal Mochikin Services untuk sinkronisasi akun dan data performa pribadi Anda.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => void refresh()}
          className="self-start sm:self-auto gap-1 border-amber-300 bg-white hover:bg-amber-100/50 text-amber-900"
        >
          <ArrowClockwise className="size-3" aria-hidden="true" />
          Periksa Sesi
        </Button>
      </div>
    </div>
  );
}
