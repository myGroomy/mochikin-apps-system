# MYCUSTOMER

CRM untuk bisnis F&B untuk mencatat order, mengelola profil customer, memantau retensi, dan melakukan follow-up WhatsApp manual. Aplikasi menggunakan Next.js App Router, TypeScript, Tailwind CSS, dan Supabase sebagai satu-satunya datastore operasional. Workbook CSV/Excel yang tersedia hanya template import; bukan database.

## Persyaratan

- Node.js 20 atau lebih baru
- pnpm sesuai konfigurasi workspace
- Proyek Supabase yang sudah memiliki schema MyCustomer

## Setup lokal

Dari root repository:

```bash
pnpm install
cp apps/mycustomer/.env.example apps/mycustomer/.env.local
```

Isi environment lokal:

- `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` untuk akses server-side.
- `SESSION_SECRET` dengan nilai acak minimal 32 karakter (`openssl rand -hex 32`).
- `LAUNCHER_SSO_SHARED_SECRET` bila memakai SSO dari launcher.
- `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` bila memakai Redis opsional.
- Pengaturan retensi default dapat diubah melalui `NEXT_PUBLIC_DEFAULT_CHURN_ACTIVE_DAYS` dan `NEXT_PUBLIC_DEFAULT_CHURN_AT_RISK_DAYS`.

Jangan gunakan service-role key di client/browser dan jangan commit `.env.local` atau secret. Terapkan schema melalui migrasi Supabase yang sesuai; jangan menjalankan `supabase/FULL_SETUP.sql` langsung di production karena skrip tersebut bersifat destruktif.

Jalankan aplikasi dan pemeriksaan dari root repository:

```bash
pnpm --filter mycustomer dev
pnpm --filter mycustomer typecheck
pnpm --filter mycustomer lint
pnpm --filter mycustomer build
```

Aplikasi lokal berjalan di [http://localhost:3003](http://localhost:3003).

## Data dan akses

Customer dan order tersimpan pada tabel kanonis `mycust_customers` dan `mycust_orders`; pengaturan aplikasi tersimpan di Supabase. Route server memvalidasi custom session dan membatasi akses berdasarkan role/cabang. Import CSV memvalidasi data sebelum menulis ke Supabase.

- **Admin**: mengelola cabang dan user, import data, serta melihat data lintas cabang sesuai otorisasi.
- **Kasir/petugas**: menjalankan operasional cabang sendiri sesuai akses yang diberikan.

Import/export berisi PII dan harus tetap dilindungi di endpoint API; menyembunyikan tombol UI saja tidak cukup.

## Deploy ke Vercel

Gunakan preset Next.js dan build command dari `apps/mycustomer/vercel.json`. Konfigurasikan URL Supabase, service-role key, dan session secret sebagai environment variables server-side. Setelah deploy, uji login, otorisasi cabang, customer/order, import CSV, dan pengaturan.

Workbook import opsional dijelaskan di [templates-database/README.md](templates-database/README.md). Panduan aplikasi tersedia di [halaman dokumentasi](/docs).
