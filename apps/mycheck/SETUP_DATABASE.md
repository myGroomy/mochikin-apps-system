# Panduan Setup Database — MyCheck (Checklist SOP, Handover & Incident)

Aplikasi **MyCheck** menggunakan arsitektur **Google Sheets Multi-Cabang + Google Apps Script (GAS)** sebagai datastore operasional gerai, sehingga supervisor dan manajer cabang dapat langsung membuka lembar kerja Google Sheets tanpa ketergantungan perangkat khusus.

---

## 1. Arsitektur Database MyCheck

MyCheck membagi spreadsheet menjadi 2 jenis:
1. **Registry Spreadsheet (`mycheck-registry.xlsx`)**: Berisi daftar seluruh cabang, akun pengguna staf/admin, dan pengaturan global sistem.
2. **Branch Spreadsheet (`mycheck-template-flat.xlsx`)**: Satu spreadsheet terpisah untuk setiap cabang fisik. Berisi definisi shift, kategori SOP, butir checklist, field handover, kategori insiden, dan riwayat laporan per bulan.

---

## 2. File Template & Skrip Siap Pakai

Semua file yang Anda butuhkan sudah tersedia di repository ini:

| Tipe File | Lokasi File | Fungsi |
| :--- | :--- | :--- |
| **Template Registry** | [`apps/mycheck/templates/mycheck-registry.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/templates/mycheck-registry.xlsx) | Template workbook sentral registry cabang & user |
| **Template Cabang** | [`apps/mycheck/templates/mycheck-template-flat.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/templates/mycheck-template-flat.xlsx) | Cetakan workbook operasional untuk setiap cabang baru |
| **Apps Script Backend** | [`apps/mycheck/apps-script/Code.gs`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/apps-script/Code.gs) | Skrip webhook GAS untuk upload bukti foto & provisi cabang |
| **Apps Script Key Setup** | [`apps/mycheck/apps-script/SetKey.gs`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/apps-script/SetKey.gs) | Skrip pembantu mengatur Script Properties di Google Cloud |

---

## 3. Langkah Demi Langkah Setup (10 Menit)

### Tahap 1: Upload Template ke Google Drive
1. Buat folder baru di Google Drive Anda (misal: `MOCHIKIN_MYCHECK_DATA`).
2. Upload file [`mycheck-registry.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/templates/mycheck-registry.xlsx) ke folder tersebut. Buka dengan Google Sheets untuk mengonversinya.
3. Upload file [`mycheck-template-flat.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/templates/mycheck-template-flat.xlsx) ke folder yang sama. Buka dengan Google Sheets.
4. Salin ID dari URL browser masing-masing spreadsheet:
   * Format URL: `https://docs.google.com/spreadsheets/d/`**`[SPREADSHEET_ID]`**`/edit`
5. Buka spreadsheet **Registry** hasil konversi, lalu buka tab `Template_Referensi`:
   * Kolom A2 (`Template_Spreadsheet_ID`): Tempelkan ID spreadsheet `mycheck-template-flat`.

### Tahap 2: Bagikan Akses ke Google Service Account
1. Ambil email Service Account Anda (misal: `mochikin-worker@your-project.iam.gserviceaccount.com`).
2. Bagikan (*Share*) folder `MOCHIKIN_MYCHECK_DATA` kepada email Service Account tersebut sebagai **Editor**. Dengan begitu, seluruh spreadsheet di dalam folder otomatis dapat dibaca dan ditulis oleh aplikasi.

### Tahap 3: Deploy Google Apps Script (Untuk Upload Foto & Autentikasi Cabang)
1. Buka [Google Apps Script](https://script.google.com) > Klik **New Project**.
2. Beri nama project: `MyCheck-Backend-GAS`.
3. Buka file [`apps/mycheck/apps-script/Code.gs`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/apps-script/Code.gs), salin seluruh kodenya, dan tempelkan ke editor Apps Script.
4. Buat file baru bernama `SetKey.gs`, salin isi [`apps/mycheck/apps-script/SetKey.gs`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/apps-script/SetKey.gs).
5. Pada menu **Project Settings (Ikon Gerigi)** > **Script Properties**, tambahkan:
   * `KEY_UPLOAD`: `kunci-rahasia-upload-anda`
   * `KEY_ADMIN`: `kunci-rahasia-admin-anda`
   * `TEMPLATE_SHEET_ID`: *[ID spreadsheet mycheck-template-flat]*
   * `ALLOWED_ROOT_IDS`: *[ID folder Google Drive MOCHIKIN_MYCHECK_DATA]*
   * `SA_EMAIL`: *[Email Service Account Anda]*
6. Klik **Deploy > New Deployment**:
   * Select type: **Web app**
   * Description: `Production v1`
   * Execute as: **Me (email Anda)**
   * Who has access: **Anyone**
   * Klik **Deploy** dan salin **Web App URL**.

---

## 4. Konfigurasi Environment Variables (`.env.local`)

Salin atau buat file `.env.local` di folder `apps/mycheck/`:

```bash
# ID Spreadsheet Registry
REGISTRY_SPREADSHEET_ID="1a2b3c4d5e..."

# Kredensial Google Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL="mochikin-worker@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...YOUR_KEY...\n-----END PRIVATE KEY-----\n"

# Webhook Google Apps Script (Hasil Deploy Tahap 3)
MYCHECK_GAS_WEBHOOK_URL="https://script.google.com/macros/s/AKfycb.../exec"
MYCHECK_GAS_API_KEY="kunci-rahasia-admin-anda"

# Keamanan Sesi Cookie & SSO
SESSION_SECRET="kunci-enkripsi-sesi-rahasia-32-karakter"
LAUNCHER_SSO_SHARED_SECRET="ganti-dengan-kunci-rahasia-panjang-dan-acak-32-karakter"

# Port & URL
PORT=3001
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

---

## 5. Cabang & Akun Operasional Pre-seeded

Sistem MyCheck terintegrasi dengan 3 cabang operasional dan akun petugas (PIN default `1234`):
* **Bandung (`CBGBDG01` / `BDG`)**: PIC Candra, Petugas Budi & Luthfia.
* **Cimahi (`CBGCMH02` / `CMH`)**: PIC Prita, Petugas Nurul Hilma & Rifah.
* **Bekasi (`CBGBSK03` / `BKS`)**: PIC Sabat, Petugas Dimas & Siti.
* **Admin Pusat (`*`)**: `admin`, `dea`.

---

## 6. Membuat Cabang Tambahan

Untuk membuat cabang operasional baru di luar 3 cabang di atas:
1. Jalankan aplikasi MyCheck (`pnpm --filter mycheck dev`).
2. Masuk ke panel admin (`/admin/cabang`).
3. Klik **Tambah Cabang**:
   * Nama Cabang: Nama cabang baru
   * Kode: Kode unik cabang (misal `CAB-004`)
4. Sistem akan otomatis menyalin `mycheck-template-flat` menjadi spreadsheet cabang baru, mendaftarkannya di Registry, dan menyiapkan struktur tab SOP.
