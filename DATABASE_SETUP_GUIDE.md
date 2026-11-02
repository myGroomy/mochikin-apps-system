# Master Database Setup Guide — MOCHIKIN-APPS

Dokumen ini adalah panduan terpadu dan arsitektur database untuk seluruh ekosistem **MOCHIKIN-APPS**. Ekosistem ini menggunakan pendekatan **Hybrid Architecture**:
1. **RDBMS (Supabase / PostgreSQL)**: Digunakan untuk autentikasi terpusat (SSO), manajemen identitas, master data cabang/karyawan, Points Engine (ledger & rollup), dan CARE scorecards.
2. **Google Sheets + Google Apps Script (GAS)**: Digunakan untuk penyimpanan data operasional gerai harian (Checklist SOP, Stock Opname, CRM/Loyalty) agar manajer operasional dan supervisor gerai dapat langsung meninjau data dalam bentuk spreadsheet tanpa ketergantungan tool teknis.

---

## 1. Matriks Arsitektur Database Per Aplikasi

| Aplikasi | Jenis Database | Lokasi Template / Skrip | Fungsi & Tabel Utama |
| :--- | :--- | :--- | :--- |
| **`mochikin-service`** | **RDBMS (Supabase)** | [`supabase/FULL_SETUP.sql`](file:///home/bradley/project/MOCHIKIN-APPS/supabase/FULL_SETUP.sql) | Portal Launcher SSO, autentikasi NIK & PIN staf, master data cabang (`branches`, `people`, `apps`). |
| **`myperformance`** | **RDBMS (Supabase) + Redis** | [`supabase/FULL_SETUP.sql`](file:///home/bradley/project/MOCHIKIN-APPS/supabase/FULL_SETUP.sql) | Engine Poin Harian, Immutable Ledger, CARE 360 Scorecards, Rollup Poin (`point_ledger`, `point_rollups`, `task_definitions`). |
| **`mycheck`** | **Google Sheets + GAS** | [`apps/mycheck/templates/`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/templates/) & [`apps/mycheck/apps-script/`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/apps-script/) | Checklist SOP Shift, Handover, Incident Tracking, Rekap Skor Shift. (1 Spreadsheet Registry + 1 Spreadsheet per Cabang). |
| **`stokis`** | **Google Sheets + GAS** | [`apps/stokis/templates/`](file:///home/bradley/project/MOCHIKIN-APPS/apps/stokis/templates/) & [`apps/stokis/apps-script/`](file:///home/bradley/project/MOCHIKIN-APPS/apps/stokis/apps-script/) | Stock Opname harian/mingguan multi-cabang, threshold stok kritis, export XLSX otomatis, integrasi WhatsApp. |
| **`mycustomer`** | **Google Sheets** | [`apps/mycustomer/templates/`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycustomer/templates/) | Data pelanggan, order transaksi, loyalty reward, riwayat interaksi cabang (1 Multi-Tab Spreadsheet). |

---

## 2. Setup Cepat 1-Klik: RDBMS Supabase (Mochikin-Service & MyPerformance)

Untuk kedua aplikasi RDBMS, skema tabel, fungsi, indeks, dan data awal (*seed data*) telah disatukan dalam **satu file SQL idempotent**:

### Langkah Setup Supabase:
1. Buat project baru di [Supabase Dashboard](https://supabase.com).
2. Buka menu **SQL Editor** di sidebar Supabase.
3. Buka file [`supabase/FULL_SETUP.sql`](file:///home/bradley/project/MOCHIKIN-APPS/supabase/FULL_SETUP.sql), salin seluruh isinya, dan tempelkan ke SQL Editor.
4. Klik tombol **Run**.
5. Selesai! Seluruh tabel, relasi, indeks, akun default admin (`admin` / PIN: `1234`), katalog aplikasi, dan katalog poin telah terbentuk otomatis.
6. Salin kredensial dari **Project Settings > API**:
   * `Project URL` → masukkan ke `SUPABASE_URL` atau `NEXT_PUBLIC_SUPABASE_URL`
   * `anon public key` → masukkan ke `SUPABASE_ANON_KEY` atau `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `service_role secret` → masukkan ke `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Setup Google Sheets & Google Apps Script (GAS)

Untuk aplikasi yang menggunakan Google Sheets (`stokis`, `mycheck`, `mycustomer`), Anda memerlukan **Google Service Account**:

### Langkah Pembuatan Google Service Account (GSA):
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat Project baru (misal: `Mochikin-Ecosystem`).
3. Aktifkan API berikut di **APIs & Services > Library**:
   * **Google Sheets API**
   * **Google Drive API**
4. Buka **IAM & Admin > Service Accounts** > Klik **Create Service Account**.
5. Beri nama (misal: `mochikin-sheets-worker`).
6. Setelah dibuat, klik service account tersebut > Tab **Keys** > **Add Key** > **Create new key (JSON)**.
7. Simpan file JSON yang terunduh. Salin:
   * `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   * `private_key` → `GOOGLE_PRIVATE_KEY` (pastikan tanda petik dua dan newline `\n` terjaga).

### Template File Siap Pakai:
Tersedia file template spreadsheet `.xlsx` yang dapat langsung diunggah ke Google Drive:
* **Stokis**:
  * [`apps/stokis/templates/stokis-registry.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/stokis/templates/stokis-registry.xlsx)
  * [`apps/stokis/templates/stokis-template-cabang.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/stokis/templates/stokis-template-cabang.xlsx)
* **MyCheck**:
  * [`apps/mycheck/templates/mycheck-registry.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/templates/mycheck-registry.xlsx)
  * [`apps/mycheck/templates/mycheck-template-flat.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/templates/mycheck-template-flat.xlsx)
* **MyCustomer**:
  * [`apps/mycustomer/templates/mycustomer-database-template.xlsx`](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycustomer/templates/mycustomer-database-template.xlsx)

---

## 4. Panduan Lengkap Per Aplikasi

Silakan ikuti panduan detail langkah demi langkah pada masing-masing folder aplikasi:
* 📘 [Panduan Setup Database Mochikin-Service](file:///home/bradley/project/MOCHIKIN-APPS/apps/mochikin-service/SETUP_DATABASE.md)
* 📗 [Panduan Setup Database MyPerformance](file:///home/bradley/project/MOCHIKIN-APPS/apps/myperformance/SETUP_DATABASE.md)
* 📓 [Panduan Setup Database MyCheck](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/SETUP_DATABASE.md)
* 📙 [Panduan Setup Database Stokis](file:///home/bradley/project/MOCHIKIN-APPS/apps/stokis/SETUP_DATABASE.md)
* 📕 [Panduan Setup Database MyCustomer](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycustomer/SETUP_DATABASE.md)
