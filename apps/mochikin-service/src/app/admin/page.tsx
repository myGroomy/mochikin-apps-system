import { redirect } from "next/navigation";
import { getServicesSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ECOSYSTEM_APPS, getAppTargetUrl } from "@/lib/constants";
import { ArrowLeft, CheckCircle2, ShieldAlert, Server, Users, ExternalLink, Database } from "lucide-react";

export default async function AdminHealthPage() {
  const session = await getServicesSession();

  if (!session) {
    redirect("/?sso=unauthenticated");
  }

  const isAdmin = session.role === "super_admin" || session.role === "role_admin";
  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-red-200 text-center shadow-sm">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900">Akses Ditolak</h1>
          <p className="text-sm text-slate-500 mt-2">
            Halaman ini khusus untuk administrator sistem Mochikin Services.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Portal
          </a>
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
    .limit(20);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Admin Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Kembali ke Portal"
            >
              <ArrowLeft className="h-5 w-5" />
            </a>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                System Health & Directory
              </h1>
              <p className="text-xs text-slate-500">Mochikin Services Gateway Status</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Database Online
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 space-y-8">
        {/* Gateway Connection Overview */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Server className="h-4 w-4" />
            Koneksi Aplikasi Ekosistem (SSO Targets)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ECOSYSTEM_APPS.map((app) => {
              const url = getAppTargetUrl(app.id);
              const isConfigured = Boolean(url);

              return (
                <div
                  key={app.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-slate-900 text-sm">{app.name}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isConfigured
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {isConfigured ? "Terkoneksi" : "Unconfigured"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-mono break-all line-clamp-2">
                      {url || "NEXT_PUBLIC_" + app.id + "_URL belum diset"}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{app.category}</span>
                    {isConfigured && (
                      <a
                        href={`/api/auth/handoff?appId=${app.id}&returnPath=/`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Test SSO <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Database & Identity Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Master Data Hub (Supabase PostgreSQL)
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar staf aktif dari tabel <code className="text-purple-600 font-mono">people</code>
                </p>
              </div>
            </div>

            <div className="text-xs font-medium text-slate-500">
              Total Ditampilkan: {people?.length || 0} staf
            </div>
          </div>

          {error ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">
              Gagal memuat daftar pengguna: {error.message}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2">Nama Staf</th>
                    <th className="pb-3">Username</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Cabang</th>
                    <th className="pb-3 pr-2">Terakhir Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {people?.map((p) => {
                    const branch = Array.isArray(p.branches) ? p.branches[0] : p.branches;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pl-2 font-semibold text-slate-900">
                          {p.name}
                        </td>
                        <td className="py-3 font-mono text-slate-600">
                          @{p.username || "-"}
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                            {p.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3">
                          {branch ? `${branch.name} (${branch.code})` : "-"}
                        </td>
                        <td className="py-3 pr-2 text-slate-400">
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
    </div>
  );
}
