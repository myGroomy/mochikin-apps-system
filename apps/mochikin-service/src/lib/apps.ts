import { getSupabaseAdmin } from "./supabase";
import { getMochikinServiceEnv } from "./env";
import { ECOSYSTEM_APPS, type EcosystemAppId } from "./constants";

export interface AppTargetUrlInfo {
  id: string;
  appId: string;
  name: string;
  title?: string;
  category: string;
  description?: string;
  url: string;
  callbackUrl?: string;
  status: "active" | "inactive";
  allowedRoles?: string[];
  isConfigured: boolean;
  source: "database" | "environment" | "unset";
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface AppRegistryInput {
  appId: string;
  name: string;
  title?: string;
  category?: string;
  description?: string;
  url: string;
  callbackUrl?: string;
  status?: "active" | "inactive";
  allowedRoles?: string[];
}

/**
 * Fallback to environment variables if database row is not set.
 */
export function getAppTargetUrlFromEnv(appId: string): string | undefined {
  try {
    const env = getMochikinServiceEnv();
    switch (appId.toUpperCase()) {
      case "STOKIS":
        return env.NEXT_PUBLIC_STOKIS_URL;
      case "MYCHECK":
        return env.NEXT_PUBLIC_MYCHECK_URL;
      case "MYCUSTOMER":
        return env.NEXT_PUBLIC_MYCUSTOMER_URL;
      case "MYPERFORMANCE":
        return env.NEXT_PUBLIC_MYPERFORMANCE_URL;
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

/**
 * Validates that redirect/callback URLs belong to HTTP/HTTPS and do not use arbitrary protocols.
 */
export function validateUrl(rawUrl: string, fieldName = "URL"): URL {
  const cleanUrl = rawUrl.trim();
  const parsed = new URL(cleanUrl);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Protokol ${fieldName} harus diawali dengan http:// atau https://`);
  }

  return parsed;
}

/**
 * Retrieves the target URL for an ecosystem app.
 * Priority: Supabase `apps` table -> Environment Variable -> undefined.
 */
export async function getAppTargetUrl(appId: string): Promise<string | undefined> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("apps")
      .select("url, status")
      .ilike("name", appId)
      .maybeSingle();

    if (data?.status === "inactive") {
      return undefined;
    }

    if (data?.url && typeof data.url === "string" && data.url.trim()) {
      return data.url.trim();
    }
  } catch (err) {
    console.warn(`Failed to read URL for ${appId} from database:`, err);
  }

  return getAppTargetUrlFromEnv(appId);
}

/**
 * Retrieves full information and URLs for all ecosystem apps.
 */
export async function getAllAppTargetUrls(): Promise<AppTargetUrlInfo[]> {
  const dbAppMap = new Map<
    string,
    {
      title?: string;
      description?: string;
      url: string;
      callbackUrl?: string;
      status?: "active" | "inactive";
      updatedAt?: string | null;
      updatedBy?: string | null;
    }
  >();

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("apps")
      .select("name, title, description, url, status, updated_at, updated_by");

    if (data) {
      for (const row of data) {
        if (row.name && row.url) {
          dbAppMap.set(row.name.toLowerCase().trim(), {
            title: row.title || undefined,
            description: row.description || undefined,
            url: row.url.trim(),
            status: row.status === "inactive" ? "inactive" : "active",
            updatedAt: row.updated_at,
            updatedBy: row.updated_by,
          });
        }
      }
    }
  } catch (err) {
    console.warn("Failed to fetch apps table from database:", err);
  }

  return ECOSYSTEM_APPS.map((meta) => {
    const dbEntry = dbAppMap.get(meta.id.toLowerCase());
    const envUrl = getAppTargetUrlFromEnv(meta.id);

    if (dbEntry?.url) {
      return {
        id: meta.id,
        appId: meta.id,
        name: dbEntry.title || meta.name,
        title: dbEntry.title || meta.name,
        category: meta.category,
        description: dbEntry.description || meta.tagline,
        url: dbEntry.url,
        callbackUrl: `${dbEntry.url.replace(/\/+$/, "")}/api/auth/sso/callback`,
        status: dbEntry.status || "active",
        allowedRoles: meta.allowedRoles,
        isConfigured: true,
        source: "database",
        updatedAt: dbEntry.updatedAt,
        updatedBy: dbEntry.updatedBy,
      };
    }

    if (envUrl) {
      return {
        id: meta.id,
        appId: meta.id,
        name: meta.name,
        title: meta.name,
        category: meta.category,
        description: meta.tagline,
        url: envUrl,
        callbackUrl: `${envUrl.replace(/\/+$/, "")}/api/auth/sso/callback`,
        status: "active",
        allowedRoles: meta.allowedRoles,
        isConfigured: true,
        source: "environment",
      };
    }

    return {
      id: meta.id,
      appId: meta.id,
      name: meta.name,
      title: meta.name,
      category: meta.category,
      description: meta.tagline,
      url: "",
      callbackUrl: "",
      status: "active",
      allowedRoles: meta.allowedRoles,
      isConfigured: false,
      source: "unset",
    };
  });
}

/**
 * Updates or inserts the target URL for an ecosystem app in Supabase.
 */
export async function updateAppTargetUrl(
  appId: string,
  rawUrl: string,
  updatedBy?: string
): Promise<{ success: boolean; url: string }> {
  validateUrl(rawUrl, "URL");
  const cleanUrl = rawUrl.trim();

  const supabase = getSupabaseAdmin();
  const name = appId.toLowerCase().trim();

  const { data: existing } = await supabase
    .from("apps")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing?.id) {
    const { error } = await supabase
      .from("apps")
      .update({
        url: cleanUrl,
        updated_at: now,
        updated_by: updatedBy || "admin",
      })
      .eq("id", existing.id);

    if (error) throw new Error(error.message || "Gagal memperbarui URL aplikasi");
  } else {
    const meta = ECOSYSTEM_APPS.find((a) => a.id.toLowerCase() === name);
    const { error } = await supabase.from("apps").insert({
      name,
      title: meta?.name || appId,
      version: "1.0.0",
      category: appId.toUpperCase() === "MYPERFORMANCE" ? "analytical" : "operational",
      description: meta?.tagline || "",
      url: cleanUrl,
      status: "active",
      created_by: updatedBy || "admin",
      updated_by: updatedBy || "admin",
      created_at: now,
      updated_at: now,
    });

    if (error) throw new Error(error.message || "Gagal memperbarui URL aplikasi");
  }

  return { success: true, url: cleanUrl };
}

/**
 * Full application registry and SSO update.
 */
export async function updateAppRegistry(
  appId: string,
  input: Partial<AppRegistryInput>,
  updatedBy?: string
): Promise<{ success: boolean }> {
  if (input.url) {
    validateUrl(input.url, "URL Aplikasi");
  }
  if (input.callbackUrl) {
    validateUrl(input.callbackUrl, "Callback URL / Redirect URI");
  }

  const supabase = getSupabaseAdmin();
  const name = appId.toLowerCase().trim();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("apps")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    updated_at: now,
    updated_by: updatedBy || "admin",
  };

  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description.trim();
  if (input.url !== undefined) payload.url = input.url.trim();
  if (input.status !== undefined) payload.status = input.status;

  if (existing?.id) {
    const { error } = await supabase
      .from("apps")
      .update(payload)
      .eq("id", existing.id);

    if (error) throw new Error(error.message || "Gagal memperbarui registry aplikasi");
  } else {
    const meta = ECOSYSTEM_APPS.find((a) => a.id.toLowerCase() === name);
    const { error } = await supabase.from("apps").insert({
      name,
      title: input.title || meta?.name || appId,
      version: "1.0.0",
      category: input.category || (appId.toUpperCase() === "MYPERFORMANCE" ? "analytical" : "operational"),
      description: input.description || meta?.tagline || "",
      url: input.url || "",
      status: input.status || "active",
      created_by: updatedBy || "admin",
      updated_by: updatedBy || "admin",
      created_at: now,
      updated_at: now,
    });

    if (error) throw new Error(error.message || "Gagal mendaftarkan aplikasi");
  }

  return { success: true };
}
