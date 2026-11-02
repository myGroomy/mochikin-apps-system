import { getServicesSession } from "@/lib/auth";
import { PortalDashboard } from "@/components/PortalDashboard";
import { LandingPage } from "@/components/LandingPage";

interface HomePageProps {
  searchParams?: Promise<{
    sso?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await getServicesSession();

  // If user is already authenticated, show the App Switcher Portal
  if (session) {
    return <PortalDashboard user={session} />;
  }

  // If not authenticated, show the marketing landing page
  return <LandingPage />;
}
