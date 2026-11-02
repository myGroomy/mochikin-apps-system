'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { fadeUp, FLUID_EASE } from '@/lib/motion';
import {
  ArrowRight,
  ShieldCheck,
  Stack,
  Lightning,
} from '@phosphor-icons/react';

const steps = [
  {
    number: '1',
    title: 'Autentikasi Staf Terpusat',
    description:
      'Masuk menggunakan username atau NIK staf dan PIN 4-digit terdaftar. Tidak perlu akun terpisah untuk setiap aplikasi.',
    icon: ShieldCheck,
  },
  {
    number: '2',
    title: 'Pilih Modul Aplikasi',
    description:
      'Pilih aplikasi yang ingin dibuka dari Launcher Dashboard: Stokis, MyCheck, MyPerformance, atau modul lainnya.',
    icon: Stack,
  },
  {
    number: '3',
    title: 'Bekerja Tanpa Login Ulang',
    description:
      'Sistem melakukan handshake SSO otomatis berbasis HMAC signature. Anda langsung terautentikasi sesuai cabang dan peran Anda.',
    icon: Lightning,
  },
];

const featuredApps = [
  {
    name: 'Stokis',
    category: 'Inventaris & Stock Opname',
    desc: 'Input stok opname cepat & laporan otomatis XLSX WhatsApp.',
    badge: 'Terhubung',
  },
  {
    name: 'MyCheck',
    category: 'Checklist SOP Shift',
    desc: 'Penyelesaian SOP harian, handover antar shift & incident tracking.',
    badge: 'Terhubung',
  },
  {
    name: 'MyPerformance',
    category: 'Points & Scorecards',
    desc: 'Points engine otomatis, evaluasi peer review CARE & leaderboard.',
    badge: 'Terhubung',
  },
  {
    name: 'MyCustomer',
    category: 'Loyalty & CRM',
    desc: 'Interaksi pelanggan dan reward loyalitas multi-cabang.',
    badge: 'Segera',
  },
];

export function LandingPage() {
  return (
    <main className="w-full max-w-full overflow-x-hidden bg-canvas">
      {/* Hero Section */}
      <section className="sky-hero grain relative px-4 pb-20 pt-32 sm:px-6 sm:pb-28 sm:pt-40 lg:px-8">
        <div className="pointer-events-none absolute -top-40 right-[-10%] h-[40rem] w-[40rem] rounded-full bg-accent/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-20%] left-[-8%] h-[32rem] w-[32rem] rounded-full bg-emerald/10 blur-[120px]" />

        <div className="relative mx-auto max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: FLUID_EASE }}
          >
            <div className="mb-4 inline-flex items-center justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                <span className="h-2 w-2 rounded-full bg-accent" /> Portal Layanan & Single Sign-On Multi Cabang
              </span>
            </div>

            <h1 className="mx-auto text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
              Satu Pintu Masuk untuk Seluruh Operasional Gerai
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ash sm:text-xl">
              Hub terpusat autentikasi staf, launcher aplikasi, dan Single Sign-On (SSO) instan untuk seluruh ekosistem Mochikin.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex h-auto items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-ink shadow-[0_8px_24px_-12px_rgba(16,18,20,0.4)] ring-1 ring-ink/10 transition-all duration-700 hover:-translate-y-[2px] active:scale-[0.98]"
              >
                Masuk ke Portal
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 transition-transform duration-500 group-hover:translate-x-0.5">
                  <ArrowRight size={14} weight="bold" className="text-accent" />
                </span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: FLUID_EASE }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Cara Kerja
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-ash">
              Tiga langkah sederhana untuk mengakses seluruh sistem operasional
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.8, ease: FLUID_EASE, delay: i * 0.1 }}
                  className="doppel-outer"
                >
                  <div className="doppel-inner p-6 sm:p-8">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-wash text-accent">
                      <Icon size={22} weight="duotone" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                      Langkah {step.number}
                    </span>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ash">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Apps Grid */}
      <section className="sky-hero px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: FLUID_EASE }}
            className="mb-14"
          >
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Aplikasi di Ekosistem Kami
            </h2>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-ash">
              Platform terintegrasi untuk operasional F&B Mochikin
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredApps.map((app, i) => (
              <motion.div
                key={app.name}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, ease: FLUID_EASE, delay: i * 0.08 }}
                className="group doppel-outer"
              >
                <div className="doppel-inner p-6 transition-all duration-500 hover:-translate-y-1">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-wash text-accent">
                    <Stack size={22} weight="duotone" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-ink">
                    {app.name}
                  </h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-ash">
                    {app.category}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ash">
                    {app.desc}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">
                      {app.badge}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 pb-20 pt-8 sm:px-6 sm:pb-28 lg:px-8">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-ink px-6 py-16 text-center sm:px-12 sm:py-24">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-accent/20 blur-[110px]" />
            <div className="absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-accent-soft/15 blur-[110px]" />
          </div>
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-4xl">
              Siap Kelola Akses Gerai Lebih Praktis?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/60 sm:text-lg">
              Masuk ke portal layanan terpadu sekarang dan nikmati kemudahan akses satu pintu ke seluruh sistem operasional.
            </p>
            <Link
              href="/login"
              className="group mt-8 inline-flex h-auto items-center justify-center gap-2 rounded-full bg-white px-9 py-4 text-base font-semibold text-ink shadow-[0_20px_60px_-20px_rgba(255,255,255,0.4)] transition-all duration-700 hover:-translate-y-[2px] active:scale-[0.98]"
            >
              Masuk ke Portal
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white transition-transform duration-500 group-hover:translate-x-0.5">
                <ArrowRight size={14} weight="bold" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline bg-canvas px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-sm text-ash sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-7">
            <a href="/login" className="transition-colors duration-300 hover:text-ink">
              Masuk
            </a>
            <a href="#" className="transition-colors duration-300 hover:text-ink">
              Fitur
            </a>
            <a href="#" className="transition-colors duration-300 hover:text-ink">
              Cara Kerja
            </a>
          </div>
          <div>
            &copy; {new Date().getFullYear()} Mochikin Service. Semua hak dilindungi.
          </div>
        </div>
      </footer>
    </main>
  );
}
