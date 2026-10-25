"use client";

import { useEffect, useState } from "react";
import { Check, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type FeatureKey, type FeatureSettings } from "@/lib/types";
import { DEFAULT_FEATURE_SETTINGS } from "@/lib/featureSettings";

const FEATURE_GROUPS: Array<{ title: string; keys: FeatureKey[] }> = [
  {
    title: "Pengalaman Peluncur",
    keys: ["global_search", "notifications", "work_context", "announcements", "favorite_apps", "recent_apps", "system_status", "recent_activity"],
  },
  {
    title: "Navigasi Admin",
    keys: ["admin_roles", "admin_permissions", "admin_apps", "admin_announcements", "admin_sessions", "admin_audit"],
  },
];

const FEATURE_LABELS: Record<FeatureKey, { label: string; description: string }> = {
  global_search: { label: "Pencarian Global", description: "Cari aplikasi yang dapat diakses dari header." },
  notifications: { label: "Notifikasi", description: "Tampilkan lonceng notifikasi dan feed pribadi." },
  work_context: { label: "Konteks Kerja", description: "Tampilkan widget cabang dan shift saat ini." },
  announcements: { label: "Pengumuman", description: "Tampilkan banner dan item pengumuman." },
  favorite_apps: { label: "Aplikasi Favorit", description: "Tampilkan panel favorit pada dasbor." },
  recent_apps: { label: "Aplikasi Terbaru", description: "Tampilkan aplikasi yang baru dibuka." },
  system_status: { label: "Status Sistem", description: "Tampilkan kartu status registry dan feed." },
  recent_activity: { label: "Aktivitas Terkini", description: "Tampilkan ringkasan aktivitas audit." },
  admin_roles: { label: "Peran", description: "Tampilkan navigasi dan kartu administrasi peran." },
  admin_permissions: { label: "Izin", description: "Tampilkan navigasi dan kartu administrasi izin." },
  admin_apps: { label: "Aplikasi", description: "Tampilkan navigasi dan kartu administrasi registry aplikasi." },
  admin_announcements: { label: "Pengumuman Admin", description: "Tampilkan navigasi administrasi pengumuman." },
  admin_sessions: { label: "Sesi", description: "Tampilkan navigasi administrasi sesi aktif." },
  admin_audit: { label: "Log Audit", description: "Tampilkan navigasi administrasi log audit." },
};

export function FeatureSettings() {
  const [features, setFeatures] = useState<FeatureSettings>(DEFAULT_FEATURE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/settings")
      .then(async (response) => {
        const body = (await response.json()) as { features?: FeatureSettings };
        if (response.ok && body.features) setFeatures(body.features);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features }),
      });
      const body = (await response.json()) as { success?: boolean; message?: string; features?: FeatureSettings };
      if (!response.ok || !body.success) throw new Error(body.message || "Unable to save settings");
      if (body.features) setFeatures(body.features);
      toast.success("Feature visibility updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-soft">Memuat pengaturan…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Pengaturan</h1>
        <p className="mt-1 text-sm text-ink-soft">Kontrol fitur opsional yang terlihat secara global.</p>
      </div>

      {FEATURE_GROUPS.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-ink">
              <Settings2 className="h-4 w-4" /> {group.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {group.keys.map((key) => {
              const metadata = FEATURE_LABELS[key];
              return (
                <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-hairline px-4 py-3 hover:bg-secondary/50">
                  <span>
                    <span className="block text-sm font-medium text-ink">{metadata.label}</span>
                    <span className="block text-xs text-ink-soft">{metadata.description}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={features[key]}
                    onChange={(event) => setFeatures((current) => ({ ...current, [key]: event.target.checked }))}
                    className="h-5 w-5 accent-primary"
                  />
                </label>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Button onClick={() => void save()} disabled={saving}>
        <Check className="mr-2 h-4 w-4" /> {saving ? "Menyimpan…" : "Simpan pengaturan"}
      </Button>
    </div>
  );
}
