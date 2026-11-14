import Link from "next/link";
import {
  Compass,
  ArrowRight,
  House,
  ShieldCheck,
  Package,
  CheckCircle,
  Users,
  TrendUp,
} from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "404 — Rute Gateway Tidak Ditemukan | MyService",
  description: "Halaman atau endpoint gateway yang Anda akses tidak terdaftar di sistem MyService.",
};

const ECOSYSTEM_LINKS = [
  { name: "Stokis", desc: "Stock Opname & Gudang", href: "https://stokis-app.vercel.app", icon: Package },
  { name: "MyCheck", desc: "SOP & Checklist Shift", href: "https://mycheck-app.vercel.app", icon: CheckCircle },
  { name: "MyCustomer", desc: "CRM & Retensi Pelanggan", href: "https://mycustomer-app.vercel.app", icon: Users },
  { name: "MyPerformance", desc: "Akumulasi Poin & Scorecard", href: "https://myperformance-app.vercel.app", icon: TrendUp },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between px-4 py-8 sm:py-12">
      {/* Top Header Identity */}
      <header className="mx-auto w-full max-w-4xl flex items-center justify-between border-b border-hairline/80 pb-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white font-bold shadow-sm transition-transform group-hover:scale-105">
            M
          </div>
          <div className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-ink">MyService</span>
            <span className="block text-[11px] text-ash font-mono">Central Gateway & Identity</span>
          </div>
        </Link>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-2.5 py-1 text-[11px] font-mono text-ash shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>HTTP 404</span>
        </div>
      </header>

      {/* Main 404 Content */}
      <main className="mx-auto my-auto w-full max-w-xl py-8">
        <div className="rounded-2xl border border-hairline bg-white p-6 sm:p-8 shadow-sm">
          {/* Badge & Monospace Code */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent uppercase tracking-wider font-mono">
              <Compass className="w-3.5 h-3.5" weight="bold" />
              Rute Tidak Terdaftar
            </span>
            <span className="text-ash/60 text-xs font-mono">ERR_GATEWAY_NOT_FOUND</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">
            Halaman Gateway Tidak Ditemukan
          </h1>
          <p className="text-sm text-ash leading-relaxed mb-6">
            Alamat URL atau portal layanan yang Anda tuju tidak terhubung ke jaringan MyService Gateway. Rute mungkin telah dipindahkan, dinonaktifkan, atau salah ketik.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pb-6 border-b border-hairline/80">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-accent-deep active:scale-95 shadow-2xs"
            >
              <House className="w-4 h-4" weight="bold" />
              <span>Kembali ke Beranda Service</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-white px-4 py-2.5 text-xs font-semibold text-ink transition-all hover:bg-sunken hover:border-hairline-strong active:scale-95 shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4 text-ash" weight="bold" />
              <span>Login SSO Gateway</span>
            </Link>
          </div>

          {/* Quick Ecosystem Launcher */}
          <div className="pt-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ash mb-3 font-mono">
              Aplikasi Ekosistem MyService
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ECOSYSTEM_LINKS.map((app) => {
                const Icon = app.icon;
                return (
                  <a
                    key={app.name}
                    href={app.href}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-hairline/70 bg-sunken/40 hover:bg-sunken hover:border-hairline transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-hairline/60 text-accent shrink-0 shadow-2xs">
                        <Icon className="w-3.5 h-3.5" weight="duotone" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink truncate group-hover:text-accent transition-colors">
                          {app.name}
                        </div>
                        <div className="text-[10px] text-ash truncate">{app.desc}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-mist shrink-0 group-hover:text-ink transition-colors" weight="bold" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-4xl border-t border-hairline/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-ash">
        <div>&copy; {new Date().getFullYear()} SaaS Platform Ecosystem. Hak Cipta Dilindungi.</div>
        <div className="font-mono text-mist">ID: service.gateway.404</div>
      </footer>
    </div>
  );
}
