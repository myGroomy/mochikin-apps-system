/**
 * validate-gates.ts — F0 Gating Checks untuk MOCHIKIN-APPS
 *
 * Struktur monorepo ini menggunakan ROOT-LEVEL apps (bukan apps/{name}/):
 *   mylauncher/, mycheck/, stokis/, mycustomer/, myperformance/
 * packages/shared/ = @mochikin/shared
 *
 * Jalankan dari root: tsx packages/shared/scripts/validate-gates.ts
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface GateResult {
  gate: string;
  status: 'PASS' | 'FAIL' | 'PENDING';
  message: string;
}

const results: GateResult[] = [];

// Root monorepo — jalankan dari direktori mana pun
const ROOT = path.resolve(__dirname, '../../..');

console.log('\n🔐 MOCHIKIN-APPS Gating Checks (F0 Gates)\n');
console.log('═'.repeat(60));

// ─────────────────────────────────────────────────────────────────
// G1: @mochikin/shared typecheck
// ─────────────────────────────────────────────────────────────────
console.log('\n[G1] @mochikin/shared typecheck...');
try {
  const sharedDir = path.join(ROOT, 'packages/shared');
  // Cari tsc lokal di shared node_modules terlebih dahulu
  const tscPaths = [
    path.join(sharedDir, 'node_modules/.bin/tsc'),
    path.join(ROOT, 'node_modules/.bin/tsc'),
  ];
  const tsc = tscPaths.find(p => fs.existsSync(p));
  if (!tsc) throw new Error('tsc not found — run pnpm install first');
  execSync(`${tsc} --noEmit`, { cwd: sharedDir, stdio: 'pipe' });
  results.push({ gate: 'G1', status: 'PASS', message: '@mochikin/shared typecheck clean' });
  console.log('✅ PASS: TypeScript compilation successful');
} catch (e) {
  const msg = (e as Error).message?.split('\n')[0] ?? 'TypeScript errors found';
  results.push({ gate: 'G1', status: 'FAIL', message: msg });
  console.log(`❌ FAIL: ${msg}`);
}

// ─────────────────────────────────────────────────────────────────
// G2: Workspace structure
// Monorepo menggunakan root-level apps (bukan apps/{name}/)
// ─────────────────────────────────────────────────────────────────
console.log('\n[G2] Workspace structure validation...');
// App di root level
const ROOT_APPS = ['mylauncher', 'mycheck', 'stokis', 'mycustomer', 'myperformance'];
const EXPECTED_PACKAGES = ['shared'];

const missingApps = ROOT_APPS.filter(app => !fs.existsSync(path.join(ROOT, 'apps', app, 'package.json')));
const missingPkgs = EXPECTED_PACKAGES.filter(pkg => !fs.existsSync(path.join(ROOT, 'packages', pkg, 'package.json')));

if (missingApps.length === 0 && missingPkgs.length === 0) {
  results.push({ gate: 'G2', status: 'PASS', message: `${ROOT_APPS.length} root-level apps + ${EXPECTED_PACKAGES.length} packages found` });
  console.log(`✅ PASS: Workspace OK — ${ROOT_APPS.length} apps (root-level) + ${EXPECTED_PACKAGES.length} packages`);
} else {
  const detail = [...missingApps.map(a => `app:${a}`), ...missingPkgs.map(p => `pkg:${p}`)].join(', ');
  results.push({ gate: 'G2', status: 'FAIL', message: `Missing: ${detail}` });
  console.log(`❌ FAIL: Missing: ${detail}`);
}

// ─────────────────────────────────────────────────────────────────
// G3: Manifest validation (root-level app dirs)
// ─────────────────────────────────────────────────────────────────
console.log('\n[G3] Manifest validation...');
try {
  const manifests: object[] = [];
  const missing: string[] = [];

  ROOT_APPS.forEach(app => {
    // Cek di root-level app dir (struktur aktual repo ini)
    const manifestPath = path.join(ROOT, 'apps', app, 'app.manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (!manifest.name || !manifest.depends) {
        throw new Error(`Invalid manifest (missing name/depends): ${app}`);
      }
      manifests.push(manifest);
    } else {
      missing.push(app);
    }
  });

  if (missing.length > 0) {
    throw new Error(`Missing app.manifest.json: ${missing.join(', ')}`);
  }

  results.push({ gate: 'G3', status: 'PASS', message: `All ${manifests.length} manifests valid` });
  console.log(`✅ PASS: All ${manifests.length} app.manifest.json files valid`);
} catch (e) {
  results.push({ gate: 'G3', status: 'FAIL', message: `Manifest error: ${(e as Error).message}` });
  console.log(`❌ FAIL: ${(e as Error).message}`);
}

// ─────────────────────────────────────────────────────────────────
// G4: Database migrations
// ─────────────────────────────────────────────────────────────────
console.log('\n[G4] Database schema check...');
const migrationsDir = path.join(ROOT, 'supabase/migrations');
if (fs.existsSync(migrationsDir)) {
  const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  if (migrations.length >= 2) {
    results.push({ gate: 'G4', status: 'PASS', message: `${migrations.length} migrations found` });
    console.log(`✅ PASS: Database migrations ready (${migrations.length} files)`);
  } else {
    results.push({ gate: 'G4', status: 'FAIL', message: 'Insufficient migrations' });
    console.log('❌ FAIL: Need at least 2 migration files');
  }
} else {
  results.push({ gate: 'G4', status: 'FAIL', message: 'supabase/migrations/ not found' });
  console.log('❌ FAIL: supabase/migrations/ directory not found');
}

// ─────────────────────────────────────────────────────────────────
// G5: No active debug endpoints
// ─────────────────────────────────────────────────────────────────
console.log('\n[G5] No debug endpoints...');
const debugRoutes: string[] = [];
ROOT_APPS.forEach(app => {
  const apiDir = path.join(ROOT, 'apps', app, 'src/app/api');
  const altApiDir = path.join(ROOT, 'apps', app, 'app/api'); // stokis pakai app/ bukan src/app/
  [apiDir, altApiDir].forEach(dir => {
    if (fs.existsSync(path.join(dir, 'debug'))) {
      debugRoutes.push(`${app}/api/debug`);
    }
    if (fs.existsSync(path.join(dir, 'test'))) {
      debugRoutes.push(`${app}/api/test`);
    }
  });
});

if (debugRoutes.length === 0) {
  results.push({ gate: 'G5', status: 'PASS', message: 'No debug/test endpoints found' });
  console.log('✅ PASS: No active debug endpoints');
} else {
  results.push({ gate: 'G5', status: 'FAIL', message: `Active debug routes: ${debugRoutes.join(', ')}` });
  console.log(`❌ FAIL: Remove debug routes: ${debugRoutes.join(', ')}`);
}

// ─────────────────────────────────────────────────────────────────
// G6: Security headers terpasang di semua app
// ─────────────────────────────────────────────────────────────────
console.log('\n[G6] Security headers check...');
const appsWithoutHeaders: string[] = [];
ROOT_APPS.forEach(app => {
  const configs = ['next.config.ts', 'next.config.js', 'next.config.mjs'];
  let hasHeaders = false;
  for (const cfg of configs) {
    const cfgPath = path.join(ROOT, 'apps', app, cfg);
    if (fs.existsSync(cfgPath)) {
      const content = fs.readFileSync(cfgPath, 'utf-8');
      if (content.includes('X-Frame-Options') || content.includes('Content-Security-Policy')) {
        hasHeaders = true;
        break;
      }
    }
  }
  if (!hasHeaders) appsWithoutHeaders.push(app);
});

if (appsWithoutHeaders.length === 0) {
  results.push({ gate: 'G6', status: 'PASS', message: 'Security headers configured in all apps' });
  console.log('✅ PASS: Security headers present in all apps');
} else {
  results.push({ gate: 'G6', status: 'FAIL', message: `Missing security headers: ${appsWithoutHeaders.join(', ')}` });
  console.log(`❌ FAIL: Add security headers to: ${appsWithoutHeaders.join(', ')}`);
}

// ─────────────────────────────────────────────────────────────────
// G7: Env resources (Supabase required; Upstash noted)
// ─────────────────────────────────────────────────────────────────
console.log('\n[G7] Resource tier confirmation...');
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const hasSupabase = envContent.includes('SUPABASE_URL=') && !envContent.includes('SUPABASE_URL=https://xxxxx');
  const hasUpstash = envContent.includes('UPSTASH_REDIS_REST_URL=') &&
    !envContent.includes('UPSTASH_REDIS_REST_URL=https://xxx');

  if (hasSupabase && hasUpstash) {
    results.push({ gate: 'G7', status: 'PASS', message: 'Supabase + Upstash configured' });
    console.log('✅ PASS: Supabase + Upstash configured in .env');
  } else if (hasSupabase) {
    results.push({ gate: 'G7', status: 'PENDING', message: 'Supabase OK; UPSTASH_REDIS_REST_URL belum diisi (wajib production)' });
    console.log('⏳ PENDING: Supabase OK — tambahkan UPSTASH_REDIS_REST_URL sebelum production');
  } else {
    results.push({ gate: 'G7', status: 'FAIL', message: 'SUPABASE_URL belum diisi di .env' });
    console.log('❌ FAIL: Isi SUPABASE_URL di .env');
  }
} else {
  results.push({ gate: 'G7', status: 'FAIL', message: '.env not found — cp .env.example .env' });
  console.log('❌ FAIL: .env tidak ditemukan — salin dari .env.example');
}

// ─────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60));
console.log('\n📊 GATING SUMMARY\n');

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;

results.forEach(r => {
  const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏳';
  console.log(`${icon} ${r.gate} (${r.status}): ${r.message}`);
});

console.log(`\nTotal: ${passed}/${results.length} gates pass`);
console.log(`Blockers: ${failed > 0 ? results.filter(r => r.status === 'FAIL').map(r => r.gate).join(', ') : 'None'}`);
console.log('\n');

process.exit(failed > 0 ? 1 : 0);
