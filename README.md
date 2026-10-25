# MOCHIKIN-APPS

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![Turborepo](https://img.shields.io/badge/monorepo-Turborepo-000000.svg)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14%2B-black.svg)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E.svg)](https://supabase.com/)
[![Cache & Queue](https://img.shields.io/badge/Cache-Upstash%20Redis-00E599.svg)](https://upstash.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

MOCHIKIN-APPS adalah ekosistem monorepo modular terintegrasi berbasis pola arsitektur ERP Odoo untuk operasional bisnis F&B Mochikin. Platform ini menyatukan portal SSO terpusat, operasional checklist gerai, manajemen persediaan bahan baku (stock opname), customer relationship management (CRM), serta sistem gamifikasi performa dan poin kerja staf ke dalam satu data hub terpadu.

---

## 🚀 Daftar Fitur Utama

- **Single Sign-On (SSO) & Launcher Hub (`mylauncher`)**:
  - Portal navigasi terpusat lintas aplikasi menggunakan handoff token HMAC SHA-256 yang aman.
  - Registrasi aplikasi otomatis berbasis `app.manifest.json`.
- **Manajemen Operasional & Shift (`mycheck`)**:
  - Checklist operasional harian gerai (Opening, Running, Closing) dengan verifikasi bukti foto.
  - Log insiden, serah terima shift (handover), dan rekap kepatuhan SOP per cabang.
- **Stock Opname & Inventory Multi-Cabang (`stokis`)**:
  - Tracking stok fisik bahan baku harian/mingguan dengan ambang batas (threshold) kritis.
  - Rekap otomatis dan pembuatan tautan laporan terformat untuk WhatsApp.
- **Customer Relationship & Loyalty (`mycustomer`)**:
  - Manajemen master data pelanggan (ritel, grosir, korporat) dan segmentasi interaksi CRM.
  - Riwayat log kontak dan riwayat transaksi pelanggan terpusat.
- **Gamifikasi & Poin Kerja Karyawan (`myperformance`)**:
  - Ingestion event real-time dari seluruh aplikasi melalui Redis queue dan HMAC signature.
  - Buku besar poin transparan (*Point Ledger*) dan penilaian scorecard CARE (Cleanliness, Accuracy, Readiness, Engagement).
- **Master Data Hub Terpadu (`@mochikin/shared`)**:
  - Sinkronisasi master cabang (`branches`), karyawan (`people`), multi-cabang (`branch_members`), dan audit log ke Supabase PostgreSQL.

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)

- **Monorepo Engine**: [Turborepo](https://turbo.build/) + [pnpm Workspaces](https://pnpm.io/)
- **Frontend & Fullstack Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Bahasa Pemrograman**: [TypeScript](https://www.typescriptlang.org/)
- **Database & Autentikasi**: [Supabase](https://supabase.com/) (PostgreSQL 15+, Row Level Security, pg_stat_statements)
- **Caching & Event Rate Limiting**: [Upstash Redis](https://upstash.com/) via HTTP REST SDK
- **Integrasi Dokumen & File**: Google Sheets API & Google Drive API (Service Account)
- **Validasi Skema & Keamanan**: [Zod](https://zod.dev/), Crypto HMAC SHA-256

---

## 📋 Persyaratan Sistem (Requirements)

- **Sistem Operasi**: Linux / macOS / Windows (WSL2 sangat direkomendasikan)
- **Node.js**: Versi `>= 18.18.0` (direkomendasikan Node.js LTS 20+)
- **Package Manager**: `pnpm` versi `>= 8.x` atau `npm` / `yarn`
- **Supabase CLI**: Versi `>= 2.x` (opsional, untuk manajemen migrasi basis data lokal/remote)
- **Akses Layanan**:
  - Akun Supabase (PostgreSQL)
  - Akun Upstash Redis REST

---

## 📦 Cara Instalasi

1. **Clone Repositori**:
   ```bash
   git clone https://github.com/mochikin/mochikin-apps.git
   cd MOCHIKIN-APPS
   ```

2. **Pasang Dependensi**:
   ```bash
   pnpm install
   ```

3. **Konfigurasi Environment**:
   Salin berkas template environment ke root dan isi kredensial yang sesuai:
   ```bash
   cp .env.example .env
   ```

4. **Eksekusi Migrasi Database**:
   Jalankan migrasi schema ke project Supabase live:
   ```bash
   supabase db push --db-url "$POSTGRES_URL_NON_POOLING"
   ```

5. **Validasi Gating F0-F6**:
   Pastikan seluruh dependensi dan arsitektur valid:
   ```bash
   pnpm validate:gates
   ```

---

## 🖥️ Cara Penggunaan / Menjalankan Aplikasi

Aplikasi dapat dijalankan secara bersamaan melalui Turborepo atau secara individual:

### Menjalankan Semua Aplikasi (Monorepo Dev Server)
```bash
pnpm dev
```

### Menjalankan Aplikasi Spesifik
| Aplikasi | Port | Perintah Eksekusi |
| :--- | :--- | :--- |
| **mylauncher** | `3000` | `pnpm --filter mylauncher dev` |
| **mycheck** | `3001` | `pnpm --filter mycheck dev` |
| **stokis** | `3002` | `pnpm --filter stokis dev` |
| **mycustomer** | `3003` | `pnpm --filter mycustomer dev` |
| **myperformance**| `3004` | `pnpm --filter myperformance dev` |

---

## 📁 Struktur Direktori

```text
MOCHIKIN-APPS/
├── mylauncher/              # Portal navigasi SSO & aplikasi terdaftar (Port 3000)
├── mycheck/                 # Modul checklist operasional & shift kerja (Port 3001)
├── stokis/                  # Modul stock opname bahan & inventaris (Port 3002)
├── mycustomer/              # Modul CRM & data loyalitas pelanggan (Port 3003)
├── myperformance/           # Modul gamifikasi poin & CARE score (Port 3004)
├── packages/
│   └── shared/              # Pustaka bersama (@mochikin/shared)
│       ├── src/
│       │   ├── master-data/ # Sinkronisasi Cabang, Karyawan, Item, Pelanggan
│       │   ├── sso/         # Helper verifikasi & pembuatan token SSO
│       │   ├── ratelimit/   # Redis rate limiter
│       │   └── env/         # Validator environment variables
├── supabase/
│   └── migrations/          # 9 Berkas SQL migrasi schema database
├── scripts/                 # Skrip utilitas (scaffold, import data, verifikasi)
├── PLANS/                   # Arsip lengkap rencana kerja, PRD, TRD, & playbook
├── package.json             # Root monorepo dependencies & turbo pipeline
├── turbo.json               # Konfigurasi caching build Turborepo
└── README.md                # Dokumentasi utama proyek
```

---

## 🔧 Pemecahan Masalah (Troubleshooting)

- **Gating Validation G7 Fail**:
  - *Penyebab*: `SUPABASE_URL` atau `UPSTASH_REDIS_REST_URL` belum terisi atau salah di file `.env`.
  - *Solusi*: Pastikan key Upstash menggunakan nama `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` (bukan prefix `KV_`).
- **Koneksi Database Gagal saat `supabase db push`**:
  - *Penyebab*: Menggunakan pooling URL port 6543 yang tidak mendukung transaksi migrasi DDL.
  - *Solusi*: Gunakan connection string `POSTGRES_URL_NON_POOLING` (direct connection port 5432).
- **Module `@mochikin/shared` Tidak Terdeteksi**:
  - *Penyebab*: Symlink workspace package belum terbentuk.
  - *Solusi*: Jalankan `pnpm build` pada root atau pastikan folder `packages/shared/dist` sudah ter-compile.

---

## 🤝 Aturan Kontribusi (Contributing)

1. Buat branch baru dari branch `main` dengan format: `feat/nama-fitur` atau `fix/nama-bug`.
2. Setiap aplikasi baru wajib memiliki berkas `app.manifest.json` di root foldernya sesuai standar `AppManifest`.
3. Gunakan script generator resmi saat menambahkan modul aplikasi baru:
   ```bash
   pnpm scaffold:app --name myapp --title "My App" --category operational
   ```
4. Pastikan `pnpm validate:gates` menghasilkan status **PASS (7/7)** sebelum mengajukan Pull Request.
5. Jalankan pemeriksaan linter dan format kode sesuai standar TypeScript monorepo.

---

## 📄 Lisensi & Kontak

- **Lisensi**: Proyek ini dilindungi di bawah lisensi [MIT](LICENSE).
- **Pengembang**: Tim Engineering & Operasional Mochikin.
- **Kontak & Dukungan**: [support@mochikin.id](mailto:support@mochikin.id) | [https://mochikin.id](https://mochikin.id)
