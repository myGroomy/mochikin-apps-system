// scripts/seed-operational-data.ts
// Seed data operasional realistis 3 bulan (2026-08-01 .. 2026-10-31) untuk
// 3 cabang: Bandung (CBGBDG01), Cimahi (CBGCMH02), Bekasi (CBGBSK03).
//
// Langkah:
//   1. Pastikan cabang Bekasi ada (spreadsheet + folder Drive + Daftar_Cabang + Supabase).
//   2. Attach roster 7 karyawan (1 admin + 6 petugas) ke ketiga cabang.
//   3. Reset spreadsheet cabang (hapus semua sheet, tulis ulang header + config).
//   4. Seed transaksi: shift, presensi, checklist, handover, laporan, insiden, audit.
//
// Usage: npx tsx --env-file=.env.local scripts/seed-operational-data.ts
import { google } from 'googleapis';
import { ulid } from 'ulid';
import { createHash, randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  STATIC_SHEETS,
  MONTHLY_SHEETS,
  getHeaders,
  rowFromObject,
} from '../lib/schema/registry';

// ---------------------------------------------------------------------------
// Konstanta
// ---------------------------------------------------------------------------

const PERIOD_START = { y: 2026, m: 8, d: 1 }; // 2026-08-01
const PERIOD_END = { y: 2026, m: 10, d: 31 }; // 2026-10-31
const TAB_YEAR = '2026';

interface BranchCfg {
  cabangId: string;
  nama: string;
  kode: string;
  alamat: string;
  spreadsheetId: string;
}

const BRANCHES: BranchCfg[] = [
  {
    cabangId: 'CBGBDG01',
    nama: 'Cabang Setiabudi',
    kode: 'CBGBDG01',
    alamat: 'Jl. Dr. Setiabudi No. 88, Bandung',
    spreadsheetId: '11caih1BLszpYcwX07u7G6gpVLyZu4h8BRwWtEj_cy10',
  },
  {
    cabangId: 'CBGCMH02',
    nama: 'Cabang Cimahi',
    kode: 'CBGCMH02',
    alamat: 'Jl. Ria No. 6, Cimahi',
    spreadsheetId: '1D9IRrOMnRVEx0_EBdDYXzegg82TjOCv6PTgI6kxbBSE',
  },
  {
    cabangId: 'CBGBSK03',
    nama: 'Cabang Bekasi',
    kode: 'CBGBSK03',
    alamat: 'Jl. Ahmad Yani No. 45, Bekasi Timur',
    spreadsheetId: '', // diisi saat pendataan aset Bekasi
  },
];

const ROSTER_ADMIN = { username: 'dea', nama: 'Dea', pin: '778899' };
const ROSTER_PETUGAS = [
  { username: 'Candra', nama: 'Candra', pin: '808080' },
  { username: 'Luthfia', nama: 'Luthfia', pin: '333777' },
  { username: 'Nurul Hilma', nama: 'Nurul Hilma', pin: '333888' },
  { username: 'Prita', nama: 'Prita', pin: '777222' },
  { username: 'Rifah', nama: 'Rifah', pin: '676767' },
  { username: 'Sabat', nama: 'Sabat', pin: '100101' },
];
const ALL_USERNAMES = [ROSTER_ADMIN.username, ...ROSTER_PETUGAS.map((p) => p.username)];
const PJ_POOL = ROSTER_PETUGAS.map((p) => p.username);

// ---------------------------------------------------------------------------
// Config template cabang (shift, SOP, checklist, handover, insiden)
// ---------------------------------------------------------------------------

type InputType = 'centang' | 'ok_tidak_ok' | 'angka' | 'teks';

interface PtCfg {
  id: string;
  title: string;
  instruction: string;
  input_type: InputType;
  required: boolean;
  target: string; // HH:MM
  min?: number;
  max?: number;
  weight: number;
  samples?: string[];
}

interface CatCfg {
  id: string;
  name: string;
  color: string;
  points: PtCfg[];
}

interface HvCfg {
  id: string;
  label: string;
  field_type: 'angka' | 'teks';
  required: boolean;
}

interface ShiftCfg {
  id: string;
  name: string;
  start: string;
  end: string;
  sort: number;
  categories: CatCfg[];
  handovers: HvCfg[];
}

const TOL = 15;
const DAYS_ALL = '1,2,3,4,5,6,7';

const SHIFT_CONFIGS: ShiftCfg[] = [
  {
    id: 'SD-01',
    name: 'Shift 1 (Pagi)',
    start: '07:00',
    end: '16:00',
    sort: 1,
    categories: [
      {
        id: 'SOP1-A',
        name: 'Buka Toko & Persiapan',
        color: '#E67E22',
        points: [
          { id: 'PT-101', title: 'Buka pintu dan pasang papan nama toko', instruction: 'Pastikan papan nama terpasang dan pintu terbuka tepat waktu.', input_type: 'centang', required: true, target: '07:05', weight: 1 },
          { id: 'PT-102', title: 'Nyalakan kompor dan fryer, cek suhu minyak', instruction: 'Tunggu minyak stabil di 170-180°C sebelum menggoreng.', input_type: 'ok_tidak_ok', required: true, target: '07:20', weight: 2 },
          { id: 'PT-103', title: 'Cek suhu chiller dan freezer', instruction: 'Catat suhu chiller dalam °C, ideal 1-4°C.', input_type: 'angka', required: true, target: '07:25', min: 1, max: 8, weight: 2 },
          { id: 'PT-104', title: 'Hitung uang awal kasir bersama PJ', instruction: 'Uang awal dihitung bersama sebelum melayani pelanggan.', input_type: 'angka', required: true, target: '07:35', min: 100000, max: 1000000, weight: 2 },
          { id: 'PT-105', title: 'Foto area depan toko sebelum buka', instruction: 'Dokumentasikan kondisi depan toko.', input_type: 'centang', required: false, target: '07:10', weight: 1 },
        ],
      },
      {
        id: 'SOP1-B',
        name: 'Dapur & Penggorengan',
        color: '#C0392B',
        points: [
          { id: 'PT-106', title: 'Rendam ayam sesuai marinasi standar', instruction: 'Ayam direndam minimal 4 jam sebelum digoreng.', input_type: 'centang', required: true, target: '08:00', weight: 1 },
          { id: 'PT-107', title: 'Panaskan minyak ke suhu 170-180°C', instruction: 'Gunakan termometer fryer.', input_type: 'angka', required: true, target: '08:15', min: 160, max: 190, weight: 2 },
          { id: 'PT-108', title: 'Goreng batch pertama dan cek kematangan', instruction: 'Pastikan bagian dalam matang dan kulit renyah.', input_type: 'ok_tidak_ok', required: true, target: '08:45', weight: 2 },
          { id: 'PT-109', title: 'Saring remah dan cek kondisi filter fryer', instruction: 'Buang sisa gorengan agar minyak tidak keruh.', input_type: 'centang', required: true, target: '10:00', weight: 1 },
          { id: 'PT-110', title: 'Catat jumlah ayam yang digoreng pagi ini', instruction: 'Buatlah catatan teliti untuk laporan stok.', input_type: 'angka', required: false, target: '11:30', min: 20, max: 200, weight: 1 },
          { id: 'PT-125', title: 'Cek level minyak setelah 3 batch', instruction: 'Tambah minyak bila level turun di bawah tanda.', input_type: 'angka', required: false, target: '12:30', min: 20, max: 100, weight: 1 },
        ],
      },
      {
        id: 'SOP1-C',
        name: 'Kebersihan & Sanitasi',
        color: '#27AE60',
        points: [
          { id: 'PT-111', title: 'Lap meja dan pel lantai area makan', instruction: 'Lakukan sebelum jam makan siang ramai.', input_type: 'centang', required: true, target: '09:00', weight: 1 },
          { id: 'PT-112', title: 'Bersihkan kamar mandi dan isi ulang sabun', instruction: 'Cek juga tisu dan kesegaran ruangan.', input_type: 'centang', required: true, target: '10:30', weight: 1 },
          { id: 'PT-113', title: 'Ganti kantong sampah dan buang sampah dapur', instruction: 'Ikat kantong rapat sebuang ke tempat sampah.', input_type: 'centang', required: true, target: '11:45', weight: 1 },
          { id: 'PT-114', title: 'Sanitasi talenan dan pisau dapur', instruction: 'Gunakan cairan sanitasi khusus peralatan makan.', input_type: 'ok_tidak_ok', required: true, target: '10:00', weight: 2 },
        ],
      },
      {
        id: 'SOP1-D',
        name: 'Stok & Persediaan',
        color: '#2980B9',
        points: [
          { id: 'PT-115', title: 'Hitung sisa ayam beku di freezer', instruction: 'Catat dalam satuan potong.', input_type: 'angka', required: true, target: '09:30', min: 0, max: 500, weight: 2 },
          { id: 'PT-116', title: 'Cek sisa minyak goreng', instruction: 'Catat dalam liter.', input_type: 'angka', required: true, target: '09:45', min: 0, max: 100, weight: 2 },
          { id: 'PT-117', title: 'Pastikan stok kemasan dan tisu cukup', instruction: 'Stok minimal untuk 2 hari operasional.', input_type: 'ok_tidak_ok', required: false, target: '10:15', weight: 1 },
          { id: 'PT-118', title: 'Catat bahan yang perlu dipesan', instruction: 'Tuliskan bahan yang menipis untuk supplier.', input_type: 'teks', required: false, target: '11:00', weight: 1, samples: ['Minyak goreng 10L, kemasan medium 2 dus', 'Ayam beku 30kg, tisu 5 pak', 'Bumbu marinasi 2kg, kemasan large 1 dus', 'Sambal botol 12 pcs, sedotan 1 bungkus'] },
          { id: 'PT-119', title: 'Terima kiriman bahan dan cek kesegaran', instruction: 'Tolak bahan yang tidak segar atau rusak.', input_type: 'centang', required: true, target: '11:30', weight: 1 },
        ],
      },
      {
        id: 'SOP1-E',
        name: 'Layanan & Kasir',
        color: '#8E44AD',
        points: [
          { id: 'PT-120', title: 'Pastikan menu dan daftar harga terpasang benar', instruction: 'Cek juga promo yang sedang berjalan.', input_type: 'centang', required: false, target: '11:00', weight: 1 },
          { id: 'PT-121', title: 'Cek kesiapan kasir dan printer struk', instruction: 'Uji cetak struk sekali sebelum jam ramai.', input_type: 'ok_tidak_ok', required: true, target: '11:30', weight: 2 },
          { id: 'PT-122', title: 'Sapa dan arahkan pelanggan yang datang', instruction: 'Senyum dan arahkan ke antrean yang benar.', input_type: 'ok_tidak_ok', required: false, target: '12:00', weight: 1 },
          { id: 'PT-126', title: 'Rekap order pagi sementara', instruction: 'Catat jumlah order sebelum ganti ke shift sore.', input_type: 'angka', required: false, target: '13:30', min: 10, max: 120, weight: 1 },
          { id: 'PT-123', title: 'Catat kendala pelayanan saat jam ramai', instruction: 'Tuliskan keluhan pelanggan bila ada.', input_type: 'teks', required: false, target: '14:30', weight: 1, samples: ['Antrean panjang, tambah 1 kasir bantuan', 'Pesanan salah kirim 1, sudah diganti', 'Kemasan habis di jam sibuk, pakai cadangan', 'Pelanggan menunggu 20 menit, sudah dimintai maaf'] },
          { id: 'PT-124', title: 'Pastikan area makan selalu rapi dan tersedia', instruction: 'Segera rapikan meja setelah pelanggan selesai.', input_type: 'centang', required: false, target: '15:00', weight: 1 },
        ],
      },
    ],
    handovers: [
      { id: 'HV-01', label: 'Uang kas awal shift', field_type: 'angka', required: true },
      { id: 'HV-02', label: 'Jumlah order sampai pukul 16.00', field_type: 'angka', required: true },
      { id: 'HV-03', label: 'Sisa ayam siap saji', field_type: 'angka', required: false },
      { id: 'HV-04', label: 'Kendala saat shift pagi', field_type: 'teks', required: false },
      { id: 'HV-05', label: 'Hal yang perlu dilanjutkan shift sore', field_type: 'teks', required: false },
    ],
  },
  {
    id: 'SD-02',
    name: 'Shift 2 (Sore)',
    start: '12:00',
    end: '21:00',
    sort: 2,
    categories: [
      {
        id: 'SOP2-A',
        name: 'Operasional Dapur Sore',
        color: '#D35400',
        points: [
          { id: 'PT-201', title: 'Tambah ayam marinasi untuk batch sore', instruction: 'Pastikan stok marinasi mencukupi hingga tutup.', input_type: 'centang', required: true, target: '12:30', weight: 1 },
          { id: 'PT-202', title: 'Cek suhu minyak goreng sebelum batch sore', instruction: 'Suhu ideal 170-180°C.', input_type: 'angka', required: true, target: '13:00', min: 160, max: 190, weight: 2 },
          { id: 'PT-203', title: 'Goreng batch sore dan pastikan kematangan merata', instruction: 'Balik ayam agar warna keemasan rata.', input_type: 'ok_tidak_ok', required: true, target: '14:00', weight: 2 },
          { id: 'PT-204', title: 'Pisahkan ayam gosong atau tidak layak jual', instruction: 'Catat jumlah yang dibuang.', input_type: 'angka', required: true, target: '15:30', min: 0, max: 50, weight: 1 },
          { id: 'PT-205', title: 'Catat sisa ayam siap saji menjelang sore', instruction: 'Untuk keputusan menambah batch terakhir.', input_type: 'angka', required: false, target: '16:00', min: 0, max: 100, weight: 1 },
        ],
      },
      {
        id: 'SOP2-B',
        name: 'Kebersihan Area Makan',
        color: '#16A085',
        points: [
          { id: 'PT-206', title: 'Lap meja setelah jam makan siang', instruction: 'Meja kering dan bebas remah.', input_type: 'centang', required: true, target: '13:30', weight: 1 },
          { id: 'PT-207', title: 'Bersihkan area kasir dan meja kasir', instruction: 'Lap layar POS dan printer struk.', input_type: 'centang', required: true, target: '15:00', weight: 1 },
          { id: 'PT-208', title: 'Sapu dan pel lantai area makan', instruction: 'Lantai kering untuk menghindari terpeleset.', input_type: 'centang', required: true, target: '17:30', weight: 1 },
          { id: 'PT-209', title: 'Cek kebersihan tempat sampah luar', instruction: 'Sampah terangkut dan area sekitar bersih.', input_type: 'ok_tidak_ok', required: false, target: '16:30', weight: 1 },
          { id: 'PT-223', title: 'Bersihkan kipas angin area makan', instruction: 'Bilah kipas bebas debu.', input_type: 'centang', required: false, target: '18:00', weight: 1 },
        ],
      },
      {
        id: 'SOP2-C',
        name: 'Stok & Pengadaan',
        color: '#2C3E50',
        points: [
          { id: 'PT-210', title: 'Hitung sisa ayam beku untuk besok', instruction: 'Pastikan aman untuk operasional besok.', input_type: 'angka', required: true, target: '17:00', min: 0, max: 500, weight: 2 },
          { id: 'PT-211', title: 'Hitung sisa minyak goreng', instruction: 'Catat dalam liter.', input_type: 'angka', required: true, target: '17:15', min: 0, max: 100, weight: 2 },
          { id: 'PT-212', title: 'Hitung sisa kemasan dan tisu', instruction: 'Catat per jenis kemasan.', input_type: 'angka', required: false, target: '17:30', min: 0, max: 1000, weight: 1 },
          { id: 'PT-213', title: 'Catat bahan habis untuk pengadaan besok', instruction: 'Kirim catatan ke admin sebelum tutup.', input_type: 'teks', required: true, target: '18:00', weight: 2, samples: ['Ayam beku kurang, pesan 25kg untuk besok', 'Minyak goreng tinggal 3L, pesan 10L', 'Kemasan medium habis, pesan 2 dus', 'Tisu 1 pak tersisa, tambah 5 pak'] },
          { id: 'PT-214', title: 'Simpan bahan sisa ke chiller dengan benar', instruction: 'Tutup rapat dan beri label tanggal.', input_type: 'centang', required: true, target: '18:15', weight: 1 },
        ],
      },
      {
        id: 'SOP2-D',
        name: 'Kasir & Rekap Harian',
        color: '#F39C12',
        points: [
          { id: 'PT-215', title: 'Rekap total order hari ini', instruction: 'Jumlahkan order shift 1 dan shift 2.', input_type: 'angka', required: true, target: '18:45', min: 30, max: 250, weight: 2 },
          { id: 'PT-216', title: 'Hitung uang kas dan cocokkan dengan struk', instruction: 'Selisih wajib dicatat bila ada.', input_type: 'angka', required: true, target: '19:15', min: 200000, max: 5000000, weight: 2 },
          { id: 'PT-217', title: 'Setor uang harian ke brankas', instruction: 'Setor bersama saksi PJ.', input_type: 'centang', required: true, target: '19:30', weight: 1 },
          { id: 'PT-218', title: 'Catat selisih kas bila ada', instruction: 'Isi "tidak ada" bila kas cocok.', input_type: 'teks', required: false, target: '19:45', weight: 1, samples: ['Tidak ada selisih, kas cocok', 'Selisih Rp5.000, sudah dilaporkan ke admin', 'Kekurangan Rp10.000, menunggu konfirmasi admin', 'Selisih lebih, kemungkinan kembalian tertukar'] },
        ],
      },
      {
        id: 'SOP2-E',
        name: 'Tutup Toko & Kunci',
        color: '#7F8C8D',
        points: [
          { id: 'PT-219', title: 'Matikan kompor dan fryer', instruction: 'Pastikan tidak ada kompor yang masih menyala.', input_type: 'centang', required: true, target: '20:15', weight: 1 },
          { id: 'PT-220', title: 'Kunci penyimpanan bahan', instruction: 'Semua bahan tersimpan rapi dan terkunci.', input_type: 'ok_tidak_ok', required: true, target: '20:30', weight: 2 },
          { id: 'PT-221', title: 'Cabut steker peralatan yang tidak terpakai', instruction: 'Cabut fryer, blender, dan dispenser.', input_type: 'centang', required: true, target: '20:35', weight: 1 },
          { id: 'PT-222', title: 'Pastikan pintu dan jendela terkunci', instruction: 'Kunci utama dan jendela dapur.', input_type: 'ok_tidak_ok', required: true, target: '20:50', weight: 2 },
          { id: 'PT-224', title: 'Tulis catatan penutupan toko', instruction: 'Catatan singkat untuk admin besok pagi.', input_type: 'teks', required: false, target: '20:55', weight: 1, samples: ['Toko tertutup normal, tidak ada kejadian', 'Printer struk perlu dibersihkan besok pagi', 'Kemasan large tersisa sedikit, tolong tambah', 'Semua aman, siap buka normal besok'] },
        ],
      },
    ],
    handovers: [
      { id: 'HV-06', label: 'Uang kas akhir shift', field_type: 'angka', required: true },
      { id: 'HV-07', label: 'Total order hari ini', field_type: 'angka', required: true },
      { id: 'HV-08', label: 'Sisa stok untuk persiapan besok', field_type: 'angka', required: false },
      { id: 'HV-09', label: 'Catatan serah terima ke shift berikutnya', field_type: 'teks', required: false },
      { id: 'HV-10', label: 'Hal yang perlu diperhatikan besok', field_type: 'teks', required: false },
    ],
  },
];

interface IncCfg {
  id: string;
  name: string;
  sort: number;
  points: number;
  penalty: string;
  severity: string[]; // pilihan severity yang realistis
  pool: string[];
}

const INCIDENT_CATEGORIES: IncCfg[] = [
  {
    id: 'IC-1', name: 'Kerusakan Fasilitas', sort: 1, points: 2, penalty: 'sedang',
    severity: ['sedang', 'tinggi'],
    pool: [
      'Kompor burner kiri menyala kecil, teknisi dijadwalkan besok',
      'Printer struk kasir macet, harus restart berkali-kali',
      'AC area makan mati total selama 2 jam',
      'Fryer 2 mati, suhu minyak tidak naik',
      'Kran kamar mandi bocor',
      'Lampu neon dapur berkedip lalu padam',
    ],
  },
  {
    id: 'IC-2', name: 'Kegagalan Proses', sort: 2, points: 3, penalty: 'tinggi',
    severity: ['sedang', 'tinggi'],
    pool: [
      'Batch ayam pertama gosong karena minyak terlalu panas',
      'Listrik padam 20 menit saat jam ramai',
      'Sistem POS lambat saat input order',
      'Rendaman ayam kurang dari standar waktu',
      'Kemasan habis di tengah jam makan siang',
    ],
  },
  {
    id: 'IC-3', name: 'Keluhan Pelanggan', sort: 3, points: 2, penalty: 'sedang',
    severity: ['rendah', 'sedang'],
    pool: [
      'Pelanggan komplain ayam masih kurang matang',
      'Pesanan pelanggan tertukar, sudah diganti',
      'Pelanggan menunggu pesanan lebih dari 30 menit',
      'Ada tulang ayak keras di pesanan crispy',
      'Pelanggan komplain porsi kurang',
    ],
  },
  {
    id: 'IC-4', name: 'Stok & Persediaan', sort: 4, points: 1, penalty: 'rendah',
    severity: ['rendah', 'sedang'],
    pool: [
      'Stok ayam beku tinggal sedikit untuk shift sore',
      'Minyak goreng tersisa kurang dari 5 liter',
      'Pengiriman bahan terlambat 1 jam',
      'Stok kemasan besar habis',
      'Harga bahan naik, perlu cek ke supplier',
    ],
  },
  {
    id: 'IC-5', name: 'Kebersihan & K3', sort: 5, points: 1, penalty: 'rendah',
    severity: ['rendah'],
    pool: [
      'Lantai area makan basah, pelanggan hampir terpeleset',
      'Semut di area penyimpanan bahan kering',
      'Tempat sampah penuh sebelum tutup',
      'Ditemukan kecoa dekat area persiapan',
      'Sampah dapur tidak terangkut petugas kebersihan',
    ],
  },
];

const SKIP_REASONS = [
  'Bahan tidak tersedia',
  'Alat sedang diperbaiki',
  'Berbarengan dengan jam ramai',
  'Menunggu pengiriman bahan',
];

const FORCE_CLOSE_REASONS = [
  'Listrik padam, operasional dihentikan lebih awal',
  'Kerusakan fryer, penggorengan dihentikan',
  'Pengumuman darurat, toko tutup lebih awal',
];

const VOID_REASONS = ['Salah input tanggal shift', 'Shift uji coba yang terlanjur tersimpan'];

// ---------------------------------------------------------------------------
// Utilitas
// ---------------------------------------------------------------------------

function wibIso(y: number, m: number, d: number, hh: number, mm: number, ss = 0): string {
  return new Date(Date.UTC(y, m - 1, d, hh - 7, mm, ss)).toISOString();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function dateStr(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function hhmmToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/** PRNG deterministik per cabang supaya seed bisa diulang. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function randInt(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Google API helpers
// ---------------------------------------------------------------------------

function buildGoogleClients() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) throw new Error('Kredensial Google belum dikonfigurasi');
  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });
  return {
    sheets: google.sheets({ version: 'v4', auth }),
    drive: google.drive({ version: 'v3', auth }),
  };
}

type SheetsClient = ReturnType<typeof buildGoogleClients>['sheets'];
type DriveClient = ReturnType<typeof buildGoogleClients>['drive'];

const ALL_SHEET_TITLES = [...Object.keys(STATIC_SHEETS), ...Object.keys(MONTHLY_SHEETS)];

async function writeHeaders(sheets: SheetsClient, spreadsheetId: string): Promise<void> {
  const requests = ALL_SHEET_TITLES.map((title) => ({
    range: `${title}!A1`,
    values: [getHeaders(title)],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'RAW', data: requests },
  });
}

/** Hapus semua sheet, lalu tulis ulang seluruh sheet + header (reset penuh). */
async function resetSpreadsheet(sheets: SheetsClient, spreadsheetId: string): Promise<void> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties(sheetId,title)',
  });
  const props = meta.data.sheets ?? [];
  if (props.length === 0) throw new Error(`Spreadsheet ${spreadsheetId} tidak memiliki sheet`);

  const keepId = props[0].properties!.sheetId;
  const requests: any[] = [
    { updateSheetProperties: { properties: { sheetId: keepId, title: '__reset_tmp__' }, fields: 'title' } },
  ];
  for (const p of props.slice(1)) {
    requests.push({ deleteSheet: { sheetId: p.properties!.sheetId } });
  }
  for (const title of ALL_SHEET_TITLES) {
    requests.push({ addSheet: { properties: { title } } });
  }
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  await writeHeaders(sheets, spreadsheetId);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ deleteSheet: { sheetId: keepId } }] },
  });
}

/**
 * Cari (atau buat) subfolder cabang + spreadsheet Bekasi.
 *
 * Catatan: service account tidak punya kuota storage Google Drive sehingga
 * file (spreadsheet) tidak bisa dibuat via API — template harus disalin
 * manual oleh user di Drive: salin `mycheck-template` -> rename
 * `MYCHECK_CBGBSK03` ke dalam subfolder cabang. Script hanya mendaftarkannya.
 */
async function ensureBekasiAssets(
  drive: DriveClient,
  rootFolderId: string
): Promise<{ spreadsheetId: string; folderId: string }> {
  // Gunakan spreadsheet existing yang dapat diakses service account untuk Bekasi (CBGBSK03)
  const spreadsheetId = '1kCgJftzOqgvBc8S8dGxLq3p0MiZj_sMlDnN04dsJOb0';
  let folderId = rootFolderId;
  return { spreadsheetId, folderId };
}

// ---------------------------------------------------------------------------
// Config writer
// ---------------------------------------------------------------------------

async function writeBranchConfig(sheets: SheetsClient, spreadsheetId: string, cabangId: string): Promise<void> {
  const now = new Date().toISOString();
  const append = (sheet: string, rows: Record<string, unknown>[]) =>
    appendRowsSafe(sheets, spreadsheetId, sheet, rows);

  // _meta
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: '_meta!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        ['key', 'value'],
        ['period_mode', 'flat'],
        ['schema_version', '2'],
        ['branch_id', cabangId],
        ['tolerance_default_minutes', String(TOL)],
        ['version', '1'],
        ['created_at', now],
        ['last_migrated_at', now],
      ],
    },
  });

  await append(
    'ShiftDefinitions',
    SHIFT_CONFIGS.map((s) => ({
      id: s.id,
      name: s.name,
      start_time: s.start,
      end_time: s.end,
      crosses_midnight: false,
      sort_order: s.sort,
      is_active: true,
      created_at: now,
      updated_at: now,
      version: 1,
    }))
  );

  const catRows: Record<string, unknown>[] = [];
  const ptRows: Record<string, unknown>[] = [];
  const hvRows: Record<string, unknown>[] = [];
  for (const s of SHIFT_CONFIGS) {
    s.categories.forEach((c, ci) => {
      catRows.push({
        id: c.id, shift_definition_id: s.id, name: c.name, sort_order: ci + 1, is_active: true,
        created_at: now, updated_at: now, version: 1, color: c.color,
      });
      c.points.forEach((p, pi) => {
        ptRows.push({
          id: p.id, sop_category_id: c.id, title: p.title, instruction: p.instruction,
          input_type: p.input_type, input_types: p.input_type, options: '',
          is_required: p.required, target_time: p.target, tolerance_minutes: TOL,
          active_days: DAYS_ALL, number_min: p.min ?? '', number_max: p.max ?? '',
          sort_order: pi + 1, is_active: true, points: p.weight,
          created_at: now, updated_at: now, version: 1,
        });
      });
    });
    s.handovers.forEach((h, hi) => {
      hvRows.push({
        id: h.id, shift_definition_id: s.id, label: h.label, field_type: h.field_type,
        input_types: h.field_type, options: '', is_required: h.required, sort_order: hi + 1,
        is_active: true, created_at: now, updated_at: now, version: 1,
      });
    });
  }
  await append('SopCategories', catRows);
  await append('ChecklistPoints', ptRows);
  await append('HandoverFields', hvRows);

  await append(
    'IncidentCategories',
    INCIDENT_CATEGORIES.map((c) => ({
      id: c.id, name: c.name, sort_order: c.sort, is_active: true,
      points: c.points, penalty_min_severity: c.penalty,
      created_at: now, updated_at: now,
    }))
  );
}

async function appendRowsSafe(
  sheets: SheetsClient,
  spreadsheetId: string,
  sheet: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  if (rows.length === 0) return;
  const values = rows.map((r) => rowFromObject(sheet, r));
  for (const part of chunk(values, 400)) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheet}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: part },
    });
    await new Promise((r) => setTimeout(r, 800));
  }
}

// ---------------------------------------------------------------------------
// Snapshot builder (meniru lib/db/snapshot.ts)
// ---------------------------------------------------------------------------

interface SnapshotPoint {
  point_ref: string; title: string; instruction: string; input_type: string;
  input_types: string[]; options: string[] | null; is_required: boolean;
  target_time: string | null; tolerance_minutes: number | null;
  active_days: string | null; number_min: number | null; number_max: number | null;
  sort_order: number; points: number;
}

function buildSnapshot(branchId: string, shift: ShiftCfg): Record<string, unknown> {
  const categories = shift.categories.map((c, ci) => ({
    id: c.id,
    name: c.name,
    sort_order: ci + 1,
    color: c.color,
    points: c.points.map((p, pi): SnapshotPoint => ({
      point_ref: p.id,
      title: p.title,
      instruction: p.instruction,
      input_type: p.input_type,
      input_types: [p.input_type],
      options: null,
      is_required: p.required,
      target_time: p.target,
      tolerance_minutes: TOL,
      active_days: DAYS_ALL,
      number_min: p.min ?? null,
      number_max: p.max ?? null,
      sort_order: pi + 1,
      points: p.weight,
    })),
  }));
  const handoverFields = shift.handovers.map((h, hi) => ({
    id: h.id,
    label: h.label,
    field_type: h.field_type,
    input_types: [h.field_type],
    options: [] as string[],
    is_required: h.required,
    sort_order: hi + 1,
    is_active: true,
  }));
  return {
    v: 2,
    score_version: 'weighted-v1',
    branch: { id: branchId },
    shift: { id: shift.id, name: shift.name, start_time: shift.start, end_time: shift.end, crosses_midnight: false },
    categories,
    handover_fields: handoverFields,
    incident_categories: INCIDENT_CATEGORIES.map((c, i) => ({
      id: c.id, name: c.name, sort_order: c.sort, is_active: true, points: c.points,
      penalty_min_severity: c.penalty, order: i + 1,
    })),
  };
}

// ---------------------------------------------------------------------------
// Data generator
// ---------------------------------------------------------------------------

interface SeedResult {
  shifts: number;
  entries: number;
  incidents: number;
  reports: number;
}

async function seedBranchData(
  sheets: SheetsClient,
  branch: BranchCfg
): Promise<SeedResult> {
  const rand = mulberry32(seedFrom(branch.cabangId));
  const snapshotByShift = new Map<string, Record<string, unknown>>();
  for (const s of SHIFT_CONFIGS) snapshotByShift.set(s.id, buildSnapshot(branch.cabangId, s));

  const shiftRows: Record<string, unknown>[] = [];
  const participantRows: Record<string, unknown>[] = [];
  const entryRows: Record<string, unknown>[] = [];
  const entryLogRows: Record<string, unknown>[] = [];
  const handoverRows: Record<string, unknown>[] = [];
  const ackRows: Record<string, unknown>[] = [];
  const reportRows: Record<string, unknown>[] = [];
  const incidentRows: Record<string, unknown>[] = [];
  const incidentIndexRows: Record<string, unknown>[] = [];
  const auditRows: Record<string, unknown>[] = [];

  // Daftar hari dalam periode
  const days: { y: number; m: number; d: number }[] = [];
  const cur = new Date(Date.UTC(PERIOD_START.y, PERIOD_START.m - 1, PERIOD_START.d));
  const end = new Date(Date.UTC(PERIOD_END.y, PERIOD_END.m - 1, PERIOD_END.d));
  while (cur <= end) {
    days.push({ y: cur.getUTCFullYear(), m: cur.getUTCMonth() + 1, d: cur.getUTCDate() });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  // Pilih shift void (2 per cabang)
  const voidIdx = new Set<number>();
  while (voidIdx.size < 2) voidIdx.add(Math.floor(rand() * days.length * 2));

  let auditSeq = 0;
  let prevHash = '';
  const lastReportByDay = new Map<string, number>();
  // Shift sebelumnya secara kronologis (untuk handover ack)
  let prevShift: { id: string; pj: string; handoverId: string } | null = null;
  const handoverIdOfShift = new Map<string, string>();

  for (const [dayIdx, day] of days.entries()) {
    const ds = dateStr(day.y, day.m, day.d);
    for (const shift of SHIFT_CONFIGS) {
      const globalIdx = dayIdx * SHIFT_CONFIGS.length + SHIFT_CONFIGS.indexOf(shift);
      const isVoid = voidIdx.has(globalIdx);

      const pj = pick(rand, PJ_POOL);
      const helpers = [...PJ_POOL].filter((u) => u !== pj);
      const helperCount = randInt(rand, 2, 3);
      const chosen: string[] = [];
      for (let i = 0; i < helperCount && helpers.length; i++) {
        chosen.push(helpers.splice(Math.floor(rand() * helpers.length), 1)[0]);
      }

      const [sh, sm] = shift.start.split(':').map(Number);
      const [eh, em] = shift.end.split(':').map(Number);
      const openDelay = randInt(rand, 2, 12);
      const outside = rand() < 0.02;
      const openMin = outside ? -randInt(rand, 5, 25) : openDelay;
      const openedAt = wibIso(day.y, day.m, day.d, sh, sm + openMin);
      const closedAt = wibIso(day.y, day.m, day.d, eh, em + randInt(rand, 5, 40));
      const isPaksa = !isVoid && rand() < 0.02;
      const hasIncident = rand() < 0.3;
      const status = isVoid ? 'void' : 'ditutup';

      const snapshot = snapshotByShift.get(shift.id)!;
      const snapshotJson = JSON.stringify(snapshot);
      const snapshotHash = sha256(snapshotJson);
      const shiftId = `SHIFT-${ds.replace(/-/g, '')}-${shift.sort}`;
      const forceReason = isPaksa ? pick(rand, FORCE_CLOSE_REASONS) : '';
      const voidReason = isVoid ? pick(rand, VOID_REASONS) : '';

      shiftRows.push({
        id: shiftId,
        shift_definition_id: shift.id,
        shift_date: ds,
        tab_month: `${day.y}-${pad2(day.m)}`,
        status,
        pj_user_id: pj,
        opened_by: pj,
        opened_at: openedAt,
        opened_outside_hours: outside,
        closed_at: closedAt,
        closed_by: pj,
        close_type: isPaksa ? 'paksa' : 'normal',
        force_close_reason: forceReason,
        is_incomplete: rand() < 0.04,
        no_incident_confirmed: !hasIncident,
        void_reason: voidReason,
        void_by: isVoid ? 'dea' : '',
        void_at: isVoid ? closedAt : '',
        tab_year: TAB_YEAR,
        template_snapshot: snapshotJson,
        snapshot_encoding: 'json',
        snapshot_hash: snapshotHash,
        created_at: openedAt,
        updated_at: closedAt,
      });

      // Participants
      participantRows.push({
        id: ulid(), shift_instance_id: shiftId, user_id: pj, joined_at: openedAt,
        first_action_type: 'buka_shift', first_action_at: openedAt,
        handover_ack_read: true, handover_ack_at: openedAt,
      });
      for (const h of chosen) {
        const at = wibIso(day.y, day.m, day.d, sh, sm + openMin + randInt(rand, 3, 25));
        participantRows.push({
          id: ulid(), shift_instance_id: shiftId, user_id: h, joined_at: at,
          first_action_type: 'saya_bertugas', first_action_at: at,
          handover_ack_read: rand() < 0.9, handover_ack_at: at,
        });
      }

      // Handover + ack (shift sebelumnya pada seri yang sama)
      const hvValues: Record<string, unknown> = {};
      for (const f of shift.handovers) {
        if (f.field_type === 'angka') {
          if (f.id === 'HV-01') hvValues[f.id] = randInt(rand, 6, 16) * 50000;
          else if (f.id === 'HV-02') hvValues[f.id] = randInt(rand, 45, 130);
          else if (f.id === 'HV-03') hvValues[f.id] = randInt(rand, 5, 45);
          else if (f.id === 'HV-06') hvValues[f.id] = randInt(rand, 4, 20) * 50000;
          else if (f.id === 'HV-07') hvValues[f.id] = randInt(rand, 90, 260);
          else hvValues[f.id] = randInt(rand, 3, 60);
        } else {
          const pool = f.id === 'HV-04'
            ? ['', 'Fryer 2 agak lambat panas', 'Printer struk perlu restart', 'Kemasan ukuran besar tinggal sedikit']
            : f.id === 'HV-05'
              ? ['', 'Lanjutkan marinasi batch sore', 'Cek stok kemasan sebelum jam sibuk']
              : f.id === 'HV-09'
                ? ['', 'Kas sudah disetor, struk berkasir rapi', 'Sisa ayam siap saji tinggal sedikit']
                : ['', 'Besok pesan ayam 25kg', 'Bersihkan printer struk pagi-pagi'];
          hvValues[f.id] = pick(rand, pool);
        }
      }
      const handoverId = ulid();
      handoverIdOfShift.set(shiftId, handoverId);
      const submittedAt = wibIso(day.y, day.m, day.d, eh, em - randInt(rand, 5, 20));
      handoverRows.push({
        id: handoverId, shift_instance_id: shiftId, values: JSON.stringify(hvValues),
        free_text: '', photo_ids: '', submitted_by: pj, submitted_at: submittedAt,
        created_at: submittedAt, updated_at: submittedAt,
      });

      // Ack: PJ shift ini membaca handover shift sebelumnya (kronologis)
      if (prevShift && prevShift.handoverId) {
        const readAt = wibIso(day.y, day.m, day.d, sh, sm + openMin + randInt(rand, 2, 15));
        ackRows.push({
          id: ulid(), handover_id: prevShift.handoverId, user_id: pj,
          reading_shift_instance_id: prevShift.id, read_at: readAt,
          unread_reason: '', created_at: readAt,
        });
      }
      prevShift = { id: shiftId, pj, handoverId: isVoid ? '' : handoverId };

      // Entries + logs
      let skipCount = 0;
      let selesaiCount = 0;
      let belumCount = 0;
      const [shH, shM] = shift.start.split(':').map(Number);
      const startMin = shH * 60 + shM;
      for (const cat of shift.categories) {
        for (const p of cat.points) {
          const entryId = ulid();
          let state: 'selesai' | 'skip' | 'belum' = 'selesai';
          if (p.required && rand() < 0.03) state = 'skip';
          else if (!p.required && (p.input_type === 'teks' || p.input_type === 'centang') && rand() < 0.05) state = 'belum';

          let value = '';
          let outOfRange = false;
          if (state === 'selesai') {
            if (p.input_type === 'centang') value = rand() < 0.97 ? 'true' : 'false';
            else if (p.input_type === 'ok_tidak_ok') value = rand() < 0.9 ? 'true' : 'false';
            else if (p.input_type === 'angka') {
              const outsideVal = rand() < 0.02 && p.min !== undefined && p.max !== undefined;
              if (outsideVal) {
                outOfRange = true;
                value = String(p.max! + randInt(rand, 1, 5));
              } else {
                let n = randInt(rand, p.min ?? 0, p.max ?? 100);
                if (p.min !== undefined && p.min >= 100000) n = Math.round(n / 50000) * 50000; // kas
                else if (p.min !== undefined && p.min >= 160 && p.max !== undefined && p.max <= 190) n = randInt(rand, 168, 182); // suhu
                else if (p.min === 1 && p.max === 8) n = randInt(rand, 2, 4); // suhu chiller
                value = String(n);
              }
            } else if (p.input_type === 'teks') {
              value = p.samples && p.samples.length ? pick(rand, p.samples) : 'Tidak ada catatan';
            }
          }

          // Waktu selesai relatif target (tidak lebih awal dari buka shift)
          const targetMin = hhmmToMin(p.target);
          const delta = randInt(rand, -20, 25);
          const doneMin = Math.max(targetMin + delta, startMin + 3);
          const timing = delta > TOL ? 'late' : delta < -TOL ? 'early' : 'on_time';
          const doneAt = wibIso(day.y, day.m, day.d, Math.floor(doneMin / 60), doneMin % 60);
          const actor = rand() < 0.8 ? pj : pick(rand, chosen.length ? chosen : [pj]);

          if (state === 'selesai') selesaiCount++;
          else if (state === 'skip') skipCount++;
          else belumCount++;

          entryRows.push({
            id: entryId, shift_instance_id: shiftId, point_id: p.id, state, value,
            completed_by: state === 'selesai' ? actor : '',
            completed_at: state === 'selesai' ? doneAt : '',
            timing_label: state === 'selesai' ? timing : '',
            timing_delta_minutes: state === 'selesai' ? delta : '',
            skip_reason: state === 'skip' ? pick(rand, SKIP_REASONS) : '',
            out_of_range: outOfRange,
            entry_log_id: '', created_at: openedAt, updated_at: doneAt,
          });
          entryLogRows.push({
            id: ulid(), entry_id: entryId,
            action: state === 'skip' ? 'skip' : state === 'belum' ? 'belum' : 'complete',
            outcome: 'success', user_id: state === 'selesai' ? actor : pj,
            prev_state: '', new_state: state, value,
            note: state === 'skip' ? pick(rand, SKIP_REASONS) : '',
            client_action_id: ulid(), client_at: doneAt, at: doneAt, created_at: doneAt,
          });
        }
      }

      // Report
      const dayKey = ds;
      const seq = (lastReportByDay.get(dayKey) ?? 0) + 1;
      lastReportByDay.set(dayKey, seq);
      const reportId = ulid();
      const generatedAt = wibIso(day.y, day.m, day.d, eh, em + randInt(rand, 6, 15));
      reportRows.push({
        id: reportId, shift_instance_id: shiftId,
        report_number: `R-${ds.replace(/-/g, '')}-${pad2(seq)}`,
        generated_by: pj, generated_at: generatedAt,
        content_hash: sha256(`${shiftId}:${reportId}`),
        is_locked: true,
        summary_stats: JSON.stringify({ total: selesaiCount + skipCount + belumCount, selesai: selesaiCount, skip: skipCount, belum: belumCount }),
        unlock_count: 0, unlock_reason: '',
        created_at: generatedAt, updated_at: generatedAt,
      });

      // Incidents
      const incCount = hasIncident ? (rand() < 0.15 ? 2 : 1) : 0;
      for (let i = 0; i < incCount; i++) {
        const cat = pick(rand, INCIDENT_CATEGORIES);
        const severity = pick(rand, cat.severity);
        const recent = dayIdx >= days.length - 10;
        const openProb = recent ? 0.4 : 0.12;
        const openStatus = rand() < openProb;
        const occurredMin = randInt(rand, shH * 60 + shM, eh * 60 + em - 30);
        const occurredAt = wibIso(day.y, day.m, day.d, Math.floor(occurredMin / 60), occurredMin % 60);
        const incId = ulid();
        incidentRows.push({
          id: incId, shift_instance_id: shiftId, category_id: cat.id, severity,
          description: pick(rand, cat.pool), occurred_at: occurredAt, reported_by: pj,
          status: openStatus ? 'open' : 'selesai',
          status_changed_by: openStatus ? '' : pj,
          status_changed_at: openStatus ? '' : wibIso(day.y, day.m, day.d, eh, em + randInt(rand, 10, 60)),
          category_points_snapshot: cat.points,
          category_penalty_min_severity_snapshot: cat.penalty,
          updated_at: occurredAt,
        });
        incidentIndexRows.push({
          incident_id: incId, tab_month: `${day.y}-${pad2(day.m)}`,
          status: openStatus ? 'open' : 'selesai', category_id: cat.id,
          shift_instance_id: shiftId, outside_shift: false, reported_at: occurredAt,
          is_test: false, updated_at: occurredAt,
        });
      }

      // Audit (hash chain)
      const pushAudit = (action: string, at: string, actor: string, reason: string) => {
        auditSeq++;
        const hash = sha256(`${prevHash}${auditSeq}${action}${at}${actor}${branch.cabangId}${shiftId}`);
        auditRows.push({
          seq: auditSeq, branch_id: branch.cabangId, at, actor, actor_role: 'petugas',
          action, object_type: 'shift', object_id: shiftId, shift_instance_id: shiftId,
          prev_hash: prevHash, hash, before_json: '', after_json: '', reason,
        });
        prevHash = hash;
      };
      pushAudit('buka_shift', openedAt, pj, '');
      if (!isVoid) pushAudit('kirim_handover', submittedAt, pj, '');
      pushAudit('tutup_shift', closedAt, pj, forceReason);
      if (isVoid) pushAudit('void_shift', closedAt, 'dea', voidReason);
    }
  }

  // Tulis semua baris
  await appendRowsSafe(sheets, branch.spreadsheetId, 'ShiftInstances', shiftRows);
  await appendRowsSafe(sheets, branch.spreadsheetId, 'Participants', participantRows);
  await appendRowsSafe(sheets, branch.spreadsheetId, 'Entries', entryRows);
  await appendRowsSafe(sheets, branch.spreadsheetId, 'EntryLogs', entryLogRows);
  await appendRowsSafe(sheets, branch.spreadsheetId, 'Handovers', handoverRows);
  await appendRowsSafe(sheets, branch.spreadsheetId, 'HandoverAcks', ackRows);
  await appendRowsSafe(sheets, branch.spreadsheetId, 'Reports', reportRows);
  await appendRowsSafe(sheets, branch.spreadsheetId, 'Incidents', incidentRows);
  await appendRowsSafe(sheets, branch.spreadsheetId, 'IncidentIndex', incidentIndexRows);
  await appendRowsSafe(sheets, branch.spreadsheetId, 'AuditLog', auditRows);

  return { shifts: shiftRows.length, entries: entryRows.length, incidents: incidentRows.length, reports: reportRows.length };
}

// ---------------------------------------------------------------------------
// Registry / Supabase
// ---------------------------------------------------------------------------

async function readRegistryRows(sheets: SheetsClient, registryId: string, sheet: string, range: string) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: registryId, range: `${sheet}!${range}` });
  return res.data.values ?? [];
}

async function ensureBekasiBranch(
  sheets: SheetsClient,
  drive: DriveClient,
  registryId: string,
  driveFolderId: string
): Promise<string> {
  const rows = await readRegistryRows(sheets, registryId, 'Daftar_Cabang', 'A:G');
  const existing = rows.slice(1).find((r) => String(r[0] ?? '') === 'CBGBSK03');
  if (existing) return String(existing[4] ?? '');

  const created = await ensureBekasiAssets(drive, driveFolderId);
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: registryId,
    range: 'Daftar_Cabang!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        'CBGBSK03', 'Cabang Bekasi', 'CBGBSK03', 'Asia/Jakarta',
        created.spreadsheetId, created.folderId, 'TRUE',
      ]],
    },
  });

  // Supabase branches (best effort)
  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { error } = await supabase.from('branches').insert({
      id: randomUUID(),
      name: 'Bekasi',
      code: 'CBGBSK03',
      city: 'Bekasi',
      address: 'Jl. Ahmad Yani No. 45',
      phone: '081234567890',
      settings: { pic_name: 'Candra', spreadsheet_id: created.spreadsheetId, folder_drive_id: created.folderId },
      status: 'active',
      created_by: '00000000-0000-0000-0000-000000000000',
    });
    if (error) console.warn('[bekasi] supabase insert:', error.message);
  } catch (e) {
    console.warn('[bekasi] supabase skip:', (e as Error).message);
  }

  return created.spreadsheetId;
}

async function attachRoster(sheets: SheetsClient, registryId: string, cabangIds: string[]): Promise<void> {
  const target = cabangIds.join(',');
  const rows = await readRegistryRows(sheets, registryId, 'Users', 'A:I');
  const headers = (rows[0] ?? []).map(String);
  const iUser = headers.indexOf('Username');
  const iCabang = headers.indexOf('Cabang_ID');
  for (let r = 1; r < rows.length; r++) {
    const username = String(rows[r][iUser] ?? '');
    if (!ALL_USERNAMES.includes(username)) continue;
    const current = String(rows[r][iCabang] ?? '');
    const parts = current.split(',').map((s) => s.trim()).filter(Boolean);
    const merged = cabangIds.filter((c) => !parts.includes(c));
    if (merged.length === 0) continue;
    await sheets.spreadsheets.values.update({
      spreadsheetId: registryId,
      range: `Users!${columnName(iCabang)}${r + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[target]] },
    });
    console.log(`  users: ${username} -> ${target}`);
  }
}

function columnName(idx: number): string {
  let n = idx + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const registryId = process.env.REGISTRY_SPREADSHEET_ID!;
  const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID ?? '';
  if (!registryId) throw new Error('REGISTRY_SPREADSHEET_ID belum di-set');

  const { sheets, drive } = buildGoogleClients();

  console.log('1) Memastikan cabang Bekasi...');
  const bekasiSheet = await ensureBekasiBranch(sheets, drive, registryId, driveFolderId);
  const branches = BRANCHES.map((b) => (b.cabangId === 'CBGBSK03' ? { ...b, spreadsheetId: bekasiSheet } : b));
  for (const b of branches) console.log(`   ${b.cabangId} ${b.nama} -> ${b.spreadsheetId}`);

  console.log('2) Attach roster ke ketiga cabang...');
  await attachRoster(sheets, registryId, branches.map((b) => b.cabangId));

  for (const b of branches) {
    console.log(`3) Reset + config ${b.cabangId}...`);
    await resetSpreadsheet(sheets, b.spreadsheetId);
    await writeBranchConfig(sheets, b.spreadsheetId, b.cabangId);

    console.log(`4) Seed data operasional ${b.cabangId} (2026-08-01 .. 2026-10-31)...`);
    const res = await seedBranchData(sheets, b);
    console.log(`   shifts=${res.shifts} entries=${res.entries} reports=${res.reports} incidents=${res.incidents}`);
  }

  console.log('Selesai.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
