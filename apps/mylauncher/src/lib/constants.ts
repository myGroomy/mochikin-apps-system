import type { App } from "./types";

export const APP_NAME = "MOCHIKIN LAUNCHER";

function envUrl(val: string | undefined): string {
  return val?.trim().replace(/\/+$/, "") ?? "";
}

export const STOKIS_URL = envUrl(process.env.NEXT_PUBLIC_STOKIS_URL);
export const MYCUSTOMER_URL = envUrl(process.env.NEXT_PUBLIC_MYCUSTOMER_URL);
export const MYCHECK_URL = envUrl(process.env.NEXT_PUBLIC_MYCHECK_URL);
export const MYPERFORMANCE_URL = envUrl(process.env.NEXT_PUBLIC_MYPERFORMANCE_URL);

export const SSO_HANDOFF_SECRET_ENV = "LAUNCHER_SSO_SHARED_SECRET";
const CALLBACK = "/api/auth/sso/callback";

export const SSO_TARGETS = {
  STOKIS: {
    url: STOKIS_URL,
    callbackPath: CALLBACK,
    permission: "view_stokis",
  },
  MYCUSTOMER: {
    url: MYCUSTOMER_URL,
    callbackPath: CALLBACK,
    permission: "view_mycustomer",
  },
  MYCHECK: {
    url: MYCHECK_URL,
    callbackPath: CALLBACK,
    permission: "view_mycheck",
  },
  MYPERFORMANCE: {
    url: MYPERFORMANCE_URL,
    callbackPath: CALLBACK,
    permission: "view_myperformance",
  },
} as const;

export const CANONICAL_ECOSYSTEM_APP_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(SSO_TARGETS)
    .filter(([, t]) => Boolean(t.url))
    .map(([id, t]) => [id, t.url])
);

export const PENDING_ECOSYSTEM_APP_IDS = ["MYSHIFT", "MYHR"] as const;

/** Ensure registry URLs are absolute so external opens work with SSO cookie. */
export function resolveAppUrl(url: string, deepLink?: string | null): string {
  const base = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
  if (!deepLink) return base;
  try {
    const target = new URL(base);
    const extra = new URL(deepLink, target);
    target.pathname = extra.pathname === "/" ? target.pathname : `${target.pathname.replace(/\/$/, "")}${extra.pathname}`;
    extra.searchParams.forEach((value, key) => target.searchParams.set(key, value));
    if (extra.hash) target.hash = extra.hash;
    return target.toString();
  } catch {
    return base;
  }
}

export const APP_REGISTRY: App[] = [
  {
    app_id: "STOKIS",
    name: "Stokis",
    url: STOKIS_URL,
    icon: "package",
    status: STOKIS_URL ? "ACTIVE" : "INACTIVE",
    required_permission: "view_stokis",
  },
  {
    app_id: "MYCUSTOMER",
    name: "Mycustomer",
    url: MYCUSTOMER_URL,
    icon: "users",
    status: MYCUSTOMER_URL ? "ACTIVE" : "INACTIVE",
    required_permission: "view_mycustomer",
  },
  {
    app_id: "MYCHECK",
    name: "Mycheck",
    url: MYCHECK_URL,
    icon: "check-circle",
    status: MYCHECK_URL ? "ACTIVE" : "INACTIVE",
    required_permission: "view_mycheck",
  },
  {
    app_id: "MYPERFORMANCE",
    name: "Myperformance",
    url: MYPERFORMANCE_URL,
    icon: "activity",
    status: MYPERFORMANCE_URL ? "ACTIVE" : "INACTIVE",
    required_permission: "view_myperformance",
  },
  {
    app_id: "MYSHIFT",
    name: "Myshift",
    url: "",
    icon: "calendar-days",
    status: "INACTIVE",
    required_permission: "view_myshift",
  },
  {
    app_id: "MYHR",
    name: "Myhr",
    url: "",
    icon: "building",
    status: "INACTIVE",
    required_permission: "view_myhr",
  },
];
