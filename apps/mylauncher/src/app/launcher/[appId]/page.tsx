import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { getRegistryApps } from "@/lib/server/registry";
import { AppLaunchView } from "@/components/launcher/AppLaunchView";

export default async function AppIdPage({
  params,
  searchParams,
}: {
  params: Promise<{ appId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { appId: rawAppId } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/");

  const appId = rawAppId.toUpperCase();
  let apps: Awaited<ReturnType<typeof getRegistryApps>> = [];
  try {
    apps = await getRegistryApps();
  } catch {
    apps = [];
  }

  const app = apps.find((item) => item.app_id === appId);
  const authorized =
    !!app &&
    app.status === "ACTIVE" &&
    session.permissions.includes(app.required_permission);

  let deepLink: string | null = null;
  let handoffUrl: string | null = null;
  if (authorized && app) {
    const path = typeof sp.path === "string" ? sp.path : null;
    const rest: string[] = [];
    for (const [key, value] of Object.entries(sp)) {
      if (key === "path") continue;
      const values = Array.isArray(value) ? value : value !== undefined ? [value] : [];
      for (const v of values) rest.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
    }
    if (path || rest.length) {
      const qs = rest.length ? `?${rest.join("&")}` : "";
      deepLink = `${path || ""}${qs}`;
      try {
        const { writeAuditLog } = await import("@/lib/server/data");
        await writeAuditLog({
          actor_employee_id: session.employeeId,
          action: "app_open",
          target: app.app_id,
          details: deepLink,
        });
      } catch {
        // audit is best-effort
      }
    } else {
      try {
        const { writeAuditLog } = await import("@/lib/server/data");
        await writeAuditLog({
          actor_employee_id: session.employeeId,
          action: "app_open",
          target: app.app_id,
        });
      } catch {
        // audit is best-effort
      }
    }
    if (app.app_id === "STOKIS" || app.app_id === "MYCUSTOMER") {
      const params = new URLSearchParams({ appId: app.app_id, returnPath: deepLink || "/" });
      handoffUrl = `/api/auth/handoff?${params.toString()}`;
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-canvas">
      <AppLaunchView app={authorized && app ? app : null} appId={appId} deepLink={deepLink} handoffUrl={handoffUrl} />
    </div>
  );
}
