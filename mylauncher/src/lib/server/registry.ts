import "server-only";

import fs from "fs";
import path from "path";
import type { App, AppStatus, AppManifestInfo } from "@/lib/types";
import { APP_REGISTRY, CANONICAL_ECOSYSTEM_APP_URLS, PENDING_ECOSYSTEM_APP_IDS } from "@/lib/constants";
import { appendRow, deleteRowByIndex, ensureSheet, readSheet, rowsToObjects, updateRowByIndex } from "./sheets";
import { ensureLauncherTabs, TABS } from "./data";

let cached: { expiresAt: number; apps: App[] } | null = null;
const REGISTRY_CANDIDATES = ["Registry", "Apps", "App Registry", "registry", "apps"];
const REGISTRY_HEADERS = ["app_id", "name", "url", "icon", "status", "required_permission"];

/**
 * Load local app.manifest.json for enrichment (Odoo pattern)
 */
function loadLocalManifests(): Map<string, AppManifestInfo> {
  const manifests = new Map<string, AppManifestInfo>();
  const rootDir = path.resolve(process.cwd(), "..");
  
  const candidateDirs = [
    { dir: "mylauncher", id: "MYLAUNCHER" },
    { dir: "mycheck", id: "MYCHECK" },
    { dir: "stokis", id: "STOKIS" },
    { dir: "mycustomer", id: "MYCUSTOMER" },
    { dir: "myperformance", id: "MYPERFORMANCE" },
  ];

  for (const { dir, id } of candidateDirs) {
    const manifestPath = path.join(rootDir, dir, "app.manifest.json");
    if (fs.existsSync(manifestPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        manifests.set(id, {
          version: raw.version,
          category: raw.category,
          title: raw.title,
          depends: raw.depends,
          provides: raw.provides,
          description: raw.description,
        });
        // also store with raw.name
        if (raw.name) {
          manifests.set(String(raw.name).toUpperCase(), manifests.get(id)!);
        }
      } catch (err) {
        console.warn(`Failed to read manifest for ${dir}:`, err);
      }
    }
  }

  return manifests;
}

async function resolveRegistryTab(): Promise<string | null> {
  const sheets = await import("./sheets");
  try {
    const meta = await sheets.getSheets().spreadsheets.get({ spreadsheetId: sheets.spreadsheetId() });
    const titles = (meta.data.sheets || []).map((s) => s.properties?.title || "");
    const known = new Set(Object.values(TABS) as string[]);
    const match =
      titles.find((t) => REGISTRY_CANDIDATES.includes(t)) ||
      titles.find((t) => /app|registry/i.test(t) && !known.has(t));
    return match || null;
  } catch {
    return null;
  }
}

export function invalidateRegistryCache(): void {
  cached = null;
}

export async function getRegistryTab(): Promise<string> {
  await ensureLauncherTabs();
  const tab = await resolveRegistryTab();
  if (tab) return tab;
  await ensureSheet(TABS.apps, REGISTRY_HEADERS);
  return TABS.apps;
}

function mapApp(row: Record<string, string>): App {
  return {
    app_id: String(row.app_id || "").trim().toUpperCase(),
    name: String(row.name || "").trim(),
    url: String(row.url || "").trim(),
    icon: String(row.icon || "layout-grid").trim(),
    status: String(row.status || "INACTIVE").trim().toUpperCase() as AppStatus,
    required_permission: String(row.required_permission || "").trim(),
  };
}

async function syncEcosystemRegistry(objects: Record<string, string>[], tab: string): Promise<boolean> {
  let updated = false;
  for (let index = 0; index < objects.length; index += 1) {
    const current = mapApp(objects[index]);
    if (!current.app_id) continue;
    const canonicalUrl = (CANONICAL_ECOSYSTEM_APP_URLS as Record<string, string>)[current.app_id];
    if (canonicalUrl && (current.url !== canonicalUrl || current.status !== "ACTIVE")) {
      await updateRowByIndex(tab, index, appRow({ ...current, url: canonicalUrl, status: "ACTIVE" }));
      updated = true;
    } else if (
      (PENDING_ECOSYSTEM_APP_IDS as readonly string[]).includes(current.app_id) &&
      /mochikin\.id/i.test(current.url)
    ) {
      await updateRowByIndex(tab, index, appRow({ ...current, url: "", status: "INACTIVE" }));
      updated = true;
    }
  }
  return updated;
}

export async function getRegistryApps(): Promise<App[]> {
  if (cached && cached.expiresAt > Date.now()) return cached.apps;
  await ensureLauncherTabs();
  const tab = await getRegistryTab();
  let rows = await readSheet(tab);
  let objects = rowsToObjects(rows);
  const hasData = objects.some((row) => String(row.app_id || "").trim() !== "");
  if (!hasData) {
    for (const app of APP_REGISTRY) {
      await appendRow(tab, appRow(app));
    }
    rows = await readSheet(tab);
    objects = rowsToObjects(rows);
  } else if (await syncEcosystemRegistry(objects, tab)) {
    rows = await readSheet(tab);
    objects = rowsToObjects(rows);
  }
  const localManifests = loadLocalManifests();
  const apps = objects.filter((row) => String(row.app_id || "").trim() !== "").map((row) => {
    const baseApp = mapApp(row);
    const manifest = localManifests.get(baseApp.app_id);
    if (manifest) {
      return {
        ...baseApp,
        version: manifest.version,
        category: manifest.category,
        title: manifest.title || baseApp.name,
        depends: manifest.depends,
        provides: manifest.provides,
        description: manifest.description,
      };
    }
    return baseApp;
  });
  cached = { expiresAt: Date.now() + 60_000, apps };
  return apps;
}

async function readRegistryRows(): Promise<{ rows: Record<string, string>[]; tab: string }> {
  const tab = await getRegistryTab();
  const rows = await readSheet(tab);
  return { rows: rowsToObjects(rows), tab };
}

function appRow(app: App): (string | number)[] {
  return [app.app_id, app.name, app.url, app.icon, app.status, app.required_permission];
}

export async function createRegistryApp(input: Partial<App> & { name: string; url: string; required_permission: string }): Promise<{ success: boolean; message: string; app?: App }> {
  const appId = (input.app_id || "").trim().toUpperCase() || `APP_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const existing = await getRegistryApps();
  if (existing.some((a) => a.app_id === appId)) {
    return { success: false, message: "App ID already exists" };
  }
  const app: App = {
    app_id: appId,
    name: input.name.trim(),
    url: input.url.trim(),
    icon: input.icon || "layout-grid",
    status: (input.status || "ACTIVE") as AppStatus,
    required_permission: input.required_permission,
  };
  const tab = await getRegistryTab();
  await appendRow(tab, appRow(app));
  invalidateRegistryCache();
  return { success: true, message: "App created", app };
}

export async function updateRegistryApp(appId: string, updates: Partial<Omit<App, "app_id">>): Promise<{ success: boolean; message: string }> {
  const { rows, tab } = await readRegistryRows();
  const idx = rows.findIndex((r) => (r.app_id || "").trim().toUpperCase() === appId.toUpperCase());
  if (idx < 0) return { success: false, message: "App not found" };
  const current = mapApp(rows[idx]);
  const next: App = { ...current, ...updates, app_id: current.app_id };
  await updateRowByIndex(tab, idx, appRow(next));
  invalidateRegistryCache();
  return { success: true, message: "App updated" };
}

export async function deleteRegistryApp(appId: string): Promise<{ success: boolean; message: string }> {
  const { rows, tab } = await readRegistryRows();
  const idx = rows.findIndex((r) => (r.app_id || "").trim().toUpperCase() === appId.toUpperCase());
  if (idx < 0) return { success: false, message: "App not found" };
  await deleteRowByIndex(tab, idx);
  invalidateRegistryCache();
  return { success: true, message: "App deleted" };
}
