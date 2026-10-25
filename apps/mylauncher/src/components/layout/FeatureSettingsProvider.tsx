"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useDomainStore } from "@/stores/useLauncherStore";
import { DEFAULT_FEATURE_SETTINGS } from "@/lib/featureSettings";
import type { FeatureSettings } from "@/lib/types";

const FeatureSettingsContext = createContext<FeatureSettings>(DEFAULT_FEATURE_SETTINGS);
const FEATURES_POLL_MS = 60_000;

export function FeatureSettingsProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useDomainStore((state) => state.isAuthenticated);
  const [features, setFeatures] = useState<FeatureSettings>(DEFAULT_FEATURE_SETTINGS);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/settings");
        if (cancelled || !response.ok) return;
        const body = (await response.json()) as {
          success?: boolean;
          features?: FeatureSettings;
        };
        if (!cancelled && body.success && body.features) setFeatures(body.features);
      } catch {
        // keep last known features on network blip
      }
    }

    void load();
    const interval = setInterval(() => void load(), FEATURES_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  return (
    <FeatureSettingsContext.Provider
      value={isAuthenticated ? features : DEFAULT_FEATURE_SETTINGS}
    >
      {children}
    </FeatureSettingsContext.Provider>
  );
}

export function useFeatureSettings(): FeatureSettings {
  return useContext(FeatureSettingsContext);
}
