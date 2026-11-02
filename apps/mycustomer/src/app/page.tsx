import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/sessionServer";
import LandingPage from "@/components/LandingPage";

export default async function Page() {
  const user = await getSessionUser();
  if (user) {
    redirect("/app");
  }

  return <LandingPage />;
}
