import { z } from "zod";

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => {
    if (typeof v === "string" && v.trim() === "") return undefined;
    if (v === null || v === undefined) return undefined;
    return v;
  }, schema);

const optionalUrl = emptyToUndefined(z.string().url().optional());

const MochikinServiceEnvSchema = z.object({
  // Supabase (Direct PostgreSQL database)
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10).optional(),

  // SSO Handoff & Session Secrets
  LAUNCHER_SSO_SHARED_SECRET: z.string().min(32),
  LAUNCHER_SESSION_SECRET: z.string().min(32).optional(),
  SESSION_SECRET: z.string().min(32).optional(),

  // Security config
  SESSION_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(28800), // 8 hours
  MAX_FAILED_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  ACCOUNT_LOCK_DURATION_MINUTES: z.coerce.number().int().positive().default(5),
  SESSION_COOKIE_DOMAIN: emptyToUndefined(z.string().optional()),

  // Sibling Ecosystem App URLs
  NEXT_PUBLIC_STOKIS_URL: optionalUrl,
  NEXT_PUBLIC_MYCUSTOMER_URL: optionalUrl,
  NEXT_PUBLIC_MYCHECK_URL: optionalUrl,
  NEXT_PUBLIC_MYPERFORMANCE_URL: optionalUrl,
});

export type MochikinServiceEnv = z.infer<typeof MochikinServiceEnvSchema>;

let cachedEnv: MochikinServiceEnv | null = null;

export function getMochikinServiceEnv(): MochikinServiceEnv {
  if (cachedEnv) return cachedEnv;

  const result = MochikinServiceEnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Environment validation failed for MyService:", result.error.format());
    throw new Error("Invalid MyService environment configuration");
  }

  cachedEnv = result.data;
  return cachedEnv;
}
