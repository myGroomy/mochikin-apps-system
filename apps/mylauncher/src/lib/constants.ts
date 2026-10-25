import type { App } from "./types";

export const APP_NAME = "MOCHIKIN LAUNCHER";
export const STOKIS_URL = "https://stokis-project.vercel.app";
export const MYCUSTOMER_URL = "https://retain-ly.vercel.app";
export const SSO_HANDOFF_SECRET_ENV = "LAUNCHER_SSO_SHARED_SECRET";
export const SSO_TARGETS = {
  STOKIS: {
    url: STOKIS_URL,
    callbackPath: "/api/auth/sso/callback",
    permission: "view_stokis",
  },
  MYCUSTOMER: {
    url: MYCUSTOMER_URL,
    callbackPath: "/api/auth/sso/callback",
    permission: "view_mycustomer",
  },
} as const;
export const CANONICAL_ECOSYSTEM_APP_URLS = {
  STOKIS: STOKIS_URL,
  MYCUSTOMER: MYCUSTOMER_URL,
} as const;
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
    status: "ACTIVE",
    required_permission: "view_stokis",
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
    app_id: "MYCUSTOMER",
    name: "Mycustomer",
    url: MYCUSTOMER_URL,
    icon: "users",
    status: "ACTIVE",
    required_permission: "view_mycustomer",
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
