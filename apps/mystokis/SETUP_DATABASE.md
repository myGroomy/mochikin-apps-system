# Panduan Setup Database — Stokis (Stock Opname Multi-Cabang)

Aplikasi **Stokis** menggunakan arsitektur **Google Sheets Multi-Cabang + Google Apps Script (GAS)** sebagai datastore operasional stok opname dan pelaporan otomatis XLSX / WhatsApp.

---

## 1. Arsitektur Database Stokis

Sistem Stokis dirancang dengan prinsip isolasi per cabang:
1. **Registry Spreadsheet (`stokis-registry.xlsx`)**: Berisi daftar master cabang (`Daftar_Cabang`), link spreadsheet masing-masing cabang, dan akun staf.
2. **Branch Spreadsheet (`stokis-template-cabang.xlsx`)**: Satu spreadsheet terpisah untuk tiap cabang. Berisi katalog barang fisik (`Master_Item`), log pencatatan hitung stok (`SO_Transaksi`), arsip laporan (`Laporan_PDF`), dan daftar petugas outlet.

---

## 2. File Template & Skrip Siap Pakai

Semua file yang Anda butuhkan sudah tersedia di repository ini:

| Tipe File | Lokasi File | Fungsi |
| :--- | :--- | :--- |
| **Template Registry** | [`apps/stokis/templates/stokis-registry.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/stokis/templates/stokis-registry.xlsx) | Cetakan master registry cabang dan kredensial login |
| **Template Cabang** | [`apps/stokis/templates/stokis-template-cabang.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/stokis/templates/stokis-template-cabang.xlsx) | Cetakan master lembar kerja fisik stock opname tiap cabang |
| **Generator Template** | [`apps/stokis/scripts/generate-templates.ts`](file:///home/bradley/project/MOCHIKIN-APPS/apps/stokis/scripts/generate-templates.ts) | Skrip Node.js untuk meregenerasi file `.xlsx` jika skema berubah |
| **Apps Script Backend** | [`apps/stokis/apps-script/`](file:///home/bradley/project/MOCHIKIN-APPS/apps/stokis/apps-script/) | Kumpulan skrip GAS untuk provisi cabang (`SetupPhase1.js`), mutasi stok (`SO.js`), dan format PDF |

---

## 3. Langkah Demi Langkah Setup (10 Menit)

### Tahap 1: Upload Template ke Google Drive
1. Buat folder baru di Google Drive Anda (misal: `MOCHIKIN_STOKIS_DATA`).
2. Upload file [`stokis-registry.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/stokis/templates/stokis-registry.xlsx) ke folder tersebut. Buka dengan Google Sheets untuk mengonversi menjadi Google Spreadsheet.
3. Upload file [`stokis-template-cabang.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/stokis/templates/stokis-template-cabang.xlsx) ke folder yang sama. Buka dengan Google Sheets.
4. Salin ID dari URL browser masing-masing spreadsheet:
   * Format URL: `https://docs.google.com/spreadsheets/d/`**`[SPREADSHEET_ID]`**`/edit`
5. Buka spreadsheet **Registry** hasil konversi, lalu buka tab `Template_Referensi`:
   * Kolom A2 (`Template_Spreadsheet_ID`): Tempelkan ID spreadsheet `stokis-template-cabang`.

### Tahap 2: Bagikan Akses ke Google Service Account
1. Ambil email Service Account Anda (misal: `mochikin-worker@your-project.iam.gserviceaccount.com`).
2. Bagikan (*Share*) folder `MOCHIKIN_STOKIS_DATA` kepada email Service Account tersebut dengan hak akses **Editor**.

### Tahap 3: Deploy Google Apps Script (GAS Backend)
1. Buka [Google Apps Script](https://script.google.com) > Klik **New Project**.
2. Beri nama: `Stokis-Backend-GAS`.
3. Salin kode dari folder [`apps/stokis/apps-script/`](file:///home/bradley/project/MOCHIKIN-APPS/apps/stokis/apps-script/):
   * Masukkan `Code.js`, `MasterItem.js`, `SO.js`, `Laporan.js`, `PDF.js`, `SetupPhase1.js`.
4. Buka **Project Settings (Ikon Gerigi)** > **Script Properties**, tambahkan:
   * `FOLDER_DRIVE_INDUK`: *[ID folder Google Drive MOCHIKIN_STOKIS_DATA]*
   * `API_SECRET_KEY`: `kunci-rahasia-stokis-anda`
5. Klik **Deploy > New Deployment**:
   * Select type: **Web app**
   * Execute as: **Me**
   * Who has access: **Anyone**
   * Klik **Deploy** dan salin **Web App URL**.

---

## 4. Konfigurasi Environment Variables (`.env.local`)

Salin atau buat file `.env.local` di folder `apps/stokis/`:

```bash
# ID Spreadsheet Registry Stokis
STOKIS_REGISTRY_SPREADSHEET_ID="1xYz..."

# Kredensial Google Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL="mochikin-worker@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...YOUR_KEY...\n-----END PRIVATE KEY-----\n"

# Webhook Google Apps Script
STOKIS_GAS_URL="https://script.google.com/macros/s/AKfycb.../exec"
STOKIS_GAS_SECRET="kunci-rahasia-stokis-anda"

# Keamanan Sesi Cookie & SSO
SESSION_SECRET="kunci-enkripsi-sesi-rahasia-32-karakter"
LAUNCHER_SSO_SHARED_SECRET="ganti-dengan-kunci-rahasia-panjang-dan-acak-32-karakter"

# Port & URL
PORT=3002
APP_URL="http://localhost:3002"
NEXT_PUBLIC_APP_URL="http://localhost:3002"
```

---

## 5. Cabang & Akun Operasional Pre-seeded

Template `stokis-registry.xlsx` sudah dilengkapi dengan 3 cabang operasional dan akun petugas (PIN default `1234`):
* **Bandung (`CAB-BDG`)**: PIC Candra, Petugas Budi & Luthfia.
* **Cimahi (`CAB-CMH`)**: PIC Prita, Petugas Nurul Hilma & Rifah.
* **Bekasi (`CAB-BKS`)**: PIC Sabat, Petugas Dimas & Siti.
* **Admin Pusat (`*`)**: `admin`, `dea`.

---

## 6. Menambah Cabang Baru

1. Jalankan aplikasi Stokis (`pnpm --filter stokis dev`).
2. Masuk sebagai admin (`/login` dengan PIN `1234`).
3. Buka menu **Cabang** > Klik **Buat Cabang Baru**.
4. Masukkan Nama Cabang & Alamat. Sistem akan otomatis menyalin `stokis-template-cabang` menjadi spreadsheet cabang baru di Google Drive Anda.
