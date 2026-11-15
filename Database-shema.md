# Skema Database Terpusat — MOCHIKIN-APPS

**Sumber DDL**: [`supabase/FULL_SETUP.sql`](supabase/FULL_SETUP.sql) (satu-satunya sumber kebenaran)
**Engine**: Supabase PostgreSQL (ekstensi `uuid-ossp`, `pgcrypto`)
**Total**: 48 tabel relasional di skema `public` + 1 Storage bucket `mycheck-photos`
**Sifat skrip**: idempotent — diawali blok `0.1` yang me-drop seluruh VIEW, MATERIALIZED VIEW, dan BASE TABLE di `public` sebelum membuat ulang.

Tidak ada RLS pada tabel `public`; akses aplikasi memakai `SUPABASE_SERVICE_ROLE_KEY`. RLS hanya aktif di `storage.objects` untuk bucket foto.

---

## 1. Core & Identity (`myservice`)

### 1.1 `branches`
`id` UUID PK · `name` TEXT · `code` TEXT UNIQUE (mis. `CBG01BDG`) · `description` · `city` (default `Bandung`) · `address` · `phone` · `parent_branch_id` → `branches(id)` ON DELETE SET NULL · `settings` JSONB · `status` CHECK (`active|inactive|closed`) · `created_by` · `created_at` · `updated_by` · `updated_at` · `deleted_at`
Index: `idx_branches_code`, `idx_branches_status`, `idx_branches_city`

### 1.2 `people`
`id` UUID PK · `name` · `email` TEXT UNIQUE NOT NULL · `username` VARCHAR(50) UNIQUE · `phone` · `pin_hash` (format `salt$scryptHex`) · `role` CHECK (`super_admin|role_admin|branch_manager|staff|guest`, default `staff`) · `branch_id` UUID NOT NULL → `branches` RESTRICT · `status` CHECK (`active|inactive|suspended`) · `failed_attempts` · `locked_until` · `last_login_at` · audit (`created_by`, `created_at`, `updated_by`, `updated_at`, `deleted_at`)
Index: `idx_people_email`, `idx_people_username_lower` (LOWER), `idx_people_branch_id`, `idx_people_role`, `idx_people_status`

### 1.3 `branch_members`
`id` UUID PK · `branch_id` → `branches` CASCADE · `person_id` → `people` CASCADE · `branch_role` CHECK (`manager|staff|observer`) · `is_active` · `assigned_by` · `assigned_at` · `removed_at` · UNIQUE (`branch_id`,`person_id`)
Index: `idx_branch_members_person`, `idx_branch_members_branch`

### 1.4 `shift_definitions`
`id` TEXT PK (`opening`, `closing`) · `name` · `short_name` · `type` · `start_hour`/`end_hour` INT 0–23 · `time_display` · `tagline` · `branch_id` → `branches` SET NULL · `is_active` · `is_system_default` · timestamps/deleted_at
Index parsial: `idx_shift_definitions_active`, `idx_shift_definitions_branch`

### 1.5 `apps`
`id` UUID PK · `name` TEXT UNIQUE (`myservice`, `mycheck`, `stokis`, `mycustomer`, `myperformance`) · `title` · `version` · `category` CHECK (`core|operational|analytical`) · `description` · `icon_url` · `url` · `target_url` · `repository` · `status` CHECK (`active|inactive|beta`) · `is_active` · `requires_sso` · `port` · `config` JSONB · timestamps
Index: `idx_apps_name`

### 1.6 `brand_profiles`
`id` TEXT PK (`default`) · `brand_name` · `tagline` · `logo_url` · `themes` JSONB (`service`, `mycheck`, `mystokis`, `mycustomer`, `myperformance`) · `is_active` · `updated_at` · `updated_by`

---

## 2. Points Engine & CARE 360 (`myperformance`)

### 2.1 Katalog poin
- **`ref_app`**: `app_id` VARCHAR(32) PK · `app_name` · `is_active` · `created_at`. Seed: `mycheck`, `stokis`, `mycustomer`, `myperformance`.
- **`dim_item`**: `item_id` SERIAL PK · `app_id` → `ref_app` · `item_code` · `item_name` · `default_weight` NUMERIC(6,2) · `tier` · `is_active` · UNIQUE (`app_id`,`item_code`).
- **`task_definitions`**: `task_code` TEXT PK · `name` · `app_id` · `category` CHAR(1) CHECK (`M`,`T`) · `level_role` CHECK (`Manajer`,`SPV`,`Staf`) · `points_per_unit` ≥ 0 · `unit_output` · `is_active` · `valid_from`/`valid_to`.
- **`point_config`**: key-value — `config_key` PK, `config_value` NUMERIC(10,2), `description`. Seed: `monthly_points_target` 1044, `effective_hours_month` 173, `daily_points_ceiling` 50, `stokis_max_session_points` 8, `mycheck_shift_base_points` 2, `mycustomer_wa_daily_limit` 15, `incident_reward_points` 1.5, `incident_max_daily_reward` 3, `audit_correction_window_days` 90.

### 2.2 `idempotency_registry`
`idempotency_key` VARCHAR(128) PK · `event_id` UUID · `app_id` → `ref_app` · `response_payload` JSONB · `created_at`

### 2.3 `point_ledger` (append-only)
`id` UUID PK · `person_id` → `people` · `branch_id` → `branches` · `task_code` → `task_definitions` · `task_name_snapshot` · `points_per_unit_snapshot` · `source_app` · `event_id` TEXT · `idempotency_key` TEXT UNIQUE · `quantity` > 0 · `points` · `shift_date` DATE · `occurred_at` · `meta` JSONB · `created_at`
Index: `idx_pl_person_shift`, `idx_pl_branch_shift`
Trigger `trg_point_ledger_append_only` (BEFORE UPDATE OR DELETE) → `RAISE EXCEPTION restrict_violation`. Koreksi hanya lewat entri reversal.

### 2.4 `point_event` (header, immutable)
`event_id` UUID PK · `app_id` → `ref_app` · `task_code` · `person_id` · `branch_id` · `shift_date` · `occurred_at` · `points` NUMERIC(8,2) · `kind` CHECK (`earn|reversal|adjustment`) · `idempotency_key` UNIQUE · `session_ref` · `actor_id` · `reverses_event_id` → `point_event` · `reason` · `meta` JSONB · `created_at`
Index: `idx_point_event_lookup` (`person_id`,`branch_id`,`shift_date`), `idx_point_event_shift_date`, `idx_point_event_app`
Trigger `trg_immutable_header` → `trg_point_platform_prevent_mutation()`

### 2.5 `point_event_line` (detail, immutable)
`line_id` BIGSERIAL PK · `event_id` → `point_event` CASCADE · `shift_date` · `item_id` → `dim_item` · `qty` > 0 · `weight_snapshot` ≥ 0 · `points` · `kind` CHECK (`earn|reversal`) · `reverses_line_id` → self · `line_ref` · `meta` · `created_at`
Index: `idx_point_event_line_event`, `idx_point_event_line_shift_date`, `idx_point_event_line_item`
Trigger `trg_immutable_line`. Non-partisi, B-Tree saja (tanpa tabel pecahan tahunan).

### 2.6 Rollup
- **`point_daily`**: PK (`person_id`,`branch_id`,`app_id`,`date_key`) · `total_points` · `event_count` · `is_capped` · `computed_at`. Dipakai `refresh_point_daily(date)` — proporsional cap ke `daily_points_ceiling`.
- **`point_monthly`**: PK (`person_id`,`branch_id`,`app_id`,`month_key` CHAR(7)) · `total_points` · `event_count` · `computed_at`. Dipakai `refresh_point_monthly('YYYY-MM')`.
- **`point_rollups`**: `id` UUID PK · (`person_id`,`branch_id`,`period_type` CHECK `daily|monthly`,`period_key`,`source_app`) · `total_points` · `total_tasks` · `last_updated` · UNIQUE (`person_id`,`period_type`,`period_key`,`source_app`).
- **`get_point_platform_storage_stats()`** SECURITY DEFINER → JSONB jumlah baris `point_event`, `point_event_line`, `point_daily`, `point_monthly`.

### 2.7 CARE 360 & ITO
- **`care_dimensions`**: `id` VARCHAR(32) PK · `name` · `weight` NUMERIC(4,2) default 0.20.
- **`care_settings`**: `key` PK · `value` JSONB · `updated_at`.
- **`care_periods`**: `period_key` VARCHAR(7) PK · `is_closed` · `closed_at` · `closed_by`.
- **`care_submissions`**: `id` · `period_key` · `branch_id` · `submitted_by` · `submitted_at`.
- **`care_assessments`**: `id` · `submission_id` CASCADE · `assessor_id` · `assessed_id` · `branch_id` · `score` NUMERIC(5,2) · `notes` · `created_at`.
- **`care_assessments_rp`**: `id` · `assessment_id` CASCADE · `dimension_id` → `care_dimensions` · `score`.
- **`care_scores`**: `id` · `period_key` · `person_id` · `branch_id` · `final_score` · `rank` · `computed_at` · UNIQUE (`period_key`,`person_id`).
- **`care_complaints`**: `id` · `branch_id` · `customer_name` · `description` · `reported_at`.
- **`care_followups`**: `id` · `complaint_id` CASCADE · `notes` · `handled_by` · `handled_at`.
- **`care_ito_issues`** dan **`ito_issues`** (struktur identik): `id` · `branch_id` · `title` · `status` default `open` · `reported_by` · `reported_at`.

---

## 3. Operasional Checklist (`mycheck`)

### 3.1 Template
- **`mycheck_shift_definitions`**: `id` UUID PK · `branch_id` CASCADE (NULL = global) · `name` · `start_time` TIME · `end_time` TIME · `crosses_midnight` · `sort_order` · `is_active` · timestamps. Index `idx_mc_shift_def_branch`.
- **`mycheck_sop_categories`**: `id` · `shift_definition_id` CASCADE · `name` · `color` default `#059669` · `sort_order` · `is_active` · `created_at`. Index `idx_mc_cat_shift`.
- **`mycheck_checklist_points`**: `id` · `category_id` CASCADE · `point_text` · `input_types` TEXT[] default `{boolean}` (`boolean|number|text|photo|radio`) · `options` TEXT[] · `weight_points` · `is_required` · `sort_order` · `is_active` · `created_at`. Index `idx_mc_points_cat`.
- **`mycheck_handover_fields`**: `id` · `shift_definition_id` CASCADE · `field_name` · `field_type` (`text|number|boolean|photo`) · `is_required` · `sort_order` · `is_active` · `created_at`. Index `idx_mc_ho_fields_shift`.

### 3.2 Transaksi
- **`mycheck_shift_instances`**: `id` TEXT PK (mis. `SI_ZZYTKST79JHA2WSXSK7DNFN8PW`) · `branch_id` RESTRICT · `shift_definition_id` RESTRICT · `shift_date` DATE · `status` CHECK (`open|closed|force_closed|void`) · `pj_user_id` · `opened_at` · `closed_at` · `opened_outside_hours` · `closed_outside_hours` · `template_snapshot` JSONB · `is_test` · `created_at`. Index `idx_mc_instances_branch_date`, `idx_mc_instances_status`.
- **`mycheck_entries`**: `id` · `shift_instance_id` TEXT CASCADE · `point_id` SET NULL · `point_text_snap` · `input_type` · `value_boolean` · `value_number` NUMERIC(12,2) · `value_text` · `photo_url` · `notes` · `filled_by_user_id` · `filled_at`. Index `idx_mc_entries_instance`.
- **`mycheck_handovers`**: `id` · `shift_instance_id` CASCADE · `from_user_id` · `field_values` JSONB · `notes` · `submitted_at` · `acknowledged_by_id` · `acknowledged_at`. Index `idx_mc_handovers_instance`.
- **`mycheck_incidents`**: `id` · `branch_id` · `shift_instance_id` SET NULL · `category` · `title` · `description` · `severity` CHECK (`low|medium|high|critical`) · `status` CHECK (`open|investigating|resolved`) · `photo_urls` TEXT[] · `reported_by_id` · `reported_at` · `resolved_by_id` · `resolved_at` · `resolution_notes`. Index `idx_mc_incidents_branch`.
- **`mycheck_notifications`**: `id` · `user_id` CASCADE · `branch_id` CASCADE · `type` · `title` · `body` · `link` · `is_read` · `created_at`. Index `idx_mc_notif_user`.

### 3.3 Storage bucket `mycheck-photos`
`public = true`, `file_size_limit = 5242880` (5 MB), `allowed_mime_types = {image/jpeg, image/png, image/webp}`
Policy pada `storage.objects`: `mycheck_photos_public_read` (SELECT), `mycheck_photos_auth_insert` (INSERT), `mycheck_photos_auth_delete` (DELETE) — semuanya difilter `bucket_id = 'mycheck-photos'`.

---

## 4. Stock Opname (`mystokis` — tabel fisik tetap berprefix `stokis_`)

### 4.1 `stokis_items`
`id` UUID PK · `code` TEXT UNIQUE (mis. `AYAM_POTONG`) · `name` · `category` (mis. `Bahan Baku`, `Bahan Penolong`, `Kemasan`) · `area` default `Kitchen` · `unit` default `kg` · `default_weight` NUMERIC(6,2) · `threshold` NUMERIC(12,2) · `tipe_input` default `dual` · `tier` · `sort_order` · `is_active` · `created_at`
Index: `idx_stokis_items_code`, `idx_stokis_items_active`

### 4.2 `stokis_branch_thresholds`
`id` · `branch_id` CASCADE · `branch_code` · `item_id` → `stokis_items` CASCADE · `item_code` · `min_stock` · `warning_level` · `updated_at` · UNIQUE (`branch_id`,`item_id`). Index `idx_stokis_thresh_branch`.

### 4.3 `stokis_opnames`
`id` UUID PK · `sesi_id` TEXT UNIQUE · `branch_id` RESTRICT · `branch_code` · `opname_date` DATE · `shift_type` default `closing` (`opening|closing|custom`) · `status` CHECK (`draft|submitted|verified`) · `petugas` · `notes` · `submitted_by_id` · `submitted_at` · `verified_by_id` · `verified_at` · `xlsx_payload` JSONB · `wa_sent_at`
Index: `idx_stokis_opnames_branch_date`, `idx_stokis_opnames_sesi`

### 4.4 `stokis_opname_lines`
`id` · `opname_id` CASCADE · `item_id` SET NULL · `item_code` · `item_name` · `area` · `unit` · `threshold` · `step1` · `step2` · `physical_stock` · `system_stock` · `difference` · `keterangan` · `status_isi` · `tgl_refill` TEXT · `tgl_pakai` TEXT · `photo_url` · `created_at`. Index `idx_stokis_lines_opname`.

### 4.5 `stokis_mutations`
`id` · `branch_id` RESTRICT · `item_id` RESTRICT · `mutation_type` CHECK (`in|out|transfer|waste|adjustment`) · `quantity` > 0 · `unit` · `reference_doc` · `notes` · `created_by_id` · `created_at`. Index `idx_stokis_mutations_branch`.

---

## 5. CRM & Loyalty (`mycustomer`)

### 5.1 `mycust_customers`
`id` UUID PK · `branch_id` SET NULL · `branch` TEXT (kode) · `name` · `phone` VARCHAR(32) NOT NULL · `phone_normalized` VARCHAR(32) · `email` · `address` · `first_order_date` TEXT · `order_count` INT · `total_orders` INT · `total_spend` NUMERIC(15,2) · `loyalty_points` INT ≥ 0 · `description` · `age_range` · `gender` · `is_followed_up` · `followed_up_at` · `aliases` JSONB · `branch_memberships` JSONB · `status` CHECK (`active|inactive|blacklisted`) · `registered_at` · `last_order_at` · `created_at`
Index: `idx_mycust_customers_phone`, `idx_mycust_customers_phone_norm`, `idx_mycust_customers_branch`

### 5.2 `mycust_orders`
`id` · `branch_id` SET NULL · `branch` TEXT · `customer_id` RESTRICT · `order_number` VARCHAR(64) default UUID · `order_date` DATE · `channel` default `dine_in` (`dine_in|takeaway|gofood|grab|shopee|whatsapp|custom`) · `raw_phone_input` · `total_amount` NUMERIC(15,2) ≥ 0 · `discount_amount` · `payment_method` CHECK (`cash|qris|debit|transfer|point`) · `status` CHECK (`pending|completed|cancelled`) · `is_followed_up` · `followed_up_at` · `cashier_id` · `created_at`
Index: `idx_mycust_orders_branch_date`, `idx_mycust_orders_cust`, `idx_mycust_orders_date`

### 5.3 `mycust_order_items`
`id` · `order_id` CASCADE · `item_name` · `quantity` INT > 0 · `unit_price` ≥ 0 · `subtotal` ≥ 0. Index `idx_mycust_order_items_order`.

### 5.4 `mycust_loyalty_logs`
`id` · `customer_id` CASCADE · `order_id` SET NULL · `points_change` INT (+earn / −redeem) · `kind` CHECK (`earn|redeem|adjustment|reversal`) · `description` · `created_at`. Index `idx_mycust_loyalty_cust`.

### 5.5 `mycust_interactions`
`id` · `customer_id` CASCADE · `branch_id` RESTRICT · `interaction_type` CHECK (`wa_message|feedback|complaint|promo_blast`) · `notes` · `staff_id` · `created_at`. Index `idx_mycust_interactions_cust`.

### 5.6 `mycustomer_wa_logs`
`id` · `user_id` CASCADE · `customer_id` TEXT · `order_id` TEXT · `clicked_at` · `point_granted` BOOLEAN · `locked_until` TEXT default tanggal hari ini · `created_at`. Index `idx_mycust_wa_lookup` (`user_id`,`customer_id`,`locked_until`) — dipakai untuk plafon reward WA harian per staf.

---

## 6. Seed Default (bagian 6 `FULL_SETUP.sql`)

| Objek | Nilai |
| :--- | :--- |
| Cabang | `CBG01BDG` — `dbd72db3-9cb9-4879-982a-4f3deacbd144`, *Mochikin Bandung (Setiabudi)*, Bandung, `active` |
| Pengguna | `dea` — `8a67ef36-3b28-47fd-8cb6-4c09d96dc1aa`, `role_admin`, PIN `778899` |
| | `taufik` — `11ae2974-1a7c-4486-b6df-050c59ca8ce1`, `staff`, PIN `123456` |
| Penugasan | Keduanya di `CBG01BDG` (`branch_role` `manager` dan `staff`) |
| Shift | `opening` 07:00–15:00 dan `closing` 15:00–23:00 |
| Apps | `myservice`:3000 (core, `requires_sso=false`), `mycheck`:3001, `stokis`:3002, `mycustomer`:3003, `myperformance`:3004 |
| Brand | `default` — *Mochikin*, tagline *Street Snack & Modern Food Services*, 5 tema warna |
| ref_app | `mycheck`, `stokis`, `mycustomer`, `myperformance` |
| Task poin | `MYCHECK_HADIR` 1.00 · `MYCHECK_SHIFT_CLOSE` 2.00 · `MYCHECK_INCIDENT` 1.50 · `STOKIS_OPNAME` 2.00 · `STOKIS_MUTASI` 0.50 · `MYCUST_ORDER` 0.50 · `MYCUST_WA` 0.25 |
| Barang | `AYAM_POTONG`, `TEPUNG_PREMIX`, `MINYAK_GORENG`, `BUMBU_TABUR`, `KEMASAN_BOX` + sinkron ke `dim_item` (`app_id = 'stokis'`) |

---

## 7. Catatan Integrasi

- **Nama app `stokis` vs `mystokis`**: data historis (`apps.name`, `ref_app.app_id`, `dim_item.app_id`, `task_definitions.app_id`, kode `STOKIS_*`) tetap memakai `stokis`. Aplikasi `apps/mystokis` mengirim `app_id = 'stokis'` agar seed dan poin lama tetap valid.
- **Kode cabang teks**: `branches.code` (teks) sering dipakai sebagai filter; sebelum memanggil PostgREST `.or()` campur UUID + kode, validasi UUID dengan regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` untuk menghindari cast error.
- **Join `branch_members` → `branches`**: PostgREST dapat mengembalikan objek atau array; kode menormalkan dengan `Array.isArray(x) ? x[0] : x`.
- **Immutability**: `point_ledger`, `point_event`, `point_event_line` menolak `UPDATE`/`DELETE` di level trigger. Reversal dibuat sebagai baris baru.
