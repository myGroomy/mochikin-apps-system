'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Flame,
  Award,
  ShieldCheck,
  Smartphone,
  Star,
  TrendingUp,
  Users,
  Target,
  Zap,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

const steps = [
  {
    number: '1',
    title: 'Aktivitas SOP & Poin Otomatis',
    description:
      'Setiap penyelesaian shift di MyCheck dan stock opname di Stokis langsung menghasilkan akumulasi poin harian.',
  },
  {
    number: '2',
    title: 'Isi CARE Scorecard Berkala',
    description:
      'Anggota tim dan supervisor saling memberikan feedback objektif pada aspek Collaboration, Accountability, Respect, dan Excellence.',
  },
  {
    number: '3',
    title: 'Rollup & Apresiasi Kinerja',
    description:
      'Sistem mengkalkulasi peringkat cabang dan individu secara otomatis, siap digunakan untuk dasar insentif yang adil.',
  },
];

const mockRollup = [
  { title: 'Kepatuhan Shift & SOP Gandaria', category: 'Operasional', points: '+50', status: 'Terverifikasi' },
  { title: 'CARE Peer Review: Kolaborasi Tim', category: 'Perilaku', points: '+120', status: 'Bintang 5' },
  { title: 'Stock Opname Akurasi 100%', category: 'Inventaris', points: '+80', status: 'Sempurna' },
  { title: 'Kehadiran Tepat Waktu 1 Bulan', category: 'Disiplin', points: '+40', status: 'Konsisten' },
];

export function LandingPage() {
  return (
    <main className="overflow-x-hidden w-full max-w-full bg-base-100">
      {/* Hero Section */}
      <section className="px-8 pt-28 mx-auto md:px-12 lg:px-24 max-w-7xl relative">
        <div className="max-w-3xl text-center mx-auto lg:text-balance mb-10">
          <div className="mb-4 inline-flex items-center justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#16A34A]">
              <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
              Sistem Manajemen Performa &amp; Scorecard Multi Cabang
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
            Pantau Performa Nyata, Apresiasi Tanpa Bias
          </h1>

          <p className="text-base leading-normal mt-5 text-base-content/60 font-medium max-w-xl mx-auto">
            Satu platform untuk points engine otomatis, evaluasi peer review CARE, dan leaderboard cabang. Terintegrasi langsung dengan ekosistem MOCHIKIN-APPS.
          </p>

          <div className="flex flex-wrap items-center gap-3 justify-center mx-auto mt-10">
            <Link
              href="/dashboard/me"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-white bg-[#16A34A] hover:bg-[#15803d] focus:ring-emerald-500/50 h-10 px-6 text-sm font-medium rounded-lg"
            >
              Buka Dashboard
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link
              href="/scorecards"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-[#16A34A] bg-emerald-50 hover:bg-emerald-100 focus:ring-emerald-500/50 h-10 px-6 text-sm font-semibold rounded-lg gap-2"
            >
              <Star className="w-4 h-4" />
              <span>Lihat Scorecard</span>
            </Link>
            <a
              href="#fitur"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-base-content/70 bg-base-200 hover:bg-base-300 hover:text-base-content ring-1 ring-base-300 focus:ring-emerald-500/30 h-10 px-6 text-sm font-medium rounded-lg"
            >
              Lihat Fitur
            </a>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="relative w-full mx-auto max-w-5xl items-center py-12">
          <div className="p-6 sm:p-10 bg-emerald-500/5 rounded-2xl">
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
                    <TrendingUp className="w-3 h-3 text-[#16A34A]" />
                    myperformance.app/dashboard/me
                  </div>
                </div>
              </div>

              {/* Mockup Content */}
              <div className="p-4 sm:p-6 space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="text-xs text-emerald-800 font-medium">Total Poin Saya</div>
                    <div className="text-lg font-bold text-[#16A34A] mt-1">1,480 Pts</div>
                  </div>
                  <div className="p-3 rounded-lg bg-base-200/50 border border-base-300">
                    <div className="text-xs text-base-content/50 font-medium">Nilai CARE Rata-rata</div>
                    <div className="text-lg font-bold text-base-content mt-1">4.85 / 5.0</div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-xs text-amber-800 font-medium">Peringkat Cabang</div>
                    <div className="text-lg font-bold text-amber-700 mt-1">#1 Top Tier</div>
                  </div>
                </div>

                {/* Live Section Header */}
                <div className="flex items-center justify-between border-b border-base-200 pb-3 pt-1">
                  <div>
                    <span className="text-xs text-base-content/50">Cabang Gandaria · Periode Aktif</span>
                    <h3 className="text-base font-semibold text-base-content">Rollup Poin &amp; Evaluasi Karyawan</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-[#16A34A]">
                    Performa Sangat Baik
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-base-200">
                  <div className="h-full w-4/5 rounded-full bg-[#22C55E]" />
                </div>

                {/* Mockup Table Rows */}
                <div className="space-y-2">
                  {mockRollup.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-base-200/40 text-xs border border-base-200"
                    >
                      <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center text-xs font-bold text-[#16A34A]">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-base-content truncate">
                          {item.title}
                        </div>
                        <div className="text-base-content/40">{item.category}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[#16A34A] font-bold">
                          {item.points}
                        </span>
                      </div>
                      <div className="px-2 py-0.5 rounded-md text-2xs font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200/50">
                        {item.status}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom sync status */}
                <div className="flex items-center justify-between border-t border-base-200 pt-3 text-xs text-base-content/50">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
                    <span>Points Engine tersinkronisasi otomatis</span>
                  </div>
                  <span className="text-base-content/40">Diperbarui real-time</span>
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
              'Points Engine',
              'CARE Scorecard',
              '360 Peer Review',
              'Leaderboard Cabang',
              'Poin Disiplin',
              'Tiering Kinerja',
              'Rollup Otomatis',
              'Multi Cabang',
              'Transparansi Adil',
              'SSO Terintegrasi',
              'Mobile Friendly',
              'Audit Trail',
              'Points Engine',
              'CARE Scorecard',
              '360 Peer Review',
              'Leaderboard Cabang',
              'Poin Disiplin',
              'Tiering Kinerja',
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
          <p className="text-sm leading-normal font-bold uppercase text-[#16A34A]">
            Fitur Utama
          </p>
          <h2 className="text-xl leading-tight tracking-tight sm:text-2xl md:text-3xl capitalize lg:text-4xl mt-4 font-semibold text-base-content lg:text-balance">
            Yang Anda Butuhkan untuk Manajemen Performa Modern
          </h2>
          <p className="text-base leading-normal mt-4 text-base-content/60 font-medium">
            Dari kalkulasi poin harian hingga review rekan kerja berkala, semua tercatat transparan tanpa rekayasa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {/* Large card - spans 2 cols */}
          <div className="sm:col-span-2 bg-base-200/50 p-8 rounded-2xl border border-base-300/50 hover:scale-[1.01] transition-transform duration-300">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 text-[#16A34A]">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-base-content">
                  Points Engine Otomatis
                </h3>
                <p className="text-sm text-base-content/60 mt-2 leading-relaxed">
                  Menghubungkan input operasional harian secara langsung. Kepatuhan checklist SOP di MyCheck dan akurasi stock opname di Stokis secara instan menghasilkan poin performa terukur.
                </p>
              </div>
            </div>
          </div>

          {/* Tall card - spans 2 rows */}
          <div className="row-span-2 bg-[#16A34A] text-white p-8 rounded-2xl hover:scale-[1.01] transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-5">
              <Star className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold">
              CARE Scorecard Multi-Dimensi
            </h3>
            <p className="text-sm mt-2 opacity-90 leading-relaxed">
              Instrumen evaluasi berbasis 4 pilar utama: Collaboration, Accountability, Respect, dan Excellence dengan mekanisme peer review yang terlindungi dan objektif.
            </p>
            <div className="mt-6 space-y-2.5">
              {[
                'Collaboration (Kerjasama tim)',
                'Accountability (Tanggung jawab)',
                'Respect (Etika & saling hargai)',
                'Excellence (Kualitas layanan)',
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
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-4 text-[#16A34A]">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-base-content">
              Leaderboard Cabang
            </h3>
            <p className="text-sm text-base-content/60 mt-2">
              Peringkat transparan harian dan bulanan untuk memicu kompetisi positif antar tim gerai.
            </p>
          </div>

          {/* Small card 2 */}
          <div className="bg-base-200/50 p-6 rounded-2xl border border-base-300/50 hover:scale-[1.01] transition-transform duration-300">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-4 text-[#16A34A]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-base-content">
              Otorisasi Berjenjang
            </h3>
            <p className="text-sm text-base-content/60 mt-2">
              Hak akses ketat dari Staff, Captain, Area Manager, hingga Direksi menjaga kerahasiaan penilaian.
            </p>
          </div>

          {/* Another wide card */}
          <div className="sm:col-span-2 bg-base-200/50 p-6 rounded-2xl border border-base-300/50 hover:scale-[1.01] transition-transform duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 text-[#16A34A]">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-base-content">
                  Rollup Poin &amp; Rekap Insentif
                </h3>
                <p className="text-sm text-base-content/60 mt-1.5">
                  Rekapitulasi otomatis setiap akhir periode tanpa kalkulasi manual. Mempercepat proses reward dan insentif karyawan dengan data yang dapat diaudit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cara Kerja - Green Accent Section */}
      <section className="bg-[#16A34A] py-20 text-white">
        <div className="max-w-7xl mx-auto px-8 md:px-12 lg:px-24">
          <div className="text-center mb-14">
            <p className="text-sm leading-normal font-bold uppercase text-white/80">
              Cara Kerja
            </p>
            <h2 className="text-xl leading-tight tracking-tight sm:text-2xl md:text-3xl capitalize lg:text-4xl mt-4 font-semibold text-white">
              Tiga Langkah Evaluasi yang Adil &amp; Berkelanjutan
            </h2>
            <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
              Mendorong produktivitas harian dan budaya saling mengapresiasi.
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

      {/* Kenapa MyPerformance - Split Section */}
      <section className="px-8 py-24 mx-auto md:px-12 lg:px-24 max-w-7xl relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
          <div className="lg:order-last">
            <p className="text-sm leading-normal font-bold uppercase text-[#16A34A]">
              Mengapa MyPerformance
            </p>
            <h2 className="text-xl leading-tight tracking-tight sm:text-2xl md:text-3xl capitalize lg:text-4xl mt-4 font-semibold text-base-content">
              Dirancang untuk Ekosistem Ritel yang Menghargai Kerja Nyata
            </h2>
            <p className="text-base leading-normal mt-4 text-base-content/60 font-medium">
              Menghilangkan bias suka-tidak-suka dengan memadukan metrik pekerjaan operasional harian dan evaluasi perilaku rekan kerja.
            </p>
            <div className="flex flex-wrap items-center gap-2 mx-auto mt-10">
              <Link
                href="/dashboard/me"
                className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-white bg-[#16A34A] hover:bg-[#15803d] focus:ring-emerald-500/50 h-10 px-6 text-sm font-medium rounded-lg"
              >
                Mulai Sekarang
              </Link>
              <a
                href="#fitur"
                className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-base-content/70 bg-base-200 hover:bg-base-300 hover:text-base-content ring-1 ring-base-300 focus:ring-emerald-500/30 h-10 px-6 text-sm font-medium rounded-lg"
              >
                Pelajari Fitur
              </a>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 text-center gap-x-6 gap-y-12">
              {[
                {
                  icon: TrendingUp,
                  title: 'Metrik Nyata',
                  desc: 'Poin dihitung dari pekerjaan riil di gerai, bukan sekadar asumsi.',
                },
                {
                  icon: Star,
                  title: 'Peer Review CARE',
                  desc: 'Penilaian 360 derajat yang rahasia, konstruktif, dan objektif.',
                },
                {
                  icon: Smartphone,
                  title: 'Mobile First',
                  desc: 'Petugas dapat memantau perolehan poin langsung dari ponsel mereka.',
                },
                {
                  icon: Target,
                  title: 'Target Terarah',
                  desc: 'Staf tahu persis apa yang perlu dicapai untuk meningkatkan poin & tier.',
                },
              ].map((item) => (
                <div key={item.title}>
                  <div className="flex flex-col gap-3 text-[#16A34A]">
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
            Siap Tingkatkan Motivasi &amp; Kinerja Tim Gerai?
          </h2>
          <p className="text-base leading-normal mt-4 text-base-content/60 font-medium max-w-lg mx-auto">
            Buka MyPerformance sekarang dan terapkan sistem apresiasi transparan di seluruh gerai Anda.
          </p>
          <div className="flex flex-wrap items-center gap-3 justify-center mt-10">
            <Link
              href="/dashboard/me"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-white bg-[#16A34A] hover:bg-[#15803d] focus:ring-emerald-500/50 h-11 px-8 text-sm font-medium rounded-lg"
            >
              Buka Dashboard
              <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
            <Link
              href="/scorecards"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-base-content/70 bg-base-200 hover:bg-base-300 hover:text-base-content ring-1 ring-base-300 focus:ring-emerald-500/30 h-11 px-8 text-sm font-medium rounded-lg gap-2"
            >
              <Star className="w-4 h-4" />
              <span>Lihat Scorecard</span>
            </Link>
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
              <Link href="/dashboard/me" className="hover:text-base-content transition">
                Dashboard
              </Link>
              <a href="#fitur" className="hover:text-base-content transition">
                Fitur
              </a>
              <Link href="/scorecards" className="hover:text-base-content transition">
                Scorecards
              </Link>
            </div>
            <p className="text-xs text-base-content/60">
              &copy; {new Date().getFullYear()} MyPerformance. Apresiasi kinerja yang transparan.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
