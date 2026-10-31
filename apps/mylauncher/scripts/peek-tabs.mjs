#!/usr/bin/env node
/* Lihat isi tab Apps di registry sheet */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envText = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf8");
for (const line of envText.split("\n")) {
  const t = line.trim(); if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("="); if (eq === -1) continue;
  const k = t.slice(0, eq).trim(); let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}
const { google } = await import("googleapis");
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const id = process.env.REGISTRY_SPREADSHEET_ID;
for (const tab of ["Apps", "Permissions", "Roles"]) {
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: `${tab}!A1:Z50` });
    console.log(`\n=== Tab: ${tab} ===`);
    console.log(JSON.stringify(res.data.values || [], null, 2));
  } catch (e) {
    console.log(`\n=== Tab: ${tab} === GAGAL: ${e.message}`);
  }
}
