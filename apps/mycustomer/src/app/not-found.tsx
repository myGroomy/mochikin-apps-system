import Link from "next/link";
import Image from "next/image";
import {
  UserMinus,
  Basket,
  CheckSquare,
  House,
  ArrowRight,
  ChartBar,
} from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "404 — Data CRM Tidak Ditemukan | MyCustomer",
  description: "Kontak atau halaman analitik yang Anda akses tidak terdaftar dalam catatan database MyCustomer.",
};

export default function NotFound() {
  return (
    <div className="sky-hero grain min-h-screen flex flex-col justify-between p-4 sm:p-8">
      {/* Top Navbar Header */}
      <header className="mx-auto w-full max-w-4xl flex items-center justify-between border-b border-hairline/80 pb-4">
        <Link href="/app" className="flex items-center gap-3 group">
          <Image
            src="/brand-assets/mycustomer-icon.png"
            alt="MyCustomer Icon"
            width={32}
            height={32}
            className="h-8 w-8 object-contain drop-shadow-sm transition-transform group-hover:scale-105"
          />
          <div>
            <span className="block text-sm font-semibold tracking-tight text-ink">MYCUSTOMER</span>
            <span className="block text-[11px] text-ash">Pelacak Retensi & WhatsApp CRM</span>
          </div>
        </Link>
        <span className="inline-flex items-center rounded-full bg-[#022D4E]-wash px-2.5 py-1 text-[11px] font-semibold text-[#022D4E]-deep border border-[#022D4E]/10">
          Status 404
        </span>
      </header>

      {/* Main Doppel Card */}
      <main className="mx-auto my-auto w-full max-w-xl py-6">
        <div className="doppel-outer rounded-3xl p-1 shadow-sm">
          <div className="doppel-inner rounded-[calc(1.5rem-0.25rem)] bg-white p-6 sm:p-8">
            {/* Visual Icon & Badge */}
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200/60 px-3 py-1 text-[11px] font-semibold text-rose-700">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>Customer / Rute Tidak Ditemukan</span>
              </span>
              <span className="text-xs font-mono text-ash/60">CRM_DATA_EMPTY</span>
            </div>

            <div className="flex items-start gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#022D4E]-wash text-[#022D4E]-deep shrink-0">
                <UserMinus className="w-6 h-6" weight="duotone" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                  Halaman CRM Tidak Ditemukan
                </h1>
                <p className="text-xs text-ash mt-0.5">
                  Tautan salah, parameter pelanggan nihil, atau data telah digabungkan.
                </p>
              </div>
            </div>

            <p className="text-sm text-ash leading-relaxed mb-6">
              Catatan pelanggan, lembar follow-up WhatsApp, atau analitik cabang yang Anda tuju tidak terdaftar di sistem. Anda dapat kembali merekam transaksi baru atau meninjau daftar retensi pelanggan.
            </p>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
              <Link
                href="/app"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#022D4E] px-4 py-3 text-xs font-semibold text-white transition-all hover:bg-[#022D4E]-deep active:scale-95 shadow-sm"
              >
                <Basket className="w-4 h-4" weight="bold" />
                <span>Input Order Pelanggan</span>
              </Link>
              <Link
                href="/app/follow-up"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-hairline bg-sunken/40 px-4 py-3 text-xs font-semibold text-ink transition-all hover:bg-sunken active:scale-95"
              >
                <CheckSquare className="w-4 h-4 text-[#022D4E]" weight="bold" />
                <span>Follow-up WhatsApp</span>
              </Link>
            </div>

            {/* Sub Links */}
            <div className="border-t border-hairline/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <Link
                href="/app/dashboard"
                className="inline-flex items-center gap-1.5 text-ash hover:text-ink transition-colors font-medium"
              >
                <ChartBar className="w-4 h-4 text-ash" weight="bold" />
                <span>Buka Dashboard Retensi</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-ash hover:text-ink transition-colors font-medium"
              >
                <House className="w-4 h-4 text-ash" weight="bold" />
                <span>Beranda MyCustomer</span>
                <ArrowRight className="w-3.5 h-3.5" weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-4xl border-t border-hairline/80 pt-4 text-center text-[11px] text-ash">
        &copy; {new Date().getFullYear()} MyCustomer • Jangan sampai pelanggan lupa balik lagi.
      </footer>
    </div>
  );
}
