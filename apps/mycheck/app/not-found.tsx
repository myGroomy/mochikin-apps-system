import Link from "next/link";
import {
  ListChecks,
  ClipboardX,
  ArrowRight,
  Home,
  BookOpen,
  CalendarClock,
} from "lucide-react";

export const metadata = {
  title: "404 — Prosedur Tidak Ditemukan | MyCheck",
  description: "Rute checklist atau prosedur SOP yang Anda cari tidak ditemukan dalam daftar shift MyCheck.",
};

export default function NotFound() {
  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-sm">
        {/* SOP Status Header Tag */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-[11px] font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>SOP Outlet F&B</span>
          </div>
          <span className="text-xs font-mono font-medium text-stone-400">
            ERR_404_UNCHECKED
          </span>
        </div>

        {/* Hero Visual */}
        <div className="flex items-start gap-4 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-700 border border-stone-200 shrink-0">
            <ClipboardX className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Prosedur Shift Tidak Ditemukan
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Halaman ini berada di luar panduan alur kerja shift aktif.
            </p>
          </div>
        </div>

        <p className="text-sm text-stone-600 leading-relaxed mb-6">
          Rute tugas atau lembar checklist yang Anda coba akses tidak tercatat dalam jadwal operasional shift, atau tautan telah kedaluwarsa setelah sesi shift ditutup.
        </p>

        {/* Core Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-6">
          <Link
            href="/daftar-shift"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition-all active:scale-[0.98] shadow-sm"
          >
            <CalendarClock className="w-4 h-4" />
            <span>Buka Jadwal Shift</span>
          </Link>
          <Link
            href="/petugas"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/60 px-4 py-3 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-all active:scale-[0.98]"
          >
            <ListChecks className="w-4 h-4 text-emerald-600" />
            <span>Checklist Petugas</span>
          </Link>
        </div>

        {/* Documentation & Return Links */}
        <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-4 space-y-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 font-mono">
            Bantuan Operasional
          </div>
          <div className="flex flex-col gap-1.5 text-xs">
            <Link
              href="/docs"
              className="flex items-center justify-between p-2 rounded-xl text-stone-600 hover:bg-white hover:text-stone-900 transition-all group"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700" />
                <span>Dokumentasi Standar SOP</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/"
              className="flex items-center justify-between p-2 rounded-xl text-stone-600 hover:bg-white hover:text-stone-900 transition-all group"
            >
              <span className="flex items-center gap-2">
                <Home className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700" />
                <span>Halaman Depan MyCheck</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
