import { redirect } from "next/navigation";
import { getServicesSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";

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

      <header className="relative z-10 border-b border-hairline/60 bg-surface/60 backdrop-blur-xs">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2">
            <Logo size="sm" />
          </a>
          <span className="text-xs font-semibold text-ash">Central Auth Gateway</span>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-3.5 py-6 sm:px-6 sm:py-12">
        <LoginForm initialError={ssoError} />
      </main>

      <footer className="relative z-10 pb-6 text-center text-xs text-mist">
        <p>&copy; {new Date().getFullYear()} SaaS Platform. Gateway Autentikasi Staf Terpadu</p>
      </footer>
    </div>
  );
}
