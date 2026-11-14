import { redirect } from "next/navigation";
import Link from "next/link";
import { getServicesSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { AdminNavTabs } from "@/components/AdminNavTabs";
import { House } from "@phosphor-icons/react/dist/ssr";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServicesSession();

  if (!session) {
    redirect("/?sso=unauthenticated");
  }

  const isAdmin =
    session.role === "super_admin" ||
    session.role === "role_admin" ||
    session.role === "admin";

  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface/90 backdrop-blur-md px-3.5 sm:px-6">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2 focus-visible:rounded-md">
              <Logo size="sm" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-sunken active:scale-95 shadow-xs"
              title="Kembali ke Beranda Portal"
            >
              <House className="w-3.5 h-3.5 text-accent" weight="bold" />
              <span>Beranda</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-wash text-xs font-bold text-accent">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block leading-tight">
                <div className="text-xs font-semibold text-ink">{session.name}</div>
                <div className="text-[10px] text-ash capitalize">
                  {session.role.replace("_", " ")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="p-3.5 sm:p-6 flex-1 pb-24 md:pb-8">
        <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-display">
              Admin Control Center
            </h1>
            <p className="text-xs sm:text-sm text-ash mt-0.5">
              Kelola integrasi koneksi modul, otorisasi staf multi-cabang, direktori outlet, dan profil brand.
            </p>
          </div>

          <AdminNavTabs />

          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
