"use client";

import { useEffect } from "react";
import { WarningCircle, ArrowClockwise, House } from "@phosphor-icons/react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Mochikin Service Client Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="doppel-outer w-full max-w-md">
        <div className="doppel-inner p-6 sm:p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose/10 text-rose flex items-center justify-center mx-auto">
            <WarningCircle size={28} weight="fill" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">Terjadi Kendala Memuat Halaman</h2>
            <p className="text-xs sm:text-sm text-ash mt-1">
              {error?.message || "Sesi atau komponen tampilan gagal dimuat dengan benar."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent-deep transition-all"
            >
              <ArrowClockwise size={14} weight="bold" />
              <span>Coba Lagi</span>
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-md border border-hairline bg-white px-4 py-2 text-xs font-medium text-ink hover:bg-sunken transition-all"
            >
              <House size={14} weight="bold" />
              <span>Ke Beranda</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
