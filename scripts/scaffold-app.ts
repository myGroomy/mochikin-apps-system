#!/usr/bin/env node

/**
 * F5.7 Scaffold CLI Tool
 * pnpm scaffold:app --name myapp --type dataApp
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ScaffoldOptions {
  name: string;
  type: 'app' | 'service' | 'tool';
  description?: string;
  owner?: string;
}

function validateAppName(name: string): boolean {
  const kebabCaseRegex = /^[a-z][a-z0-9-]*$/;
  return kebabCaseRegex.test(name);
}

async function scaffoldApp(options: ScaffoldOptions) {
  const { name, type, description, owner = 'mochikin-team' } = options;

  // Validate
  if (!validateAppName(name)) {
    console.error('❌ App name must be kebab-case starting with letter');
    process.exit(1);
  }

  const appDir = path.join(process.cwd(), 'apps', name);

  if (fs.existsSync(appDir)) {
    console.error(`❌ App directory already exists: ${appDir}`);
    process.exit(1);
  }

  console.log(`🚀 Creating app: ${name}`);

  // 1. Create directory structure
  console.log('📁 Creating directory structure...');
  const dirs = [
    `${appDir}/src/app`,
    `${appDir}/src/lib`,
    `${appDir}/src/components`,
    `${appDir}/src/__tests__/integration`,
  ];

  dirs.forEach((dir) => {
    fs.mkdirSync(dir, { recursive: true });
  });

  // 2. Generate app.manifest.json
  console.log('📋 Generating app.manifest.json...');
  const manifest = {
    name,
    displayName: name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(''),
    version: '1.0.0',
    description: description || `${name} application`,
    type,
    owner,
    dependencies: ['@mochikin/shared'],
    permissions: type === 'app' ? ['read:master-data', 'write:master-data'] : ['read:master-data'],
    features: ['person-mapping', 'branch-isolation'],
    api: {
      endpoints: ['/api/resources'],
      rls: true,
      events: [`${name}.created`],
    },
    integrations: { supabase: true },
    environment: {
      required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
      optional: [],
    },
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(`${appDir}/app.manifest.json`, JSON.stringify(manifest, null, 2));

  // 3. Generate key files
  console.log('📝 Generating source files...');

  const displayName = manifest.displayName;
  const serviceClass = `${displayName.replace(/-/g, '')}IntegrationService`;

  // layout.tsx
  fs.writeFileSync(
    `${appDir}/src/app/layout.tsx`,
    `import type { Metadata } from 'next';\nimport './globals.css';\n\nexport const metadata: Metadata = {\n  title: '${displayName} - MOCHIKIN',\n  description: '${manifest.description}',\n};\n\nexport default function RootLayout({\n  children,\n}: {\n  children: React.ReactNode;\n}) {\n  return (\n    <html lang="en">\n      <body>\n        <div className="min-h-screen bg-gray-50">\n          {children}\n        </div>\n      </body>\n    </html>\n  );\n}\n`
  );

  // page.tsx
  fs.writeFileSync(
    `${appDir}/src/app/page.tsx`,
    `export default function Home() {\n  return (\n    <main className="container mx-auto px-4 py-8">\n      <h1 className="text-4xl font-bold mb-4">${displayName}</h1>\n      <p className="text-gray-600">Welcome to ${displayName}</p>\n    </main>\n  );\n}\n`
  );

  // middleware.ts
  fs.writeFileSync(
    `${appDir}/src/middleware.ts`,
    `import { NextRequest, NextResponse } from 'next/server';\n\nexport async function middleware(request: NextRequest) {\n  // Extract JWT claims from Authorization header\n  const personId = request.headers.get('X-Person-Id');\n  const branchId = request.headers.get('X-Branch-Id');\n  const role = request.headers.get('X-Role');\n\n  if (!personId || !branchId) {\n    return NextResponse.redirect(new URL('/login', request.url));\n  }\n\n  return NextResponse.next();\n}\n\nexport const config = {\n  matcher: ['/api/:path*'],\n};\n`
  );

  // lib/integration.ts
  fs.writeFileSync(
    `${appDir}/src/lib/integration.ts`,
    `import { createClient, SupabaseClient } from '@supabase/supabase-js';\nimport { MasterDataService, getMasterDataService } from '@mochikin/shared/master-data';\n\nexport class ${serviceClass} {\n  private masterDataService: MasterDataService;\n  private supabase: SupabaseClient;\n\n  constructor(supabaseClient: SupabaseClient) {\n    this.supabase = supabaseClient;\n    this.masterDataService = getMasterDataService(supabaseClient);\n  }\n\n  async validateRequestContext(personId: string, branchId: string): Promise<boolean> {\n    try {\n      const person = await this.masterDataService.getPersonById(personId);\n      return !!(person && person.branch_id === branchId && person.status === 'active');\n    } catch (error) {\n      return false;\n    }\n  }\n\n  async getPersonContext(personId: string) {\n    try {\n      const person = await this.masterDataService.getPersonById(personId);\n      if (!person) return null;\n      return {\n        person_id: person.id,\n        name: person.name,\n        email: person.email,\n        branch_id: person.branch_id,\n        role: person.role,\n      };\n    } catch (error) {\n      return null;\n    }\n  }\n\n  async validateCreation(\n    personId: string,\n    branchId: string,\n    resourceData: any\n  ): Promise<{ valid: boolean; error?: string }> {\n    const contextValid = await this.validateRequestContext(personId, branchId);\n    if (!contextValid) return { valid: false, error: 'Invalid person or branch' };\n    return { valid: true };\n  }\n\n  enrichRecord(record: any, personId: string, branchId: string) {\n    return {\n      ...record,\n      person_id: personId,\n      branch_id: branchId,\n      created_by: personId,\n      updated_by: personId,\n    };\n  }\n\n  async validateBeforeEvent(\n    eventData: any,\n    eventType: string,\n    personId: string,\n    branchId: string\n  ): Promise<boolean> {\n    const contextValid = await this.validateRequestContext(personId, branchId);\n    return contextValid;\n  }\n\n  async logAction(action: string, personId: string, branchId: string, details: any) {\n    try {\n      await this.supabase.from('master_data_audit_log').insert([{\n        table_name: 'resources',\n        record_id: details.record_id,\n        action: 'UPDATE',\n        changed_by: personId,\n        new_values: details,\n        record_identifier: details.name || 'resource',\n      }]);\n    } catch (error) {\n      console.warn('Audit log error:', error);\n    }\n  }\n}\n\nlet serviceInstance: ${serviceClass} | null = null;\n\nexport function get${serviceClass}(supabaseClient: SupabaseClient): ${serviceClass} {\n  if (!serviceInstance) {\n    serviceInstance = new ${serviceClass}(supabaseClient);\n  }\n  return serviceInstance;\n}\n`
  );

  // app/api/resources/route.ts
  fs.writeFileSync(
    `${appDir}/src/app/api/resources/route.ts`,
    `import { NextRequest, NextResponse } from 'next/server';\nimport { createClient } from '@supabase/supabase-js';\nimport { validateEnv } from '@mochikin/shared/env';\nimport { get${serviceClass} } from '@/lib/integration';\nimport { z } from 'zod';\n\nexport async function GET(request: NextRequest) {\n  const env = validateEnv();\n  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);\n  const integration = get${serviceClass}(supabase);\n\n  const personId = request.headers.get('X-Person-Id');\n  const branchId = request.headers.get('X-Branch-Id');\n\n  if (!personId || !branchId) {\n    return NextResponse.json({ error: 'Missing context' }, { status: 400 });\n  }\n\n  const isValid = await integration.validateRequestContext(personId, branchId);\n  if (!isValid) {\n    return NextResponse.json({ error: 'Invalid context' }, { status: 403 });\n  }\n\n  const { data, error } = await supabase\n    .from('resources')\n    .select('*')\n    .eq('branch_id', branchId)\n    .order('created_at', { ascending: false });\n\n  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });\n\n  await integration.logAction('LIST', personId, branchId, { record_id: 'bulk' });\n\n  return NextResponse.json({ success: true, data, count: data?.length || 0 });\n}\n\nexport async function POST(request: NextRequest) {\n  const env = validateEnv();\n  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);\n  const integration = get${serviceClass}(supabase);\n\n  const personId = request.headers.get('X-Person-Id');\n  const branchId = request.headers.get('X-Branch-Id');\n\n  if (!personId || !branchId) {\n    return NextResponse.json({ error: 'Missing context' }, { status: 400 });\n  }\n\n  const body = await request.json();\n  const schema = z.object({ name: z.string().min(1), description: z.string().optional() });\n\n  let resourceData;\n  try {\n    resourceData = schema.parse(body);\n  } catch (e) {\n    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });\n  }\n\n  const validation = await integration.validateCreation(personId, branchId, resourceData);\n  if (!validation.valid) {\n    return NextResponse.json({ error: validation.error }, { status: 400 });\n  }\n\n  const enrichedData = integration.enrichRecord(resourceData, personId, branchId);\n  const { data: newResource, error: insertError } = await supabase\n    .from('resources')\n    .insert([enrichedData])\n    .select()\n    .single();\n\n  if (insertError) return NextResponse.json({ error: 'Failed to create' }, { status: 500 });\n\n  const eventValid = await integration.validateBeforeEvent(\n    { resource_id: newResource.id, branch_id: branchId },\n    '${name}.created',\n    personId,\n    branchId\n  );\n\n  if (eventValid) {\n    console.log('📤 Event: ${name}.created', { resource_id: newResource.id });\n  }\n\n  await integration.logAction('CREATE', personId, branchId, {\n    record_id: newResource.id,\n    name: newResource.name,\n  });\n\n  return NextResponse.json({ success: true, data: newResource }, { status: 201 });\n}\n`
  );

  // __tests__/integration/resources.test.ts
  fs.writeFileSync(
    `${appDir}/src/__tests__/integration/resources.test.ts`,
    `import { describe, it, expect, beforeAll, afterAll } from 'vitest';\nimport { createClient } from '@supabase/supabase-js';\nimport { validateEnv } from '@mochikin/shared/env';\nimport { get${serviceClass} } from '../../lib/integration';\n\ndescribe('${displayName} Integration Tests', () => {\n  let supabase: any;\n  let testBranch: any;\n  let testPerson: any;\n\n  beforeAll(async () => {\n    const env = validateEnv();\n    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);\n\n    const branchRes = await supabase\n      .from('branches')\n      .insert([{ name: 'Test ${displayName}', location: 'Test', status: 'active' }])\n      .select()\n      .single();\n    testBranch = branchRes.data;\n\n    const personRes = await supabase\n      .from('people')\n      .insert([{\n        name: 'Test User',\n        email: '${name}-test@mochikin.local',\n        role: 'staff',\n        branch_id: testBranch.id,\n        status: 'active',\n      }])\n      .select()\n      .single();\n    testPerson = personRes.data;\n  });\n\n  afterAll(async () => {\n    await supabase.from('people').delete().eq('id', testPerson?.id);\n    await supabase.from('branches').delete().eq('id', testBranch?.id);\n  });\n\n  it('should validate request context', async () => {\n    const integration = get${serviceClass}(supabase);\n    const isValid = await integration.validateRequestContext(testPerson.id, testBranch.id);\n    expect(isValid).toBe(true);\n  });\n\n  it('should reject invalid person', async () => {\n    const integration = get${serviceClass}(supabase);\n    const isValid = await integration.validateRequestContext('fake-id', testBranch.id);\n    expect(isValid).toBe(false);\n  });\n});\n`
  );

  // package.json
  fs.writeFileSync(
    `${appDir}/package.json`,
    JSON.stringify(
      {
        name: `@mochikin/${name}`,
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'eslint src',
          test: 'vitest',
          'test:integration': 'vitest run --grep integration',
        },
        dependencies: {
          '@mochikin/shared': '*',
          '@supabase/supabase-js': '^2.38.0',
          next: '^14.0.0',
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          zod: '^3.22.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^0.34.0',
          '@testing-library/react': '^14.0.0',
        },
      },
      null,
      2
    )
  );

  // .env.local
  fs.writeFileSync(
    `${appDir}/.env.local`,
    `# Supabase\nSUPABASE_URL=https://jjugzkpqgfvlgerfapnl.supabase.co\nSUPABASE_ANON_KEY=your-anon-key\nSUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n\n# Shared\nLAUNCHER_SSO_SHARED_SECRET=your_sso_secret\nMOCHIKIN_EVENTS_SECRET=your_events_secret\n`
  );

  // tsconfig.json
  fs.writeFileSync(
    `${appDir}/tsconfig.json`,
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          jsx: 'react-jsx',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          baseUrl: '.',
          paths: { '@/*': ['./src/*'] },
        },
        include: ['src'],
        exclude: ['node_modules'],
      },
      null,
      2
    )
  );

  // .gitignore
  fs.writeFileSync(
    `${appDir}/.gitignore`,
    `node_modules\n/.next\n/out\n/build\n.env\n.env.local\n*.log\n.DS_Store\n`
  );

  // 4. Add to pnpm-workspace.yaml
  console.log('📦 Updating pnpm-workspace.yaml...');
  const workspacePath = path.join(process.cwd(), 'pnpm-workspace.yaml');
  let workspaceContent = fs.readFileSync(workspacePath, 'utf-8');
  if (!workspaceContent.includes(`  - 'apps/${name}'`)) {
    workspaceContent = workspaceContent.replace(
      /packages:\n/,
      `packages:\n  - 'apps/${name}'\n`
    );
    fs.writeFileSync(workspacePath, workspaceContent);
  }

  // 5. Install dependencies
  console.log('📥 Installing dependencies...');
  try {
    execSync(`cd ${appDir} && pnpm install`, { stdio: 'inherit' });
  } catch (error) {
    console.warn('⚠️  Dependencies install had issues, but app created');
  }

  console.log(`\n✅ App '${name}' created successfully!\n`);
  console.log(`📍 Location: ${appDir}`);
  console.log(`\n🚀 Next steps:`);
  console.log(`  1. cd apps/${name}`);
  console.log(`  2. Update .env.local with your Supabase keys`);
  console.log(`  3. Customize src/lib/integration.ts`);
  console.log(`  4. Add more API routes as needed`);
  console.log(`  5. pnpm dev`);
  console.log(`\n📖 See ADAPTER-PLAYBOOK.md for integration guide\n`);
}

// Parse CLI args
const args = process.argv.slice(2);
let options: ScaffoldOptions = { name: '', type: 'app' };

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--name') options.name = args[i + 1];
  if (args[i] === '--type') options.type = (args[i + 1] as any) || 'app';
  if (args[i] === '--description') options.description = args[i + 1];
}

if (!options.name) {
  console.error('Usage: pnpm scaffold:app --name myapp [--type app|service|tool] [--description "..."]');
  process.exit(1);
}

scaffoldApp(options).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
