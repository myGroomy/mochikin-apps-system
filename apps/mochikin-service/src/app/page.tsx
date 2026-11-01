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

  // If not authenticated, show the clean login form
  return (
    <main className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-b from-slate-50 via-slate-100/50 to-slate-100">
      <LoginForm initialError={ssoError} />
    </main>
  );
}
