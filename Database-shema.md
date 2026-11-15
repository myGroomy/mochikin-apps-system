# Dokumentasi Skema Database Terpusat (RDBMS Supabase PostgreSQL)

**Sumber DDL Utama**: [`supabase/FULL_SETUP.sql`](supabase/FULL_SETUP.sql)  
**Engine**: PostgreSQL 15+ (Supabase)  
**Total Tabel**: 44 Tabel Relasional + 1 Public Storage Bucket (`mycheck-photos`)  

Seluruh aplikasi dalam monorepo (`myservice`, `mycheck`, `mystokis`, `mycustomer`, `myperformance`) menggunakan satu database PostgreSQL terpusat di skema `public`.

---

## 1. Domain Master Data & Portal SSO (`myservice`)

### 1.1 `branches` (Master Cabang)
| Kolom | Tipe | Constraint | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | ID unik cabang |
| `name` | `TEXT` | `NOT NULL` | Nama cabang (contoh: `Mochikin Bandung Setiabudi`) |
| `code` | `TEXT` | `UNIQUE NOT NULL` | Kode cabang unik (contoh: `CBG01BDG`) |
| `description` | `TEXT` | | Deskripsi cabang |
| `city` | `TEXT` | `NOT NULL DEFAULT 'Bandung'` | Kota lokasi cabang |
| `address` | `TEXT` | | Alamat lengkap cabang |
| `phone` | `TEXT` | | Nomor telepon/WhatsApp cabang |
| `parent_branch_id`| `UUID` | `REFERENCES branches(id) ON DELETE SET NULL` | Induk cabang (jika sub-cabang) |
| `settings` | `JSONB` | `NOT NULL DEFAULT '{}'::jsonb` | Pengaturan spesifik cabang (`urutanLaporan`, dll.) |
| `status` | `TEXT` | `CHECK (status IN ('active', 'inactive', 'closed'))` | Status operasional cabang |
| `created_by` | `UUID` | `NOT NULL` | Pembuat record |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Waktu pembuatan |
| `updated_by` | `UUID` | | Pengubah terakhir |
| `updated_at` | `TIMESTAMPTZ` | | Waktu perubahan terakhir |
| `deleted_at` | `TIMESTAMPTZ` | | Soft-delete timestamp |
- **Indexes**: `idx_branches_code`, `idx_branches_status`, `idx_branches_city`.

### 1.2 `people` (Master Staf & Pengguna)
| Kolom | Tipe | Constraint | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | ID unik personel |
| `name` | `TEXT` | `NOT NULL` | Nama lengkap staf |
| `email` | `TEXT` | `UNIQUE` | Alamat email |
| `phone` | `TEXT` | | Nomor WhatsApp/telepon |
| `username` | `TEXT` | `UNIQUE` | Username login SSO |
| `pin_hash` | `TEXT` | | Hash PIN format `salt$scryptHex` |
| `role` | `TEXT` | `CHECK (role IN ('super_admin','role_admin','branch_manager','staff','guest','admin','petugas'))` | Peran pengguna |
| `branch_id` | `UUID` | `REFERENCES branches(id)` | Cabang utama staf |
| `status` | `TEXT` | `CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated'))` | Status kepegawaian |
| `hire_date` | `DATE` | | Tanggal mulai bekerja |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Waktu pembuatan |
| `updated_at` | `TIMESTAMPTZ` | | Waktu pembaruan |
| `deleted_at` | `TIMESTAMPTZ` | | Soft-delete timestamp |
- **Indexes**: `idx_people_email`, `idx_people_username_lower`, `idx_people_branch_id`, `idx_people_role`, `idx_people_status`.

### 1.3 `branch_members` (Penugasan Multi-Cabang)
| Kolom | Tipe | Constraint | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | ID relasi |
| `person_id` | `UUID` | `NOT NULL REFERENCES people(id) ON DELETE CASCADE` | Staf yang ditugaskan |
| `branch_id` | `UUID` | `NOT NULL REFERENCES branches(id) ON DELETE CASCADE` | Cabang penugasan |
| `is_primary` | `BOOLEAN` | `NOT NULL DEFAULT false` | Penanda cabang utama |
| `assigned_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Waktu penugasan |
- **Unique**: `UNIQUE(person_id, branch_id)`
- **Indexes**: `idx_branch_members_person`, `idx_branch_members_branch`.

### 1.4 Tabel Pendukung Portal
- **`shift_definitions`**: Master definisi jam shift global/per-cabang (`code`, `name`, `shift_type`, `start_time`, `end_time`, `sort_order`).
- **`apps`**: Katalog registrasi aplikasi ekosistem (`name`, `title`, `url`, `callback_url`, `status`, `allowed_roles`).
- **`brand_profiles`**: Konfigurasi identitas visual dan warna tema aplikasi (`id = 'default'`, `brand_name`, `themes` JSONB).
- **`ref_app`**: Referensi aplikasi penghasil poin (`mycheck`, `stokis`, `mycustomer`, `myperformance`).
- **`dim_item`**: Dimensi item lintas aplikasi untuk pembobotan poin (`item_id`, `app_id`, `item_code`, `item_name`, `weight_default`, `tier_level`).

---

## 2. Domain Gamifikasi & Evaluasi Kinerja (`myperformance`)

### 2.1 Mesin Poin & Buku Besar (*Points Engine*)
1. **`task_definitions`**: Katalog kode tugas (`task_code` PK, `app_id`, `name`, `default_points`).
2. **`point_config`**: Konfigurasi aturan poin per aplikasi (`id`, `app_id`, `entity_type`, `entity_id`, `point_value`, `set_method`, `version`).
3. **`idempotency_registry`**: Pencegah duplikasi pengiriman event (`idempotency_key` PK, `app_id`, `person_id`, `response_status`, `expires_at`).
4. **`point_ledger`** (*Append-Only*):
   - Menyimpan buku besar mutasi poin per staf per shift (`id`, `person_id`, `branch_id`, `app_id`, `task_code`, `shift_date`, `points`, `is_reversal`, `reversal_of`).
   - **Trigger**: `trg_point_ledger_append_only` (mencegah `UPDATE` dan `DELETE`).
5. **`point_event`** & **`point_event_line`** (*Immutable Header & Lines*):
   - Menyimpan sesi perolehan poin (`event_id`, `app_id`, `person_id`, `branch_id`, `shift_date`, `total_points`, `status`, `idempotency_key`) beserta rincian baris itemnya (`line_id`, `event_id`, `item_id`, `points_awarded`).
   - **Triggers**: `trg_immutable_header` & `trg_immutable_line` (melarang perubahan data historis selain kolom `status` untuk *reversal*).
   - **Indexes**: B-Tree `idx_point_event_lookup`, `idx_point_event_shift_date`, `idx_point_event_line_event`.
6. **`point_daily`**, **`point_monthly`**, **`point_rollups`**: Tabel agregasi poin harian, bulanan, dan *leaderboard rollup* (`UNIQUE(person_id, branch_id, period_type, period_key)`).

### 2.2 Evaluasi CARE 360° & Isu ITO
- **`care_dimensions`**: Dimensi penilaian (`name`, `weight`, `sort_order`).
- **`care_settings`**: Pengaturan bobot penilai (`weight_self`, `weight_peer`, `weight_leader`).
- **`care_periods`**: Periode kuartal/bulanan evaluasi (`code`, `status`: `draft | open | closed`).
- **`care_submissions`**, **`care_assessments`**, **`care_assessments_rp`**, **`care_scores`**: Data pengajuan penilaian mandiri, rekan, atasan, serta kalkulasi skor akhir.
- **`care_complaints`**, **`care_followups`**, **`care_ito_issues`**, **`ito_issues`**: Pelacakan komplain dan tindak lanjut *Issue-to-Outcome* (ITO).

---

## 3. Domain Operasional Checklist SOP (`mycheck`)

### 3.1 Konfigurasi Template SOP
- **`mycheck_shift_definitions`**: Definisi shift per cabang (`id`, `branch_id`, `name`, `start_time`, `end_time`, `crosses_midnight`, `version`).
- **`mycheck_sop_categories`**: Kategori grup checklist (`id`, `shift_definition_id`, `name`, `color`, `sort_order`).
- **`mycheck_checklist_points`**: Butir pemeriksaan SOP (`id`, `category_id`, `title`, `instruction`, `input_type`, `input_types`, `is_required`, `target_time`, `points`).
- **`mycheck_handover_fields`**: Konfigurasi isian serah terima shift (`id`, `shift_definition_id`, `label`, `field_type`, `is_required`).

### 3.2 Operasional Shift Harian
- **`mycheck_shift_instances`**:
  - `id` (`TEXT PRIMARY KEY`, contoh: `SI_01J...`), `branch_id`, `shift_definition_id`, `shift_date`, `status` (`open | closed | force_closed | void`), `pj_user_id`, `opened_at`, `closed_at`, `template_snapshot` (`JSONB`), `is_test`.
  - **Indexes**: `idx_mc_instances_branch_date`, `idx_mc_instances_status`.
- **`mycheck_entries`**:
  - Jawaban checklist aktual (`id` UUID, `shift_instance_id`, `point_id`, `point_text_snap`, `input_type`, `value_boolean`, `value_number`, `value_text`, `photo_url`, `notes`, `filled_by_user_id`, `filled_at`).
- **`mycheck_handovers`**:
  - Rekaman serah terima shift (`id` UUID, `shift_instance_id`, `from_user_id`, `field_values` JSONB, `notes`, `submitted_at`, `acknowledged_by_id`).
- **`mycheck_incidents`**:
  - Laporan insiden operasional (`id` UUID, `branch_id`, `shift_instance_id`, `category`, `title`, `description`, `severity`: `low | medium | high | critical`, `status`: `open | investigating | resolved`, `photo_urls` TEXT[]).
- **`mycheck_notifications`**:
  - Notifikasi aplikasi untuk pengguna (`id` UUID, `user_id`, `branch_id`, `type`, `title`, `body`, `link`, `is_read`, `created_at`).

### 3.3 Supabase Storage Bucket: `mycheck-photos`
- **ID Bucket**: `mycheck-photos` (`public = true`)
- **Batas Ukuran Berkas**: `5.242.880 bytes` (5 MB)
- **Tipe MIME Diizinkan**: `image/jpeg`, `image/png`, `image/webp`
- **Format Path Objek**: `${branchCode}/${YYYY-MM}/${baseName}-${ulid6}.${ext}`
- **Policies**: `mycheck_photos_public_read` (`SELECT`), `mycheck_photos_auth_insert` (`INSERT`), `mycheck_photos_auth_delete` (`DELETE`).

---

## 4. Domain Stock Opname & Inventaris (`mystokis`)

### 4.1 `stokis_items` (Katalog Master Barang)
| Kolom | Tipe | Constraint | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | ID unik barang |
| `code` | `TEXT` | `UNIQUE NOT NULL` | Kode SKU barang (contoh: `ITM001`) |
| `name` | `TEXT` | `NOT NULL` | Nama barang |
| `category` | `TEXT` | `NOT NULL DEFAULT 'Ingredient'` | Kategori barang |
| `area` | `TEXT` | `DEFAULT 'Kitchen'` | Area penyimpanan (`Chiller`, `Meja Laci`, dll.) |
| `unit` | `TEXT` | `NOT NULL` | Satuan hitung (`gram`, `pcs`, `pack`, `porsi`) |
| `conversion_qty` | `NUMERIC(12,2)` | | Nilai konversi kemasan |
| `min_stock` | `NUMERIC(12,2)` | `DEFAULT 0.00` | Stok minimum global |
| `tipe_input` | `VARCHAR(64)` | `NOT NULL DEFAULT 'dual'` | Tipe input SO (`dual`, `single`, `boolean`, `date`, `expiry`, `text`) |
| `points_weight` | `NUMERIC(10,2)` | `NOT NULL DEFAULT 1.00` | Bobot poin item |
| `status` | `TEXT` | `DEFAULT 'active'` | Status aktif/nonaktif |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | Flag aktif |

### 4.2 `stokis_branch_thresholds` (Threshold Kritis Per Cabang)
- `id` (`UUID PK`), `branch_id` (`REFERENCES branches(id)`), `item_id` (`REFERENCES stokis_items(id)`), `threshold` (`NUMERIC(12,2)`).
- **Constraint**: `UNIQUE(branch_id, item_id)`.

### 4.3 `stokis_opnames` & `stokis_opname_lines` (Transaksi Stock Opname)
- **`stokis_opnames` (Header Sesi SO)**:
  - `id` (`UUID PK`), `sesi_id` (`TEXT UNIQUE NOT NULL`), `branch_id`, `branch_code`, `opname_date` (`DATE`), `shift_type` (`opening | closing`), `status` (`draft | submitted | verified`), `petugas`, `notes`, `submitted_by_id`, `submitted_at`, `xlsx_payload` (`JSONB`), `wa_sent_at` (`TIMESTAMPTZ`).
- **`stokis_opname_lines` (Detail Item SO)**:
  - `id` (`UUID PK`), `opname_id` (`REFERENCES stokis_opnames(id) ON DELETE CASCADE`), `item_id`, `item_code`, `item_name`, `area`, `unit`, `threshold`, `step1`, `step2`, `physical_stock`, `system_stock`, `difference`, `status_isi`, `tgl_refill`, `tgl_pakai`, `tgl_kedaluwarsa`, `keterangan`.
- **`stokis_mutations`**: Log mutasi masuk/keluar/penyesuaian stok (`in | out | adjustment | opname_variance`).

---

## 5. Domain CRM & Loyalitas Pelanggan (`mycustomer`)

### 5.1 `mycust_customers` (Master Pelanggan)
| Kolom | Tipe | Constraint | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | ID pelanggan |
| `customer_code` | `TEXT` | `UNIQUE` | Kode pelanggan (`CUST_...`) |
| `name` | `TEXT` | `NOT NULL` | Nama pelanggan |
| `phone` | `TEXT` | `UNIQUE NOT NULL` | Nomor telepon asli |
| `phone_normalized`| `TEXT` | | Nomor ternormalisasi (`628...`) untuk dedup cepat |
| `gender` | `VARCHAR(16)` | | Jenis kelamin (`L` / `P`) |
| `age_range` | `VARCHAR(32)` | | Rentang usia (`18-24`, `25-34`, dll.) |
| `branch_id` | `UUID` | `REFERENCES branches(id)` | Cabang akuisisi pertama |
| `branch_code` | `TEXT` | | Kode cabang |
| `first_order_date`| `DATE` | | Tanggal transaksi pertama |
| `last_order_date` | `DATE` | | Tanggal transaksi terakhir |
| `order_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Total frekuensi pesanan |
| `total_spent` | `NUMERIC(14,2)` | `NOT NULL DEFAULT 0.00` | Total nilai belanja |
| `loyalty_points` | `INTEGER` | `NOT NULL DEFAULT 0` | Poin loyalitas pelanggan |
| `tier` | `VARCHAR(32)` | `DEFAULT 'regular'` | Tier pelanggan (`regular`, `silver`, `gold`, `vip`) |
| `is_followed_up` | `BOOLEAN` | `NOT NULL DEFAULT false` | Status sudah di-follow up |
| `followed_up_at` | `TIMESTAMPTZ` | | Waktu follow up terakhir |
- **Indexes**: `idx_mycust_customers_phone`, `idx_mycust_customers_phone_norm`, `idx_mycust_customers_branch`.

### 5.2 `mycust_orders` & `mycust_order_items` (Riwayat Transaksi)
- **`mycust_orders`**:
  - `id` (`UUID PK`), `order_code` (`TEXT UNIQUE`), `customer_id` (`REFERENCES mycust_customers(id) ON DELETE CASCADE`), `branch_id`, `branch_code`, `order_date` (`DATE`), `channel` (`dine_in | takeaway | gofood | grab | shopee | whatsapp | custom`), `total_amount`, `points_earned`, `raw_phone_input`, `is_followed_up`, `notes`, `served_by_id`.
  - **Indexes**: `idx_mycust_orders_branch_date`, `idx_mycust_orders_cust`, `idx_mycust_orders_date`.
- **`mycust_order_items`**: Detail produk per pesanan (`order_id`, `product_name`, `qty`, `unit_price`, `subtotal`).

### 5.3 Log Interaksi & WhatsApp CRM
- **`mycust_loyalty_logs`**: Riwayat penambahan/penukaran poin loyalitas pelanggan.
- **`mycust_interactions`**: Catatan riwayat komunikasi CRM (`whatsapp`, `call`, `promo`, `complaint`, `feedback`).
- **`mycustomer_wa_logs`**: Log klik pengiriman pesan WhatsApp oleh staf beserta batas plafon poin harian (`user_id`, `customer_id`, `order_id`, `clicked_at`, `point_granted`, `locked_until`).

---

## 6. Data Awal (*Seed Data*) di `FULL_SETUP.sql`

Saat `supabase/FULL_SETUP.sql` dijalankan, database otomatis terisi dengan:
1. **Cabang Utama**:
   - Kode: `CBG01BDG` (`id: dbd72db3-e37d-4dc6-a5f4-d650c2b4875d`) — *Mochikin Bandung Setiabudi*.
2. **Akun Staf & Admin**:
   - `dea` (Role: `admin`, PIN: `778899`, Cabang: `CBG01BDG`).
   - `taufik` (Role: `staff`, PIN: `123456`, Cabang: `CBG01BDG`).
3. **Master Barang Stokis**: 5 item inventaris awal (`ITM001` s/d `ITM005`).
4. **Master Tugas Poin (`task_definitions`)**: `MYCHECK_SHIFT_CLOSE`, `MYCHECK_INCIDENT`, `STOKIS_SO_SUBMIT`, `MYCUST_WA`, dll.
