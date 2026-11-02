import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/LandingPage";
import { Button } from "@/components/ui/button";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sso?: string }>;
}) {
  const { sso } = await searchParams;

  if (sso) {
    let title = "Gagal Masuk via SSO";
    let message = "Terjadi kesalahan saat proses Single Sign-On dari Launcher.";

    if (sso === "no_supabase_profile") {
      title = "Profil Pengguna Belum Terhubung";
      message =
        "Akun Anda belum terdaftar di tabel master data pengguna (people) di database Supabase MyPerformance. Hubungi administrator untuk mendaftarkan akun Anda.";
    } else if (sso === "invalid") {
      title = "Sesi SSO Tidak Valid";
      message =
        "Token autentikasi dari Launcher tidak valid atau telah kedaluwarsa. Silakan buka kembali aplikasi dari Portal Mochikin Services.";
    } else if (sso === "secret_unconfigured") {
      title = "Konfigurasi Server Belum Lengkap";
      message =
        "Kunci rahasia LAUNCHER_SSO_SHARED_SECRET belum dikonfigurasi di environment MyPerformance.";
    }

    return (
      <main className="container max-w-xl mx-auto px-4 py-16">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <WarningCircle className="size-6 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-base font-bold text-destructive">{title}</h2>
              <p className="text-xs text-foreground/80 leading-relaxed">{message}</p>
              <div className="pt-3">
                <Button asChild variant="outline" size="sm">
                  <a href="/">Coba Lagi</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const cookieStore = await cookies();
  const hasSession = Boolean(
    cookieStore.get("mochikin_sso")?.value || cookieStore.get("sso_token")?.value
  );

  if (hasSession) {
    redirect("/dashboard/me");
  }

  return <LandingPage />;
}
