import { Navbar } from "./Navbar";
import { AppCard } from "./AppCard";
import { ECOSYSTEM_APPS, isRoleAllowedForApp } from "@/lib/constants";
import type { ServicesUserSession } from "@/lib/auth";

interface PortalDashboardProps {
  user: ServicesUserSession;
}

export function PortalDashboard({ user }: PortalDashboardProps) {
  const isAdmin = user.role === "super_admin" || user.role === "role_admin";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60">
      <Navbar user={user} isAdmin={isAdmin} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Selamat Datang, {user.name} 👋
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Pilih aplikasi di bawah untuk mulai bekerja. Autentikasi SSO aktif untuk cabang{" "}
                <strong className="text-slate-700 font-semibold">{user.branchName}</strong>.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-sm text-xs font-medium text-slate-600 shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Sesi Aktif: Hingga {new Date(user.expiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</span>
            </div>
          </div>
        </div>

        {/* App Switcher Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ECOSYSTEM_APPS.map((app) => {
            const isAllowed = isRoleAllowedForApp(user.role, app.id);
            return (
              <AppCard
                key={app.id}
                app={app}
                isAllowed={isAllowed}
                userRole={user.role}
              />
            );
          })}
        </div>

        {/* Helpful Tip Box */}
        <div className="mt-10 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-bold text-lg">
              💡
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Akses Langsung Tanpa Login Ulang
              </h4>
              <p className="text-xs text-slate-500">
                Klik tombol "Buka Aplikasi" untuk otomatis masuk ke Stokis, MyCheck, MyCustomer, atau MyPerformance.
              </p>
            </div>
          </div>

          {isAdmin && (
            <a
              href="/admin"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
            >
              Lihat Status Layanan &rarr;
            </a>
          )}
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200/60 bg-white/50 py-6 text-center text-xs text-slate-400">
        <p>Mochikin Services &bull; Unified Enterprise Gateway &bull; v2.0</p>
      </footer>
    </div>
  );
}
