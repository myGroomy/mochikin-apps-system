# Plan: Standarisasi Environment Variables Semua App

## Tujuan

1. **Penamaan key seragam di semua app** — jika variabel adalah "global" (matriks `=`), namanya dan nilainya **sama persis** di semua app. Tidak perlu bingung "apakah ini sama dengan app lain?".
2. **Section terpisah** — Section A = privat/unik per app (`≠`), Section B = global/sama di semua app (`=`).
3. **Setiap key dilengkapi keterangan sumber** (di mana didapatkan) dan **command Unix untuk generate** nilai unik.
4. File `.env.local` berada di tiap folder `apps/<app>/` dan **tidak ter-commit** (sudah di `.gitignore`).

---

## Struktur File `.env.local`

Setiap file dibagi menjadi 2 section:

### Section A — Privat / Unik per App (`≠`)
Nama key **sama** di semua app, tetapi **nilai BEDA** tiap app. Jangan copy-paste nilai antar app.

| Key | Digunakan oleh | Sumber | Command Unix generate |
|-----|---------------|--------|----------------------|
| `SESSION_SECRET` | mylauncher, stokis, mycheck, mycustomer, myperformance | Kunci HMAC cookie session. Minimal 32 karakter. | `openssl rand -base64 48` |
| `REGISTRY_SPREADSHEET_ID` | mylauncher, stokis, mycheck | ID spreadsheet registry Google Sheets (beda per app). | `cat /proc/sys/kernel/random/uuid` |
| `FOLDER_DRIVE_INDUK` | mylauncher, stokis | ID folder Drive induk (opsional). | — (copy dari URL Google Drive) |
| `CRON_SECRET` | mycheck, myperformance | Kunci otorisasi cron internal. | `openssl rand -base64 32` |

### Section B — Global / Sama Semua App (`=`)
Nama key **dan nilainya SAMA PERSIS** di semua app yang memakainya. Ubah serentak di semua app.

| Key | Digunakan oleh | Sumber | Command Unix generate |
|-----|---------------|--------|----------------------|
| `LAUNCHER_SSO_SHARED_SECRET` | semua app | Kunci verifikasi JWT SSO antar app. | `openssl rand -base64 48` |
| `MOCHIKIN_EVENTS_SECRET` | semua app | Kunci verifikasi HMAC event antar app. | `openssl rand -base64 48` |
| `SUPABASE_URL` | semua app | Project URL dari Supabase Dashboard → Settings → API. | — |
| `SUPABASE_ANON_KEY` | semua app | Anon key dari Supabase Dashboard → Settings → API. | — |
| `SUPABASE_SERVICE_ROLE_KEY` | semua app | Service role key dari Supabase Dashboard → Settings → API. | — |
| `NEXT_PUBLIC_SUPABASE_URL` | semua app (client) | Sama dengan `SUPABASE_URL`. | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | semua app (client) | Sama dengan `SUPABASE_ANON_KEY`. | — |
| `UPSTASH_REDIS_REST_URL` | semua app | URL dari Upstash Console → Redis → REST API. | — |
| `UPSTASH_REDIS_REST_TOKEN` | semua app | Token dari Upstash Console → Redis → REST API. | — |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | mylauncher, stokis, mycheck, mycustomer | `client_email` dari file JSON Service Account Google Cloud Console. | — |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | mylauncher, stokis, mycheck, mycustomer | `private_key` dari file JSON Service Account (format PEM, `\n` sebagai literal). | — |
| `APP_TIMEZONE` | semua app | `Asia/Jakarta`. | — |

---

## Key Khusus Hanya Satu App (tidak ada di matriks global)

| Key | App | Sumber | Command Unix generate |
|-----|-----|--------|----------------------|
| `LAUNCHER_SESSION_SECRET` | mylauncher | Kunci session launcher (khusus). | `openssl rand -base64 48` |
| `STOKIS_API_KEY` | stokis | Kunci HMAC session stokis (digunakan `lib/session.ts`). Minimal 32 karakter. | `openssl rand -base64 48` |
| `GOOGLE_DRIVE_FOLDER_ID` | mycheck | ID folder Drive untuk foto bukti. | — (copy dari URL Google Drive) |
| `MYCHECK_GAS_URL` | mycheck | URL Apps Script pendamping mycheck. | — |
| `MYCHECK_GAS_UPLOAD_KEY` | mycheck | Kunci upload Apps Script mycheck. | `openssl rand -base64 32` |
| `MYCHECK_GAS_ADMIN_KEY` | mycheck | Kunci admin Apps Script mycheck. | `openssl rand -base64 32` |
| `CRON_SECRET` | mycheck, myperformance | (sudah di Section A di atas) | `openssl rand -base64 32` |
| `MYPERFORMANCE_URL` | stokis, mycheck, myperformance | Endpoint event emit myperformance. | — |
| `APPS_SCRIPT_URL` | stokis | URL Apps Script legacy (opsional). | — |
| `APP_URL`, `NEXT_PUBLIC_APP_URL` | stokis | URL publik app stokis. | — |
| `SESSION_EXPIRES_IN_SECONDS` | mylauncher | Waktu kedaluwarsa session (detik). | — |
| `MAX_FAILED_LOGIN_ATTEMPTS` | mylauncher | Maksimal percobaan login gagal. | — |
| `ACCOUNT_LOCK_DURATION_MENIT` | mylauncher | Durasi kunci akun (menit). | — |
| `SESSION_COOKIE_DOMAIN` | mylauncher | Domain cookie untuk production. | — |
| `GITHUB_TOKEN` | mylauncher | Token GitHub untuk `/api/apps?enrich=true`. | — |
| `MONTHLY_POINTS_TARGET` | myperformance | Target poin bulanan. | — |
| `NEXT_PUBLIC_MONTHLY_POINTS_TARGET` | myperformance | Versi publik target poin. | — |
| `EFFECTIVE_HOURS_PER_BULAN` | myperformance | Jam kerja efektif per bulan. | — |
| `AUTH_ALLOW_DEV_HEADERS` | myperformance | `false` di production. | — |
| `MOCHIKIN_REGISTRY_SHEET_ID` | myperformance | ID spreadsheet registry untuk `/api/export/monthly`. | — |

---

## Langkah Penerapan

1. Buat nilai unik untuk **Section A** di setiap app dengan command Unix di atas.
2. Buat nilai satu (sama) untuk **Section B**, copy ke semua app.
3. Isi `GOOGLE_SERVICE_ACCOUNT_*` dari file JSON Service Account yang diunduh dari Google Cloud Console.
4. Simpan di `apps/<app>/.env.local` (tidak ter-commit).
5. Untuk production: isi di Vercel Project Settings → Environment Variables (Production + Preview).

---

## Perbedaan dengan Sebelumnya

- Sebelum: tiap app mempunyai susunan variabel acak, ada yang pakai `STOKIS_API_KEY`, ada yang pakai `SESSION_SECRET` untuk hal yang sama, nama belum seragam.
- Sesudah: `SESSION_SECRET` adalah nama standar untuk kunci session di semua app. `LAUNCHER_SSO_SHARED_SECRET` dan `MOCHIKIN_EVENTS_SECRET` sama di semua app. Tidak ada duplikasi nama dengan arti berbeda.
