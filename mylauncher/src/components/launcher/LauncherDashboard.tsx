"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDomainStore } from "@/stores/useLauncherStore";
import type { App } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Star } from "lucide-react";
import { useFeatureSettings } from "@/components/layout/FeatureSettingsProvider";
import { AppCard, getAppDisplay } from "@/components/launcher/AppCard";

export function LauncherDashboard() {
  const apps = useDomainStore((s) => s.apps);
  const isAuthenticated = useDomainStore((s) => s.isAuthenticated);
  const activeEmployee = useDomainStore((s) => s.activeEmployee);
  const setApps = useDomainStore((s) => s.setApps);
  const permissions = useDomainStore((s) => s.permissions);
  const favorites = useDomainStore((s) => s.favorites);
  const recentApps = useDomainStore((s) => s.recentApps);
  const toggleFavorite = useDomainStore((s) => s.toggleFavorite);
  const pushRecentApp = useDomainStore((s) => s.pushRecentApp);
  const router = useRouter();
  const features = useFeatureSettings();
  const [registryLoading, setRegistryLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void fetch("/api/registry")
      .then(async (response) => {
        const result = (await response.json()) as { apps?: App[]; message?: string };
        if (!response.ok || !result.apps) {
          throw new Error(result.message || "Application registry unavailable");
        }
        if (!cancelled) setApps(result.apps);
      })
      .catch((error: unknown) => {
        // Silent fail; loading skeleton handles UI
      })
      .finally(() => {
        if (!cancelled) setRegistryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setApps]);

  const displayApps = isAuthenticated ? apps : [];
  const accessible = displayApps.filter(
    (app) => app.status === "ACTIVE" && permissions.includes(app.required_permission)
  );
  const favoriteApps = favorites
    .map((id) => accessible.find((a) => a.app_id === id))
    .filter((a): a is App => Boolean(a));
  const recent = recentApps
    .map((id) => accessible.find((a) => a.app_id === id))
    .filter((a): a is App => Boolean(a));
  function handleOpenApp(app: App) {
    if (app.status !== "ACTIVE") return;
    pushRecentApp(app.app_id);
    router.push(`/launcher/${app.app_id.toLowerCase()}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">
          {isAuthenticated && activeEmployee
            ? `Selamat datang, ${activeEmployee.name}`
            : "Selamat datang"}
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Buka aplikasi dari grid di bawah. Klik kartu aplikasi untuk meluncurkan.
        </p>
      </div>

      {features.favorite_apps && favoriteApps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-mist mr-2">
            Favorit
          </p>
          {favoriteApps.map((app) => {
            const { Icon } = getAppDisplay(app.app_id, app.name);
            return (
              <Button
                key={app.app_id}
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => handleOpenApp(app)}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {app.name}
              </Button>
            );
          })}
        </div>
      )}

      {features.recent_apps && recent.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-mist mr-2">
            Terakhir Dibuka
          </p>
          {recent.map((app) => {
            const { Icon } = getAppDisplay(app.app_id, app.name);
            return (
              <Button
                key={app.app_id}
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => handleOpenApp(app)}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {app.name}
              </Button>
            );
          })}
        </div>
      )}

      <section aria-label="Semua Aplikasi" className="mt-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-mist">
          Semua Aplikasi
        </h2>
        {registryLoading && isAuthenticated ? (
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            role="status"
            aria-busy="true"
            aria-live="polite"
          >
            <span className="sr-only">Memuat aplikasi…</span>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-xl border border-hairline bg-surface"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : accessible.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-hairline">
            <div className="text-center">
              <p className="text-ink-soft">Tidak ada aplikasi tersedia</p>
              <p className="mt-1 text-xs text-mist">
                {isAuthenticated
                  ? "Peran Anda tidak memberikan akses ke aplikasi apa pun."
                  : "Masuk dengan akun yang valid"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {accessible.map((app, index) => (
              <AppCard
                key={app.app_id}
                app={app}
                index={index}
                onClick={handleOpenApp}
                favorite={favorites.includes(app.app_id)}
                onToggleFavorite={() => toggleFavorite(app.app_id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
