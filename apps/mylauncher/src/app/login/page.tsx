import { redirect } from "next/navigation";
import { getServicesSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

interface LoginPageProps {
  searchParams?: Promise<{
    sso?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServicesSession();
  const sp = searchParams ? await searchParams : {};

  if (session) {
    redirect("/");
  }

  let ssoError: string | null = null;
  if (sp.sso === "unauthenticated") {
    ssoError = "Sesi Anda telah berakhir. Silakan masuk kembali.";
  } else if (sp.sso === "invalid") {
    ssoError = "Token SSO tidak valid atau telah kedaluwarsa. Silakan masuk kembali.";
  }

  return (
    <div className="sky-hero grain relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[40rem] w-[40rem] rounded-full bg-accent/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[-8%] h-[32rem] w-[32rem] rounded-full bg-emerald/10 blur-[120px]" />

      <header className="relative z-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-ink">Mochikin Service</span>
          </a>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        <LoginForm initialError={ssoError} />
      </main>

      <footer className="relative z-10 pb-6 text-center text-xs text-mist">
        <p>&copy; {new Date().getFullYear()} PT Mochikin Sukses Selaras. Sistem autentikasi staf</p>
      </footer>
    </div>
  );
}
