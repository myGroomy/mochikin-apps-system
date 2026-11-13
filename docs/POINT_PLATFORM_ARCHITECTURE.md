# DOKUMENTASI ARSITEKTUR & RUNBOOK OPERASIONAL: POINT PLATFORM
**Ekosistem Mochikin Apps (Monorepo)**
**Versi**: 2.0.0 (Unified Point Platform)
**Status**: Production Ready (Supabase Free Tier Optimized)

---

## 1. Arsitektur Sistem Terpadu

Point Platform adalah mesin buku besar poin terpusat di Supabase PostgreSQL yang menggantikan dualisme arsitektur historis (F1 vs K1). Platform ini berfungsi sebagai **satu-satunya sumber kebenaran (Single Source of Truth)** bagi seluruh perhitungan poin performa, insentif lembur, dan evaluasi kepatuhan SOP di gerai Mochikin.

```mermaid
flowchart TD
    subgraph Producers ["Aplikasi Produsen Gerai (Local First)"]
        MC["MyCheck\n(Checklist SOP Shift)"]
        ST["Stokis\n(Stock Opname Fisik)"]
        CU["MyCustomer\n(CRM WhatsApp)"]
    end

    subgraph OutboxLayer ["Local Outbox (Google Sheets Cabang)"]
        OB_MC[("PointOutbox MyCheck\n(Append batchUpdate)")]
        OB_ST[("PointOutbox Stokis\n(Append batchUpdate)")]
        OB_CU[("PointOutbox MyCustomer\n(Append batchUpdate)")]
    end

    subgraph IngressGateway ["Point Platform Ingress (MyPerformance Port 3004)"]
        INGEST["POST /api/points/ingest\n(HMAC Signature per App)"]
        REVERSAL["POST /api/points/reversal\n(Audit Zero Point)"]
        REGISTRY[("idempotency_registry\n(O(1) Global Idempotency)")]
    end

    subgraph DatabaseLayer ["Supabase PostgreSQL (Storage < 250 MB)"]
        EVENT[("point_event (Header)\n[Partitioned by shift_date]")]
        LINE[("point_event_line (Items)\n[Partitioned by shift_date]")]
        CONFIG[("point_config\n(Dynamic Business Rules)")]
        DIM_ITEM[("dim_item\n(Calibrated 1 pt = 10 min)")]
    end

    subgraph RollupLayer ["Rollup Permanen & Cache"]
        DAILY[("point_daily\n(Rollup Harian, Plafon 50 pt)")]
        MONTHLY[("point_monthly\n(Rollup Bulanan Permanen)")]
        REDIS[("Upstash Redis T+0\n(Realtime Hari Berjalan)")]
    end

    subgraph Consumers ["Antarmuka Pengguna (UI)"]
        DASH_ME["Dashboard Poin Saya\n(/dashboard/me)"]
        DASH_TEAM["Leaderboard Tim\n(/dashboard/team)"]
        EXPORT["Ekspor Bulanan Google Sheets\n(/api/export/monthly)"]
    end

    MC -->|1. Transaksi Lokal| OB_MC
    ST -->|1. Transaksi Lokal| OB_ST
    CU -->|1. Transaksi Lokal| OB_CU

    OB_MC -->|2. Asynchronous Flush| INGEST
    OB_ST -->|2. Asynchronous Flush| INGEST
    OB_CU -->|2. Asynchronous Flush| INGEST
    OB_ST -->|Audit Pembalikan| REVERSAL

    INGEST -->|Idempotency Check| REGISTRY
    INGEST -->|Kalkulasi Server & Capping| CONFIG
    INGEST -->|Katalog Bobot SOP| DIM_ITEM
    INGEST -->|Batch Insert Atomik| EVENT
    INGEST -->|Rincian Item Fisik| LINE
    INGEST -.->|Mirror T+0 Hari Ini| REDIS

    REVERSAL -->|Negative Offset Entry| EVENT
    REVERSAL -->|Negative Line Entry| LINE

    EVENT -->|Vercel Cron 00:00| DAILY
    DAILY -->|Vercel Cron 01:00 (Tgl 1)| MONTHLY

    DAILY --> DASH_ME
    EVENT --> DASH_TEAM
    MONTHLY --> EXPORT
```

---

## 2. Spesifikasi Skema Database

1. **`ref_app`**: Daftar resmi aplikasi produsen (`mycheck`, `stokis`, `mycustomer`).
2. **`dim_item`**: Katalog item bahan/tugas dengan bobot tarif server (`default_weight`, `tier`).
   * *Tier 1 (Kemasan / Dry)*: $0.10\text{ pt}$ ($1\text{ menit}$).
   * *Tier 2 (Curah / Timbang)*: $0.30\text{ pt}$ ($3\text{ menit}$).
   * *Tier 3 (Basah / Chiller / Daging)*: $0.50\text{ pt}$ ($5\text{ menit}$).
3. **`idempotency_registry`**: Registri non-partisi untuk menjamin idempotensi global $O(1)$.
4. **`point_config`**: Parameter bisnis dinamis (`monthly_points_target = 1044`, `daily_points_ceiling = 50`, `stokis_max_session_points = 8`, `mycustomer_wa_daily_limit = 15`, `incident_reward_points = 1.50`, `audit_correction_window_days = 90`).
5. **`point_event` & `point_event_line`**: Tabel transaksi terpartisi bulanan berdasarkan `shift_date` (WIB), dilindungi trigger *append-only* `trg_point_platform_prevent_mutation` (UPDATE dan DELETE dilarang keras).
6. **`point_daily` & `point_monthly`**: Tabel rollup permanen dengan `app_id` di dalam Primary Key (`person_id, branch_id, app_id, date_key/month_key`).

---

## 3. Kontrak API Terpusat

### a. `POST /api/points/ingest`
Pintu gerbang penyerahan sesi kerja dari seluruh aplikasi gerai.

* **Headers**:
  * `Content-Type: application/json`
  * `X-Event-Signature`: Signature HMAC SHA-256 menggunakan secret per-aplikasi.
* **Payload Request**:
  ```json
  {
    "appId": "stokis",
    "taskCode": "STOKIS_OPNAME",
    "personId": "8bff1d53-94c0-4e0f-99ab-8f20ef772657",
    "branchId": "a1b4bd40-8144-4081-bdc9-22f418ade1da",
    "shiftDate": "2026-11-13",
    "occurredAt": "2026-11-13T17:30:00+07:00",
    "sessionRef": "SO-BDG-20261113",
    "idempotencyKey": "stokis-so-SO-BDG-20261113-user1",
    "meta": { "sesiId": "SO-BDG-20261113" },
    "lines": [
      { "itemCode": "ITM_AYAM", "qty": 4 },
      { "itemCode": "ITM_TEPUNG", "qty": 10 }
    ]
  }
  ```
* **Respons Sukses (HTTP 201 / 200 Replay)**:
  ```json
  {
    "success": true,
    "data": {
      "eventId": "f946d72d-789e-4e3e-9803-06be9a12119d",
      "points": 5.00,
      "linesCount": 2,
      "isCapped": false,
      "shiftDate": "2026-11-13",
      "idempotent": false
    }
  }
  ```

---

### b. `POST /api/points/reversal`
Pintu gerbang audit pembatalan poin (*Zero Point*) per-item maupun per-sesi.

* **Payload Request**:
  ```json
  {
    "appId": "stokis",
    "targetEventId": "f946d72d-789e-4e3e-9803-06be9a12119d",
    "actorId": "39b24d2a-6f12-44e3-8446-ec06f5b31b5e",
    "reason": "Bahan ayam susut timbangan chiller",
    "itemCode": "ITM_AYAM"
  }
  ```
* **Respons Sukses (HTTP 201 / 200 Replay)**:
  ```json
  {
    "success": true,
    "data": {
      "reversalEventId": "e8264c4b-44ec-4216-93a9-ec710fbed1e6",
      "reversedPoints": -2.00,
      "itemCode": "ITM_AYAM",
      "shiftDate": "2026-11-13",
      "idempotent": false
    }
  }
  ```

---

### c. `GET /api/points/health`
Endpoint monitoring kapasitas real-time dan sistem peringatan ambang batas.

* **Respons Contoh**:
  ```json
  {
    "success": true,
    "status": "healthy",
    "timestamp_wib": "Jumat, 13 November 2026 pukul 18.00.00 WIB",
    "storage": {
      "size_mb": 18.41,
      "size_pretty": "18 MB",
      "target_max_mb": 250.0,
      "free_tier_cap_mb": 500.0,
      "warning_threshold_mb": 150.0,
      "usage_percent_of_target": 7.36,
      "remaining_to_target_mb": 231.59
    },
    "warning": {
      "active": false,
      "message": "Normal: Penggunaan database jauh di bawah batas peringatan 150 MB."
    },
    "table_rows": {
      "ref_app": 3,
      "dim_item": 250,
      "point_config": 9,
      "point_event": 0,
      "point_event_line": 0,
      "point_daily": 0,
      "point_monthly": 0
    }
  }
  ```

---

## 4. Runbook Operasional Sistem Poin

### Runbook 1: Keepalive Gagal / Proyek Supabase Terancam Pause
* **Gejala**: Proyek Supabase tidak aktif > 7 hari dan terancam auto-pause oleh provider gratis.
* **Prosedur Penanganan**:
  1. Periksa status GitHub Actions pada workflow `.github/workflows/supabase-keepalive.yml`.
  2. Pastikan secret `CRON_SECRET` dan `MYPERFORMANCE_URL` terisi di repository settings.
  3. Lakukan trigger manual (*workflow_dispatch*) di GitHub Actions atau eksekusi curl langsung:
     ```bash
     curl -H "Authorization: Bearer <CRON_SECRET>" "https://myperformance.mochikin.id/api/cron/keepalive"
     ```
  4. Verifikasi status kembali `200 OK` dengan database `connected`.

---

### Runbook 2: Antrean Outbox Menumpuk di Google Sheets Gerai
* **Gejala**: Kolom `Status` pada tab `PointOutbox` spreadsheet cabang berisi banyak baris `'pending'` atau `'failed'`, atau poin belum masuk ke MyPerformance.
* **Prosedur Penanganan**:
  1. Buka spreadsheet cabang terkait dan periksa tab `PointOutbox`.
  2. Periksa kolom `Last_Error`:
     * Jika `429 Quota Exceeded`: Kuota Google API sedang jenuh. Tunggu 5 menit, worker outbox akan otomatis melakukan retry dengan *capped exponential backoff*.
     * Jika `Network error`: Koneksi WiFi gerai terputus. Setelah koneksi pulih, klik tombol "Sinkronisasi Outbox" di UI atau panggil `flushOutbox(spreadsheetId)`.
     * Jika `dead_letter (4xx)`: Terdapat data master yang tidak cocok (misal kode item salah ketik). Perbaiki data item di tab `Master_Item` dan ubah status baris di outbox dari `dead_letter` menjadi `pending` untuk dikirim ulang.

---

### Runbook 3: Kapasitas Basis Data Hampir Penuh (> 150 MB / 60% Plafon)
* **Gejala**: Endpoint `/api/points/health` merespons `status: "warning"` dan `warning.active = true`.
* **Prosedur Penanganan**:
  1. Jalankan kueri pemantauan tabel terbesar via SQL Editor Supabase:
     ```sql
     SELECT relname, pg_size_pretty(pg_total_relation_size(c.oid))
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 10;
     ```
  2. Jalankan simulasi pengarsipan partisi lama:
     ```bash
     curl -X POST "https://myperformance.mochikin.id/api/cron/archive-monthly?dryRun=true&olderThanMonths=18"
     ```
  3. Jika verifikasi checksum dan rollup bulanan pada `point_monthly` sudah klop $100\%$, jalankan pengarsipan riil (`dryRun=false`) untuk melepaskan (*detach*) dan men-drop partisi fisik yang telah diarsip ke Google Drive.

---

### Runbook 4: Prosedur Pemulihan Basis Data dari Cadangan (Disaster Recovery Restore)
* **Kondisi**: Terjadi kerusakan data operasional atau anomali fatal pada basis data utama.
* **Prosedur Pemulihan**:
  1. Temukan berkas cadangan JSON terbaru di folder `backups/` atau Google Drive (misal: `point_platform_backup_2026-11-13T...json`).
  2. Jalankan pengujian validasi checksum mandiri:
     ```bash
     pnpm --filter myperformance exec tsx scripts/backup-restore-point-platform.ts
     ```
  3. Skrip otomatis memverifikasi kecocokan **SHA-256 checksum** 64-karakter hex.
  4. Data secara atomik dimasukkan kembali ke tabel-tabel master dan rollup (`ref_app`, `point_config`, `dim_item`, `point_daily`, `point_monthly`) tanpa tabrakan duplikasi (*idempotent ignore duplicates*).

---

### Runbook 5: Panduan Menambah Aplikasi Baru atau Task Baru
1. **Menambah Aplikasi Baru**:
   * Sisipkan record baru ke tabel `ref_app`:
     ```sql
     INSERT INTO ref_app (app_id, app_name) VALUES ('mykitchen', 'MyKitchen Kitchen Display System');
     ```
   * Set secret HMAC di environment: `MOCHIKIN_MYKITCHEN_EVENTS_SECRET=<secret_32_chars>`.
2. **Menambah Task / Item Baru**:
   * Daftarkan item ke tabel `dim_item` dengan kalibrasi waktu kerja riil:
     ```sql
     INSERT INTO dim_item (app_id, item_code, item_name, default_weight, tier)
     VALUES ('mykitchen', 'KITCHEN_PREP_BATCH', 'Preparasi 1 Batch Bahan', 1.00, 'tier_3');
     ```
   * Daftarkan kode tugas ke `task_definitions`:
     ```sql
     INSERT INTO task_definitions (task_code, name, app_id, points_per_unit, unit_output)
     VALUES ('KITCHEN_PREP_BATCH', 'Preparasi Batch Dapur', 'mykitchen', 1.00, 'batch');
     ```

---

*Dokumentasi Arsitektur dan Runbook Operasional Point Platform telah lengkap dan siap digunakan oleh tim engineering dan operasional Mochikin.*
