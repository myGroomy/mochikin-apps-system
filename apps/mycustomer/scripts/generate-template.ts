// apps/mycustomer/scripts/generate-template.ts
// Generator template database MyCustomer menggunakan ExcelJS (10 tab + seed riil).
import ExcelJS from 'exceljs';
import path from 'path';

const DEST_FILE = path.join(__dirname, '../templates/mycustomer-database-template.xlsx');

function styleHeader(row: ExcelJS.Row, bgHex: string) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgHex },
    };
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
}

function autoFitColumns(ws: ExcelJS.Worksheet) {
  ws.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLen) maxLen = Math.min(val.length + 3, 40);
    });
    col.width = maxLen;
  });
}

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MOCHIKIN-APPS (MyCustomer)';
  wb.created = new Date();

  // 1. customers
  const wsCust = wb.addWorksheet('customers', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsCust.addRow([
    'id', 'phone_normalized', 'name', 'phone_raw', 'aliases', 'gender',
    'age_range', 'notes', 'first_order_date', 'last_order_date', 'total_orders',
    'branch_memberships', 'is_active', 'is_followed_up', 'created_at',
    'updated_at', 'followed_up_at'
  ]);
  styleHeader(wsCust.getRow(1), '1E3A8A');
  autoFitColumns(wsCust);

  // 2. orders
  const wsOrders = wb.addWorksheet('orders', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsOrders.addRow([
    'id', 'customer_id', 'order_date', 'channel', 'raw_phone_input', 'created_at',
    'branch', 'is_followed_up', 'followed_up_at'
  ]);
  styleHeader(wsOrders.getRow(1), '1E3A8A');
  autoFitColumns(wsOrders);

  // 3. customer_branches
  const wsCustBranches = wb.addWorksheet('customer_branches', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsCustBranches.addRow([
    'id', 'customer_id', 'branch', 'first_order_date', 'last_order_date',
    'order_count', 'local_name', 'notes', 'created_at'
  ]);
  styleHeader(wsCustBranches.getRow(1), '1E3A8A');
  autoFitColumns(wsCustBranches);

  // 4. branches (3 Cabang Operasional Riil: BDG, CMH, BKS)
  const wsBranches = wb.addWorksheet('branches', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsBranches.addRow(['id', 'code', 'name', 'created_at', 'address', 'is_active']);
  styleHeader(wsBranches.getRow(1), '065F46');
  wsBranches.addRow(['00000000-0000-0000-0000-000000000101', 'CMH', 'Mochikin Cimahi', '2026-01-01', 'Jl. Ria No. 6, Cimahi', 'TRUE']);
  wsBranches.addRow(['00000000-0000-0000-0000-000000000102', 'BDG', 'Mochikin Bandung (Setiabudi)', '2026-01-01', 'Jl. Dr. Setiabudi No. 88, Bandung', 'TRUE']);
  wsBranches.addRow(['00000000-0000-0000-0000-000000000103', 'BKS', 'Mochikin Bekasi', '2026-01-01', 'Jl. Ahmad Yani No. 45, Bekasi Timur', 'TRUE']);
  autoFitColumns(wsBranches);

  // 5. users (Akun Operasional Nyata - Sesuai Database)
  const wsUsers = wb.addWorksheet('users', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsUsers.addRow(['id', 'username', 'display_name', 'pin', 'role', 'created_at', 'branch', 'active', 'status']);
  styleHeader(wsUsers.getRow(1), '065F46');
  wsUsers.addRow(['00000000-0000-0000-0000-000000000201', 'admin', 'Admin Mochikin Pusat', '1234', 'owner', '2026-01-01', 'BDG', 'TRUE', 'active']);
  wsUsers.addRow(['00000000-0000-0000-0000-000000000202', 'dea', 'Dea (Operational Admin)', '1234', 'admin', '2026-01-01', 'BDG', 'TRUE', 'active']);
  wsUsers.addRow(['00000000-0000-0000-0000-000000000203', 'candra', 'Candra', '1234', 'admin', '2026-01-01', 'BDG', 'TRUE', 'active']);
  wsUsers.addRow(['00000000-0000-0000-0000-000000000204', 'budi', 'Budi', '1234', 'kasir', '2026-01-01', 'BDG', 'TRUE', 'active']);
  wsUsers.addRow(['00000000-0000-0000-0000-000000000205', 'prita', 'Prita', '1234', 'admin', '2026-01-01', 'CMH', 'TRUE', 'active']);
  wsUsers.addRow(['00000000-0000-0000-0000-000000000206', 'nurul', 'Nurul Hilma', '1234', 'kasir', '2026-01-01', 'CMH', 'TRUE', 'active']);
  wsUsers.addRow(['00000000-0000-0000-0000-000000000207', 'sabat', 'Sabat', '1234', 'admin', '2026-01-01', 'BKS', 'TRUE', 'active']);
  wsUsers.addRow(['00000000-0000-0000-0000-000000000208', 'dimas', 'Dimas', '1234', 'kasir', '2026-01-01', 'BKS', 'TRUE', 'active']);
  autoFitColumns(wsUsers);

  // 6. settings
  const wsSettings = wb.addWorksheet('settings', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsSettings.addRow(['key', 'value']);
  styleHeader(wsSettings.getRow(1), '065F46');
  wsSettings.addRow(['loyaltyMinOrder', '5']);
  wsSettings.addRow(['waSenderNumber', '6281234567890']);
  wsSettings.addRow(['cronAutoSync', 'TRUE']);
  wsSettings.addRow(['waTemplate', 'Halo {nama}, terima kasih sudah order di Mochikin {cabang}!']);
  autoFitColumns(wsSettings);

  // 7. staging_cmh
  const wsStagingCmh = wb.addWorksheet('staging_cmh', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsStagingCmh.addRow(['tanggal', 'nama', 'tipe_order', 'no_telp', 'status']);
  styleHeader(wsStagingCmh.getRow(1), '92400E');
  autoFitColumns(wsStagingCmh);

  // 8. staging_bdg
  const wsStagingBdg = wb.addWorksheet('staging_bdg', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsStagingBdg.addRow(['tanggal', 'nama', 'tipe_order', 'no_telp', 'status']);
  styleHeader(wsStagingBdg.getRow(1), '92400E');
  autoFitColumns(wsStagingBdg);

  // 9. staging_bks
  const wsStagingBks = wb.addWorksheet('staging_bks', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsStagingBks.addRow(['tanggal', 'nama', 'tipe_order', 'no_telp', 'status']);
  styleHeader(wsStagingBks.getRow(1), '92400E');
  autoFitColumns(wsStagingBks);

  // 10. import_customers
  const wsImpCust = wb.addWorksheet('import_customers', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsImpCust.addRow(['Nama', 'No WhatsApp', 'Cabang', 'Gender', 'Rentang Usia', 'Tanggal Order Pertama', 'Catatan']);
  styleHeader(wsImpCust.getRow(1), '374151');
  autoFitColumns(wsImpCust);

  // 11. import_orders
  const wsImpOrd = wb.addWorksheet('import_orders', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsImpOrd.addRow(['No WhatsApp', 'Nama', 'Tanggal Order', 'Channel', 'Cabang']);
  styleHeader(wsImpOrd.getRow(1), '374151');
  autoFitColumns(wsImpOrd);

  await wb.xlsx.writeFile(DEST_FILE);
  console.log(`✅ Berhasil membuat template MyCustomer: ${DEST_FILE}`);
}

main().catch(console.error);
