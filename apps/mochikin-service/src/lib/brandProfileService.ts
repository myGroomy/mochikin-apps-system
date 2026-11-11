import { getSupabaseAdmin } from "./supabase";
import {
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_TAGLINE,
  type BrandThemeConfig,
  formatAppTitle,
} from "@mochikin/shared/sso";

export { type BrandThemeConfig, formatAppTitle };

export interface BrandProfile {
  id: string;
  brandName: string;
  tagline: string;
  logoUrl?: string | null;
  themes: BrandThemeConfig;
  isActive: boolean;
  updatedAt: string;
  updatedBy?: string | null;
}

export const DEFAULT_BRAND_THEMES: BrandThemeConfig = {
  service: "gold",
  mystokis: "blue",
  mycustomer: "navy",
  mycheck: "black",
  myperformance: "olive",
};

export const THEME_COLOR_PRESETS: Record<string, { label: string; hex: string; desc: string }[]> = {
  service: [
    { label: "Golden Master", hex: "#b45309", desc: "Hangat, elegan, wibawa gateway" },
    { label: "Deep Navy", hex: "#0f223d", desc: "Korporat & aman" },
    { label: "Warm Brown", hex: "#78350f", desc: "Klasik & organik" },
    { label: "Emerald Royal", hex: "#047857", desc: "Segar & berprestasi" },
  ],
  mystokis: [
    { label: "Cobalt Blue", hex: "#1d4ed8", desc: "Akurasi logistik & ketenangan gudang" },
    { label: "Terracotta Rust", hex: "#c2410c", desc: "Fisik kardus & bahan baku" },
    { label: "Steel Indigo", hex: "#4338ca", desc: "Modern tech inventory" },
    { label: "Teal Cyan", hex: "#0f766e", desc: "Segar & rapi" },
  ],
  mycustomer: [
    { label: "Deep Navy", hex: "#0f223d", desc: "Kepercayaan & data analitik" },
    { label: "Berry Rose", hex: "#e11d48", desc: "Keramahan & customer love" },
    { label: "Plum Violet", hex: "#7e22ce", desc: "Hospitality & membership VIP" },
    { label: "Warm Coral", hex: "#ea580c", desc: "Komunikasi aktif & promosi" },
  ],
  mycheck: [
    { label: "Jet Black", hex: "#09090b", desc: "Disiplin SOP & surgical audit" },
    { label: "Slate Zinc", hex: "#3f3f46", desc: "Minimalis & rapi" },
    { label: "Dark Charcoal", hex: "#1c1917", desc: "Tegas & fokus checklist" },
  ],
  myperformance: [
    { label: "Heritage Olive", hex: "#4d662c", desc: "Pertumbuhan stabil & kedewasaan tim" },
    { label: "Emerald Mint", hex: "#059669", desc: "Poin hijau & leaderboard aktif" },
    { label: "Bronze Gold", hex: "#a16207", desc: "Piala juara & penghargaan" },
  ],
};

// In-memory fallback
let inMemoryBrandProfile: BrandProfile = {
  id: "default",
  brandName: DEFAULT_BRAND_NAME,
  tagline: DEFAULT_BRAND_TAGLINE,
  logoUrl: null,
  themes: { ...DEFAULT_BRAND_THEMES },
  isActive: true,
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

/**
 * Mengambil profil brand SaaS yang aktif (Supabase atau in-memory fallback).
 */
export async function getBrandProfile(): Promise<BrandProfile> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id || "default",
        brandName: data.brand_name || DEFAULT_BRAND_NAME,
        tagline: data.tagline || DEFAULT_BRAND_TAGLINE,
        logoUrl: data.logo_url || null,
        themes: {
          ...DEFAULT_BRAND_THEMES,
          ...(typeof data.themes === "object" && data.themes ? data.themes : {}),
        },
        isActive: Boolean(data.is_active ?? true),
        updatedAt: data.updated_at || new Date().toISOString(),
        updatedBy: data.updated_by || null,
      };
    }
  } catch (err) {
    // Database query failed / table not ready
  }

  return { ...inMemoryBrandProfile };
}

/**
 * Memperbarui profil brand SaaS dan konfigurasi tema tone app.
 */
export async function updateBrandProfile(
  input: {
    brandName?: string;
    tagline?: string;
    logoUrl?: string | null;
    themes?: Partial<BrandThemeConfig>;
  },
  updatedBy = "admin"
): Promise<BrandProfile> {
  const current = await getBrandProfile();
  const nextThemes: BrandThemeConfig = {
    ...current.themes,
    ...(input.themes || {}),
  };

  const updated: BrandProfile = {
    ...current,
    brandName: input.brandName?.trim() || current.brandName,
    tagline: input.tagline?.trim() ?? current.tagline,
    logoUrl: input.logoUrl !== undefined ? input.logoUrl : current.logoUrl,
    themes: nextThemes,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("brand_profiles").upsert({
      id: "default",
      brand_name: updated.brandName,
      tagline: updated.tagline,
      logo_url: updated.logoUrl,
      themes: updated.themes,
      is_active: true,
      updated_at: updated.updatedAt,
      updated_by: updated.updatedBy,
    });
  } catch (err) {
    // Database update failed, fallback in-memory updated
  }

  inMemoryBrandProfile = { ...updated };
  return updated;
}
