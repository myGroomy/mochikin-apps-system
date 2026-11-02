'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Layers3,
  Smartphone,
  ShieldCheck,
  UsersRound,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

const steps = [
  {
    number: '1',
    title: 'Buka Shift & Pilih Tim',
    description:
      'Penanggung jawab membuka shift baru, memilih cabang kerja, dan seluruh staf shift dapat langsung bergabung.',
  },
  {
    number: '2',
    title: 'Kerjakan Checklist & SOP',
    description:
      'Selesaikan item checklist dengan validasi real-time, unggah bukti foto, dan draft autosave agar tidak ada data hilang.',
  },
  {
    number: '3',
    title: 'Handover & Tutup Shift',
    description:
      'Isi catatan serah terima, catat incident bila ada, lalu kunci laporan shift secara otomatis untuk tinjauan manajemen.',
  },
];

const checklistPreview = [
  { label: 'Cek kebersihan area kasir & meja makan', done: true, time: '07:15' },
  { label: 'Pastikan perlengkapan & raw materials lengkap', done: true, time: '07:22' },
  { label: 'Periksa suhu chiller (standar 2°C - 4°C)', done: true, time: '07:30' },
  { label: 'Siapkan opening cash float & cetak settlement', done: false, time: 'Pending' },
];

export function LandingPage() {
  return (
    <main className="w-full max-w-full overflow-x-hidden bg-white text-[#1A1A1A]">
      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-8 pt-28 md:px-12 lg:px-24">
        <div className="mx-auto mb-10 max-w-3xl text-center lg:text-balance">
          <div className="mb-4 inline-flex items-center justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]">
              <span className="h-2 w-2 rounded-full bg-[#1A1A1A]" />
              Sistem Operasional Shift Multi Cabang
            </span>
          </div>

          <h1
            className="mt-4 font-semibold text-[#1A1A1A]"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              lineHeight: '1.15',
              letterSpacing: '-0.02em',
            }}
          >
            Shift Lebih Rapi, Operasional Lebih Terkendali
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base font-medium leading-normal text-neutral-600">
            Satu alur untuk checklist SOP, serah terima, incident tracking, dan laporan shift otomatis. Terisolasi per cabang, aman, dan nyaman dipakai dari ponsel.
          </p>

          <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#1A1A1A] px-6 text-sm font-medium text-white transition-all duration-200 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              Mulai Sekarang
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-neutral-100 px-6 text-sm font-semibold text-[#1A1A1A] transition-all duration-200 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-300"
            >
              <BookOpen className="h-4 w-4" />
              <span>Pelajari Cara Pakai</span>
            </Link>
            <a
              href="#fitur"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-200 bg-white px-6 text-sm font-medium text-neutral-700 transition-all duration-200 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300"
            >
              Lihat Fitur
            </a>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="relative mx-auto w-full max-w-5xl items-center py-12">
          <div className="rounded-2xl bg-neutral-100/70 p-6 sm:p-10">
            <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl ring-4 ring-neutral-100">
              {/* Mockup Top Bar */}
              <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50/80 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-xs font-medium text-neutral-500 border border-neutral-200/60">
                    <ClipboardCheck className="h-3 w-3 text-[#1A1A1A]" />
                    mycheck.app/shift/live
                  </div>
                </div>
              </div>

              {/* Mockup Content */}
              <div className="space-y-4 p-4 sm:p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <div className="text-xs font-medium text-neutral-500">Progress SOP</div>
                    <div className="mt-1 text-lg font-bold text-[#1A1A1A]">12 / 16</div>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                    <div className="text-xs font-medium text-emerald-800">Tim Aktif</div>
                    <div className="mt-1 text-lg font-bold text-emerald-700">4 Staf</div>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <div className="text-xs font-medium text-neutral-500">Incident</div>
                    <div className="mt-1 text-lg font-bold text-neutral-700">0 Laporan</div>
                  </div>
                </div>

                {/* Live Shift Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3 pt-1">
                  <div>
                    <span className="text-xs text-neutral-400">Cabang Gandaria · Shift Pagi</span>
                    <h3 className="text-base font-semibold text-[#1A1A1A]">Pemeriksaan Kesiapan Outlet</h3>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Sedang Berjalan
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full w-3/4 rounded-full bg-[#1A1A1A]" />
                </div>

                {/* Mockup Checklist Rows */}
                <div className="space-y-2">
                  {checklistPreview.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50/70 px-3.5 py-2.5 text-xs border border-neutral-100"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                            item.done
                              ? 'bg-[#1A1A1A] text-white'
                              : 'border border-neutral-300 bg-white text-transparent'
                          }`}
                        >
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                        <span className={`font-medium truncate ${item.done ? 'text-neutral-500 line-through' : 'text-[#1A1A1A]'}`}>
                          {item.label}
                        </span>
                      </div>
                      <span className="shrink-0 text-2xs text-neutral-400 font-mono">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bottom sync status */}
                <div className="flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Autosave draft aktif</span>
                  </div>
                  <span className="text-neutral-400">Terakhir disinkronkan 1 menit lalu</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee - Fitur Tags */}
      <section className="overflow-hidden py-16">
        <div className="relative px-8">
          <div className="absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
          <div className="absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />
          <div className="flex items-center gap-2 whitespace-nowrap animate-marquee">
            {[
              'Checklist SOP',
              'Handover Shift',
              'Incident Tracking',
              'Laporan Otomatis',
              'Multi Cabang',
              'Draft Autosave',
              'Bukti Foto',
              'Audit Trail',
              'Validasi Real-time',
              'Role & Otorisasi',
              'Mobile Friendly',
              'Single Sign-On',
              'Checklist SOP',
              'Handover Shift',
              'Incident Tracking',
              'Laporan Otomatis',
              'Multi Cabang',
              'Draft Autosave',
              'Bukti Foto',
              'Audit Trail',
            ].map((tag, i) => (
              <span
                key={i}
                className="inline-flex shrink-0 items-center rounded-lg bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Fitur Utama - Bento Grid */}
      <section id="fitur" className="mx-auto max-w-7xl px-8 py-20 md:px-12 lg:px-24">
        <div className="mx-auto mb-14 max-w-2xl text-center lg:text-balance">
          <p className="text-sm font-bold uppercase leading-normal text-[#1A1A1A]">
            Fitur Utama
          </p>
          <h2 className="mt-4 text-xl font-semibold capitalize leading-tight tracking-tight sm:text-2xl md:text-3xl lg:text-4xl text-[#1A1A1A]">
            Yang Anda Butuhkan untuk Operasional Shift Modern
          </h2>
          <p className="mt-4 text-base font-medium leading-normal text-neutral-600">
            Dari input SOP harian hingga serah terima antar shift, semuanya terintegrasi dalam satu sistem terpusat.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Large card - spans 2 cols */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-8 transition-transform duration-300 hover:scale-[1.01] sm:col-span-2">
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-200/80 text-[#1A1A1A]">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A1A]">
                  Checklist SOP Cepat & Terarah
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  Form dinamis yang dirancang untuk input cepat di lapangan. Dilengkapi validasi angka/teks, bukti foto wajib, dan draft autosave per cabang sehingga pekerjaan tidak pernah hilang.
                </p>
              </div>
            </div>
          </div>

          {/* Tall card - spans 2 rows */}
          <div className="row-span-2 rounded-2xl bg-[#1A1A1A] p-8 text-white transition-transform duration-300 hover:scale-[1.01]">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Laporan Shift & Handover Siap Tinjau
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              Setiap catatan checklist, temuan incident, dan catatan serah terima dirangkum dalam laporan shift yang terkunci rapi untuk evaluasi manajer.
            </p>
            <div className="mt-6 space-y-2.5">
              {[
                'Progres real-time shift',
                'Handover antar staf & shift',
                'Rekam jejak incident transparan',
                'Kunci laporan anti modifikasi',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-neutral-200">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Small card 1 */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-6 transition-transform duration-300 hover:scale-[1.01]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-200/80 text-[#1A1A1A]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-[#1A1A1A]">
              Dashboard Operasional
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              Pantau status shift aktif, tingkat kepatuhan SOP, dan alert incident dari satu panel monitor.
            </p>
          </div>

          {/* Small card 2 */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-6 transition-transform duration-300 hover:scale-[1.01]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-200/80 text-[#1A1A1A]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-[#1A1A1A]">
              Isolasi Data Per Cabang
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              Otorisasi berbasis role dan isolasi database cabang menjaga privasi serta kebersihan data gerai.
            </p>
          </div>

          {/* Another wide card */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-6 transition-transform duration-300 hover:scale-[1.01] sm:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-200/80 text-[#1A1A1A]">
                <UsersRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1A1A1A]">
                  Kolaborasi Tim Tanpa Duplikasi
                </h3>
                <p className="mt-1.5 text-sm text-neutral-600">
                  Seluruh staf shift melihat progres tugas yang sama secara real-time. Tidak ada lagi pekerjaan rangkap atau informasi tercecer di grup chat pribadi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cara Kerja - Primary Dark Section */}
      <section className="bg-[#1A1A1A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-8 md:px-12 lg:px-24">
          <div className="mb-14 text-center">
            <p className="text-sm font-bold uppercase leading-normal text-white/70">
              Cara Kerja
            </p>
            <h2 className="mt-4 text-xl font-semibold capitalize leading-tight tracking-tight sm:text-2xl md:text-3xl lg:text-4xl text-white">
              Tiga Langkah Menuju Shift yang Lebih Terkendali
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              Alur kerja terstruktur dari pembukaan shift hingga serah terima selesai.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-5 divide-dashed divide-white/20 md:grid-cols-2 lg:grid-cols-3 lg:gap-10 max-lg:divide-y lg:divide-x">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative z-10 pb-10 pt-6 text-center last:pb-0 md:text-left lg:py-0 lg:pe-10 last:lg:pe-0"
              >
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-bold text-white md:mx-0">
                  {step.number}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">{step.title}</h3>
                <p className="text-base text-white/80 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kenapa MyCheck - Split Section */}
      <section className="relative mx-auto max-w-7xl px-8 py-24 md:px-12 lg:px-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-3">
          <div className="lg:order-last">
            <p className="text-sm font-bold uppercase leading-normal text-[#1A1A1A]">
              Mengapa MyCheck
            </p>
            <h2 className="mt-4 text-xl font-semibold capitalize leading-tight tracking-tight sm:text-2xl md:text-3xl lg:text-4xl text-[#1A1A1A]">
              Dirancang untuk Tim Outlet yang Butuh Kepraktisan
            </h2>
            <p className="mt-4 text-base font-medium leading-normal text-neutral-600">
              Setiap tombol dan alur dibuat untuk memudahkan staf lapangan menyelesaikan SOP dengan cepat tanpa beban administratif yang rumit.
            </p>
            <div className="mx-auto mt-10 flex flex-wrap items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#1A1A1A] px-6 text-sm font-medium text-white transition-all duration-200 hover:bg-neutral-800"
              >
                Mulai Sekarang
              </Link>
              <a
                href="#fitur"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-200 bg-white px-6 text-sm font-medium text-neutral-700 transition-all duration-200 hover:bg-neutral-50"
              >
                Pelajari Fitur
              </a>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 text-center">
              {[
                {
                  icon: ClipboardCheck,
                  title: 'Input Terarah',
                  desc: 'Form ringkas dengan validasi otomatis dan upload foto langsung dari kamera.',
                },
                {
                  icon: FileCheck2,
                  title: 'Jejak Waktu Nyata',
                  desc: 'Setiap checklist tercatat bersama timestamp dan identitas staf pengerja.',
                },
                {
                  icon: Smartphone,
                  title: 'Mobile First',
                  desc: 'Responsif dan ringan dibuka di smartphone staf tanpa perlu laptop.',
                },
                {
                  icon: Layers3,
                  title: 'Satu Sumber Data',
                  desc: 'Checklist, serah terima, dan incident tersinkronisasi dalam satu alur utuh.',
                },
              ].map((item) => (
                <div key={item.title}>
                  <div className="flex flex-col gap-3 text-[#1A1A1A]">
                    <item.icon className="mx-auto h-5 w-5" />
                    <div>
                      <h3 className="text-base font-medium leading-normal sm:text-lg md:text-xl text-[#1A1A1A]">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                  <div>
                    <p className="mt-2 text-base font-medium leading-normal text-neutral-600">
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
      <section className="bg-neutral-100/60">
        <div className="mx-auto max-w-7xl px-8 py-24 text-center md:px-12 lg:px-24">
          <h2 className="text-2xl font-semibold capitalize leading-tight tracking-tight sm:text-3xl md:text-4xl text-[#1A1A1A]">
            Siap Buat Operasional Shift Lebih Teratur?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base font-medium leading-normal text-neutral-600">
            Mulai gunakan MyCheck sekarang untuk memastikan SOP outlet berjalan konsisten di seluruh cabang.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#1A1A1A] px-8 text-sm font-medium text-white transition-all duration-200 hover:bg-neutral-800"
            >
              Mulai Sekarang
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-8 text-sm font-medium text-neutral-700 transition-all duration-200 hover:bg-neutral-50"
            >
              <BookOpen className="h-4 w-4" />
              <span>Baca Dokumentasi</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 lg:px-24">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Link href="/" className="flex items-center gap-3">
              <Logo size="sm" />
            </Link>
            <div className="flex items-center gap-6 text-sm text-neutral-500">
              <Link href="/login" className="transition hover:text-[#1A1A1A]">
                Masuk
              </Link>
              <a href="#fitur" className="transition hover:text-[#1A1A1A]">
                Fitur
              </a>
              <Link href="/docs" className="transition hover:text-[#1A1A1A]">
                Dokumentasi
              </Link>
            </div>
            <p className="text-xs text-neutral-500">
              &copy; {new Date().getFullYear()} MyCheck. Operasional shift yang jelas.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
