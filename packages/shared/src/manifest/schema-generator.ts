import { z } from 'zod';

/**
 * F5.2 App Manifest Schema & Generator
 * Validates and generates app.manifest.json for new apps
 */

// Manifest schema definition
export const AppManifestSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, 'Name must be kebab-case starting with letter'),
  displayName: z.string().min(1).max(50),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semver'),
  description: z.string().min(10).max(200),

  type: z.enum(['app', 'service', 'tool']).default('app'),
  owner: z.string().min(1).default('mochikin-team'),

  dependencies: z
    .array(z.string())
    .min(1)
    .refine((deps) => deps.includes('@mochikin/shared'), {
      message: '@mochikin/shared is required',
    }),

  permissions: z
    .array(z.enum(['read:master-data', 'write:master-data', 'admin', 'execute:events']))
    .default(['read:master-data']),

  features: z.array(z.string()).default(['person-mapping', 'branch-isolation']),

  api: z
    .object({
      endpoints: z.array(z.string()),
      rls: z.boolean().default(true),
      events: z.array(z.string()).default([]),
    })
    .optional(),

  integrations: z
    .object({
      supabase: z.boolean().default(true),
      sheets: z.boolean().default(false),
      events: z.boolean().default(false),
    })
    .default({ supabase: true, sheets: false, events: false }),

  environment: z
    .object({
      required: z.array(z.string()),
      optional: z.array(z.string()).default([]),
    })
    .default({
      required: [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ],
      optional: [],
    }),

  status: z.enum(['draft', 'active', 'deprecated']).default('active'),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});

type AppManifest = z.infer<typeof AppManifestSchema>;

/**
 * Generator function
 */
export function generateManifest(input: Partial<AppManifest>): AppManifest {
  const defaults: AppManifest = {
    name: 'myapp',
    displayName: 'My App',
    version: '1.0.0',
    description: 'A MOCHIKIN app',
    type: 'app',
    owner: 'mochikin-team',
    dependencies: ['@mochikin/shared'],
    permissions: ['read:master-data'],
    features: ['person-mapping', 'branch-isolation'],
    integrations: { supabase: true, sheets: false, events: false },
    environment: {
      required: [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ],
      optional: [],
    },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const merged = { ...defaults, ...input };
  return AppManifestSchema.parse(merged);
}

/**
 * Template manifests for common app types
 */
export const MANIFEST_TEMPLATES = {
  dataApp: (name: string): Partial<AppManifest> => ({
    type: 'app',
    dependencies: ['@mochikin/shared'],
    permissions: ['read:master-data', 'write:master-data'],
    features: ['person-mapping', 'branch-isolation', 'rls-enforcement'],
    integrations: { supabase: true, sheets: false, events: true },
    api: {
      endpoints: [
        '/api/resources',
        '/api/resources/[id]',
      ],
      rls: true,
      events: ['resource.created', 'resource.updated', 'resource.deleted'],
    },
  }),

  analyticsApp: (name: string): Partial<AppManifest> => ({
    type: 'app',
    dependencies: ['@mochikin/shared'],
    permissions: ['read:master-data'],
    features: ['read-only', 'analytics'],
    integrations: { supabase: true, sheets: false, events: false },
    api: {
      endpoints: ['/api/analytics', '/api/reports'],
      rls: true,
      events: [],
    },
  }),

  microservice: (name: string): Partial<AppManifest> => ({
    type: 'service',
    dependencies: ['@mochikin/shared'],
    permissions: ['read:master-data', 'execute:events'],
    features: ['event-driven'],
    integrations: { supabase: true, sheets: false, events: true },
    api: {
      endpoints: ['/api/webhook'],
      rls: false,
      events: [],
    },
  }),
};

/**
 * Validator
 */
export function validateManifest(manifest: any): { valid: boolean; errors?: string[] } {
  try {
    AppManifestSchema.parse(manifest);
    return { valid: true };
  } catch (error: any) {
    if (error.errors) {
      return {
        valid: false,
        errors: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: [error.message] };
  }
}

/**
 * Example generated manifests
 */
export const EXAMPLE_MANIFESTS = {
  mycheck: {
    name: 'mycheck',
    displayName: 'MyCheck',
    version: '1.0.0',
    description: 'Checklist management for daily outlet operations',
    type: 'app' as const,
    owner: 'mochikin-team',
    dependencies: ['@mochikin/shared'],
    permissions: ['read:master-data', 'write:master-data'],
    features: ['person-mapping', 'branch-isolation', 'audit-logging'],
    api: {
      endpoints: ['/api/checklists', '/api/checklists/[id]'],
      rls: true,
      events: ['checklist.created', 'checklist.submitted'],
    },
    integrations: { supabase: true, sheets: false, events: true },
    environment: {
      required: [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ],
      optional: [],
    },
    status: 'active' as const,
  },

  myperformance: {
    name: 'myperformance',
    displayName: 'MyPerformance',
    version: '1.0.0',
    description: 'Performance scoring and analytics with Points Engine',
    type: 'app' as const,
    owner: 'mochikin-team',
    dependencies: [
      '@mochikin/shared',
      'decimal.js',
    ],
    permissions: ['read:master-data', 'write:master-data', 'admin'],
    features: ['person-mapping', 'branch-isolation', 'points-engine', 'analytics'],
    api: {
      endpoints: [
        '/api/scorecards',
        '/api/points',
        '/api/ledger',
        '/api/analytics/performance',
      ],
      rls: true,
      events: [
        'points.awarded',
        'scorecard.updated',
        'points.snapshot',
      ],
    },
    integrations: { supabase: true, sheets: false, events: true },
    environment: {
      required: [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ],
      optional: [],
    },
    status: 'active' as const,
  },
};
