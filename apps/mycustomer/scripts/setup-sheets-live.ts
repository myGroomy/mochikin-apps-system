// apps/mycustomer/scripts/setup-sheets-live.ts
// Script untuk menginisialisasi spreadsheet MyCustomer di Google Drive (10 tab + seed cabang & user).
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

if (!email || !key || !spreadsheetId) {
  console.error('Missing Google Service Account credentials or GOOGLE_SPREADSHEET_ID');
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: email, private_key: key },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const TABS = [
  {
    name: 'customers',
    headers: [
      'id', 'phone_normalized', 'name', 'phone_raw', 'aliases', 'gender',
      'age_range', 'notes', 'first_order_date', 'last_order_date', 'total_orders',
      'branch_memberships', 'is_active', 'is_followed_up', 'created_at',
      'updated_at', 'followed_up_at'
    ],
    rows: []
  },
  {
    name: 'orders',
    headers: [
      'id', 'customer_id', 'order_date', 'channel', 'raw_phone_input', 'created_at',
      'branch', 'is_followed_up', 'followed_up_at'
    ],
    rows: []
  },
  {
    name: 'branches',
    headers: ['id', 'code', 'name', 'created_at', 'address', 'is_active'],
    rows: [
      ['00000000-0000-0000-0000-000000000101', 'CMH', 'Mochikin Cimahi', '2026-01-01', 'Jl. Ria No. 6, Cimahi', 'TRUE'],
      ['00000000-0000-0000-0000-000000000102', 'BDG', 'Mochikin Bandung (Setiabudi)', '2026-01-01', 'Jl. Dr. Setiabudi No. 88, Bandung', 'TRUE'],
      ['00000000-0000-0000-0000-000000000103', 'BKS', 'Mochikin Bekasi', '2026-01-01', 'Jl. Ahmad Yani No. 45, Bekasi Timur', 'TRUE']
    ]
  },
  {
    name: 'users',
    headers: ['id', 'username', 'display_name', 'pin', 'role', 'created_at', 'branch', 'active', 'status'],
    rows: [
      ['00000000-0000-0000-0000-000000000201', 'admin', 'Admin Mochikin Pusat', '1234', 'owner', '2026-01-01', 'BDG', 'TRUE', 'active'],
      ['00000000-0000-0000-0000-000000000202', 'dea', 'Dea (Operational Admin)', '1234', 'admin', '2026-01-01', 'BDG', 'TRUE', 'active'],
      ['00000000-0000-0000-0000-000000000203', 'candra', 'Candra', '1234', 'admin', '2026-01-01', 'BDG', 'TRUE', 'active'],
      ['00000000-0000-0000-0000-000000000204', 'budi', 'Budi', '1234', 'kasir', '2026-01-01', 'BDG', 'TRUE', 'active'],
      ['00000000-0000-0000-0000-000000000205', 'prita', 'Prita', '1234', 'admin', '2026-01-01', 'CMH', 'TRUE', 'active'],
      ['00000000-0000-0000-0000-000000000206', 'nurul', 'Nurul Hilma', '1234', 'kasir', '2026-01-01', 'CMH', 'TRUE', 'active'],
      ['00000000-0000-0000-0000-000000000207', 'sabat', 'Sabat', '1234', 'admin', '2026-01-01', 'BKS', 'TRUE', 'active'],
      ['00000000-0000-0000-0000-000000000208', 'dimas', 'Dimas', '1234', 'kasir', '2026-01-01', 'BKS', 'TRUE', 'active']
    ]
  },
  {
    name: 'customer_branches',
    headers: [
      'id', 'customer_id', 'branch', 'first_order_date', 'last_order_date',
      'order_count', 'local_name', 'notes', 'created_at'
    ],
    rows: []
  },
  {
    name: 'settings',
    headers: ['key', 'value'],
    rows: [
      ['loyaltyMinOrder', '5'],
      ['waSenderNumber', '6281234567890'],
      ['cronAutoSync', 'TRUE'],
      ['waTemplate', 'Halo {nama}, terima kasih sudah order di Mochikin {cabang}!']
    ]
  },
  {
    name: 'staging_cmh',
    headers: ['tanggal', 'nama', 'tipe_order', 'no_telp', 'status'],
    rows: []
  },
  {
    name: 'staging_bdg',
    headers: ['tanggal', 'nama', 'tipe_order', 'no_telp', 'status'],
    rows: []
  },
  {
    name: 'staging_bks',
    headers: ['tanggal', 'nama', 'tipe_order', 'no_telp', 'status'],
    rows: []
  },
  {
    name: 'import_customers',
    headers: ['Nama', 'No WhatsApp', 'Cabang', 'Gender', 'Rentang Usia', 'Tanggal Order Pertama', 'Catatan'],
    rows: []
  },
  {
    name: 'import_orders',
    headers: ['No WhatsApp', 'Nama', 'Tanggal Order', 'Channel', 'Cabang'],
    rows: []
  }
];

async function setup() {
  console.log(`Connecting to spreadsheet: ${spreadsheetId}...`);
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = meta.data.sheets || [];
  const existingTitles = new Set(existingSheets.map((s) => s.properties?.title));
  console.log('Existing sheets:', Array.from(existingTitles));

  // 1. Create missing sheets
  const requests: any[] = [];
  for (const tab of TABS) {
    if (!existingTitles.has(tab.name)) {
      requests.push({
        addSheet: {
          properties: {
            title: tab.name,
            gridProperties: { rowCount: 100, columnCount: Math.max(tab.headers.length + 2, 10) }
          }
        }
      });
    }
  }

  if (requests.length > 0) {
    console.log(`Adding ${requests.length} new sheets...`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });
    console.log('Sheets added successfully.');
  }

  // 2. Populate headers & seed data
  const dataPayload: any[] = [];
  for (const tab of TABS) {
    const values = [tab.headers, ...tab.rows];
    dataPayload.push({
      range: `${tab.name}!A1`,
      values
    });
  }

  console.log('Writing headers and seed rows for all tabs...');
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: dataPayload
    }
  });
  console.log('Data populated successfully.');

  // 3. Format header row (bold & background color) & freeze row 1
  const updatedMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const formatRequests: any[] = [];

  for (const sheetObj of updatedMeta.data.sheets || []) {
    const sheetId = sheetObj.properties?.sheetId;
    const title = sheetObj.properties?.title;
    if (title === 'Sheet1') continue;

    // Freeze row 1
    formatRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 1 }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    });

    // Style row 1
    formatRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.08, green: 0.18, blue: 0.35 }, // dark navy
            textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });
  }

  // Delete 'Sheet1' if other sheets now exist
  const sheet1 = updatedMeta.data.sheets?.find((s) => s.properties?.title === 'Sheet1');
  if (sheet1 && (updatedMeta.data.sheets?.length || 0) > 1) {
    console.log('Removing default Sheet1...');
    formatRequests.push({
      deleteSheet: { sheetId: sheet1.properties?.sheetId }
    });
  }

  if (formatRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: formatRequests }
    });
    console.log('Formatting and cleanup applied.');
  }

  console.log('🎉 Setup MyCustomer Spreadsheet Sukses!');
}

setup().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
