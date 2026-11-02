'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { ChevronRight } from 'lucide-react';

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

const featuredApps = [
  {
    name: 'Stokis',
    category: 'Inventaris & Stock Opname',
    desc: 'Input stok opname cepat & laporan otomatis XLSX WhatsApp.',
    badge: 'Terhubung',
    accent: 'bg-amber-500/10 text-amber-600 border-amber-200',
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
    <main className="overflow-x-hidden w-full max-w-full bg-white">
      {/* Hero Section */}
      <section className="px-8 pt-28 mx-auto md:px-12 lg:px-24 max-w-7xl relative">
        <div className="max-w-3xl text-center mx-auto lg:text-balance mb-10">
          <div className="mb-4 inline-flex items-center justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-600" /> Portal Layanan & Single Sign-On Multi Cabang
            </span>
          </div>

          <h1
            className="mt-4 font-semibold text-gray-700"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              lineHeight: '1.15',
              letterSpacing: '-0.02em',
            }}
          >
            Satu Pintu Masuk untuk Seluruh Operasional Gerai
          </h1>

          <p className="text-base leading-normal mt-5 text-gray-400 font-medium max-w-xl mx-auto">
            Hub terpusat autentikasi staf, launcher aplikasi, dan Single Sign-On (SSO) instan untuk Stokis, MyCheck, MyPerformance, dan MyCustomer. Aman, terisolasi, dan mobile friendly.
          </p>

          <div className="flex flex-wrap items-center gap-3 justify-center mx-auto mt-10">
            <Link
              href="/login"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-white bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/50 h-11 px-8 text-sm font-medium rounded-lg"
            >
              Masuk ke Portal
              <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="px-8 md:px-12 lg:px-24 max-w-7xl mx-auto">
          <h2 className="text-2xl leading-tight tracking-tight sm:text-3xl md:text-4xl capitalize font-semibold text-gray-700">
            Fitur Utama MOCHIKIN SERVICE
          </h2>
          <p className="text-base leading-normal mt-4 text-gray-400 font-medium max-w-lg mx-auto">
            Platform terintegrasi untuk operasional F&B Mochikin
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                  <span className="text-amber-600 font-bold">{step.number}</span>
                </div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">{step.title}</h3>
                <p className="text-sm text-gray-400 line-clamp-2">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apps Grid */}
      <section className="py-16">
        <div className="px-8 md:px-12 lg:px-24 max-w-7xl mx-auto">
          <h2 className="text-2xl leading-tight tracking-tight sm:text-3xl md:text-4xl capitalize font-semibold text-gray-700 mb-8">
            Aplikasi di Ekosistem Kami
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredApps.map((app) => (
              <div
                key={app.name}
                className={`p-6 rounded-lg border ${app.accent} transition-colors hover:bg-amber-50 hover:border-amber-200`}
              >
                <div className="w-12 h-12 rounded-md mb-4 flex items-center justify-center mx-auto">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 20 L20 10 M20 20 L11 27 M20 20 L29 27"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx="20" cy="20" r="3" fill="currentColor" />
                    <circle cx="20" cy="10" r="2.5" fill="currentColor" />
                    <circle cx="11" cy="27" r="2.5" fill="currentColor" />
                    <circle cx="29" cy="27" r="2.5" fill="currentColor" />
                  </svg>
                </div>
                <h3 className="text-base leading-normal sm:text-lg md:text-xl text-gray-600 font-medium mb-2">{app.name}</h3>
                <p className="text-sm text-gray-400 line-clamp-2">{app.desc}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-500 capitalize">{app.badge}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="px-8 md:px-12 lg:px-24 max-w-7xl text-center mx-auto">
          <h2 className="text-2xl leading-tight tracking-tight sm:text-3xl md:text-4xl capitalize font-semibold text-gray-700">
            Siap Kelola Akses Gerai Lebih Praktis?
          </h2>
          <p className="text-base leading-normal mt-4 text-gray-400 font-medium max-w-lg mx-auto">
            Masuk ke portal layanan terpadu sekarang dan nikmati kemudahan akses satu pintu ke seluruh sistem operasional.
          </p>
          <div className="flex flex-wrap items-center gap-3 justify-center mt-10">
            <Link
              href="/login"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-white bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/50 h-11 px-8 text-sm font-medium rounded-lg"
            >
              Masuk ke Portal
              <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
            <a
              href="#fitur"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-gray-400/70 bg-white hover:bg-gray-100 hover:text-gray-600 ring-1 ring-gray-200 focus:ring-amber-500/30 h-11 px-8 text-sm font-medium rounded-lg"
            >
              Pelajari Fitur
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="px-6 md:px-12 lg:px-24 py-12 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <Logo size="sm" />
            </Link>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="/login" className="hover:text-gray-600 transition">Masuk</a>
              <a href="#fitur" className="hover:text-gray-600 transition">Fitur</a>
              <a href="#cara-kerja" className="hover:text-gray-600 transition">Cara Kerja</a>
            </div>
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} Mochikin Service. Hak cipta dilindungi.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
