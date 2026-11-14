# Panduan Setup Database  MyPerformance (Points Engine & CARE Scorecards)

Aplikasi **MyPerformance** adalah pusat kalkulasi performansi kerja karyawan, akumulasi poin harian (*Points Engine*), evaluasi 360 peer review *CARE Scorecard*, dan *Issue to Operational (ITO)*.

Database yang digunakan: **RDBMS (Supabase / PostgreSQL)** + **Redis (Upstash / Memory)** untuk skor real-time T+0.

---

## 1. Skrip Database

Skema tabel untuk MyPerformance sudah disatukan dalam skrip master:
[`supabase/FULL_SETUP.sql`](file:///home/bradley/project/MOCHIKIN-APPS/supabase/FULL_SETUP.sql)

### Tabel yang Digunakan MyPerformance:
1. `task_definitions`  Katalog jenis tugas operasional berbobot poin (misal: `MYCHECK_HADIR`, `STOKIS_OPNAME`, `MYCUST_ORDER`).
2. `point_ledger`  Buku besar transaksi poin bersifat *immutable* dan *append-only*.
3. `point_rollups`  Agregasi poin per periode (harian, bulanan, tahunan).
4. `care_dimensions` & `care_scale`  4 pilar evaluasi CARE (Collaboration, Accountability, Respect, Excellence) dan skala penilaian 1-5.
5. `scorecard_sessions`, `scorecard_questions`, `scorecard_responses`  Sesi dan data isian penilaian rekan kerja.
6. `ito_issues`, `ito_comments`  Papan tindak lanjut kendala operasional.
7. `point_logs`, `reports`, `report_contributors`  Rekap aktivitas poin lintas aplikasi.

---

## 2. Langkah Setup Database (5 Menit)

1. Jika Anda sudah menjalankan [`supabase/FULL_SETUP.sql`](file:///home/bradley/project/MOCHIKIN-APPS/supabase/FULL_SETUP.sql) saat setup Mochikin Service, **seluruh tabel MyPerformance sudah otomatis siap digunakan** pada database Supabase yang sama!
2. Jika Anda membuat project Supabase terpisah khusus MyPerformance:
   * Buka SQL Editor di Supabase Dashboard.
   * Tempelkan isi file [`supabase/FULL_SETUP.sql`](file:///home/bradley/project/MOCHIKIN-APPS/supabase/FULL_SETUP.sql).
   * Klik **Run**.

---

## 3. Setup Redis (Untuk Skor Real-Time Hari Ini / T+0)

MyPerformance menggunakan Redis untuk pembacaan sub-milidetik skor poin hari ini:
1. Buat database gratis di [Upstash Redis](https://upstash.com).
2. Salin `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` dari dashboard Upstash.
*(Catatan: Jika Redis tidak diisi, sistem memiliki mekanisme fallback otomatis membaca langsung dari `point_ledger` Supabase).*

---

## 4. Konfigurasi Environment Variables (`.env.local`)

Salin atau buat file `.env.local` di folder `apps/myperformance/`:

```bash
# Supabase API Credentials
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# Redis T+0 Mirror (Opsional / Sangat Direkomendasikan)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXXX..."

# Kunci Rahasia Ingress Event Poin (Wajib sama dengan aplikasi pengirim)
MOCHIKIN_EVENTS_SECRET="dev-events-secret-key-12345"

# Kunci Rahasia SSO (Wajib sama dengan MyService)
LAUNCHER_SSO_SHARED_SECRET="ganti-dengan-kunci-rahasia-panjang-dan-acak-32-karakter"

# Konfigurasi Target Bulanan
NEXT_PUBLIC_MONTHLY_POINTS_TARGET=1044
EFFECTIVE_HOURS_PER_MONTH=173
APP_TIMEZONE="Asia/Jakarta"

# Cron Secret (Untuk Vercel Cron Job)
CRON_SECRET="cron-secret-key-12345"
```

---

## 5. Mengatur Katalog Tarif Poin (`task_definitions`)

Katalog poin dikelola oleh admin/manajemen dan tersimpan di tabel `task_definitions`:

| Task Code | Nama Tugas | Aplikasi Asal | Bobot Poin | Satuan Output |
| :--- | :--- | :--- | :---: | :--- |
| `MYCHECK_HADIR` | Hadir Tepat Waktu | `mycheck` | **1.00** | shift |
| `MYCHECK_SHIFT_CLOSE` | Tutup Shift | `mycheck` | **2.00** | shift |
| `MYCHECK_INCIDENT` | Laporan Insiden | `mycheck` | **1.50** | laporan |
| `STOKIS_OPNAME` | Opname Stok | `stokis` | **3.00** | sesi |
| `STOKIS_MUTASI` | Mutasi Barang | `stokis` | **1.00** | item |
| `MYCUST_TIKET` | Penanganan Tiket Pelanggan | `mycustomer` | **2.00** | tiket |
| `MYCUST_ORDER` | Proses Order | `mycustomer` | **0.50** | order |

Untuk mengubah tarif poin, Anda dapat langsung melakukan UPDATE pada tabel `task_definitions` di Supabase. Perubahan tarif berikutnya tidak akan mengubah riwayat poin lama karena `point_ledger` mengunci nilai tarif saat transaksi terjadi (*snapshotting*).

---

## 6. Verifikasi & Ujicoba Sistem Poin

Untuk memverifikasi bahwa database dan route ingress poin berfungsi dengan baik:

```bash
# Jalankan skrip pipeline test terintegrasi
pnpm --filter myperformance exec tsx --env-file=.env.local scripts/test-points-pipeline.ts
```
Jika sukses, output akan menampilkan emisi event dari ketiga aplikasi, verifikasi idempotency, pencatatan di `point_ledger`, dan rollup agregasi harian.
