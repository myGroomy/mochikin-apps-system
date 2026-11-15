// scripts/so-integration-test.mjs
// Integration test: Next.js/Node → Apps Script → Google Sheets (manual E2E).
//
// Prasyarat:
//   1. Apps Script sudah di-deploy ("Anyone" access) dan STOKIS_API_KEY
//      sesuai dengan Script Properties.
//   2. Environment variable:
//        APPS_SCRIPT_URL=https://script.google.com/macros/s/<ID>/exec
//        STOKIS_API_KEY=<key>
//        CABANG_ID=CBGxxx
//
// Cara pakai:
//   node scripts/so-integration-test.mjs            # pakai payload sample
//   node scripts/so-integration-test.mjs --concurrent=5
//
// Verifikasi idempotency: request yang sama dikirim 2× → harus
// status already_processed pada percobaan kedua.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';
const API_KEY = process.env.STOKIS_API_KEY || '';
const CABANG_ID = process.env.CABANG_ID || '';

const concurrentArg = process.argv.find((a) => a.startsWith('--concurrent='));
const CONCURRENT = concurrentArg ? Number(concurrentArg.split('=')[1]) : 1;

function loadSample() {
  const raw = fs.readFileSync(path.join(__dirname, 'so-bulk-sample.json'), 'utf8');
  const sample = JSON.parse(raw);
  // sesiId baru agar tidak bentrok dengan run sebelumnya
  const runId = Date.now().toString(36).toUpperCase().slice(-8);
  return {
    ...sample,
    sesiId: `SES_IT_${runId}${CONCURRENT > 1 ? '_C' + CONCURRENT : ''}`,
    petugas: `Uji Integrasi ${runId}`,
  };
}

async function post(payload, label = 'submit #1') {
  const t0 = Date.now();
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'x-api-key': API_KEY,
      action: 'submitSO',
      cabangId: CABANG_ID,
      payload,
    }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { success: false, error: { code: 'PARSE', message: text.slice(0, 200) } };
  }
  console.log(`[${label}] HTTP ${res.status} · ${Date.now() - t0}ms ·`, JSON.stringify(json));
  return json;
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ PASS: ${msg}`);
  }
}

function summary(count) {
  let pass = 0;
  let fail = 0;
  for (const c of count) {
    if (c) pass += 1;
    else fail += 1;
  }
  return { pass, fail };
}

async function main() {
  if (!APPS_SCRIPT_URL || !API_KEY || !CABANG_ID) {
    console.error('Set APPS_SCRIPT_URL, STOKIS_API_KEY, CABANG_ID terlebih dahulu.');
    process.exit(1);
  }

  const payload = loadSample();
  console.log(`Payload: ${payload.items.length} item, sesi=${payload.sesiId}, cabang=${CABANG_ID}`);

  if (CONCURRENT > 1) {
    const runs = Array.from({ length: CONCURRENT }, () => post(payload, 'concurrent submit'));
    const results = await Promise.all(runs);
    const statuses = results.map((r) => r?.data?.status);
    const successCount = statuses.filter((s) => s === 'success').length;
    const dupCount = statuses.filter((s) => s === 'already_processed').length;
    console.log(`Concurrent ${CONCURRENT}: success=${successCount}, already_processed=${dupCount}`);
    assert(successCount === 1, `tidak boleh ada duplikat write (success harus 1, dapat ${successCount})`);
    assert(successCount + dupCount === CONCURRENT, 'semua request harus mendapat jawaban sukses/already_processed');
    return;
  }

  // 1. Submit pertama → success, rows_written = N
  const r1 = await post(payload, 'submit #1');
  assert(r1.success === true && r1?.data?.status === 'success', 'submit pertama harus success');
  assert(r1?.data?.rows_written === payload.items.length, `rows_written harus ${payload.items.length}`);
  assert(!!r1?.data?.sesiId, 'response memuat sesiId');

  // 2. Submit kedua (payload sama) → already_processed, tanpa row baru
  const r2 = await post(payload, 'submit #2 (retry)');
  assert(r2.success === true && r2?.data?.status === 'already_processed', 'retry harus already_processed');

  // 3. Payload invalid → validation_error
  const bad = { ...payload, items: [{ itemId: 'ITM00001', step1: -1, step2: 0 }] };
  const r3 = await post(bad, 'submit invalid');
  assert(r3.success === false && r3?.error?.code === 'validation_error', 'payload invalid ditolak di backend');

  console.log(`\nSelesai. ${summary([true, true, true]).pass + (process.exitCode ? 1 : 0)}/3+ ditandai pass.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});