# MOCHIKIN-APPS

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](package.json)
[![Turborepo](https://img.shields.io/badge/monorepo-Turborepo-000000.svg)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E.svg)](https://supabase.com/)
[![Storage](https://img.shields.io/badge/Storage-Supabase%20CDN-3ECF8E.svg)](https://supabase.com/storage)
[![Cache & Queue](https://img.shields.io/badge/Cache-Upstash%20Redis-00E599.svg)](https://upstash.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

MOCHIKIN-APPS adalah ekosistem monorepo modular terintegrasi untuk operasional bisnis F&B Mochikin yang berjalan **100% di atas database terpusat Supabase PostgreSQL & Supabase Storage CDN** (tanpa ketergantungan Google Sheets atau Google Apps Script). Platform ini menyatukan portal SSO terpusat, operasional checklist gerai, stock opname multi-cabang, CRM & loyalitas pelanggan, serta sistem gamifikasi poin kerja staf ke dalam satu RDBMS terpadu.

---

## 🚀 Daftar Aplikasi & Modul Utama

- **Single Sign-On (SSO) & Portal Hub (`apps/myservice` — Port `3000`)**:
  - Portal autentikasi terpusat dengan verifikasi PIN berbasis `scrypt` pada tabel `people`.
  - Pemilihan cabang (`branches` & `branch_members`) dan shift operasional, dengan handoff token HMAC SHA-256 lintas aplikasi.
- **Manajemen Operasional & Checklist SOP (`apps/mycheck` — Port `3001`)**:
  - Siklus shift harian (Open, Checklist Entries, Auto-save Draft, Handover, Close) di tabel `mycheck_shift_instances`, `mycheck_entries`, dan `mycheck_handovers`.
  - Unggah foto bukti langsung ke **Supabase Storage Bucket (`mycheck-photos`)** via CDN publik.
  - Pelaporan insiden (`mycheck_incidents`) dan notifikasi real-time (`mycheck_notifications`).
- **Stock Opname & Inventaris Multi-Cabang (`apps/mystokis` — Port `3002`)**:
  - Pencatatan stok fisik harian/shift secara transaksional di `stokis_opnames` dan `stokis_opname_lines`.
  - Katalog barang & ambang batas kritis per cabang (`stokis_items` & `stokis_branch_thresholds`).
  - Generator laporan Excel (`.xlsx`) *on-the-fly* di memori menggunakan `ExcelJS` dan integrasi tautan laporan WhatsApp.
- **Customer Relationship & Loyalty (`apps/mycustomer` — Port `3003`)**:
  - Database pelanggan & riwayat pesanan (`mycust_customers`, `mycust_orders`, `mycust_order_items`) dengan pencarian nomor telepon berindeks B-Tree (`<100ms`).
  - Analitik retensi pelanggan, segmentasi churn, dan log tindak lanjut WhatsApp (`mycustomer_wa_logs`).
- **Gamifikasi Poin & Evaluasi Kinerja (`apps/myperformance` — Port `3004`)**:
  - Mesin poin otomatis (*Point Ledger* & *Immutable Point Events*) yang menerima event tugas dari `mycheck`, `mystokis`, dan `mycustomer`.
  - Scorecard evaluasi 360° CARE (*Cleanliness, Accuracy, Readiness, Engagement*) dan pelacakan isu ITO.
- **Pustaka Bersama (`packages/shared` & `packages/ui`)**:
  - `@mochikin/shared`: Skema validasi Zod, kontrak emisi event HMAC, klaim JWT SSO, validator environment, dan Upstash Redis rate limiter.
  - `@mochikin/ui`: Komponen antarmuka pengguna bersama berbasis Tailwind CSS & Radix UI.

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)

- **Monorepo Engine**: [Turborepo](https://turbo.build/) + [pnpm Workspaces](https://pnpm.io/)
- **Fullstack Framework**: [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/)
- **Bahasa Pemrograman**: [TypeScript 5](https://www.typescriptlang.org/)
- **Database Utama**: [Supabase PostgreSQL](https://supabase.com/) (44 tabel relasional, B-Tree indexes, immutability triggers)
- **Object Storage**: [Supabase Storage](https://supabase.com/storage) (Public CDN bucket `mycheck-photos`)
- **Caching & Rate Limiting**: [Upstash Redis](https://upstash.com/)
- **Generator Dokumen**: [ExcelJS](https://github.com/exceljs/exceljs) (in-memory `.xlsx` generation)
- **Validasi & Keamanan**: [Zod](https://zod.dev/), Node.js `crypto` (`scrypt` + HMAC SHA-256)

---

## 📋 Persyaratan Sistem (Requirements)

- **Node.js**: `>= 22.12.0`
- **Package Manager**: `pnpm >= 9.x`
- **RAM Development**:
  - Menjalankan 1–2 aplikasi selektif: minimal **4 GB RAM** (WSL2 / Linux / macOS).
  - Menjalankan ke-5 aplikasi secara paralel (`pnpm dev`): direkomendasikan **8 GB RAM**.

---

## 📦 Cara Instalasi & Setup Database

1. **Clone Repositori & Pasang Dependensi**:
   ```bash
   git clone https://github.com/myGroomy/mochikin-apps-system.git
   cd MOCHIKIN-APPS
   pnpm install
   ```

2. **Konfigurasi Environment**:
   Salin `.env.example` menjadi `.env` di root dan `.env.local` pada masing-masing aplikasi. Pastikan variabel Supabase terisi:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   SESSION_SECRET=<minimal-32-karakter>
   LAUNCHER_SSO_SHARED_SECRET=<minimal-32-karakter>
   ```

3. **Inisialisasi Skema Database Supabase**:
   Buka **Supabase SQL Editor** dan jalankan berkas [`supabase/FULL_SETUP.sql`](supabase/FULL_SETUP.sql). Skrip bersifat *idempotent* dan otomatis menyiapkan seluruh 44 tabel, indeks, trigger imutabilitas, bucket storage `mycheck-photos`, serta data awal (*seed*) cabang `CBG01BDG` dan pengguna standar.
   Detail struktur tabel dapat dilihat pada [`Database-shema.md`](Database-shema.md).

4. **Build Paket Shared & Verifikasi**:
   ```bash
   pnpm --filter @mochikin/shared build
   pnpm check-manifests
   pnpm -r exec tsc --noEmit
   pnpm -r test
   ```

---

## 🖥️ Menjalankan Aplikasi

### Mode Selektif (Hemat Memori / WSL 4 GB)
Jalankan portal SSO bersama aplikasi yang sedang dikerjakan:
| Aplikasi | Port | Perintah Eksekusi |
| :--- | :--- | :--- |
| **MyService (Portal SSO)** | `3000` | `pnpm --filter myservice dev` |
| **MyCheck** | `3001` | `pnpm --filter mycheck dev` |
| **MyStokis** | `3002` | `pnpm --filter mystokis dev` |
| **MyCustomer** | `3003` | `pnpm --filter mycustomer dev` |
| **MyPerformance** | `3004` | `pnpm --filter myperformance dev` |

### Mode Paralel Penuh (Membutuhkan RAM >= 8 GB)
```bash
pnpm dev
```

---

## 📁 Struktur Direktori

```text
MOCHIKIN-APPS/
├── apps/
│   ├── myservice/           # Portal SSO & manajemen akses cabang (Port 3000)
│   ├── mycheck/             # Operasional checklist shift, foto CDN, handover, insiden (Port 3001)
│   ├── mystokis/            # Stock opname harian, threshold cabang, generator XLSX (Port 3002)
│   ├── mycustomer/          # CRM pelanggan, riwayat order, retensi WhatsApp (Port 3003)
│   └── myperformance/       # Mesin poin karyawan, evaluasi CARE 360, ITO (Port 3004)
├── packages/
│   ├── shared/              # Kontrak event, SSO token, skema Zod, rate limiter (@mochikin/shared)
│   └── ui/                  # Komponen UI bersama (@mochikin/ui)
├── supabase/
│   ├── FULL_SETUP.sql       # Skrip DDL master RDBMS & Storage (44 tabel)
│   └── migrations/          # Riwayat migrasi skema SQL
├── scripts/                 # Skrip validasi manifest & utilitas monorepo
├── Database-shema.md        # Dokumentasi lengkap skema RDBMS Supabase
├── package.json             # Konfigurasi workspace & skrip root
└── turbo.json               # Pipeline build & test Turborepo
```

---

## 🧪 Pengujian (Testing)

Jalankan seluruh unit test & live RDBMS integration test (total **347+ tests**):
```bash
pnpm -r test
```

---

## 📄 Lisensi

Proyek internal **Mochikin F&B Ecosystem** — dilindungi di bawah lisensi [MIT](LICENSE).
