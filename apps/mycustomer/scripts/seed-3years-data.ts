// apps/mycustomer/scripts/seed-3years-data.ts
// Script untuk mengisi data pelanggan & order MyCustomer selama 3 tahun (2023 - 2026).
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';

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

const RAW_CUSTOMERS = [
  { name: 'Rizky Ramadhan', gender: 'L', age: '26-35', primaryBranch: 'BDG' },
  { name: 'Siti Nurhaliza', gender: 'P', age: '18-25', primaryBranch: 'BDG' },
  { name: 'Budi Santoso', gender: 'L', age: '36-45', primaryBranch: 'CMH' },
  { name: 'Anisa Rahmawati', gender: 'P', age: '26-35', primaryBranch: 'CMH' },
  { name: 'Farhan Maulana', gender: 'L', age: '18-25', primaryBranch: 'BKS' },
  { name: 'Dewi Lestari', gender: 'P', age: '36-45', primaryBranch: 'BKS' },
  { name: 'Dimas Anggara', gender: 'L', age: '26-35', primaryBranch: 'BDG' },
  { name: 'Maya Safitri', gender: 'P', age: '18-25', primaryBranch: 'BDG' },
  { name: 'Aditya Pratama', gender: 'L', age: '26-35', primaryBranch: 'CMH' },
  { name: 'Putri Wulandari', gender: 'P', age: '26-35', primaryBranch: 'CMH' },
  { name: 'Gilang Ramadhan', gender: 'L', age: '18-25', primaryBranch: 'BKS' },
  { name: 'Ayu Lestari', gender: 'P', age: '36-45', primaryBranch: 'BKS' },
  { name: 'Hendra Wijaya', gender: 'L', age: '46-55', primaryBranch: 'BDG' },
  { name: 'Rina Marlina', gender: 'P', age: '26-35', primaryBranch: 'BDG' },
  { name: 'Fajar Hidayat', gender: 'L', age: '26-35', primaryBranch: 'CMH' },
  { name: 'Nabila Putri', gender: 'P', age: '18-25', primaryBranch: 'CMH' },
  { name: 'Eko Prasetyo', gender: 'L', age: '36-45', primaryBranch: 'BKS' },
  { name: 'Ratna Sari', gender: 'P', age: '36-45', primaryBranch: 'BKS' },
  { name: 'Yoga Pratama', gender: 'L', age: '18-25', primaryBranch: 'BDG' },
  { name: 'Indah Permatasari', gender: 'P', age: '26-35', primaryBranch: 'BDG' },
  { name: 'Bagus Kurniawan', gender: 'L', age: '26-35', primaryBranch: 'CMH' },
  { name: 'Dian Sastro', gender: 'P', age: '36-45', primaryBranch: 'CMH' },
  { name: 'Arif Rahman', gender: 'L', age: '26-35', primaryBranch: 'BKS' },
  { name: 'Tri Wahyuni', gender: 'P', age: '46-55', primaryBranch: 'BKS' },
  { name: 'Reza Pahlevi', gender: 'L', age: '18-25', primaryBranch: 'BDG' },
  { name: 'Citra Kirana', gender: 'P', age: '26-35', primaryBranch: 'BDG' },
  { name: 'Agung Nugroho', gender: 'L', age: '36-45', primaryBranch: 'CMH' },
  { name: 'Fitri Handayani', gender: 'P', age: '26-35', primaryBranch: 'CMH' },
  { name: 'Wahyu Setiawan', gender: 'L', age: '26-35', primaryBranch: 'BKS' },
  { name: 'Gita Gutawa', gender: 'P', age: '18-25', primaryBranch: 'BKS' },
  { name: 'Ilham Fauzi', gender: 'L', age: '18-25', primaryBranch: 'BDG' },
  { name: 'Lestari Handoko', gender: 'P', age: '46-55', primaryBranch: 'BDG' },
  { name: 'Kevin Sanjaya', gender: 'L', age: '26-35', primaryBranch: 'CMH' },
  { name: 'Melati Kusuma', gender: 'P', age: '26-35', primaryBranch: 'CMH' },
  { name: 'Danang Priyanto', gender: 'L', age: '36-45', primaryBranch: 'BKS' },
  { name: 'Tiara Andini', gender: 'P', age: '18-25', primaryBranch: 'BKS' },
  { name: 'Lukman Hakim', gender: 'L', age: '36-45', primaryBranch: 'BDG' },
  { name: 'Sarah Sechan', gender: 'P', age: '36-45', primaryBranch: 'BDG' },
  { name: 'Bayu Skak', gender: 'L', age: '26-35', primaryBranch: 'CMH' },
  { name: 'Nadia Vega', gender: 'P', age: '26-35', primaryBranch: 'CMH' },
  { name: 'Rendy Pandugo', gender: 'L', age: '26-35', primaryBranch: 'BKS' },
  { name: 'Jessica Mila', gender: 'P', age: '26-35', primaryBranch: 'BKS' },
  { name: 'Rio Febrian', gender: 'L', age: '46-55', primaryBranch: 'BDG' },
  { name: 'Vania Larissa', gender: 'P', age: '18-25', primaryBranch: 'BDG' },
  { name: 'Surya Saputra', gender: 'L', age: '46-55', primaryBranch: 'CMH' },
  { name: 'Chelsea Islan', gender: 'P', age: '26-35', primaryBranch: 'CMH' },
  { name: 'Gading Marten', gender: 'L', age: '36-45', primaryBranch: 'BKS' },
  { name: 'Sheila Dara', gender: 'P', age: '26-35', primaryBranch: 'BKS' },
  { name: 'Tora Sudiro', gender: 'L', age: '46-55', primaryBranch: 'BDG' },
  { name: 'Enzy Storia', gender: 'P', age: '26-35', primaryBranch: 'BDG' },
  { name: 'Vincent Rompies', gender: 'L', age: '36-45', primaryBranch: 'CMH' },
  { name: 'Hesti Purwadinata', gender: 'P', age: '36-45', primaryBranch: 'CMH' },
  { name: 'Desta Mahendra', gender: 'L', age: '46-55', primaryBranch: 'BKS' },
  { name: 'Natasha Rizky', gender: 'P', age: '26-35', primaryBranch: 'BKS' },
  { name: 'Wendy Cagur', gender: 'L', age: '36-45', primaryBranch: 'BDG' },
  { name: 'Kiky Saputri', gender: 'P', age: '26-35', primaryBranch: 'BDG' },
  { name: 'Denny Cagur', gender: 'L', age: '46-55', primaryBranch: 'CMH' },
  { name: 'Shanty Widihastuti', gender: 'P', age: '36-45', primaryBranch: 'CMH' },
  { name: 'Andre Taulany', gender: 'L', age: '46-55', primaryBranch: 'BKS' },
  { name: 'Sule Sutisna', gender: 'L', age: '46-55', primaryBranch: 'BKS' },
];

const CHANNELS = ['dine_in', 'takeaway', 'gofood', 'grab', 'shopee', 'whatsapp'];
const AMOUNTS = [25000, 35000, 48000, 55000, 72000, 85000, 99000, 120000, 150000, 185000];

function randomDate(startYear: number, endYear: number): string {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 10, 1).getTime();
  const d = new Date(start + Math.random() * (end - start));
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log('Generating 3-year customer & order dataset (2023 - 2026)...');

  const customersRows: any[] = [];
  const ordersRows: any[] = [];
  const customerBranchesMap = new Map<string, any>();

  // Process customers
  RAW_CUSTOMERS.forEach((c, idx) => {
    const custId = uuidv4();
    const phoneSuffix = String(idx + 1).padStart(4, '0');
    const phoneRaw = `08121100${phoneSuffix}`;
    const phoneNormalized = `628121100${phoneSuffix}`;

    // Tentukan pola keaktifan pelanggan:
    // 0-14: Loyal customer (12 - 20 orders across 3 years)
    // 15-34: Regular customer (5 - 10 orders)
    // 35-49: At-risk / Churned (orders in 2023-2024, no recent order in 2026)
    // 50-59: New customer in 2026 (1 - 4 orders)
    let orderCount = 3;
    let yearRange = [2023, 2026];

    if (idx < 15) {
      orderCount = 12 + (idx % 8); // 12-19 orders
      yearRange = [2023, 2026];
    } else if (idx < 35) {
      orderCount = 5 + (idx % 6); // 5-10 orders
      yearRange = [2024, 2026];
    } else if (idx < 50) {
      orderCount = 3 + (idx % 4); // Churned: 2023 - mid 2024
      yearRange = [2023, 2024];
    } else {
      orderCount = 1 + (idx % 4); // New in 2026
      yearRange = [2026, 2026];
    }

    const customerOrders: any[] = [];
    const branchSet = new Set<string>();

    for (let o = 0; o < orderCount; o++) {
      const orderId = uuidv4();
      const orderDate = randomDate(yearRange[0], yearRange[1]);
      const channel = CHANNELS[(idx + o) % CHANNELS.length];
      // Kebanyakan di primary branch, sesekali ke cabang lain
      const branch = (o % 4 === 0 && idx % 3 === 0) ? 'BDG' : c.primaryBranch;
      const totalAmount = AMOUNTS[(idx * 3 + o * 7) % AMOUNTS.length];
      branchSet.add(branch);

      const orderRow = [
        orderId,
        custId,
        orderDate,
        channel,
        branch,
        totalAmount,
        `Pesanan ${channel} di cabang ${branch}`,
        `${orderDate}T12:30:00.000Z`,
        ''
      ];
      customerOrders.push({ orderDate, branch, row: orderRow });
    }

    // Urutkan order berdasarkan tanggal
    customerOrders.sort((a, b) => a.orderDate.localeCompare(b.orderDate));
    customerOrders.forEach((o) => ordersRows.push(o.row));

    const firstOrderDate = customerOrders[0]?.orderDate || '2024-01-01';
    const lastOrderDate = customerOrders[customerOrders.length - 1]?.orderDate || '2026-10-01';
    const branchesArr = Array.from(branchSet);

    // Track customer_branches
    branchesArr.forEach((b) => {
      const bOrders = customerOrders.filter((o) => o.branch === b);
      const bFirst = bOrders[0]?.orderDate || firstOrderDate;
      const bLast = bOrders[bOrders.length - 1]?.orderDate || lastOrderDate;
      const cbKey = `${custId}_${b}`;
      customerBranchesMap.set(cbKey, [
        uuidv4(),
        custId,
        b,
        bFirst,
        bLast,
        bOrders.length,
        c.name,
        `Langganan cabang ${b}`,
        `${bFirst}T10:00:00.000Z`
      ]);
    });

    customersRows.push([
      custId,
      phoneNormalized,
      c.name,
      phoneRaw,
      '[]',
      c.gender,
      c.age,
      idx < 15 ? 'Pelanggan Setia VIP' : (idx < 50 ? 'Regular' : 'Pelanggan Baru'),
      firstOrderDate,
      lastOrderDate,
      customerOrders.length,
      JSON.stringify(branchesArr),
      'TRUE',
      'FALSE',
      `${firstOrderDate}T09:00:00.000Z`,
      `${lastOrderDate}T15:00:00.000Z`,
      ''
    ]);
  });

  console.log(`Total generated: ${customersRows.length} customers, ${ordersRows.length} orders.`);

  // Generate Staging data (recent orders for CMH, BDG, BKS)
  const stagingCmh: any[] = [
    ['2026-11-01', 'Budi Santoso', 'dine_in', '081211000003', 'done'],
    ['2026-11-02', 'Anisa Rahmawati', 'gofood', '081211000004', 'done'],
    ['2026-11-02', 'Putri Wulandari', 'whatsapp', '081211000010', 'pending'],
  ];

  const stagingBdg: any[] = [
    ['2026-11-01', 'Rizky Ramadhan', 'takeaway', '081211000001', 'done'],
    ['2026-11-02', 'Siti Nurhaliza', 'dine_in', '081211000002', 'done'],
    ['2026-11-02', 'Dimas Anggara', 'grab', '081211000007', 'pending'],
  ];

  const stagingBks: any[] = [
    ['2026-11-01', 'Farhan Maulana', 'gofood', '081211000005', 'done'],
    ['2026-11-02', 'Dewi Lestari', 'shopee', '081211000006', 'done'],
    ['2026-11-02', 'Gilang Ramadhan', 'dine_in', '081211000011', 'pending'],
  ];

  // 1. Write to Google Sheets online
  console.log('Writing to Google Sheets online...');
  const customerBranchesRows = Array.from(customerBranchesMap.values());

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: 'customers!A2:Q', values: customersRows },
        { range: 'orders!A2:I', values: ordersRows },
        { range: 'customer_branches!A2:I', values: customerBranchesRows },
        { range: 'staging_cmh!A2:E', values: stagingCmh },
        { range: 'staging_bdg!A2:E', values: stagingBdg },
        { range: 'staging_bks!A2:E', values: stagingBks },
      ],
    },
  });

  console.log('✅ Google Sheets online successfully updated!');

  // 2. Also update local template .xlsx
  const templatePath = path.join(__dirname, '../templates/mycustomer-database-template.xlsx');
  console.log(`Updating local template file: ${templatePath}...`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);

  const wsCust = wb.getWorksheet('customers');
  if (wsCust) {
    customersRows.forEach((r) => wsCust.addRow(r));
  }

  const wsOrders = wb.getWorksheet('orders');
  if (wsOrders) {
    ordersRows.forEach((r) => wsOrders.addRow(r));
  }

  const wsCustBranches = wb.getWorksheet('customer_branches');
  if (wsCustBranches) {
    customerBranchesRows.forEach((r) => wsCustBranches.addRow(r));
  }

  await wb.xlsx.writeFile(templatePath);
  console.log('✅ Local template file updated!');
  console.log('🎉 3-Year Customer & Order Simulation Complete!');
}

main().catch((err) => {
  console.error('Error seeding 3 years data:', err);
  process.exit(1);
});
