import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.roleId !== "role_admin") redirect("/launcher");
  return children;
}
