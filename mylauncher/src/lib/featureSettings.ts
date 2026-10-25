import { FEATURE_KEYS, type FeatureSettings } from "@/lib/types";

export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = Object.fromEntries(
  FEATURE_KEYS.map((key) => [key, true])
) as FeatureSettings;
