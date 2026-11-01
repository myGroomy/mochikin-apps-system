import { redirect } from 'next/navigation';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sso?: string }>;
}) {
  const { sso } = await searchParams;

  if (sso) {
    let title = 'Gagal Masuk via SSO';
    let message = 'Terjadi kesalahan saat proses Single Sign-On dari Launcher.';

    if (sso === 'no_supabase_profile') {
      title = 'Profil Supabase Belum Terhubung';
      message =
        'Akun Anda belum terdaftar di tabel master data pengguna (people) di database Supabase MyPerformance. Hubungi administrator untuk mendaftarkan akun Anda.';
    } else if (sso === 'invalid') {
      title = 'Sesi SSO Tidak Valid';
      message =
        'Token autentikasi dari Launcher tidak valid atau telah kedaluwarsa. Silakan buka kembali aplikasi dari Launcher.';
    } else if (sso === 'secret_unconfigured') {
      title = 'Konfigurasi Server Belum Lengkap';
      message =
        'Kunci rahasia LAUNCHER_SSO_SHARED_SECRET belum dikonfigurasi di environment Vercel MyPerformance.';
    }

    return (
      <main className="container max-w-xl mx-auto px-4 py-16">
        <div className="card bg-base-200 border border-base-300 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-error text-xl font-bold">{title}</h2>
            <p className="text-base text-base-content/80 mt-2">{message}</p>
            <div className="card-actions justify-end mt-6">
              <a href="/" className="btn btn-outline btn-sm">
                Coba Lagi
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  redirect('/dashboard/me');
}
