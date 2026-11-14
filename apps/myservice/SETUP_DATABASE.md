# Panduan Setup Database — Mochikin Service (Central Gateway & SSO)

Aplikasi **Mochikin Service** bertindak sebagai gerbang autentikasi terpusat, pengelola Single Sign-On (SSO), dan launcher seluruh aplikasi ekosistem MOCHIKIN.

Database yang digunakan: **RDBMS (Supabase / PostgreSQL)**.

---

## 1. Skrip Database

Skema tabel untuk Mochikin Service sudah disatukan dalam skrip master:
[`supabase/FULL_SETUP.sql`](file:///home/bradley/project/MOCHIKIN-APPS/supabase/FULL_SETUP.sql)

### Tabel yang Digunakan Mochikin Service:
1. `branches` — Master cabang / gerai operasional.
2. `people` — Master identitas staf, username, NIK, peran, dan hash PIN login (`salt$scrypt_hash`).
3. `apps` — Katalog aplikasi launcher (Stokis, MyCheck, MyPerformance, MyCustomer) beserta URL target SSO.
4. `master_data_audit_log` — Log audit perubahan data master.

---

## 2. Langkah Setup Database (5 Menit)

1. Buka [Supabase Dashboard](https://supabase.com) dan masuk ke project Anda.
2. Buka menu **SQL Editor** pada panel kiri.
3. Buka file [`supabase/FULL_SETUP.sql`](file:///home/bradley/project/MOCHIKIN-APPS/supabase/FULL_SETUP.sql), salin seluruh isi teksnya, tempelkan ke editor, lalu klik **Run**.
4. Skrip akan secara otomatis:
   * Membuat seluruh tabel dan indeks.
   * Membuat cabang default: **Mochikin Cibiru (`BJ01`)** dan **Bandung (`CBG01BDG`)**.
   * Mendaftarkan 4 aplikasi di launcher (Stokis port 3002, MyCheck port 3001, MyPerformance port 3004, MyCustomer port 3003).
   * Mendaftarkan akun admin default:
     * **Username**: `admin`
     * **PIN**: `1234`
     * **Role**: `role_admin`
   * Mendaftarkan akun staf/crew default:
     * **Username**: `crew`
     * **PIN**: `1234`
     * **Role**: `staff`

---

## 3. Konfigurasi Environment Variables (`.env.local`)

Salin atau buat file `.env.local` di folder `apps/myservice/`:

```bash
# URL & Kunci API Supabase (Didapat dari Supabase Dashboard > Project Settings > API)
SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# Kunci Rahasia SSO (Wajib sama di semua aplikasi ekosistem)
LAUNCHER_SSO_SHARED_SECRET="ganti-dengan-kunci-rahasia-panjang-dan-acak-32-karakter"

# Port & URL Aplikasi Ini
APP_URL="http://localhost:3000"
PORT=3000
```

---

## 4. Daftar Akun Operasional Awal (Pre-seeded)

Setelah menjalankan `supabase/FULL_SETUP.sql`, akun-akun operasional cabang berikut langsung aktif dengan default PIN `1234`:

| Username | Nama Lengkap | Role | Cabang | Akses Aplikasi |
|---|---|---|---|---|
| `admin` | Admin Mochikin Pusat | `role_admin` | Pusat (Semua) | Semua Aplikasi (Full Access) |
| `dea` | Dea (Operational Admin) | `role_admin` | Pusat (Semua) | Semua Aplikasi |
| `candra` | Candra | `supervisor` | Bandung (BDG) | STOKIS, MYCHECK, MYCUSTOMER, MYPERFORMANCE |
| `budi` | Budi | `staff` | Bandung (BDG) | STOKIS, MYCHECK, MYCUSTOMER, MYPERFORMANCE |
| `luthfia` | Luthfia | `staff` | Bandung (BDG) | STOKIS, MYCHECK, MYCUSTOMER, MYPERFORMANCE |
| `prita` | Prita | `supervisor` | Cimahi (CMH) | STOKIS, MYCHECK, MYCUSTOMER, MYPERFORMANCE |
| `nurul` | Nurul Hilma | `staff` | Cimahi (CMH) | STOKIS, MYCHECK, MYCUSTOMER, MYPERFORMANCE |
| `rifah` | Rifah | `staff` | Cimahi (CMH) | STOKIS, MYCHECK, MYCUSTOMER, MYPERFORMANCE |
| `sabat` | Sabat | `supervisor` | Bekasi (BKS) | STOKIS, MYCHECK, MYCUSTOMER, MYPERFORMANCE |
| `dimas` | Dimas | `staff` | Bekasi (BKS) | STOKIS, MYCHECK, MYCUSTOMER, MYPERFORMANCE |
| `siti` | Siti | `staff` | Bekasi (BKS) | STOKIS, MYCHECK, MYCUSTOMER, MYPERFORMANCE |

---

## 5. Menambah Staf Baru atau Mengubah PIN Login

Untuk menambahkan staf baru atau mengubah PIN secara langsung via SQL di Supabase:

```sql
-- Format hash PIN: salt$scrypt_hash
-- Nilai hash untuk PIN "1234":
-- 376e923be61491b5ddfa26ff4affd13f$35274584d2b39bde7a9acfa796e1739d045b3d5d9b6c1e0bca3cc282cd1a02a0

INSERT INTO people (name, email, username, pin_hash, role, branch_id, status)
VALUES (
  'Nama Petugas',
  'petugas@mochikin.id',
  'petugas1',
  '376e923be61491b5ddfa26ff4affd13f$35274584d2b39bde7a9acfa796e1739d045b3d5d9b6c1e0bca3cc282cd1a02a0',
  'staff',
  (SELECT id FROM branches WHERE code = 'BJ01' LIMIT 1),
  'active'
);
```

---

## 5. Menyesuaikan Target URL Aplikasi di Production

Ketika aplikasi dideploy ke Vercel atau domain custom:
1. Masuk sebagai `admin` di Mochikin Service.
2. Buka menu **Kesehatan Sistem** (`/admin`).
3. Pada tabel **Kelola Target URL Aplikasi**, ubah URL setiap aplikasi (contoh: ubah dari `http://localhost:3002` ke `https://stokis.mochikin.id`).
4. Klik **Simpan**. Perubahan akan langsung tersimpan di tabel `apps` Supabase tanpa perlu redeploy.
