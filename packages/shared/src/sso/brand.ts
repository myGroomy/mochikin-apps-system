export interface BrandThemeConfig {
  service: string;
  mystokis: string;
  mycustomer: string;
  mycheck: string;
  myperformance: string;
}

export const DEFAULT_BRAND_NAME = "Mochikin";
export const DEFAULT_BRAND_TAGLINE = "Street Snack & Modern Food Services";

export const DEFAULT_LOCAL_APP_URLS: Record<string, string> = {
  SERVICE: "http://localhost:3000",
  MYSERVICE: "http://localhost:3000",
  MYCHECK: "http://localhost:3001",
  MYSTOKIS: "http://localhost:3002",
  STOKIS: "http://localhost:3002",
  MYCUSTOMER: "http://localhost:3003",
  MYPERFORMANCE: "http://localhost:3004",
};

/**
 * Format app title based on SaaS convention: "{AppPrefix} - {BrandName}"
 * Example: formatAppTitle("MyService", "Matchaku") => "MyService - Matchaku"
 */
export function formatAppTitle(appPrefix: string, brandName?: string | null): string {
  const cleanBrand = brandName?.trim() || DEFAULT_BRAND_NAME;
  return `${appPrefix} - ${cleanBrand}`;
}

/**
 * Reads the active brand name from client-side cookies or falls back to default.
 */
export function getClientBrandName(): string {
  if (typeof document === "undefined") return DEFAULT_BRAND_NAME;
  const match = document.cookie.match(/(^|;\s*)mochikin_brand_name=([^;]*)/);
  if (match && match[2]) {
    try {
      const decoded = decodeURIComponent(match[2]).trim();
      if (decoded) return decoded;
    } catch {}
  }
  return DEFAULT_BRAND_NAME;
}
