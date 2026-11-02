import { getMochikinServiceEnv } from "./env";

export const SERVICE_APP_NAME = "Mochikin Services";

export type EcosystemAppId = "STOKIS" | "MYCHECK" | "MYCUSTOMER" | "MYPERFORMANCE";

export interface EcosystemAppMeta {
  id: EcosystemAppId;
  name: string;
  tagline: string;
  category: "Operasional" | "Analitik & Retensi" | "Kinerja";
  iconName: "package" | "check-circle" | "users" | "trending-up";
  allowedRoles: string[];
}

export const ECOSYSTEM_APPS: EcosystemAppMeta[] = [
  {
    id: "STOKIS",
    name: "Stokis",
    tagline: "Manajemen stok, bahan baku & Stock Opname harian.",
    category: "Operasional",
    iconName: "package",
    allowedRoles: ["super_admin", "role_admin", "branch_manager", "staff", "guest", "admin", "petugas"],
  },
  {
    id: "MYCHECK",
    name: "MyCheck",
    tagline: "Checklist operasional shift, SOP outlet & pelaporan insiden.",
    category: "Operasional",
    iconName: "check-circle",
    allowedRoles: ["super_admin", "role_admin", "branch_manager", "staff", "admin", "petugas"],
  },
  {
    id: "MYCUSTOMER",
    name: "MyCustomer",
    tagline: "Database pelanggan, analitik retensi & WhatsApp CRM.",
    category: "Analitik & Retensi",
    iconName: "users",
    allowedRoles: ["super_admin", "role_admin", "branch_manager", "staff", "admin", "petugas"],
  },
  {
    id: "MYPERFORMANCE",
    name: "MyPerformance",
    tagline: "Pusat akumulasi poin, scorecard 360 & leaderboard kru.",
    category: "Kinerja",
    iconName: "trending-up",
    allowedRoles: ["super_admin", "role_admin", "branch_manager", "staff", "admin", "petugas"],
  },
];

export function getAppTargetUrl(appId: EcosystemAppId): string | undefined {
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
}

export function getPermissionsForRole(role: string): string[] {
  const r = role.toLowerCase().trim();
  if (r === "super_admin" || r === "role_admin" || r === "admin") {
    return [
      "view_stokis",
      "view_mycheck",
      "view_mycustomer",
      "view_myperformance",
      "manage_admin",
    ];
  }
  if (r === "branch_manager") {
    return [
      "view_stokis",
      "view_mycheck",
      "view_mycustomer",
      "view_myperformance",
    ];
  }
  if (r === "staff" || r === "petugas") {
    return ["view_stokis", "view_mycheck", "view_mycustomer", "view_myperformance"];
  }
  return ["view_stokis"];
}

export function isRoleAllowedForApp(role: string, appId: EcosystemAppId): boolean {
  const meta = ECOSYSTEM_APPS.find((a) => a.id === appId);
  if (!meta) return false;
  return meta.allowedRoles.includes(role.toLowerCase().trim());
}
