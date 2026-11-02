import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

function styleHeaderRow(row: ExcelJS.Row, fillColor = '1F2937', fontColor = 'FFFFFF') {
  row.font = { name: 'Arial', size: 10, bold: true, color: { argb: fontColor } };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
  row.height = 28;
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillColor },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: '374151' } },
      left: { style: 'thin', color: { argb: '374151' } },
      bottom: { style: 'medium', color: { argb: '111827' } },
      right: { style: 'thin', color: { argb: '374151' } },
    };
  });
}

function autoFitColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((col) => {
    let maxLength = 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLength) maxLength = Math.min(val.length + 3, 40);
    });
    col.width = maxLength;
  });
}

async function generateBranchTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MOCHIKIN-APPS (Stokis)';
  wb.created = new Date();

  // 1. Master_Item
  const wsMaster = wb.addWorksheet('Master_Item', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsMaster.addRow([
    'Item_ID', 'Nama_Barang', 'Area', 'Satuan',
    'Konversi_Isi', 'Konversi_Keterangan', 'Threshold', 'Aktif',
    'Tanggal_Dibuat', 'Tipe_Input', 'Keterangan'
  ]);
  styleHeaderRow(wsMaster.getRow(1), '1E3A8A'); // Navy Blue

  // Sample items
  const sampleItems = [
    ['ITM-001', 'Ayam Potong Marinasi', 'Freezer Ayam dan Alat', 'Pack', 1, '1 pack = 10 potong', 10, 'TRUE', '2026-01-01', 'dual', 'Bahan baku utama'],
    ['ITM-002', 'Beras Pulen 25kg', 'Meja Biru Depan', 'Karung', 1, 'Karung 25kg', 2, 'TRUE', '2026-01-01', 'single', 'Stok beras'],
    ['ITM-003', 'Minyak Goreng 2L', 'Gas dan Utilitas', 'Pouch', 1, 'Pouch 2 liter', 6, 'TRUE', '2026-01-01', 'single', 'Minyak goreng'],
    ['ITM-004', 'Saus Sambal 1kg', 'Chiller', 'Bungkus', 1, 'Refill 1kg', 4, 'TRUE', '2026-01-01', 'dual', 'Saus pelengkap'],
    ['ITM-005', 'Gas Elpiji 12kg', 'Gas dan Utilitas', 'Tabung', 1, 'Tabung 12kg', 2, 'TRUE', '2026-01-01', 'single', 'Utilitas dapur'],
  ];
  sampleItems.forEach(row => wsMaster.addRow(row));
  autoFitColumns(wsMaster);

  // 2. SO_Transaksi
  const wsSO = wb.addWorksheet('SO_Transaksi', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsSO.addRow([
    'Transaksi_ID', 'Timestamp', 'Tanggal_Operasional', 'Shift',
    'Item_ID', 'Nama_Barang', 'Area', 'Step1', 'Step2', 'Total',
    'Petugas', 'Sesi_ID', 'Keterangan', 'Status_Isi', 'Tgl_Refill', 'Tgl_Pakai', 'Note'
  ]);
  styleHeaderRow(wsSO.getRow(1), '1E3A8A');
  autoFitColumns(wsSO);

  // 3. Laporan_PDF
  const wsLaporan = wb.addWorksheet('Laporan_PDF', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsLaporan.addRow([
    'Laporan_ID', 'Sesi_ID', 'Tanggal_Operasional', 'Shift',
    'Petugas', 'Waktu_Dibuat', 'Link_PDF', 'Jumlah_Kritis',
    'Jumlah_Hampir_Habis', 'Status_Kirim_WA'
  ]);
  styleHeaderRow(wsLaporan.getRow(1), '1E3A8A');
  autoFitColumns(wsLaporan);

  // 4. Petugas
  const wsPetugas = wb.addWorksheet('Petugas', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsPetugas.addRow(['Petugas_ID', 'Nama', 'Nomor_WA', 'Aktif']);
  styleHeaderRow(wsPetugas.getRow(1), '1E3A8A');
  wsPetugas.addRow(['PTG-001', 'Staff Gudang', '6281234567890', 'TRUE']);
  autoFitColumns(wsPetugas);

  // 5. Settings
  const wsSettings = wb.addWorksheet('Settings', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsSettings.addRow(['Key', 'Value']);
  styleHeaderRow(wsSettings.getRow(1), '1E3A8A');
  wsSettings.addRow(['Daftar_Shift', 'Opening, Closing']);
  wsSettings.addRow(['Kelipatan_Threshold_Hampir_Habis', 2]);
  wsSettings.addRow(['Urutan_Laporan', 'Urutan_Input']);
  wsSettings.addRow(['Daftar_Area', 'Meja Biru Depan, Chiller, Freezer Ayam dan Alat, Barang Alat dan Kebersihan, Meja Laci, Gas dan Utilitas']);
  autoFitColumns(wsSettings);

  const dest = path.join(TEMPLATES_DIR, 'stokis-template-cabang.xlsx');
  await wb.xlsx.writeFile(dest);
  console.log(`✅ Berhasil membuat: ${dest}`);
}

async function generateRegistryTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MOCHIKIN-APPS (Stokis Registry)';
  wb.created = new Date();

  // 1. Daftar_Cabang
  const wsCabang = wb.addWorksheet('Daftar_Cabang', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsCabang.addRow([
    'Cabang_ID', 'Nama_Cabang', 'Alamat', 'Spreadsheet_ID',
    'Folder_Drive_ID', 'PIC_Nama', 'Nomor_WA_Cabang', 'Aktif', 'Tanggal_Dibuat'
  ]);
  styleHeaderRow(wsCabang.getRow(1), '065F46'); // Emerald Green
  wsCabang.addRow([
    'CAB-001', 'Cabang Bandung Utama', 'Jl. Braga No. 10, Bandung',
    '', '', 'Candra', '6281234567890', 'TRUE', '2026-01-01'
  ]);
  autoFitColumns(wsCabang);

  // 2. Template_Referensi
  const wsRef = wb.addWorksheet('Template_Referensi', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsRef.addRow(['Template_Spreadsheet_ID', 'Template_Versi', 'Terakhir_Diperbarui']);
  styleHeaderRow(wsRef.getRow(1), '065F46');
  wsRef.addRow(['ID_SPREADSHEET_TEMPLATE_CABANG_DISINI', 'v1', '2026-01-01']);
  autoFitColumns(wsRef);

  // 3. Settings_Global
  const wsGlobal = wb.addWorksheet('Settings_Global', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsGlobal.addRow(['Key', 'Value']);
  styleHeaderRow(wsGlobal.getRow(1), '065F46');
  wsGlobal.addRow(['Nama_Perusahaan', 'PT Mochikin Sukses Selaras']);
  wsGlobal.addRow(['Versi_Sistem', '1.0.0']);
  autoFitColumns(wsGlobal);

  // 4. Users
  const wsUsers = wb.addWorksheet('Users', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsUsers.addRow(['User_ID', 'Username', 'PIN', 'Role', 'Cabang_Akses', 'Aktif']);
  styleHeaderRow(wsUsers.getRow(1), '065F46');
  wsUsers.addRow(['USR-001', 'admin', '1234', 'admin', '*', 'TRUE']);
  wsUsers.addRow(['USR-002', 'petugas1', '1234', 'petugas', 'CAB-001', 'TRUE']);
  autoFitColumns(wsUsers);

  const dest = path.join(TEMPLATES_DIR, 'stokis-registry.xlsx');
  await wb.xlsx.writeFile(dest);
  console.log(`✅ Berhasil membuat: ${dest}`);
}

async function main() {
  await generateBranchTemplate();
  await generateRegistryTemplate();
}

main().catch(console.error);
