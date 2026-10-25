// Diagnostic: cek data nyata di Google Sheets untuk dashboard.
// Meniru getDashboardHarian / getDashboardMingguan (lib/domain/dashboard-service.ts).
import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';

function loadEnv(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const env = {};
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    let key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = loadEnv(path.join(process.cwd(), '.env.local'));
const registryId = env.REGISTRY_SPREADSHEET_ID;
const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

async function read(sheetId, range) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  const values = res.data.values || [];
  if (values.length === 0) return { headers: [], rows: [] };
  const headers = values[0].map((h) => String(h).trim());
  const rows = values.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));
  return { headers, rows };
}

function toObjects(headers, rows) {
  return rows.map((row) => {
    const o = {};
    headers.forEach((h, i) => { o[h] = row[i]; });
    return o;
  });
}

// formatDate port dari lib/domain/ids.ts
function serialToDate(serial) {
  const ms = Math.round((serial - 25569) * 86400000);
  return Number.isFinite(ms) ? ms : null;
}
function fmtFromDate(ms) {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function formatDate(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'number' && Number.isFinite(v)) return fmtFromDate(serialToDate(v));
  const s = String(v).trim();
  if (/^\d{5,6}$/.test(s)) return fmtFromDate(serialToDate(Number(s)));
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(v);
  return fmtFromDate(d.getTime());
}

function calcStatus(total, threshold) {
  const t = Number(threshold) || 0;
  if (t === null || t === undefined || Number.isNaN(t) || t < 0) return 'Tidak Dipantau';
  if (total <= t) return 'Kritis';
  if (t > 0 && total <= t * 2) return 'Hampir Habis';
  return 'Aman';
}

async function main() {
  console.log('REGISTRY_SPREADSHEET_ID:', registryId ? 'SET' : 'MISSING');
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    console.log('Service account env MISSING');
    return;
  }
  console.log('SA email:', env.GOOGLE_SERVICE_ACCOUNT_EMAIL);

  let cabangRows;
  try {
    const reg = await read(registryId, 'Daftar_Cabang');
    cabangRows = toObjects(reg.headers, reg.rows);
    console.log('\n[HASIL READ Registry Daftar_Cabang]');
    console.log('  headers:', reg.headers.join(', '));
    console.log('  jumlah baris data:', reg.rows.length);
    console.log('  baris:', cabangRows.map((r) => ({
      Cabang_ID: r.Cabang_ID,
      Nama: r.Nama_Cabang,
      Aktif: r.Aktif,
      Spreadsheet_ID: r.Spreadsheet_ID ? String(r.Spreadsheet_ID).slice(0, 8) + '...' : null,
    })));
  } catch (e) {
    console.log('\n[ERROR] Gagal baca Registry Daftar_Cabang:', e.message);
    return;
  }

  const aktif = cabangRows.filter((r) => ['true', 'TRUE', 'True', true].includes(r.Aktif));
  for (const cb of aktif) {
    const sheetId = String(cb.Spreadsheet_ID || '').trim();
    console.log(`\n========== CABANG: ${cb.Cabang_ID} (${cb.Nama_Cabang}) → spreadsheet ${sheetId ? sheetId.slice(0, 10) + '...' : 'KOSONG'} ==========`);
    if (!sheetId) continue;
    try {
      const so = await read(sheetId, 'SO_Transaksi');
      const master = await read(sheetId, 'Master_Item');
      console.log('\n  [SO_Transaksi] headers:', so.headers.join(', '));
      console.log('  [SO_Transaksi] jumlah baris data:', so.rows.length);
      const soObjs = toObjects(so.headers, so.rows);
      if (soObjs.length > 0) {
        console.log('  contoh baris SO[0]:', JSON.stringify(Object.fromEntries(Object.entries(soObjs[0]).map(([k, v]) => [k, String(v).slice(0, 30)])), null, 0));
      }
      console.log('\n  [Master_Item] headers:', master.headers.join(', '));
      console.log('  [Master_Item] jumlah baris data:', master.rows.length);
      const masterObjs = toObjects(master.headers, master.rows);
      if (masterObjs.length > 0) {
        const m0 = masterObjs[0];
        console.log('  contoh baris Master[0]: Item_ID=%s Threshold=%s Tipe_Input=%s Aktif=%s',
          m0.Item_ID, m0.Threshold, m0.Tipe_Input, m0.Aktif);
      }

      const masterMap = {};
      masterObjs.forEach((m) => { masterMap[String(m.Item_ID)] = m; });

      const byDate = {};
      const fmtUnknown = {};
      for (const r of soObjs) {
        const raw = r.Tanggal_Operasional;
        const f = formatDate(raw);
        if (!f) {
          const k = String(raw);
          fmtUnknown[k] = (fmtUnknown[k] || 0) + 1;
          continue;
        }
        if (!byDate[f]) byDate[f] = [];
        byDate[f].push(r);
      }
      console.log('\n  [Distribusi Tanggal_Operasional (formatDate)]');
      const dates = Object.keys(byDate).sort();
      if (dates.length === 0) console.log('   (tidak ada tanggal yang terformat — data kosong / format aneh)');
      for (const d of dates.reverse()) {
        const rows = byDate[d];
        const statuses = { Kritis: 0, 'Hampir Habis': 0, Aman: 0, 'Tidak Dipantau': 0, total: 0 };
        for (const r of rows) {
          const master = masterMap[String(r.Item_ID)] || {};
          const step1 = Number(r.Step1) || 0;
          const step2 = Number(r.Step2) || 0;
          const total = Number(r.Total) || (step1 + step2);
          const st = calcStatus(total, master.Threshold);
          statuses.total++;
          if (st === 'Kritis') statuses.Kritis++;
          else if (st === 'Hampir Habis') statuses['Hampir Habis']++;
          else if (st === 'Aman') statuses.Aman++;
          else statuses['Tidak Dipantau']++;
        }
        console.log(`   ${d}: rows=${rows.length} → Kritis=${statuses.Kritis} HampirHabis=${statuses['Hampir Habis']} Aman=${statuses.Aman} TidakDipantau=${statuses['Tidak Dipantau']}`);
      }
      if (Object.keys(fmtUnknown).length > 0) {
        console.log('\n  [Tanggal tidak terformat?]:', JSON.stringify(fmtUnknown));
      }

      // Eventual mismatch: cek apakah SO berisi Kolom Status langsung
      const hasStatusCol = so.headers.includes('Status');
      console.log('\n  [Info] kolom Status ada di SO_Transaksi?', hasStatusCol);
      const hasThresholdCol = so.headers.includes('Threshold');
      console.log('  [Info] kolom Threshold ada di SO_Transaksi?', hasThresholdCol);
    } catch (e) {
      console.log('\n  [ERROR] gagal baca spreadsheet cabang:', e.message);
    }
  }
  console.log('\nSELESAI');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });