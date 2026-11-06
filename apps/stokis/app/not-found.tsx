import Link from "next/link";
import {
  PackageX,
  ClipboardCheck,
  BarChart3,
  Home,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";

export const metadata = {
  title: "404 — Stok / Halaman Tidak Ditemukan | Stokis",
  description: "Item atau rute yang Anda cari tidak tercatat dalam master data gudang maupun sesi Stock Opname.",
};

export default function NotFound() {
  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl border border-base-300 overflow-hidden">
        {/* Card Header Alert Stripe */}
        <div className="bg-warning/15 border-b border-warning/20 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="badge badge-warning badge-sm font-semibold uppercase tracking-wider font-mono">
              STOK NIHIL
            </span>
            <span className="text-xs text-base-content/60 font-mono">CODE: 404_ITEM_NOT_FOUND</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-warning animate-ping" />
            <span className="text-[11px] font-semibold text-warning">Selisih Fisik</span>
          </div>
        </div>

        <div className="card-body p-6 sm:p-8">
          {/* Warehouse Visual Icon */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10 text-warning border border-warning/20 shrink-0">
              <PackageX className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-base-content tracking-tight">
                Halaman Tidak Tercatat di Gudang
              </h1>
              <p className="text-xs text-base-content/60">
                Sistem Stock Opname Multi Cabang Mochikin
              </p>
            </div>
          </div>

          <p className="text-sm text-base-content/80 leading-relaxed mb-6">
            Rute inventaris atau laporan yang Anda tuju tidak ada dalam database cabang aktif. Item mungkin telah diarsipkan, URL salah ketik, atau sesi Stock Opname telah ditutup.
          </p>

          {/* Core Action Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
            <Link
              href="/stock-opname"
              className="btn btn-primary btn-sm h-11 text-xs gap-2 font-semibold shadow-sm"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Input Stock Opname</span>
            </Link>
            <Link
              href="/dashboard"
              className="btn btn-outline btn-sm h-11 text-xs gap-2 font-semibold"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard Cabang</span>
            </Link>
          </div>

          {/* Quick Helpful Links */}
          <div className="border-t border-base-200 pt-4 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/50 font-mono">
              Menu Cepat Stokis
            </div>
            <div className="divide-y divide-base-200 text-xs">
              <Link
                href="/laporan"
                className="flex items-center justify-between py-2.5 text-base-content/80 hover:text-primary transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-base-content/40 group-hover:text-primary" />
                  <span>Rekap Laporan SO Harian</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-base-content/40 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/"
                className="flex items-center justify-between py-2.5 text-base-content/80 hover:text-primary transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-base-content/40 group-hover:text-primary" />
                  <span>Halaman Utama Stokis</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-base-content/40 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
