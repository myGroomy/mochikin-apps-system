// Per-app environment schemas.
//
// These mirror the canonical templates in PLANS/env-templates/*.env.example.
// Matrix source of truth: PLANS/env-templates/README-env.md
//   `=`  identical across every app that uses it
//   `≠`  required but unique per app
//   `o`  optional
//   `-`  not used by that app
//
// Apps should prefer `validateEnvFor('<app>')` over the generic `validateEnv()`
// so only the variables that app actually needs are enforced.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/** Contract secrets: must be IDENTICAL across every app (matrix `=`). */
const ContractSecrets = {
  LAUNCHER_SSO_SHARED_SECRET: z.string().min(32),
  MOCHIKIN_EVENTS_SECRET: z.string().min(32),
  MYPERFORMANCE_URL: z.string().url().optional(),
  APP_TIMEZONE: z.string().default('Asia/Jakarta'),
};

/** Supabase (matrix `=`). Used by every app. */
const SupabaseEnv = {
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
};

/** Upstash Redis (matrix `=`). Used by every app. */
const UpstashEnv = {
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(10),
};

/** Google Service Account (matrix `=`). Used by every app EXCEPT myperformance. */
const GoogleServiceAccountEnv = {
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(10),
};

/** Per-app session secret (matrix `≠`, >= 32 chars). */
const AppSessionSecret = z.string().min(32, 'SESSION_SECRET must be at least 32 characters');

// ---------------------------------------------------------------------------
// Per-app schemas
// ---------------------------------------------------------------------------

/**
 * mylauncher — source of truth for identity/registry.
 * Template: PLANS/env-templates/mylauncher.env.example
 */
export const MyLauncherEnvSchema = z.object({
  // Unique to this app
  LAUNCHER_SESSION_SECRET: z.string().min(32),
  REGISTRY_SPREADSHEET_ID: z.string().min(1),
  FOLDER_DRIVE_INDUK: z.string().optional(),

  // Contract (identical everywhere)
  ...ContractSecrets,

  // Google
  ...GoogleServiceAccountEnv,

  // Session + login behaviour
  SESSION_SECRET: AppSessionSecret,
  SESSION_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(3600),
  MAX_FAILED_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  ACCOUNT_LOCK_DURATION_MINUTES: z.coerce.number().int().positive().default(5),
  SESSION_COOKIE_DOMAIN: z.string().optional(),

  // Optional integrations
  GITHUB_TOKEN: z.string().optional(),
  ...UpstashEnv,

  // Scaffolding/legacy generic route support
  ...SupabaseEnv,
});

/**
 * stokis — stock opname / branch operations.
 * Template: PLANS/env-templates/stokis.env.example
 */
export const StokisEnvSchema = z.object({
  // Unique to this app
  REGISTRY_SPREADSHEET_ID: z.string().min(1),
  FOLDER_DRIVE_INDUK: z.string().optional(),
  // HMAC session key for lib/session.ts (WAJIB, >= 32). Must match the legacy
  // Apps Script key if that path is still in use.
  STOKIS_API_KEY: z.string().min(32, 'STOKIS_API_KEY must be at least 32 characters'),
  APPS_SCRIPT_URL: z.string().url().optional(),
  APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  SESSION_SECRET: AppSessionSecret,

  // Contract (identical everywhere)
  ...ContractSecrets,
  MYPERFORMANCE_URL: z.string().url(),

  // Google
  ...GoogleServiceAccountEnv,

  // Supabase & Upstash (wajib by validateEnv)
  ...SupabaseEnv,
  ...UpstashEnv,
});

/**
 * mycheck — branch checklists / incident evidence.
 * Template: PLANS/env-templates/mycheck.env.example
 */
export const MycheckEnvSchema = z.object({
  // Unique to this app
  REGISTRY_SPREADSHEET_ID: z.string().min(1),
  GOOGLE_DRIVE_FOLDER_ID: z.string().min(1),
  MYCHECK_GAS_URL: z.string().url().optional(),
  MYCHECK_GAS_UPLOAD_KEY: z.string().optional(),
  MYCHECK_GAS_ADMIN_KEY: z.string().optional(),
  SESSION_SECRET: AppSessionSecret,
  CRON_SECRET: z.string().min(1),
  SCORE_DEPLOY: z.string().optional(),
  MYCHECK_SHIFT_BUFFER_MODE: z.string().optional(),

  // Contract (identical everywhere)
  ...ContractSecrets,
  MYPERFORMANCE_URL: z.string().url(),

  // Google
  ...GoogleServiceAccountEnv,

  // Supabase & Upstash
  ...SupabaseEnv,
  ...UpstashEnv,
});

/**
 * mycustomer (Retain-ly) — customer retention.
 * Template: PLANS/env-templates/mycustomer.env.example
 * Note: uses GOOGLE_SPREADSHEET_ID (NOT REGISTRY_SPREADSHEET_ID).
 */
export const MycustomerEnvSchema = z.object({
  // Unique to this app
  GOOGLE_SPREADSHEET_ID: z.string().min(1),
  SESSION_SECRET: AppSessionSecret,
  SHEET_CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().optional(),
  NEXT_PUBLIC_DEFAULT_CHURN_AT_RISK_DAYS: z.coerce.number().int().positive().optional(),
  NEXT_PUBLIC_DEFAULT_CHURN_ACTIVE_DAYS: z.coerce.number().int().positive().optional(),

  // Contract (identical everywhere)
  ...ContractSecrets,
  MYPERFORMANCE_URL: z.string().url(),

  // Google
  ...GoogleServiceAccountEnv,

  // Supabase & Upstash
  ...SupabaseEnv,
  ...UpstashEnv,
});

/**
 * myperformance — points / rollup aggregator.
 * Template: PLANS/env-templates/myperformance.env.example
 * Notes:
 *   - Uses NEXT_PUBLIC_SUPABASE_* for the browser client AND the server vars.
 *   - SESSION_SECRET is OPTIONAL (o): used only as a fallback when
 *     LAUNCHER_SSO_SHARED_SECRET is empty.
 *   - AUTH_ALLOW_DEV_HEADERS MUST be false in production.
 */
export const MyperformanceEnvSchema = z.object({
  // Unique to this app
  CRON_SECRET: z.string().min(1),
  MONTHLY_POINTS_TARGET: z.coerce.number().int().positive().default(1044),
  NEXT_PUBLIC_MONTHLY_POINTS_TARGET: z.coerce.number().int().positive().default(1044),
  EFFECTIVE_HOURS_PER_MONTH: z.coerce.number().positive().default(173),
  AUTH_ALLOW_DEV_HEADERS: z
    .enum(['true', 'false'])
    .default('false')
    .refine(v => v !== 'true' || process.env.NODE_ENV !== 'production', {
      message: 'AUTH_ALLOW_DEV_HEADERS must be false in production',
    }),
  // Optional fallback secret (do not rely on it).
  SESSION_SECRET: AppSessionSecret.optional(),
  // Registry spreadsheet used ONLY by /api/export/monthly (via
  // createSheetsClient). Distinct from launcher/mycheck's REGISTRY_SPREADSHEET_ID.
  MOCHIKIN_REGISTRY_SHEET_ID: z.string().min(1).optional(),

  // Contract (identical everywhere)
  ...ContractSecrets,

  // Supabase — both server and NEXT_PUBLIC_ forms are required.
  ...SupabaseEnv,
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),

  // Upstash
  ...UpstashEnv,
  // NOTE: myperformance does NOT use Google Service Account (matrix `-`).
});

// ---------------------------------------------------------------------------
// Registry + generic validator
// ---------------------------------------------------------------------------

export const AppEnvSchemas = {
  mylauncher: MyLauncherEnvSchema,
  stokis: StokisEnvSchema,
  mycheck: MycheckEnvSchema,
  mycustomer: MycustomerEnvSchema,
  myperformance: MyperformanceEnvSchema,
} as const;

export type MochikinApp = keyof typeof AppEnvSchemas;

export type AppEnv<A extends MochikinApp> = z.infer<(typeof AppEnvSchemas)[A]>;

/**
 * Validate process.env against a specific app's schema.
 * Throws with a readable field-level report on failure.
 */
export function validateEnvFor<A extends MochikinApp>(app: A): AppEnv<A> {
  const schema = AppEnvSchemas[app];
  const result = schema.safeParse(process.env);

  if (!result.success) {
    console.error(`❌ Environment validation failed for app "${app}":`);
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error(`Invalid environment variables for ${app}`);
  }

  return result.data as AppEnv<A>;
}
