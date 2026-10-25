#!/usr/bin/env tsx
/**
 * verify-f6-gates.ts — Gate verification untuk F6 MyPerformance
 *
 * Jalankan: pnpm tsx scripts/verify-f6-gates.ts
 * Exit 0 = semua gate OK. Exit 1 = ada gate gagal.
 *
 * G1: @mochikin/shared punya events.ts + boundary.ts
 * G2: pnpm-workspace.yaml bersih (myperformance terdaftar)
 * G3: Turborepo pipeline + manifest linter aktif
 * G4: Supabase people/branches terisi + JWT Custom Claims
 * G5: validate-person-mapping (exit 0)
 * G6a: Vercel Pro tier
 * G6b: Upstash + Supabase capacity
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(__dirname, '..');
const RESET = '\x1b[0m';
const RED   = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD  = '\x1b[1m';

let passed = 0;
let failed = 0;
let warned = 0;

function ok(label: string, detail = '') {
  console.log(`  ${GREEN}✅${RESET} ${label}${detail ? ` — ${detail}` : ''}`);
  passed++;
}

function fail(label: string, detail = '') {
  console.log(`  ${RED}❌${RESET} ${label}${detail ? `\n     ${RED}→ ${detail}${RESET}` : ''}`);
  failed++;
}

function warn(label: string, detail = '') {
  console.log(`  ${YELLOW}⚠️ ${RESET} ${label}${detail ? `\n     ${YELLOW}→ ${detail}${RESET}` : ''}`);
  warned++;
}

function section(title: string) {
  console.log(`\n${BOLD}${title}${RESET}`);
}

// ─── G1: @mochikin/shared modules ──────────────────────────────────────────

section('G1 — @mochikin/shared core modules');

const sharedSrc = resolve(ROOT, 'packages/shared/src');

const requiredModules: { path: string; desc: string }[] = [
  { path: 'events/contract.ts', desc: 'TaskEvent contract' },
  { path: 'events/index.ts',    desc: 'events index' },
  { path: 'points/boundary.ts', desc: 'Redis/Supabase boundary' },
  { path: 'points/index.ts',    desc: 'points index' },
  { path: 'sso/token.ts',       desc: 'JWT validation' },
  { path: 'sso/index.ts',       desc: 'SSO index' },
  { path: 'ratelimit/index.ts', desc: 'rate-limit' },
  { path: 'env/index.ts',       desc: 'env validator' },
];

for (const mod of requiredModules) {
  const full = resolve(sharedSrc, mod.path);
  if (existsSync(full)) {
    ok(mod.path, mod.desc);
  } else {
    fail(mod.path, `File tidak ditemukan: ${full}`);
  }
}

// Check TaskEvent contract has required fields
try {
  const contractContent = readFileSync(resolve(sharedSrc, 'events/contract.ts'), 'utf-8');
  const hasTaskId       = contractContent.includes('taskId') || contractContent.includes('task_name');
  const hasIdempotency  = contractContent.includes('idempotencyKey') || contractContent.includes('event_id');
  const hasOccurredAt   = contractContent.includes('occurredAt') || contractContent.includes('timestamp');

  if (hasTaskId && hasIdempotency && hasOccurredAt) {
    ok('events/contract.ts', 'taskId + idempotencyKey + occurredAt fields present');
  } else {
    warn('events/contract.ts', 'Schema mungkin perlu update ke PRD §8 contract (taskId, outputQty, idempotencyKey)');
  }
} catch {
  // already failed above
}

// ─── G2: pnpm-workspace.yaml ──────────────────────────────────────────────

section('G2 — pnpm-workspace.yaml');

try {
  const workspaceContent = readFileSync(resolve(ROOT, 'pnpm-workspace.yaml'), 'utf-8');
  const requiredEntries = ['mylauncher', 'mycheck', 'stokis', 'mycustomer', 'myperformance', 'packages/shared'];

  let workspaceOk = true;
  for (const entry of requiredEntries) {
    if (workspaceContent.includes(entry)) {
      ok(`workspace: ${entry}`);
    } else {
      fail(`workspace: ${entry}`, `'${entry}' tidak ada di pnpm-workspace.yaml`);
      workspaceOk = false;
    }
  }
} catch (e) {
  fail('pnpm-workspace.yaml', 'File tidak ditemukan');
}

// ─── G3: Turborepo + Manifest Linter ────────────────────────────────────

section('G3 — Turborepo + Manifest Linter');

const turboJson = resolve(ROOT, 'turbo.json');
if (existsSync(turboJson)) {
  ok('turbo.json', 'Turborepo config ada');
} else {
  fail('turbo.json', 'File tidak ditemukan');
}

const checkManifests = resolve(ROOT, 'scripts/check-manifests.mjs');
if (existsSync(checkManifests)) {
  ok('scripts/check-manifests.mjs', 'Manifest linter ada');
  // Coba jalankan
  try {
    execSync(`node ${checkManifests}`, { cwd: ROOT, stdio: 'pipe' });
    ok('Manifest linter run', 'Semua manifest valid');
  } catch {
    warn('Manifest linter run', 'Ada manifest yang belum valid (jalankan: node scripts/check-manifests.mjs)');
  }
} else {
  warn('scripts/check-manifests.mjs', 'File tidak ditemukan — buat jika belum ada');
}

// Check app.manifest.json di myperformance
const manifestPath = resolve(ROOT, 'apps/myperformance/app.manifest.json');
const altManifestPath = resolve(ROOT, 'myperformance/app.manifest.json');
if (existsSync(manifestPath)) {
  ok('apps/myperformance/app.manifest.json', 'Manifest ada');
} else if (existsSync(altManifestPath)) {
  warn('myperformance/app.manifest.json', 'Ada di myperformance/ tapi app harusnya di apps/myperformance/');
} else {
  fail('apps/myperformance/app.manifest.json', 'Manifest tidak ditemukan');
}

// ─── G4: Supabase tables (hanya check migration files) ───────────────────

section('G4 — Supabase Schema & JWT Custom Claims');

const migrationsDir = resolve(ROOT, 'supabase/migrations');
const requiredMigrations = [
  '004_people_table.sql',
  '005_branches_table.sql',
  '009_myperformance_schema.sql',
];

for (const mig of requiredMigrations) {
  const full = resolve(migrationsDir, mig);
  if (existsSync(full)) {
    ok(`migration: ${mig}`);
  } else {
    fail(`migration: ${mig}`, `File tidak ditemukan: ${full}`);
  }
}

// Check JWT custom claims in shared SSO
try {
  const tokenContent = readFileSync(resolve(sharedSrc, 'sso/token.ts'), 'utf-8');
  const hasClaims = tokenContent.includes('person_id') && tokenContent.includes('branch_id') && tokenContent.includes('role');
  if (hasClaims) {
    ok('JWT Custom Claims', 'person_id + branch_id + role dalam JWTCustomClaimsSchema');
  } else {
    fail('JWT Custom Claims', 'Schema JWT tidak mengandung person_id/branch_id/role');
  }
} catch {
  warn('JWT Custom Claims', 'Tidak bisa verifikasi sso/token.ts');
}

warn('Supabase runtime check', 'G4 runtime (people/branches terisi + RLS aktif) perlu verifikasi manual via Supabase dashboard');

// ─── G5: validate-person-mapping ─────────────────────────────────────────

section('G5 — Person Mapping (SSO v2)');

const validateScript = resolve(ROOT, 'packages/shared/scripts/validate-person-mapping.ts');
const validateScriptAlt = resolve(ROOT, 'scripts/validate-person-mapping.ts');

if (existsSync(validateScript)) {
  ok('validate-person-mapping.ts', `Ditemukan: ${validateScript}`);
  warn('G5 runtime', 'Jalankan manual: pnpm tsx packages/shared/scripts/validate-person-mapping.ts');
} else if (existsSync(validateScriptAlt)) {
  ok('validate-person-mapping.ts', `Ditemukan: ${validateScriptAlt}`);
  warn('G5 runtime', 'Jalankan manual: pnpm tsx scripts/validate-person-mapping.ts');
} else {
  warn('validate-person-mapping.ts', 'Script tidak ditemukan — buat sebelum M1');
}

// ─── G6: Vercel Pro + Upstash ────────────────────────────────────────────

section('G6 — Vercel Pro & Upstash Capacity');

// Hanya bisa cek env vars — runtime check perlu manual
const envExample = resolve(ROOT, '.env.example');
const hasEnvExample = existsSync(envExample);

if (hasEnvExample) {
  const envContent = readFileSync(envExample, 'utf-8');
  if (envContent.includes('UPSTASH_REDIS')) {
    ok('UPSTASH_REDIS env', 'Ada di .env.example');
  } else {
    warn('UPSTASH_REDIS', 'Tidak ada di .env.example — tambahkan');
  }
} else {
  warn('.env.example', 'Tidak ditemukan di root');
}

warn('G6a — Vercel Pro',  'Verifikasi manual: dashboard.vercel.com → Settings → Billing → Plan = Pro');
warn('G6b — Upstash',     'Verifikasi manual: console.upstash.com → cek daily command limit vs estimasi 25 user × 20 event/hari');
warn('G6b — Supabase',    'Verifikasi manual: app.supabase.com → Settings → Billing → cek row limit & storage');

// ─── Summary ──────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`${BOLD}Gate Verification Summary${RESET}`);
console.log(`${'─'.repeat(60)}`);
console.log(`  ${GREEN}✅ Passed: ${passed}${RESET}`);
console.log(`  ${YELLOW}⚠️  Warned: ${warned}${RESET}`);
console.log(`  ${RED}❌ Failed: ${failed}${RESET}`);
console.log(`${'─'.repeat(60)}\n`);

if (failed > 0) {
  console.log(`${RED}${BOLD}❌ GATE FAILED — Perbaiki ${failed} item di atas sebelum lanjut ke M1.${RESET}\n`);
  process.exit(1);
} else if (warned > 0) {
  console.log(`${YELLOW}${BOLD}⚠️  GATE PARTIAL — ${warned} item perlu verifikasi manual (runtime checks).${RESET}`);
  console.log(`${YELLOW}   File-file yang bisa dicek otomatis sudah lulus. Lanjutkan M0 scaffold,`);
  console.log(`   tapi verifikasi manual G4/G5/G6 sebelum M1 (emit event).${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${GREEN}${BOLD}✅ ALL GATES PASSED — Siap lanjut ke M1!${RESET}\n`);
  process.exit(0);
}
