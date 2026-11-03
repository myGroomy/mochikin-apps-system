import { getSupabaseAdmin } from "./supabase";
import { getMochikinServiceEnv } from "./env";
import { ECOSYSTEM_APPS, type EcosystemAppId } from "./constants";

export interface AppTargetUrlInfo {
  id: EcosystemAppId;
  appId: EcosystemAppId;
  name: string;
  category: string;
  url: string;
  isConfigured: boolean;
  source: "database" | "environment" | "unset";
  updatedAt?: string | null;
  updatedBy?: string | null;
}

/**
 * Fallback to environment variables if database row is not set.
 */
export function getAppTargetUrlFromEnv(appId: EcosystemAppId): string | undefined {
  try {
    const env = getMochikinServiceEnv();
    switch (appId) {
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
 * Retrieves the target URL for an ecosystem app.
 * Priority: Supabase `apps` table -> Environment Variable -> undefined.
 */
export async function getAppTargetUrl(appId: EcosystemAppId): Promise<string | undefined> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("apps")
      .select("url")
      .ilike("name", appId)
      .maybeSingle();

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
  const dbAppMap = new Map<string, { url: string; updatedAt?: string | null; updatedBy?: string | null }>();

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("apps")
      .select("name, url, updated_at, updated_by");

    if (data) {
      for (const row of data) {
        if (row.name && row.url) {
          dbAppMap.set(row.name.toLowerCase().trim(), {
            url: row.url.trim(),
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
        name: meta.name,
        category: meta.category,
        url: dbEntry.url,
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
        category: meta.category,
        url: envUrl,
        isConfigured: true,
        source: "environment",
      };
    }

    return {
      id: meta.id,
      appId: meta.id,
      name: meta.name,
      category: meta.category,
      url: "",
      isConfigured: false,
      source: "unset",
    };
  });
}

/**
 * Updates or inserts the target URL for an ecosystem app in Supabase.
 */
export async function updateAppTargetUrl(
  appId: EcosystemAppId,
  rawUrl: string,
  updatedBy?: string
): Promise<{ success: boolean; url: string }> {
  const cleanUrl = rawUrl.trim();
  const parsed = new URL(cleanUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Protokol URL harus diawali dengan http:// atau https://");
  }

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
    const meta = ECOSYSTEM_APPS.find((a) => a.id === appId);
    const { error } = await supabase.from("apps").insert({
      name,
      title: meta?.name || appId,
      version: "1.0.0",
      category: appId === "MYPERFORMANCE" ? "analytical" : "operational",
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
