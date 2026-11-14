# Master Database Setup Guide  MOCHIKIN-APPS

Dokumen ini adalah panduan arsitektur database terpadu untuk seluruh ekosistem **MOCHIKIN-APPS** (Branch `rdbms-ver`).
Seluruh modul aplikasi telah disatukan ke dalam **1 Database Supabase PostgreSQL Terpusat**:

---

## 1. Matriks Arsitektur Database Terpadu (Unified Schema)

| Aplikasi | Modul & Peran | Tabel Utama di Supabase PostgreSQL |
| :--- | :--- | :--- |
| **`myservice`** | Identity, Gateway & SSO Portal | `branches`, `people`, `branch_members`, `apps`, `brand_profiles`, `shift_definitions` |
| **`myperformance`** | Points Engine, Rollups & CARE 360 | `point_ledger`, `point_event`, `point_daily`, `point_monthly`, `task_definitions`, `care_*` |
| **`mycheck`** | SOP Checklist, Shift & Incidents | `mycheck_shift_definitions`, `mycheck_sop_categories`, `mycheck_checklist_points`, `mycheck_handover_fields`, `mycheck_shift_instances`, `mycheck_entries`, `mycheck_handovers`, `mycheck_incidents`, `mycheck_photos`, `mycheck_notifications` |
| **`stokis`** | Stock Opname & Mutasi Inventori | `stokis_items`, `stokis_branch_thresholds`, `stokis_opnames`, `stokis_opname_lines`, `stokis_mutations` |
| **`mycustomer`** | CRM, Transaksi & Loyalty Rewards | `mycust_customers`, `mycust_orders`, `mycust_order_items`, `mycust_loyalty_logs`, `mycust_interactions` |
---

## 2. Setup Cepat 1-Klik: RDBMS Supabase (MyService & MyPerformance)

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
* 📘 [Panduan Setup Database MyService](file:///home/bradley/project/MOCHIKIN-APPS/apps/myservice/SETUP_DATABASE.md)
* 📗 [Panduan Setup Database MyPerformance](file:///home/bradley/project/MOCHIKIN-APPS/apps/myperformance/SETUP_DATABASE.md)
* 📓 [Panduan Setup Database MyCheck](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycheck/SETUP_DATABASE.md)
* 📙 [Panduan Setup Database Stokis](file:///home/bradley/project/MOCHIKIN-APPS/apps/stokis/SETUP_DATABASE.md)
* 📕 [Panduan Setup Database MyCustomer](file:///home/bradley/project/MOCHIKIN-APPS/apps/mycustomer/SETUP_DATABASE.md)
