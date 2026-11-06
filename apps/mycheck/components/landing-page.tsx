'use client';

/*
 * RENCANA HALAMAN — Landing MYCHECK
 * Jenis: software (sistem operasi shift multi cabang untuk outlet F&B).
 * Aksi utama: "Mulai Sekarang" → /login.
 *
 * Bahasa visual mengikuti MYCUSTOMER: nav pil mengambang, hero lapang dengan
 * cahaya lembut, satu app-frame produk, bento fitur, kartu langkah bertumpuk,
 * kartu peran yang melebar saat disentuh, panel log shift, lalu CTA gelap.
 * Identitas MYCHECK tetap terlihat lewat aksen pine green yang terbatas,
 * sementara navigasi dan aksi utama mengikuti sistem navy.
 *
 * Alur: Nav → Hero + app-frame → Fitur → Narasi → Cara kerja → Peran →
 * Jejak shift → CTA → Footer.
 */

import Link from 'next/link';
import { useRef, useState } from 'react';
import { MotionConfig, motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  Camera,
  ChartLine,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  ListChecks,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { FLUID_EASE, heroMaskReveal, wordReveal } from '@/lib/motion';

const NAV_LINKS: Array<[string, string]> = [
  ['Fitur', '#fitur'],
  ['Cara Kerja', '#cara-kerja'],
  ['Peran', '#peran'],
  ['Jejak Shift', '#jejak'],
];

const HERO_STATS: Array<[string, string, string]> = [
  ['Progress SOP', '12/16', 'text-ink'],
  ['Kepatuhan', '98%', 'text-brand'],
  ['Tim aktif', '4 staf', 'text-ink'],
  ['Insiden', '0', 'text-ink'],
];

const HERO_CHECKLIST = [
  { label: 'Kebersihan area kasir', done: true, time: '07:15' },
  { label: 'Bahan & perlengkapan', done: true, time: '07:22' },
  { label: 'Suhu chiller 2–4 °C', done: true, time: '07:30' },
  { label: 'Opening cash float', done: false, time: 'Pending' },
];

const HERO_SIDEBAR: Array<[string, LucideIcon, boolean]> = [
  ['Ringkasan Shift', BarChart3, false],
  ['Checklist SOP', ListChecks, true],
  ['Handover', ArrowLeftRight, false],
  ['Insiden', ShieldCheck, false],
  ['Laporan', FileCheck2, false],
];

const BENTO_METRICS: Array<[string, string]> = [
  ['Item selesai', '12/16'],
  ['Bukti foto', '8'],
  ['Insiden', '0'],
  ['Kepatuhan', '98%'],
];

const STEPS: Array<{ tag: string; icon: LucideIcon; title: string; desc: string }> = [
  {
    tag: 'Buka',
    icon: CalendarClock,
    title: 'Buka shift, pilih cabang.',
    desc: 'Penanggung jawab membuka shift baru dan memilih cabang kerja. Seluruh staf shift langsung bergabung ke alur yang sama — tanpa grup chat tambahan.',
  },
  {
    tag: 'Jalan',
    icon: ListChecks,
    title: 'Kerjakan checklist dengan bukti.',
    desc: 'Setiap item divalidasi saat diisi, foto diunggah langsung dari kamera ponsel, dan draft tersimpan otomatis per cabang. Pekerjaan tidak pernah hilang di tengah jalan.',
  },
  {
    tag: 'Tutup',
    icon: LockKeyhole,
    title: 'Handover, lalu kunci laporan.',
    desc: 'Catatan serah terima dan insiden ikut tersusun. Saat shift ditutup, laporan terkunci rapi untuk ditinjau manajer — siap dipertanggungjawabkan.',
  },
];

const ROLES: Array<{
  tag: string;
  icon: LucideIcon;
  name: string;
  note: string;
  desc: string;
  points: string[];
}> = [
  {
    tag: 'Lapangan',
    icon: UserRound,
    name: 'Petugas shift',
    note: 'Buka ponsel, mulai shift',
    desc: 'Checklist per section, bukti foto, dan draft yang tersimpan sendiri. Tidak ada form yang harus diisi dua kali atau dicatat ulang di buku.',
    points: ['Checklist per section', 'Foto langsung dari kamera', 'Autosave per cabang'],
  },
  {
    tag: 'Penanggung jawab',
    icon: ClipboardCheck,
    name: 'PJ Shift',
    note: 'Buka, serah terima, tutup',
    desc: 'Buka shift, catat handover, dan kunci laporan tanpa menunggu manajer. Semua temuan lapangan tercatat dengan waktu dan nama pengerjanya.',
    points: ['Buka & tutup shift', 'Handover antar shift', 'Incident tercatat rapi'],
  },
  {
    tag: 'Kontrol',
    icon: BarChart3,
    name: 'Manajer cabang',
    note: 'Pantau semua cabang',
    desc: 'Dashboard kepatuhan, laporan terkunci, dan audit trail yang tidak bisa diubah diam-diam. Cukup satu layar untuk melihat mana yang beres dan mana yang perlu ditegur.',
    points: ['Dashboard real-time', 'Laporan anti modifikasi', 'Audit trail lengkap'],
  },
];

const SHIFT_LOGS = [
  {
    code: 'SH-0715',
    branch: 'Cabang Gandaria',
    shift: 'Shift Pagi',
    time: '07:00 – 15:00',
    person: 'Rani · PJ Shift',
    progress: 100,
    items: '16/16',
    photos: '8 foto',
    incident: '0 insiden',
    note: 'Opening selesai tepat waktu. Suhu chiller 3 °C, kas float sesuai, dan area kasir sudah bersih sebelum jam buka.',
  },
  {
    code: 'SH-1502',
    branch: 'Cabang Kemang',
    shift: 'Shift Siang',
    time: '15:00 – 23:00',
    person: 'Bagas · PJ Shift',
    progress: 94,
    items: '15/16',
    photos: '6 foto',
    incident: '1 insiden',
    note: 'Satu unit blender berhenti di tengah jam sibuk. Insiden tercatat, foto bukti terlampir, dan tim maintenance sudah menerima notifikasi.',
  },
  {
    code: 'SH-2308',
    branch: 'Cabang Senopati',
    shift: 'Shift Malam',
    time: '23:00 – 07:00',
    person: 'Dewi · PJ Shift',
    progress: 100,
    items: '14/14',
    photos: '4 foto',
    incident: '0 insiden',
    note: 'Closing berjalan lengkap. Handover untuk shift pagi sudah ditulis, termasuk catatan stok susu yang tinggal dua karton.',
  },
];

export function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);

  const [activeRole, setActiveRole] = useState<number | null>(0);
  const [activeLog, setActiveLog] = useState(0);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start end', 'end start'],
  });
  const heroMockupY = useTransform(scrollYProgress, [0, 1], [0, 32]);

  const inView = (delay = 0) => ({
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.9, delay, ease: FLUID_EASE },
  });

  const goLog = (dir: 1 | -1) => {
    setActiveLog((i) => (i + dir + SHIFT_LOGS.length) % SHIFT_LOGS.length);
  };

  const log = SHIFT_LOGS[activeLog];

  return (
    <MotionConfig reducedMotion="user">
      <main className="w-full max-w-full overflow-x-hidden bg-canvas text-ink">
      {/* Nav pil mengambang */}
      <nav className="fixed left-1/2 top-5 z-50 w-[min(100%-2rem,52rem)] -translate-x-1/2">
        <div className="flex items-center justify-between gap-3 rounded-full border border-hairline bg-white/80 py-2 pl-4 pr-2 shadow-[0_12px_40px_-16px_rgba(26,26,26,0.18)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2.5" aria-label="MYCHECK — beranda">
            <Logo size="sm" />
          </Link>

          <div className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium text-ash transition-colors duration-300 hover:text-ink"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden px-3 text-sm font-semibold text-ink-soft transition-colors duration-300 hover:text-ink sm:inline-flex"
            >
              Masuk
            </Link>
            <Link
              href="/login"
              className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-300 hover:-translate-y-px hover:bg-primary-hover active:scale-[0.98]"
            >
              Daftar
              <ArrowRight
                size={14}
                strokeWidth={2.6}
                className="transition-transform duration-500 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        ref={heroRef}
        className="sky-hero relative px-4 pb-24 pt-40 sm:px-6 sm:pb-32 sm:pt-48 lg:px-8"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 right-[-12%] h-[34rem] w-[34rem] rounded-full bg-brand/12 blur-[130px]" />
          <div className="absolute left-[-10%] top-1/3 h-[28rem] w-[28rem] rounded-full bg-brand-soft/15 blur-[120px]" />
          <div className="absolute bottom-[-20%] left-1/3 h-[26rem] w-[26rem] rounded-full bg-brand-wash/70 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.045] mix-blend-multiply"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl text-center">
          <motion.h1
            initial="hidden"
            animate="show"
            className="mx-auto max-w-5xl text-[clamp(40px,5.6vw,78px)] font-semibold leading-[1.04] tracking-[-0.03em] text-ink"
          >
            <span className="block overflow-hidden pb-1">
              <motion.span variants={heroMaskReveal} className="block">
                Setiap shift selesai{' '}
                <span
                  aria-hidden
                  className="mx-1 inline-flex h-9 w-12 translate-y-[-0.08em] items-center justify-center rounded-full bg-primary align-middle text-primary-foreground shadow-sm sm:h-12 sm:w-16 lg:h-14 lg:w-20"
                >
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" strokeWidth={3.4} />
                </span>{' '}
                <span className="text-brand">tercatat</span>, tanpa SOP yang terlewat.
              </motion.span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.08, ease: FLUID_EASE }}
            className="mx-auto mt-7 max-w-2xl text-[17px] leading-relaxed text-ash sm:text-[19px]"
          >
            MYCHECK menyatukan checklist SOP, serah terima, catatan insiden, dan
            laporan shift dalam satu alur per cabang. Petugas membuka shift dari
            ponsel; manajer melihat semuanya terkunci dan siap ditinjau.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.16, ease: FLUID_EASE }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-sm transition-all duration-300 hover:-translate-y-px hover:bg-primary-hover active:scale-[0.98]"
            >
              Mulai Sekarang
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 group-hover:translate-x-0.5">
                <ArrowRight size={14} strokeWidth={2.6} />
              </span>
            </Link>
            <a
              href="#cara-kerja"
              className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-7 py-4 text-lg font-semibold text-ink-soft transition-all duration-500 hover:bg-sunken active:scale-[0.98]"
            >
              Lihat Cara Kerjanya
              <ArrowUpRight
                size={16}
                strokeWidth={2.4}
                className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </motion.div>

          {/* App-frame produk */}
          <motion.div
            style={{ y: heroMockupY }}
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.1, ease: FLUID_EASE, delay: 0.2 }}
            className="mt-16 sm:mt-20"
          >
            <div className="doppel-outer mx-auto max-w-5xl rounded-[32px] p-2.5">
              <div className="overflow-hidden rounded-[26px] border border-hairline bg-white">
                <div className="flex items-center gap-2 border-b border-hairline bg-white px-5 py-3.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-ink/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-ink/35" />
                  <span className="h-2.5 w-2.5 rounded-full bg-ink/50" />
                  <div className="ml-4 flex-1 rounded-lg bg-sunken px-3 py-1.5 text-left font-mono text-xs text-ash">
                    mycheck.app/shift/gandaria
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-5 bg-canvas p-4 sm:p-6">
                  <div className="col-span-3 hidden border-r border-hairline pr-5 sm:block">
                    <div className="space-y-1.5">
                      {HERO_SIDEBAR.map(([label, Icon, active]) => (
                        <div
                          key={label}
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-colors duration-300 ${
                            active
                              ? 'bg-white font-semibold text-ink shadow-[0_6px_16px_-6px_rgba(26,26,26,0.25)] ring-1 ring-ink/10'
                              : 'text-ash'
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${active ? 'text-brand' : 'text-mist'}`}
                            strokeWidth={2}
                          />
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 rounded-xl border border-hairline bg-white p-3">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ash">
                        <Building2 className="h-3.5 w-3.5 text-brand" />
                        Cabang kerja
                      </div>
                      <div className="mt-1.5 text-sm font-semibold text-ink">Gandaria</div>
                      <div className="text-xs text-mist">Shift Pagi · 07:00–15:00</div>
                    </div>
                  </div>

                  <div className="col-span-12 sm:col-span-9">
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                      {HERO_STATS.map(([label, value, hue]) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-hairline bg-white p-3 sm:p-4"
                        >
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-ash sm:text-[11px]">
                            {label}
                          </div>
                          <div className={`mt-1 text-xl font-semibold tracking-tight sm:text-2xl ${hue}`}>
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-2xl border border-hairline bg-white p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs text-mist">Cabang Gandaria · Shift Pagi</div>
                          <div className="mt-0.5 text-sm font-semibold text-ink sm:text-lg">
                            Pemeriksaan Kesiapan Outlet
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-2.5 py-1 text-[11px] font-semibold text-brand">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                          Sedang berjalan
                        </span>
                      </div>

                      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-sunken">
                        <div className="h-full w-3/4 rounded-full bg-brand" />
                      </div>

                      <div className="mt-4 space-y-2">
                        {HERO_CHECKLIST.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between gap-3 rounded-xl border border-hairline/70 bg-sunken/60 px-3 py-2.5"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                                  item.done
                                    ? 'bg-brand text-white'
                                    : 'border border-border-strong bg-white text-transparent'
                                }`}
                              >
                                <Check className="h-3 w-3" strokeWidth={3.4} />
                              </span>
                              <span
                                className={`text-xs font-medium leading-snug ${
                                  item.done ? 'text-mist line-through' : 'text-ink'
                                }`}
                              >
                                {item.label}
                              </span>
                            </div>
                            <span className="shrink-0 font-mono text-[10px] text-mist">
                              {item.time}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3 text-[11px] text-ash">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-brand-soft" />
                          Autosave draft aktif
                        </span>
                        <span className="text-mist">Tersinkron 1 menit lalu</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Fitur — bento */}
      <section id="fitur" className="px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <p className="max-w-3xl text-[clamp(26px,3.2vw,40px)] font-semibold leading-tight tracking-[-0.02em] text-ink">
              Satu layar yang merangkum seluruh shift, dari buka outlet sampai
              laporan terkunci.
            </p>
            <span className="inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ash">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              Fitur utama
            </span>
          </div>

          <div className="mt-12 grid grid-flow-dense grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
            {/* Kartu besar */}
            <motion.div
              {...inView()}
              className="doppel-outer col-span-1 sm:col-span-2 md:col-span-2 md:row-span-2"
            >
              <div className="doppel-inner flex h-full flex-col justify-between gap-6 p-6 sm:p-8">
                <div>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-wash text-brand">
                    <ClipboardCheck size={22} strokeWidth={2} />
                  </div>
                  <h3 className="max-w-sm text-xl font-semibold leading-snug tracking-tight text-ink">
                    Checklist SOP yang mengikuti alur outlet.
                  </h3>
                  <p className="mt-3 max-w-md text-[16px] leading-relaxed text-ash">
                    Form dinamis dengan validasi angka, bukti foto wajib, dan
                    draft autosave per cabang. Item yang belum selesai tetap
                    terlihat, bukan tenggelam di percakapan.
                  </p>
                </div>

                <div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {BENTO_METRICS.map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-hairline bg-sunken/70 p-3"
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-ash">
                          {label}
                        </div>
                        <div className="mt-1 text-xl font-semibold tracking-tight text-ink">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-white px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-wash text-brand">
                        <Camera className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink">
                          Bukti foto chiller · 07:30
                        </div>
                        <div className="text-[11px] text-mist">Tersimpan ke laporan shift</div>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-wash px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                      Valid
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Kartu kecil 1 */}
            <motion.div
              {...inView(0.08)}
              className="group rounded-[24px] border border-hairline bg-white p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(26,26,26,0.25)]"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <ArrowLeftRight size={22} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold leading-snug tracking-tight text-ink">
                Serah terima tanpa grup chat.
              </h3>
              <p className="mt-2 text-[16px] leading-relaxed text-ash">
                Catatan handover menempel pada shift yang sama. Shift berikutnya
                tahu persis apa yang selesai dan apa yang harus dilanjutkan.
              </p>
            </motion.div>

            {/* Kartu kecil 2 */}
            <motion.div
              {...inView(0.16)}
              className="group rounded-[24px] border border-hairline bg-white p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(26,26,26,0.25)]"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft/15 text-brand">
                <ShieldCheck size={22} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold leading-snug tracking-tight text-ink">
                Insiden terlihat sebelum membesar.
              </h3>
              <p className="mt-2 text-[16px] leading-relaxed text-ash">
                Catat temuan, lampirkan foto, dan tandai tingkat urgensinya.
                Manajer menerima jejak yang bisa ditindaklanjuti, bukan pesan
                tengah malam.
              </p>
            </motion.div>

            {/* Kartu lebar */}
            <motion.div
              {...inView(0.2)}
              className="col-span-1 rounded-[24px] border border-hairline bg-white p-6 sm:col-span-2"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold leading-snug tracking-tight text-ink">
                    Terhubung dengan cabang, shift, dan orang yang sama.
                  </h3>
                  <p className="mt-1 max-w-xl text-[16px] leading-relaxed text-ash">
                    Otorisasi berbasis role dan isolasi data per cabang menjaga
                    privasi gerai. Semua orang melihat versi pekerjaan yang sama.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {[Building2, CalendarClock, Users].map((Icon, i) => (
                    <span
                      key={i}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-canvas text-ash transition-colors duration-300 hover:border-brand/30 hover:text-brand"
                    >
                      <Icon size={18} strokeWidth={2} />
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { icon: ClipboardList, label: 'Buka shift' },
                  { icon: ListChecks, label: 'Checklist' },
                  { icon: ArrowLeftRight, label: 'Handover' },
                  { icon: LockKeyhole, label: 'Laporan terkunci' },
                ].map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-3.5 py-1.5 text-sm font-medium text-brand"
                  >
                    <chip.icon size={15} strokeWidth={2.4} />
                    {chip.label}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Kartu gelap */}
            <motion.div
              {...inView(0.28)}
              className="col-span-1 flex flex-col justify-between gap-6 rounded-[24px] bg-brand-deep p-6 text-white sm:col-span-2 md:col-span-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-brand-wash">
                <Zap size={22} strokeWidth={2} />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight">2 menit</div>
                <p className="mt-1 text-[16px] leading-relaxed text-white/75">
                  dari browser ke shift pertama. Tanpa instalasi aplikasi dan
                  tanpa training panjang.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Narasi */}
      <section className="bg-white px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.45 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            className="max-w-3xl text-[clamp(28px,3.4vw,44px)] font-semibold leading-tight tracking-[-0.02em] text-ink"
          >
            {'Laporan shift tersusun sendiri, bukan tumpukan chat.'
              .split(' ')
              .map((word, i) => (
                <motion.span
                  key={`${word}-${i}`}
                  variants={wordReveal}
                  custom={i}
                  className="mr-[0.24em] inline-block"
                >
                  {word}
                </motion.span>
              ))}
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            className="mt-9 max-w-4xl text-[19px] leading-relaxed text-ash sm:text-[23px] sm:leading-relaxed"
          >
            {'Setiap item yang dicentang meninggalkan jejak: siapa yang mengerjakan, kapan, di cabang mana, dan bukti fotonya. MYCHECK merangkum semua itu menjadi laporan yang bisa dibaca dalam satu menit — bukan tumpukan chat yang harus disusun ulang.'
              .split(' ')
              .map((word, i) => (
                <motion.span
                  key={`${word}-${i}`}
                  variants={wordReveal}
                  custom={i}
                  className="mr-[0.22em] inline-block"
                >
                  {word}
                </motion.span>
              ))}
          </motion.p>
        </div>
      </section>

      {/* Cara kerja — kartu bertumpuk */}
      <section
        id="cara-kerja"
        className="px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <motion.h2
                {...inView()}
                className="max-w-sm text-[clamp(28px,3.4vw,44px)] font-semibold leading-tight tracking-[-0.02em] text-ink"
              >
                Cara kerja. Alur yang sama tiap shift, hasil yang terus konsisten.
              </motion.h2>
              <motion.p
                {...inView(0.08)}
                className="mt-5 max-w-sm text-[16px] leading-relaxed text-ash"
              >
                Staf tidak perlu mempelajari flow baru. Cukup buka shift seperti
                biasa; MYCHECK mengubahnya menjadi checklist, serah terima, dan
                laporan yang siap ditinjau.
              </motion.p>
              <div className="mt-10 hidden items-center gap-2 lg:flex">
                {STEPS.map((step) => (
                  <span
                    key={step.tag}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft"
                  >
                    <step.icon size={14} strokeWidth={2.4} className="text-brand" />
                    {step.tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5 sm:space-y-6 lg:col-span-7">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.tag}
                {...inView(i * 0.06)}
                className="lg:sticky lg:top-24"
                style={{ zIndex: 30 - i * 10 }}
              >
                <div className="doppel-outer">
                  <div className="doppel-inner p-6 sm:p-8">
                    <div className="flex gap-4 sm:gap-5">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-wash text-brand">
                        <step.icon size={24} strokeWidth={2} />
                      </span>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
                          {step.tag}
                        </span>
                        <h3 className="mt-1.5 text-xl font-semibold leading-snug tracking-[-0.02em] text-ink">
                          {step.title}
                        </h3>
                        <p className="mt-2.5 max-w-lg text-[16px] leading-relaxed text-ash">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Peran */}
      <section id="peran" className="bg-white px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.h2
            {...inView()}
            className="max-w-2xl text-[clamp(28px,3.4vw,44px)] font-semibold leading-tight tracking-[-0.02em] text-ink"
          >
            Satu alur untuk setiap peran di outlet.
          </motion.h2>
          <motion.p
            {...inView(0.08)}
            className="mt-4 max-w-xl text-[16px] leading-relaxed text-ash"
          >
            Petugas, penanggung jawab, dan manajer melihat pekerjaan yang sama
            dari sudut yang berbeda. Tidak ada versi data yang berselisih.
          </motion.p>

          <div className="mt-12 flex flex-col gap-4 lg:h-[34rem] lg:flex-row lg:items-stretch">
            {ROLES.map((role, i) => {
              const active = activeRole === i;
              const Icon = role.icon;
              return (
                <button
                  key={role.name}
                  type="button"
                  onClick={() => setActiveRole(active ? null : i)}
                  onMouseEnter={() => setActiveRole(i)}
                  onMouseLeave={() => setActiveRole(0)}
                  aria-expanded={active}
                  className={`group relative min-h-[13rem] flex-1 overflow-hidden rounded-[28px] border border-hairline text-left transition-[flex,background-color] duration-700 ease-out lg:flex-[1.15] lg:hover:flex-[2.2] lg:focus-visible:flex-[2.2] ${
                    active ? 'bg-brand-deep lg:flex-[2.2]' : 'bg-white'
                  }`}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 lg:group-hover:opacity-100"
                    style={{
                      background:
                        'radial-gradient(120% 120% at 15% 0%, rgba(220,239,227,0.18), transparent 62%)',
                    }}
                  />

                  <div className="relative flex h-full flex-col justify-between gap-8 p-7 sm:p-8">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-500 ${
                        active
                          ? 'bg-white/15 text-brand-wash'
                          : 'bg-brand-wash text-brand'
                      }`}
                    >
                      <Icon size={24} strokeWidth={2} />
                    </span>

                    <div>
                      <span
                        className={`text-xs font-semibold uppercase tracking-[0.18em] transition-colors duration-500 ${
                          active ? 'text-white/60' : 'text-mist'
                        }`}
                      >
                        {role.tag}
                      </span>
                      <h3
                        className={`mt-2 text-xl font-semibold tracking-tight transition-colors duration-500 ${
                          active ? 'text-white' : 'text-ink'
                        }`}
                      >
                        {role.name}
                      </h3>
                      <p
                        className={`mt-1 text-[16px] font-medium transition-colors duration-500 ${
                          active ? 'text-white/75' : 'text-ash'
                        }`}
                      >
                        {role.note}
                      </p>
                      <p
                        className={`mt-3 max-w-xs text-[16px] leading-relaxed transition-colors duration-500 ${
                          active ? 'text-white/75' : 'text-ash'
                        }`}
                      >
                        {role.desc}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {role.points.map((point) => (
                          <span
                            key={point}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              active
                                ? 'bg-white/10 text-brand-wash'
                                : 'bg-sunken text-ash'
                            }`}
                          >
                            {point}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Jejak shift */}
      <section id="jejak" className="px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <motion.h2
                {...inView()}
                className="max-w-sm text-[clamp(28px,3.4vw,44px)] font-semibold leading-tight tracking-[-0.02em] text-ink"
              >
                Setiap shift meninggalkan jejak yang bisa dibaca.
              </motion.h2>
              <motion.p
                {...inView(0.08)}
                className="mt-4 max-w-xs text-[16px] leading-relaxed text-ash"
              >
                Buka-tutup shift terekam utuh: item yang selesai, bukti foto,
                insiden, dan catatan serah terima. Manajer tinggal membaca,
                bukan menebak.
              </motion.p>
              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  { icon: ClipboardCheck, label: 'Checklist' },
                  { icon: ArrowLeftRight, label: 'Handover' },
                  { icon: ShieldCheck, label: 'Insiden' },
                ].map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft"
                  >
                    <chip.icon size={14} strokeWidth={2.4} className="text-brand" />
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>

            <motion.div {...inView(0.1)} className="lg:col-span-8">
              <div className="relative flex flex-col justify-between gap-8 rounded-[32px] border border-hairline bg-white p-7 sm:p-10">
                <motion.div
                  key={activeLog}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: FLUID_EASE }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-mist">
                        {log.code} · {log.time}
                      </div>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-ink">
                        {log.branch} · {log.shift}
                      </h3>
                      <div className="mt-1 text-sm text-ash">{log.person}</div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-3 py-1 text-xs font-semibold text-brand">
                      <LockKeyhole className="h-3.5 w-3.5" strokeWidth={2.4} />
                      Terkunci
                    </span>
                  </div>

                  <blockquote className="mt-6 text-[18px] font-medium leading-relaxed tracking-[-0.01em] text-ink sm:text-[21px]">
                    &ldquo;{log.note}&rdquo;
                  </blockquote>

                  <div className="mt-6 grid grid-cols-3 gap-2.5 sm:gap-3">
                    {[
                      ['Item selesai', log.items],
                      ['Bukti foto', log.photos],
                      ['Temuan', log.incident],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-hairline bg-sunken/60 p-3"
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-ash">
                          {label}
                        </div>
                        <div className="mt-1 text-lg font-semibold tracking-tight text-ink">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-ash">Progress shift</span>
                      <span className="font-semibold text-brand">{log.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-sunken">
                      <div
                        className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out"
                        style={{ width: `${log.progress}%` }}
                      />
                    </div>
                  </div>
                </motion.div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {SHIFT_LOGS.map((item, i) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setActiveLog(i)}
                        aria-label={`Lihat ${item.branch} ${item.shift}`}
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          i === activeLog
                            ? 'w-7 bg-brand'
                            : 'w-1.5 bg-mist/40 hover:bg-mist'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => goLog(-1)}
                      aria-label="Log shift sebelumnya"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white text-ash transition-all duration-300 hover:border-brand/30 hover:text-brand active:scale-95"
                    >
                      <ChevronLeft size={17} strokeWidth={2.4} />
                    </button>
                    <button
                      type="button"
                      onClick={() => goLog(1)}
                      aria-label="Log shift berikutnya"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white text-ash transition-all duration-300 hover:border-brand/30 hover:text-brand active:scale-95"
                    >
                      <ChevronRight size={17} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="mulai" className="px-4 pb-24 pt-4 sm:px-6 sm:pb-32 lg:px-8">
        <motion.div
          {...inView()}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-[24px] bg-primary-hover px-6 py-16 text-center sm:px-12 sm:py-24"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-brand-soft/25 blur-[110px]" />
            <div className="absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-brand/40 blur-[110px]" />
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '56px 56px',
              }}
            />
          </div>

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-brand-wash">
              <ChartLine className="h-3.5 w-3.5" strokeWidth={2.4} />
              Tanpa instalasi · Tanpa training panjang
            </span>
            <h2 className="mx-auto mt-6 max-w-3xl text-[clamp(28px,3.4vw,44px)] font-semibold leading-[1.1] tracking-[-0.02em] text-white">
              Siap membuat setiap shift bisa dipertanggungjawabkan?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-white/75">
              Mulai dari satu cabang. Buka shift pertama hari ini, lalu lihat
              checklist, handover, dan laporan tersusun rapi tanpa lembar kerja
              tambahan.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-9 py-4 text-lg font-semibold text-ink shadow-[0_20px_60px_-20px_rgba(255,255,255,0.4)] transition-all duration-500 hover:-translate-y-[2px] active:scale-[0.98]"
              >
                Mulai Sekarang
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white transition-transform duration-500 group-hover:translate-x-0.5">
                  <ArrowRight size={14} strokeWidth={2.6} />
                </span>
              </Link>
              <Link
                href="/docs"
                className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-4 text-lg font-semibold text-white/85 transition-all duration-500 hover:bg-white/10 active:scale-[0.98]"
              >
                Baca Panduan
                <BookOpen size={16} strokeWidth={2.2} />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline bg-canvas px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-sm text-ash sm:flex-row">
          <Link href="/" className="flex items-center gap-2.5" aria-label="MYCHECK — beranda">
            <Logo size="sm" />
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-7">
            <a href="#fitur" className="transition-colors duration-300 hover:text-ink">
              Fitur
            </a>
            <a href="#cara-kerja" className="transition-colors duration-300 hover:text-ink">
              Cara Kerja
            </a>
            <Link href="/login" className="transition-colors duration-300 hover:text-ink">
              Masuk
            </Link>
            <Link href="/docs" className="transition-colors duration-300 hover:text-ink">
              Dokumentasi
            </Link>
          </div>

          <div className="text-center sm:text-right">
            <div className="font-medium text-ink-soft">
              &copy; {new Date().getFullYear()} MYCHECK
            </div>
            <div className="text-xs text-mist">Operasional shift yang jelas.</div>
          </div>
        </div>
      </footer>
      </main>
    </MotionConfig>
  );
}
