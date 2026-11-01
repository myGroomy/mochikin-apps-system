import { getServicesSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { PortalDashboard } from "@/components/PortalDashboard";

interface HomePageProps {
  searchParams?: Promise<{
    sso?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await getServicesSession();
  const sp = searchParams ? await searchParams : {};

  // If user is already authenticated, show the App Switcher Portal
  if (session) {
    return <PortalDashboard user={session} />;
  }

  // Handle SSO error redirects
  let ssoError: string | null = null;
  if (sp.sso === "unauthenticated") {
    ssoError = "Sesi Anda telah berakhir. Silakan masuk kembali.";
  } else if (sp.sso === "invalid") {
    ssoError = "Token SSO tidak valid atau telah kedaluwarsa. Silakan masuk kembali.";
  }

  // If not authenticated, show the modern login form
  return (
    <main className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-base-200 relative overflow-hidden">
      {/* Decorative ambient background blur */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

      <LoginForm initialError={ssoError} />

      <footer className="mt-8 text-center text-xs text-base-content/50 z-10">
        <p>&copy; {new Date().getFullYear()} Mochikin Services &bull; Unified Enterprise Gateway</p>
      </footer>
    </main>
  );
}