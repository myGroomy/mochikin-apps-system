// apps/stokis/scripts/provision-bekasi-live.ts
// Provision cabang Bekasi di Stokis: clone template spreadsheet, buat folder PDF, daftarkan ke Registry.
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
const registryId = process.env.REGISTRY_SPREADSHEET_ID;
const parentFolderId = process.env.FOLDER_DRIVE_INDUK;

if (!email || !key || !registryId || !parentFolderId) {
  console.error('Missing required environment variables in apps/stokis/.env.local');
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: email, private_key: key },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
});

const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

async function main() {
  console.log('1. Checking existing branches in STOKIS_REGISTRY...');
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: registryId,
    range: 'Daftar_Cabang!A1:I20',
  });
  const rows = res.data.values || [];
  const bekasiExists = rows.some((r) => r[0] === 'CBG03BKS' || String(r[1]).toLowerCase().includes('bekasi'));

  if (bekasiExists) {
    console.log('Cabang Bekasi sudah terdaftar di Stokis Registry.');
    return;
  }

  // Find template spreadsheet ID from Template_Referensi
  console.log('2. Reading template ID from Template_Referensi...');
  const refRes = await sheets.spreadsheets.values.get({
    spreadsheetId: registryId,
    range: 'Template_Referensi!A2:A2',
  });
  const templateId = refRes.data.values?.[0]?.[0];
  if (!templateId) {
    throw new Error('Template_Spreadsheet_ID tidak ditemukan di sheet Template_Referensi');
  }
  console.log(`Template ID: ${templateId}`);

  // Create folder PDF_Bekasi
  console.log('3. Creating PDF_Bekasi folder in Drive...');
  const folderRes = await drive.files.create({
    requestBody: {
      name: 'PDF_Bekasi',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id, name',
  });
  const pdfFolderId = folderRes.data.id!;
  console.log(`PDF Folder created: ${pdfFolderId}`);

  // Clone STOKIS_TEMPLATE_CABANG to SO_Bekasi
  console.log('4. Cloning template to SO_Bekasi...');
  const copyRes = await drive.files.copy({
    fileId: templateId,
    requestBody: {
      name: 'SO_Bekasi',
      parents: [parentFolderId],
    },
    fields: 'id, name',
  });
  const soBekasiId = copyRes.data.id!;
  console.log(`SO_Bekasi spreadsheet created: ${soBekasiId}`);

  // Register in Daftar_Cabang
  console.log('5. Appending CBG03BKS to Daftar_Cabang...');
  await sheets.spreadsheets.values.append({
    spreadsheetId: registryId,
    range: 'Daftar_Cabang!A:I',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          'CBG03BKS',
          'Bekasi',
          'Jl. Ahmad Yani No. 45, Bekasi Timur',
          soBekasiId,
          pdfFolderId,
          'Sabat',
          '8123456789',
          'TRUE',
          new Date().toISOString().replace('T', ' ').substring(0, 19),
        ],
      ],
    },
  });

  // Update users branch access in Users tab
  console.log('6. Updating Users branch permissions to include CBG03BKS...');
  const usersRes = await sheets.spreadsheets.values.get({
    spreadsheetId: registryId,
    range: 'Users!A1:G20',
  });
  const userRows = usersRes.data.values || [];
  if (userRows.length > 1) {
    const updatedUserRows = userRows.map((row, idx) => {
      if (idx === 0) return row;
      const cabangCol = row[5] || '';
      if (cabangCol.includes('CBG01BDG') && !cabangCol.includes('CBG03BKS')) {
        row[5] = `${cabangCol}, CBG03BKS`;
      }
      return row;
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: registryId,
      range: `Users!A1:G${updatedUserRows.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: updatedUserRows,
      },
    });
  }

  console.log('🎉 Sukses! Cabang Bekasi (CBG03BKS) berhasil dibuat dan diregistrasikan di Stokis.');
}

main().catch((err) => {
  console.error('Provisioning failed:', err.message);
  process.exit(1);
});
