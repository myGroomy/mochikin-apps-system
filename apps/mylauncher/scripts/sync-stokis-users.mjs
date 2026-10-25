import nextEnv from "@next/env";
import { google } from "googleapis";
import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";

function loadEnvFile(path) {
  if (!path) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const separator = trimmed.indexOf("=");
    const name = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\n/g, "\n");
    }
    process.env[name] = value;
  }
}

nextEnv.loadEnvConfig(process.cwd());
loadEnvFile(process.env.STOKIS_ENV_FILE);

const spreadsheetId = process.env.REGISTRY_SPREADSHEET_ID;
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!spreadsheetId || !email || !privateKey) throw new Error("Google Sheets environment is incomplete");

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: email, private_key: privateKey },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const metadata = await sheets.spreadsheets.get({ spreadsheetId });
const sheetTitles = (metadata.data.sheets || []).map((sheet) => String(sheet.properties?.title || ""));
function resolveSheetTitle(expected) {
  const title = sheetTitles.find((candidate) => candidate.toLowerCase() === expected.toLowerCase());
  if (!title && expected === "Users" && sheetTitles.includes("Sheet1")) return "Sheet1";
  if (!title) throw new Error(`Sheet ${expected} was not found in spreadsheet ...${spreadsheetId.slice(-6)}; available sheets: ${sheetTitles.join(", ")}`);
  return title;
}
let usersSheet = sheetTitles.find((candidate) => candidate.toLowerCase() === "users");
const employeesSheet = resolveSheetTitle("Employees");

if (!usersSheet && process.env.STOKIS_SEED_DUMMY_USERS === "1") {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: "Users" } } }] },
  });
  usersSheet = "Users";
  await writeHeader(usersSheet, ["User_ID", "Username", "PIN", "Nama", "Role", "Cabang_ID", "Aktif", "Created_At"]);
}
if (!usersSheet) usersSheet = resolveSheetTitle("Users");

const EMPLOYEE_HEADERS = [
  "employee_id",
  "username",
  "name",
  "role_id",
  "status",
  "pin_hash",
  "base_branch",
  "failed_login_attempts",
  "locked_until",
];

function objects(rows) {
  const headers = rows[0] || [];
  return rows.slice(1).map((row, index) => ({
    _rowNumber: index + 2,
    ...Object.fromEntries(headers.map((header, cell) => [String(header || "").trim(), row[cell] ?? ""])),
  }));
}

function hashPin(pin) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}$${scryptSync(pin, salt, 32).toString("hex")}`;
}

function roleId(role) {
  return /admin|owner|head|manager/i.test(String(role || "")) ? "role_admin" : "role_user";
}

function active(value) {
  return ![false, "false", "FALSE", "0", 0].includes(value);
}

async function read(title) {
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${title}'!A:Z` });
  return (result.data.values || []).map((row) => row.map((cell) => String(cell ?? "")));
}

async function writeRow(title, rowNumber, values) {
  const endColumn = String.fromCharCode(64 + values.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${title}'!A${rowNumber}:${endColumn}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}

async function writeHeader(title, values) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${title}'!A1:${String.fromCharCode(64 + values.length)}1`,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}

let source = objects(await read(usersSheet));
if (source.length === 0 && process.env.STOKIS_SEED_DUMMY_USERS === "1") {
  const createdAt = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${usersSheet}'!A:Z`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        ["USR_ADMIN", "admin", "1234", "Admin User", "admin", "branch_cibiru", true, createdAt],
        ["USR_CREW", "crew", "1234", "Regular User", "petugas", "branch_antapani", true, createdAt],
        ["USR_VIEWER", "viewer", "1234", "Read Only", "petugas", "branch_cimahi", true, createdAt],
      ],
    },
  });
  source = objects(await read(usersSheet));
}
const employeeRows = await read(employeesSheet);
if (!employeeRows.length) {
  await writeRow(employeesSheet, 1, EMPLOYEE_HEADERS);
}
if ((employeeRows[0] || []).map(String).indexOf("username") < 0 && employeeRows.length) {
  await writeRow(employeesSheet, 1, EMPLOYEE_HEADERS);
  for (let index = 1; index < employeeRows.length; index += 1) {
    const row = employeeRows[index] || [];
    if (row.every((cell) => !String(cell).trim())) continue;
    await writeRow(employeesSheet, index + 1, [row[0] || "", "", ...row.slice(1)]);
  }
}

const currentRows = objects(await read(employeesSheet));
const byUsername = new Map(currentRows.map((row) => [String(row.username).trim().toLowerCase(), row]));
const byEmployeeId = new Map(currentRows.map((row) => [String(row.employee_id).trim(), row]));
let created = 0;
let updated = 0;
let skipped = 0;

for (const user of source) {
  const username = String(user.Username || "").trim().toLowerCase();
  if (!username) {
    skipped += 1;
    continue;
  }
  const employeeId = String(user.User_ID || `stokis_${username}`).trim();
  const existing = byUsername.get(username) || byEmployeeId.get(employeeId);
  const pinHash = user.PIN ? hashPin(String(user.PIN)) : existing?.pin_hash || "";
  const row = [
    existing?.employee_id || employeeId,
    username,
    String(user.Nama || existing?.name || username),
    roleId(user.Role),
    active(user.Aktif) ? "ACTIVE" : "INACTIVE",
    pinHash,
    String(user.Cabang_ID || existing?.base_branch || ""),
    existing?.failed_login_attempts || "0",
    existing?.locked_until || "",
  ];
  if (existing) {
    await writeRow(employeesSheet, existing._rowNumber, row);
    updated += 1;
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${employeesSheet}'!A:Z`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
    created += 1;
  }
}

console.log(JSON.stringify({ sourceUsers: source.length, created, updated, skipped }));
