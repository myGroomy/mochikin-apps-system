import { z } from 'zod';

export const EnvSchema = z.object({
  // Secrets
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  LAUNCHER_SSO_SHARED_SECRET: z.string().min(32),
  MOCHIKIN_EVENTS_SECRET: z.string().min(32),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(10),

  // Google Sheets (Service Account — pola yang dipakai semua app: email + private key)
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(10),

  // Deployment
  STOKIS_API_KEY: z.string().min(32).optional(),
  VERCEL_ENV: z.enum(['production', 'staging', 'development']).default('development'),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_LAUNCHER_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Environment validation failed:');
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error('Invalid environment variables');
  }

  console.log('✅ Environment variables validated');
  return result.data;
}
