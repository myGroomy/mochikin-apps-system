import { redirect } from "next/navigation";
import { getServicesSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAllAppTargetUrls } from "@/lib/apps";
import { AdminAppUrlManager } from "@/components/AdminAppUrlManager";
import {
  ArrowLeft,
  ShieldAlert,
  Database,
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
        <div className="card w-full max-w-sm bg-base-100 border border-base-300 rounded-lg text-center shadow-sm">
          <div className="card-body items-center p-6">
            <ShieldAlert className="w-10 h-10 text-error mb-2" />
            <h1 className="text-lg font-bold text-base-content">Akses ditolak</h1>
            <p className="text-xs text-base-content/70 mt-1">
              Halaman ini khusus untuk administrator sistem Mochikin Services.
            </p>
            <div className="card-actions mt-5">
              <a href="/" className="btn btn-neutral btn-sm rounded-md gap-2 font-medium active:scale-95 whitespace-nowrap">
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke portal</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Fetch all apps with URLs from Supabase & fallback
  const appUrls = await getAllAppTargetUrls();

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
      <header className="navbar bg-base-100 border-b border-base-300 px-4 sm:px-6 sticky top-0 z-40">
        <div className="navbar-start gap-2">
          <a
            href="/"
            className="btn btn-ghost btn-sm btn-circle active:bg-base-200"
            title="Kembali ke portal"
          >
            <ArrowLeft className="w-4 h-4 text-base-content" />
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-base-content">
                Kesehatan sistem dan direktori
              </h1>
              <span className="badge badge-neutral badge-xs font-normal text-[11px]">
                admin
              </span>
            </div>
            <p className="text-[11px] text-base-content/60 hidden sm:block">
              Pemantauan koneksi SSO dan direktori staf aktif
            </p>
          </div>
        </div>

        <div className="navbar-end gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-base-200 border border-base-300 text-xs text-success font-medium">
            <span className="h-2 w-2 rounded-full bg-success motion-safe:animate-pulse motion-reduce:hidden" />
            <span className="h-2 w-2 rounded-full bg-success motion-safe:hidden" />
            <span>Basis data terhubung</span>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Gateway Connection Overview with Editable URL Manager */}
        <AdminAppUrlManager initialApps={appUrls} />

        {/* Database & Identity Status */}
        <div className="bg-base-100 border border-base-300 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-base-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-base-200 text-primary flex items-center justify-center font-bold">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-base-content text-sm">
                  Direktori staf aktif
                </h3>
                <p className="text-xs text-base-content/60">
                  Data pengguna aktif dari tabel <code className="text-primary font-mono text-[11px]">people</code>
                </p>
              </div>
            </div>

            <div className="text-xs text-base-content/70">
              Total ditampilkan: {people?.length || 0} staf
            </div>
          </div>

          {error ? (
            <div className="p-4">
              <div className="alert alert-error text-xs rounded-md">
                <span>Gagal memuat daftar pengguna: {error.message}</span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-base-content/70 text-xs border-b border-base-300">
                    <th className="pl-4 font-medium">Nama staf</th>
                    <th className="font-medium">Username</th>
                    <th className="font-medium">Peran SSO</th>
                    <th className="font-medium">Cabang</th>
                    <th className="pr-4 font-medium">Terakhir login</th>
                  </tr>
                </thead>
                <tbody>
                  {people?.map((p) => {
                    const branch = Array.isArray(p.branches) ? p.branches[0] : p.branches;
                    return (
                      <tr key={p.id} className="hover:bg-base-200/50 border-b border-base-200">
                        <td className="pl-4 font-medium text-xs text-base-content">
                          {p.name}
                        </td>
                        <td className="font-mono text-xs text-base-content/70">
                          @{p.username || "-"}
                        </td>
                        <td>
                          <span className="badge badge-neutral badge-xs font-normal text-[11px] capitalize">
                            {p.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="text-xs text-base-content/80">
                          {branch ? `${branch.name} (${branch.code})` : "-"}
                        </td>
                        <td className="pr-4 text-xs text-base-content/60">
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
      <footer className="p-4 bg-base-100 text-base-content/60 border-t border-base-300 text-xs text-center">
        <div>
          <p className="font-medium text-base-content">
            Mochikin Services. Pemantauan sistem dan direktori pengguna
          </p>
        </div>
      </footer>
    </div>
  );
}
