import { redirect } from "next/navigation";
import { getServicesSession } from "@/lib/auth";
import { ShieldAlert, ArrowLeft, LayoutGrid, ChevronDown } from "lucide-react";
import { Logo } from "@/components/Logo";

export default async function AdminHealthPage() {
  const session = await getServicesSession();

  if (!session) {
    redirect("/?sso=unauthenticated");
  }

  const isAdmin = session.role === "super_admin" || session.role === "role_admin";
  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-white">
        <div className="card w-full max-w-sm bg-white border border-gray-200 rounded-lg text-center shadow-sm">
          <div className="card-body items-center p-6">
            <ShieldAlert className="w-10 h-10 text-amber-500 mb-2" />
            <h1 className="text-lg font-bold text-gray-800">Akses Ditolak</h1>
            <p className="text-sm text-gray-400 mt-1">
              Halaman ini khusus untuk administrator sistem Mochikin Services.
            </p>
            <div className="card-actions mt-5">
              <a href="/" className="btn btn-neutral btn-sm rounded-md gap-2 font-medium active:scale-95 whitespace-nowrap">
                <ArrowLeft className="w-4 h-4" /> Kembali ke portal
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="navbar bg-white border-b border-gray-200 sticky top-0 z-50 px-4 sm:px-6">
        <div className="navbar-start gap-3">
          <a href="/" className="flex items-center gap-2.5">
            <Logo size="sm" />
          </a>
        </div>
        <div className="navbar-end gap-2">
          {isAdmin && (
            <a
              href="/admin"
              className="btn btn-ghost btn-sm gap-1.5 hidden sm:inline-flex text-xs font-medium rounded-md whitespace-nowrap active:bg-gray-50"
            >
              <LayoutGrid className="w-4 h-4 text-amber-500" />
              <span>Kesehatan sistem</span>
            </a>
          )}
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-sm gap-2 rounded-md pl-2 pr-2.5 active:bg-gray-50"
            >
              <div className="avatar placeholder">
                <div className="bg-gray-200 text-gray-600 font-semibold rounded w-6 h-6 text-xs">
                  {session.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="text-left hidden lg:block leading-tight">
                <div className="text-xs font-medium text-gray-600">{session.name}</div>
                <div className="text-[11px] text-gray-400 capitalize">
                  {session.role.replace("_", " ")}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400/50 hidden sm:block" />
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu menu-sm bg-white rounded-lg z-50 mt-2 w-60 p-2 shadow-sm border border-gray-200"
            >
              <li className="menu-title px-2 py-1.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-gray-600">{session.name}</span>
                  <span className="text-[11px] text-gray-400 font-mono">@{session.username}</span>
                </div>
              </li>
              <li>
                <a href="/admin" className="py-2 text-xs font-medium active:bg-gray-50">
                  <LayoutGrid className="w-4 h-4 text-amber-500" />
                  Kesehatan sistem & direktori
                </a>
              </li>
              <li>
                <a
                  href="/logout"
                  className="py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 active:bg-amber-100"
                >
                  Keluar
                </a>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Halaman Admin</h1>
          <p className="text-gray-500">Selamat datang, {session.name}</p>
        </div>
      </div>
    </div>
  );
}
