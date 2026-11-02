# Panduan Setup Database — MyCustomer (Loyalty, POS & CRM)

Aplikasi **MyCustomer** menggunakan **Google Sheets Tunggal Multi-Tab** sebagai datastore operasional pelanggan, pemesanan, dan program loyalitas multi-cabang.

---

## 1. Arsitektur Database MyCustomer

Seluruh data MyCustomer disimpan dalam **satu Google Spreadsheet** yang terdiri dari tab-tab terstruktur:

| Nama Tab | Fungsi & Kolom Utama |
| :--- | :--- |
| **`customers`** | Master data profil pelanggan (ID, Nama, No. HP, Gender, Rentang Usia, Riwayat Cabang, Tanggal Order Pertama/Terakhir, Total Kunjungan). |
| **`orders`** | Riwayat transaksi pemesanan (Tanggal Order, Channel/Tipe Order, Cabang, No. HP). |
| **`customer_branches`** | Hubungan kunjungan pelanggan per cabang gerai. |
| **`branches`** | Master cabang yang aktif melayani pelanggan. |
| **`users`** | Akun staf kasir / supervisor gerai. |
| **`settings`** | Parameter sistem (minimal belanja poin reward, masa berlaku poin, tiering). |
| **`staging_cmh` / `staging_bdg` / `staging_bks`** | Buffer data staging antrian pesanan per cabang (Cimahi, Bandung, Bekasi). |
| **`import_customers` / `import_orders`** | Template untuk import massal data lama. |

---

## 2. File Template Siap Pakai

File template workbook lengkap sudah tersedia di repository:

| Tipe File | Lokasi File | Fungsi |
| :--- | :--- | :--- |
| **Template Spreadsheet** | [`apps/mycustomer/templates/mycustomer-database-template.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycustomer/templates/mycustomer-database-template.xlsx) | Cetakan workbook siap pakai berisi 10 tab terformat |
| **Generator Template** | [`apps/mycustomer/templates-database/generate_templates.py`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycustomer/templates-database/generate_templates.py) | Skrip Python untuk meregenerasi file `.xlsx` jika skema berubah |

---

## 3. Langkah Demi Langkah Setup (5 Menit)

### Tahap 1: Upload Template ke Google Drive
1. Buka [Google Drive](https://drive.google.com).
2. Upload file [`mycustomer-database-template.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycustomer/templates/mycustomer-database-template.xlsx).
3. Klik kanan file yang terunggah > **Open with > Google Sheets** (Google Drive akan mengonversinya menjadi Google Spreadsheet).
4. Salin ID Spreadsheet dari URL browser Anda:
   * Format URL: `https://docs.google.com/spreadsheets/d/`**`[SPREADSHEET_ID]`**`/edit`
5. (Opsional) Hapus tab `_panduan` di dalam spreadsheet karena hanya berisi petunjuk teknis.

### Tahap 2: Berikan Akses ke Google Service Account
1. Buka spreadsheet yang baru dibuat.
2. Klik tombol **Share (Bagikan)** di pojok kanan atas.
3. Masukkan email **Google Service Account** Anda (misal: `mochikin-worker@your-project.iam.gserviceaccount.com`).
4. Atur role sebagai **Editor** > Hilangkan centang "Notify people" > Klik **Share**.

---

## 4. Konfigurasi Environment Variables (`.env.local`)

Salin atau buat file `.env.local` di folder `apps/mycustomer/`:

```bash
# ID Spreadsheet Database MyCustomer (Hasil Tahap 1)
GOOGLE_SPREADSHEET_ID="1a2b3c4d5e..."

# Kredensial Google Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL="mochikin-worker@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...YOUR_KEY...\n-----END PRIVATE KEY-----\n"

# Keamanan Sesi Cookie & SSO
SESSION_SECRET="kunci-enkripsi-sesi-rahasia-32-karakter"
LAUNCHER_SSO_SHARED_SECRET="ganti-dengan-kunci-rahasia-panjang-dan-acak-32-karakter"

# Port & URL
PORT=3003
APP_URL="http://localhost:3003"
NEXT_PUBLIC_APP_URL="http://localhost:3003"
```

---

## 5. Cabang & Akun Operasional Pre-seeded

Template `mycustomer-database-template.xlsx` sudah mencakup 3 cabang dan akun kasir/admin operasional (PIN `1234`):
* **Cabang**: Cimahi (`CMH`), Bandung (`BDG`), Bekasi (`BKS`).
* **Akun Pengguna**:
  * `admin` (Owner - Pusat)
  * `dea` (Admin - Pusat)
  * `candra` (Admin/SPV BDG) & `budi` (Kasir BDG)
  * `prita` (Admin/SPV CMH) & `nurul` (Kasir CMH)
  * `sabat` (Admin/SPV BKS) & `dimas` (Kasir BKS)

---

## 6. Catatan Penting Penggunaan

* **Jangan Mengubah Nama Tab**: Kode backend membaca tab dengan nama persis seperti di template (`customers`, `orders`, `branches`, dll).
* **Format Nomor HP**: Kolom nomor telepon diformat sebagai **Teks** agar angka `0` di awal nomor HP Indonesia (misal: `08123...`) tidak terpotong menjadi integer.
* **Auto-Increment ID**: Aplikasi otomatis meng-generate ULID/ID unik untuk setiap pelanggan baru yang didaftarkan kasir.
