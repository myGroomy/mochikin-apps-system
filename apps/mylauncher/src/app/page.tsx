import { redirect } from "next/navigation";
import { LoginStub } from "@/components/auth/LoginStub";
import { getSession } from "@/lib/server/session";

export default async function Home() {
  if (await getSession()) redirect("/launcher");
  return <LoginStub />;
}
