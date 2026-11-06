import Link from "next/link";
import {
  Lightning,
  Trophy,
  Star,
  House,
  ArrowRight,
  ShieldCheck,
  Compass,
} from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "404 — Skor / Halaman Tidak Ditemukan | MyPerformance",
  description: "Halaman performa atau kartu skor yang Anda cari tidak masuk dalam catatan leaderboard periode ini.",
};

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-hairline bg-white p-6 sm:p-8 shadow-sm">
        {/* Scorecard Milestone Tag */}
        <div className="flex items-center justify-between border-b border-hairline pb-4 mb-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-3 py-1 text-[11px] font-semibold text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span>Leaderboard & CARE Scorecard</span>
          </div>
          <span className="text-xs font-mono font-medium text-ash">
            0_PTS_UNRANKED
          </span>
        </div>

        {/* Hero Visual */}
        <div className="flex items-start gap-4 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent border border-accent/20 shrink-0">
            <Compass className="w-6 h-6" weight="duotone" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Halaman Performa Tidak Ditemukan
            </h1>
            <p className="text-xs text-ash mt-0.5">
              Rute atau kartu skor ini tidak terdaftar dalam catatan sesi aktif.
            </p>
          </div>
        </div>

        <p className="text-sm text-ash leading-relaxed mb-6">
          Sesi evaluasi rekan, rekaman akumulasi poin, atau rute leaderboard yang Anda tuju belum diterbitkan atau URL yang dimasukkan tidak valid.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-6">
          <Link
            href="/dashboard/me"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-xs font-semibold text-white hover:bg-accent-deep transition-all active:scale-[0.98] shadow-sm"
          >
            <Lightning className="w-4 h-4" weight="bold" />
            <span>Cek Poin Saya</span>
          </Link>
          <Link
            href="/dashboard/team"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-hairline bg-sunken/40 px-4 py-3 text-xs font-semibold text-ink hover:bg-sunken transition-all active:scale-[0.98]"
          >
            <Trophy className="w-4 h-4 text-accent" weight="bold" />
            <span>Leaderboard Tim</span>
          </Link>
        </div>

        {/* Quick Nav Sub-links */}
        <div className="rounded-2xl border border-hairline/70 bg-sunken/30 p-4 space-y-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ash font-mono">
            Modul MyPerformance
          </div>
          <div className="flex flex-col gap-1.5 text-xs">
            <Link
              href="/scorecards"
              className="flex items-center justify-between p-2 rounded-xl text-ash hover:bg-white hover:text-ink transition-all group"
            >
              <span className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-accent" weight="duotone" />
                <span>Penilaian CARE Scorecard 360</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-ash group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/scorecards/manage"
              className="flex items-center justify-between p-2 rounded-xl text-ash hover:bg-white hover:text-ink transition-all group"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-ash" weight="duotone" />
                <span>Kelola Sesi (Khusus Admin / Lead)</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-ash group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
