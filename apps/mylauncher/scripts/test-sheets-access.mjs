#!/usr/bin/env node
/**
 * Tes mandiri akses Google Sheets API pakai kredensial dari .env.local
 * Jalankan: node scripts/test-sheets-access.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

// Parse .env.local manual (tanpa dotenv dependency)
const envText = fs.readFileSync(envPath, "utf8");
for (const line of envText.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  if (!(key in process.env)) process.env[key] = val;
}

const SPREADSHEET_ID = process.env.REGISTRY_SPREADSHEET_ID;
const SA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SA_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

console.log("=== Konfigurasi terdeteksi ===");
console.log("Spreadsheet ID :", SPREADSHEET_ID);
console.log("Service Account:", SA_EMAIL);
console.log("Private key ada :", SA_KEY ? "YA" : "TIDAK");
console.log("Panjang key     :", SA_KEY?.length ?? 0);
console.log("");

if (!SPREADSHEET_ID || !SA_EMAIL || !SA_KEY) {
  console.error("ENV tidak lengkap, hentikan.");
  process.exit(1);
}

// Import googleapis dinamis agar tidak crash kalau dependency belum ada
let google;
try {
  ({ google } = await import("googleapis"));
} catch (e) {
  console.error("Gagal import googleapis:", e.message);
  console.error("Coba jalankan: pnpm install di apps/mylauncher");
  process.exit(1);
}

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

console.log("=== Membuat auth client ===");
let auth, sheets;
try {
  auth = new google.auth.GoogleAuth({
    credentials: { client_email: SA_EMAIL, private_key: SA_KEY },
    scopes: SCOPES,
  });
  sheets = google.sheets({ version: "v4", auth });
  console.log("Auth client OK\n");
} catch (e) {
  console.error("Gagal membuat auth client (kemungkinan format private key bermasalah):");
  console.error(e.message);
  process.exit(1);
}

console.log("=== Tes 1: spreadsheets.get (baca metadata) ===");
try {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  console.log("HASIL: SUKSES ✅");
  console.log("Judul spreadsheet :", meta.data.properties?.title);
  console.log("Jumlah sheet/tab :", meta.data.sheets?.length);
  console.log("Daftar tab:");
  for (const s of meta.data.sheets || []) {
    console.log("  -", s.properties?.title);
  }
} catch (e) {
  console.log("HASIL: GAGAL ❌");
  console.error("Status :", e.response?.status ?? e.code);
  console.error("Pesan  :", e.message);
  if (e.response?.data?.error) {
    console.error("Detail :", JSON.stringify(e.response.data.error, null, 2));
  }
}

console.log("\n=== Tes 2: values.get (baca isi tab pertama) ===");
try {
  const first = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const tabName = first.data.sheets?.[0]?.properties?.title;
  if (!tabName) {
    console.log("Tidak ada tab, lewati.");
  } else {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A1:Z5`,
    });
    console.log("HASIL: SUKSES ✅ (tab:", tabName + ")");
    console.log("Isi 5 baris pertama:", JSON.stringify(res.data.values || [], null, 2));
  }
} catch (e) {
  console.log("HASIL: GAGAL ❌");
  console.error("Status :", e.response?.status ?? e.code);
  console.error("Pesan  :", e.message);
}
