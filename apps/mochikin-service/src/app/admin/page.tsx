import { redirect } from "next/navigation";
import { getServicesSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ECOSYSTEM_APPS, getAppTargetUrl } from "@/lib/constants";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Server,
  Users,
  ExternalLink,
  Database,
  Layers,
  Sparkles,
} from "lucide-react";

export default async function AdminHealthPage() {
  const session = await getServicesSession();

  if (!session) {
    redirect("/?sso=unauthenticated");
  }

  const isAdmin = session.role === "super_admin" || session.role === "role_admin";
  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-base-200">
        <div className="card w-full max-w-md bg-base-100 shadow-xl border border-error/30 text-center">
          <div className="card-body items-center p-8">
            <ShieldAlert className="w-12 h-12 text-error mb-2" />
            <h1 className="text-xl font-bold text-base-content">Akses Ditolak</h1>
            <p className="text-xs sm:text-sm text-base-content/70 mt-1">
              Halaman ini khusus untuk administrator sistem Mochikin Services.
            </p>
            <div className="card-actions mt-6">
              <a href="/" className="btn btn-neutral btn-sm rounded-xl gap-2 font-bold">
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Portal
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Fetch active people summary from Supabase
  const supabase = getSupabaseAdmin();
  const { data: people, error } = await supabase
    .from("people")
    .select(`
      id,
      name,
      username,
      email,
      role,
      status,
      last_login_at,
      branches (
        id,
        name,
        code
      )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      {/* Admin Navbar */}
      <header className="navbar bg-base-100 border-b border-base-200 px-4 sm:px-8 shadow-xs sticky top-0 z-40">
        <div className="navbar-start gap-2">
          <a
            href="/"
            className="btn btn-ghost btn-sm btn-circle"
            title="Kembali ke Portal"
          >
            <ArrowLeft className="w-5 h-5 text-base-content" />
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-base-content">
                System Health & Directory
              </h1>
              <span className="badge badge-accent badge-sm font-bold uppercase">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-base-content/60 hidden sm:block">
              Mochikin Services SSO Gateway Monitor
            </p>
          </div>
        </div>

        <div className="navbar-end gap-2">
          <span className="badge badge-success badge-soft gap-1.5 font-semibold text-xs">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            Supabase DB Online
          </span>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Gateway Connection Overview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                <span>Koneksi Aplikasi Ekosistem (SSO Targets)</span>
              </h2>
              <p className="text-xs text-base-content/50">
                Status endpoint handoff SSO token untuk setiap micro-frontend
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ECOSYSTEM_APPS.map((app) => {
              const url = getAppTargetUrl(app.id);
              const isConfigured = Boolean(url);

              return (
                <div
                  key={app.id}
                  className="card bg-base-100 border border-base-200 shadow-sm flex flex-col justify-between"
                >
                  <div className="card-body p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-base-content text-sm">{app.name}</span>
                      <span
                        className={`badge badge-sm font-bold ${
                          isConfigured ? "badge-success badge-soft" : "badge-warning badge-soft"
                        }`}
                      >
                        {isConfigured ? "Terkoneksi" : "Unset"}
                      </span>
                    </div>

                    <div className="text-[11px] text-base-content/60 font-mono break-all line-clamp-2 bg-base-200/50 p-2 rounded-lg border border-base-200">
                      {url || "NEXT_PUBLIC_" + app.id + "_URL"}
                    </div>

                    <div className="mt-4 pt-3 border-t border-base-200 flex items-center justify-between text-xs">
                      <span className="badge badge-ghost badge-xs">{app.category}</span>
                      {isConfigured && (
                        <a
                          href={`/api/auth/handoff?appId=${app.id}&returnPath=/`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-xs text-primary font-bold gap-1"
                        >
                          <span>Test SSO</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Database & Identity Status */}
        <div className="card bg-base-100 border border-base-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-base-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base-content text-base">
                  Master Data Staf & Identitas (Supabase)
                </h3>
                <p className="text-xs text-base-content/60">
                  Data pengguna aktif dari tabel <code className="text-primary font-mono">people</code>
                </p>
              </div>
            </div>

            <div className="badge badge-neutral font-mono text-xs">
              Total Ditampilkan: {people?.length || 0} staf aktif
            </div>
          </div>

          {error ? (
            <div className="p-6">
              <div className="alert alert-error text-xs sm:text-sm">
                <span>Gagal memuat daftar pengguna: {error.message}</span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra table-sm w-full">
                <thead>
                  <tr className="text-base-content/70">
                    <th className="pl-6">Nama Staf</th>
                    <th>Username</th>
                    <th>Role SSO</th>
                    <th>Cabang</th>
                    <th className="pr-6">Terakhir Login</th>
                  </tr>
                </thead>
                <tbody>
                  {people?.map((p) => {
                    const branch = Array.isArray(p.branches) ? p.branches[0] : p.branches;
                    return (
                      <tr key={p.id} className="hover">
                        <td className="pl-6 font-bold text-base-content">
                          {p.name}
                        </td>
                        <td className="font-mono text-xs text-base-content/70">
                          @{p.username || "-"}
                        </td>
                        <td>
                          <span className="badge badge-primary badge-soft badge-sm font-semibold capitalize">
                            {p.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="text-xs text-base-content/80">
                          {branch ? `${branch.name} (${branch.code})` : "-"}
                        </td>
                        <td className="pr-6 text-xs text-base-content/60">
                          {p.last_login_at
                            ? new Date(p.last_login_at).toLocaleString("id-ID")
                            : "Belum pernah"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer footer-center p-6 bg-base-100 text-base-content/60 border-t border-base-200 text-xs">
        <div>
          <p className="font-semibold text-base-content">
            Mochikin Services Administration &bull; High Availability Mode
          </p>
        </div>
      </footer>
    </div>
  );
}