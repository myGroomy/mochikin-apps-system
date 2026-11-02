'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  ExternalLink,
  KeyRound,
  Layers,
  Lock,
  Package,
  ShieldCheck,
  Smartphone,
  Store,
  Users,
  Zap,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

const steps = [
  {
    number: '1',
    title: 'Autentikasi Staf Terpusat',
    description:
      'Masuk menggunakan username atau NIK staf dan PIN 4-digit terdaftar. Tidak perlu akun terpisah untuk setiap aplikasi.',
  },
  {
    number: '2',
    title: 'Pilih Modul Aplikasi',
    description:
      'Pilih aplikasi yang ingin dibuka dari Launcher Dashboard: Stokis, MyCheck, MyPerformance, atau modul lainnya.',
  },
  {
    number: '3',
    title: 'Bekerja Tanpa Login Ulang',
    description:
      'Sistem melakukan handshake SSO otomatis berbasis HMAC signature. Anda langsung terautentikasi sesuai cabang dan peran Anda.',
  },
];

const mockApps = [
  {
    name: 'Stokis',
    category: 'Inventaris & Stock Opname',
    desc: 'Input stok opname cepat & laporan otomatis XLSX WhatsApp.',
    badge: 'Terhubung',
    accent: 'bg-blue-500/10 text-blue-600 border-blue-200',
  },
  {
    name: 'MyCheck',
    category: 'Checklist SOP Shift',
    desc: 'Penyelesaian SOP harian, handover antar shift & incident tracking.',
    badge: 'Terhubung',
    accent: 'bg-neutral-500/10 text-neutral-800 border-neutral-200',
  },
  {
    name: 'MyPerformance',
    category: 'Points & Scorecards',
    desc: 'Points engine otomatis, evaluasi peer review CARE & leaderboard.',
    badge: 'Terhubung',
    accent: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  },
  {
    name: 'MyCustomer',
    category: 'Loyalty & CRM',
    desc: 'Interaksi pelanggan dan reward loyalitas multi-cabang.',
    badge: 'Segera',
    accent: 'bg-amber-500/10 text-amber-700 border-amber-200',
  },
];

export function LandingPage() {
  return (
    <main className="overflow-x-hidden w-full max-w-full bg-base-100">
      {/* Hero Section */}
      <section className="px-8 pt-28 mx-auto md:px-12 lg:px-24 max-w-7xl relative">
        <div className="max-w-3xl text-center mx-auto lg:text-balance mb-10">
          <div className="mb-4 inline-flex items-center justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#D97706]">
              <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
              Portal Layanan &amp; Single Sign-On Multi Cabang
            </span>
          </div>

          <h1
            className="mt-4 font-semibold text-base-content"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              lineHeight: '1.15',
              letterSpacing: '-0.02em',
            }}
          >
            Satu Pintu Masuk untuk Seluruh Operasional Gerai
          </h1>

          <p className="text-base leading-normal mt-5 text-base-content/60 font-medium max-w-xl mx-auto">
            Hub terpusat autentikasi staf, launcher aplikasi, dan Single Sign-On (SSO) instan untuk Stokis, MyCheck, MyPerformance, dan MyCustomer. Aman, terisolasi, dan mobile friendly.
          </p>

          <div className="flex flex-wrap items-center gap-3 justify-center mx-auto mt-10">
            <Link
              href="/login"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-white bg-[#F59E0B] hover:bg-[#D97706] focus:ring-amber-500/50 h-10 px-6 text-sm font-medium rounded-lg"
            >
              Masuk ke Portal
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <a
              href="#cara-kerja"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-[#D97706] bg-amber-50 hover:bg-amber-100 focus:ring-amber-500/50 h-10 px-6 text-sm font-semibold rounded-lg gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Cara Kerja SSO</span>
            </a>
            <a
              href="#fitur"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-base-content/70 bg-base-200 hover:bg-base-300 hover:text-base-content ring-1 ring-base-300 focus:ring-amber-500/30 h-10 px-6 text-sm font-medium rounded-lg"
            >
              Lihat Fitur
            </a>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="relative w-full mx-auto max-w-5xl items-center py-12">
          <div className="p-6 sm:p-10 bg-amber-500/5 rounded-2xl">
            <div className="w-full ring-4 ring-base-200 border border-base-300 rounded-xl overflow-hidden bg-base-100 shadow-2xl">
              {/* Mockup Top Bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-base-200/60 border-b border-base-300">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-error/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-base-100 text-xs text-base-content/50 font-medium border border-base-200">
                    <Layers className="w-3 h-3 text-[#D97706]" />
                    services.mochikin.id/portal
                  </div>
                </div>
              </div>

              {/* Mockup Content */}
              <div className="p-4 sm:p-6 space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-xs text-amber-800 font-medium">Aplikasi Terhubung</div>
                    <div className="text-lg font-bold text-[#D97706] mt-1">4 Modul Aktif</div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="text-xs text-emerald-800 font-medium">Status Gateway</div>
                    <div className="text-lg font-bold text-emerald-700 mt-1">SSO Aktif</div>
                  </div>
                  <div className="p-3 rounded-lg bg-base-200/50 border border-base-300">
                    <div className="text-xs text-base-content/50 font-medium">Keamanan Sesi</div>
                    <div className="text-lg font-bold text-base-content mt-1">HMAC SHA-256</div>
                  </div>
                </div>

                {/* Live Section Header */}
                <div className="flex items-center justify-between border-b border-base-200 pb-3 pt-1">
                  <div>
                    <span className="text-xs text-base-content/50">Cabang Gandaria · NIK: 202401</span>
                    <h3 className="text-base font-semibold text-base-content">Launcher Aplikasi Terintegrasi</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-[#D97706]">
                    Portal Aktif
                  </span>
                </div>

                {/* Mockup App Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mockApps.map((app, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-3 p-3.5 rounded-lg bg-base-200/40 border border-base-200 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base-content">{app.name}</span>
                          <span className="text-2xs text-base-content/50 font-mono">
                            {app.category}
                          </span>
                        </div>
                        <p className="text-base-content/60 text-2xs leading-relaxed truncate">
                          {app.desc}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-2xs font-semibold shrink-0 border ${app.accent}`}>
                        {app.badge}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bottom sync status */}
                <div className="flex items-center justify-between border-t border-base-200 pt-3 text-xs text-base-content/50">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#F59E0B] animate-pulse" />
                    <span>Single Sign-On Gateway Siap Digunakan</span>
                  </div>
                  <span className="text-base-content/40">Otorisasi Terpusat</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee - Fitur Tags */}
      <section className="py-16 overflow-hidden">
        <div className="relative px-8">
          <div className="absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-base-100 to-transparent" />
          <div className="absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-base-100 to-transparent" />
          <div className="flex items-center gap-2 whitespace-nowrap animate-marquee">
            {[
              'Single Sign-On',
              'Central Hub',
              'Multi Cabang',
              'HMAC Security',
              'Launcher 1-Klik',
              'Role & Otorisasi',
              'Audit Trail',
              'Isolasi Data',
              'Mobile Friendly',
              'Health Check',
              'Dynamic URL Config',
              'Single Sign-On',
              'Central Hub',
              'Multi Cabang',
              'HMAC Security',
              'Launcher 1-Klik',
            ].map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center font-medium text-base-content/60 bg-base-200/60 px-4 py-1.5 text-sm rounded-lg flex-shrink-0"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Fitur Utama - Bento Grid */}
      <section id="fitur" className="px-8 py-20 mx-auto md:px-12 lg:px-24 max-w-7xl">
        <div className="text-center max-w-2xl mx-auto lg:text-balance mb-14">
          <p className="text-sm leading-normal font-bold uppercase text-[#D97706]">
            Fitur Utama
          </p>
          <h2 className="text-xl leading-tight tracking-tight sm:text-2xl md:text-3xl capitalize lg:text-4xl mt-4 font-semibold text-base-content lg:text-balance">
            Yang Anda Butuhkan untuk Akses Ekosistem Modern
          </h2>
          <p className="text-base leading-normal mt-4 text-base-content/60 font-medium">
            Satu kali login staf menghubungkan seluruh modul operasional tanpa repot.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {/* Large card - spans 2 cols */}
          <div className="sm:col-span-2 bg-base-200/50 p-8 rounded-2xl border border-base-300/50 hover:scale-[1.01] transition-transform duration-300">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-[#D97706]">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-base-content">
                  Single Sign-On (SSO) Instan
                </h3>
                <p className="text-sm text-base-content/60 mt-2 leading-relaxed">
                  Cukup login satu kali di Mochikin Service. Buka Stokis, MyCheck, dan MyPerformance langsung tanpa perlu memasukkan username atau password berulang kali. Token ditransfer aman secara otomatis.
                </p>
              </div>
            </div>
          </div>

          {/* Tall card - spans 2 rows */}
          <div className="row-span-2 bg-[#F59E0B] text-white p-8 rounded-2xl hover:scale-[1.01] transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold">
              Keamanan Sesi &amp; Isolasi Data
            </h3>
            <p className="text-sm mt-2 opacity-90 leading-relaxed">
              Arsitektur keamanan berbasis shared-secret HMAC SHA-256 dengan masa kedaluwarsa ketat untuk mencegah penyadapan atau replay attacks.
            </p>
            <div className="mt-6 space-y-2.5">
              {[
                'Enkripsi HMAC SHA-256',
                'Time-bounded token (120 detik)',
                'Isolasi database per cabang',
                'Audit log aktivitas terpusat',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm opacity-90">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Small card 1 */}
          <div className="bg-base-200/50 p-6 rounded-2xl border border-base-300/50 hover:scale-[1.01] transition-transform duration-300">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-4 text-[#D97706]">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-base-content">
              Launcher Satu Klik
            </h3>
            <p className="text-sm text-base-content/60 mt-2">
              Beralih antar aplikasi operasional dengan satu ketukan langsung dari portal dashboard.
            </p>
          </div>

          {/* Small card 2 */}
          <div className="bg-base-200/50 p-6 rounded-2xl border border-base-300/50 hover:scale-[1.01] transition-transform duration-300">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-4 text-[#D97706]">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-base-content">
              Target URL Dinamis
            </h3>
            <p className="text-sm text-base-content/60 mt-2">
              Admin dapat mengatur domain dan port target setiap aplikasi tanpa perlu redeploy.
            </p>
          </div>

          {/* Another wide card */}
          <div className="sm:col-span-2 bg-base-200/50 p-6 rounded-2xl border border-base-300/50 hover:scale-[1.01] transition-transform duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 text-[#D97706]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-base-content">
                  Master Identitas Staf &amp; Cabang
                </h3>
                <p className="text-sm text-base-content/60 mt-1.5">
                  Satu data induk karyawan dan cabang yang disinkronkan ke seluruh ekosistem. Pembaruan data staf otomatis terdistribusi ke semua aplikasi turunan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cara Kerja - Amber Accent Section */}
      <section id="cara-kerja" className="bg-[#F59E0B] py-20 text-white">
        <div className="max-w-7xl mx-auto px-8 md:px-12 lg:px-24">
          <div className="text-center mb-14">
            <p className="text-sm leading-normal font-bold uppercase text-white/80">
              Cara Kerja
            </p>
            <h2 className="text-xl leading-tight tracking-tight sm:text-2xl md:text-3xl capitalize lg:text-4xl mt-4 font-semibold text-white">
              Tiga Langkah Alur Akses Aman Terpadu
            </h2>
            <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
              Navigasi mulus antar aplikasi tanpa hambatan autentikasi berulang.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 relative gap-5 lg:gap-10 max-lg:divide-y lg:divide-x divide-white/20 divide-dashed">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative z-10 text-center md:text-left pt-6 md:pe-10 lg:py-0 pb-10 last:pb-0 last:pe-0"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center mx-auto md:mx-0 mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-base text-white/80 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kenapa Mochikin Service - Split Section */}
      <section className="px-8 py-24 mx-auto md:px-12 lg:px-24 max-w-7xl relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
          <div className="lg:order-last">
            <p className="text-sm leading-normal font-bold uppercase text-[#D97706]">
              Mengapa Mochikin Service
            </p>
            <h2 className="text-xl leading-tight tracking-tight sm:text-2xl md:text-3xl capitalize lg:text-4xl mt-4 font-semibold text-base-content">
              Dibuat untuk Menyederhanakan Ekosistem Multi-Aplikasi Gerai
            </h2>
            <p className="text-base leading-normal mt-4 text-base-content/60 font-medium">
              Menghilangkan hambatan staf lapangan dalam mengingat banyak kata sandi serta memberi admin visibilitas menyeluruh atas operasional seluruh cabang.
            </p>
            <div className="flex flex-wrap items-center gap-2 mx-auto mt-10">
              <Link
                href="/login"
                className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-white bg-[#F59E0B] hover:bg-[#D97706] focus:ring-amber-500/50 h-10 px-6 text-sm font-medium rounded-lg"
              >
                Mulai Sekarang
              </Link>
              <a
                href="#fitur"
                className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-base-content/70 bg-base-200 hover:bg-base-300 hover:text-base-content ring-1 ring-base-300 focus:ring-amber-500/30 h-10 px-6 text-sm font-medium rounded-lg"
              >
                Pelajari Fitur
              </a>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 text-center gap-x-6 gap-y-12">
              {[
                {
                  icon: KeyRound,
                  title: 'Satu Kunci Akses',
                  desc: 'Staf hanya perlu mengingat satu akun untuk membuka semua alat kerja.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Keamanan HMAC',
                  desc: 'Protokol token terenkripsi menjamin keabsahan sesi antar aplikasi.',
                },
                {
                  icon: Smartphone,
                  title: 'Mobile First',
                  desc: 'Bisa diakses dari browser smartphone staf gerai dengan respons cepat.',
                },
                {
                  icon: Layers,
                  title: 'Integrasi Ekosistem',
                  desc: 'Menghubungkan Stokis, MyCheck, MyPerformance, dan MyCustomer jadi satu.',
                },
              ].map((item) => (
                <div key={item.title}>
                  <div className="flex flex-col gap-3 text-[#D97706]">
                    <item.icon className="w-5 h-5 mx-auto" />
                    <div>
                      <h3 className="text-base leading-normal sm:text-lg md:text-xl text-base-content font-medium">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                  <div>
                    <p className="text-base leading-normal mt-2 text-base-content/60 font-medium">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-base-200/50">
        <div className="px-8 py-24 mx-auto md:px-12 lg:px-24 max-w-7xl text-center">
          <h2 className="text-2xl leading-tight tracking-tight sm:text-3xl md:text-4xl capitalize font-semibold text-base-content">
            Siap Kelola Akses Gerai Lebih Praktis?
          </h2>
          <p className="text-base leading-normal mt-4 text-base-content/60 font-medium max-w-lg mx-auto">
            Masuk ke portal layanan terpadu sekarang dan nikmati kemudahan akses satu pintu ke seluruh sistem operasional.
          </p>
          <div className="flex flex-wrap items-center gap-3 justify-center mt-10">
            <Link
              href="/login"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-white bg-[#F59E0B] hover:bg-[#D97706] focus:ring-amber-500/50 h-11 px-8 text-sm font-medium rounded-lg"
            >
              Masuk ke Portal
              <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
            <a
              href="#fitur"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-base-content/70 bg-base-200 hover:bg-base-300 hover:text-base-content ring-1 ring-base-300 focus:ring-amber-500/30 h-11 px-8 text-sm font-medium rounded-lg"
            >
              Pelajari Fitur
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-base-300/50 bg-base-100">
        <div className="px-6 md:px-12 lg:px-24 py-12 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <Logo size="sm" />
            </Link>
            <div className="flex items-center gap-6 text-sm text-base-content/50">
              <Link href="/login" className="hover:text-base-content transition">
                Masuk
              </Link>
              <a href="#fitur" className="hover:text-base-content transition">
                Fitur
              </a>
              <a href="#cara-kerja" className="hover:text-base-content transition">
                Cara Kerja
              </a>
            </div>
            <p className="text-xs text-base-content/60">
              &copy; {new Date().getFullYear()} Mochikin Service. Hak cipta dilindungi.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
