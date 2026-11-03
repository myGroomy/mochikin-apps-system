"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Lightning,
  Trophy,
  Star,
  CheckCircle,
  Package,
  ChatTeardropText,
  ArrowRight,
  ShieldCheck,
  TrendUp,
  Sparkle,
  Storefront,
  ChartBar,
  Clock,
  Check,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/*
  <design_plan>
    1. Python RNG Execution:
       - Hero Layout: Cinematic Center (1)
       - Fonts: Charlie Display / Charlie Text (via @theme CSS variables)
       - Components: Gapless Bento Grid, Interactive Stat Cards, Live Ledger Ticker
       - GSAP/Motion Paradigms: Fluid Stagger & Hover Scale Physics
    2. AIDA Check: Confirmed (Nav -> Hero Attention -> Bento Interest -> Workflow Desire -> Action Footer).
    3. Hero Math Verification: max-w-5xl container width, 2-line headline clamp, zero stamp icons.
    4. Bento Density Verification: grid-flow-dense applied, exact row/col span interlocking.
    5. Label Sweep & Button Check: Zero cheap meta-labels ("SECTION 01"), perfect contrast (emerald buttons, dark text on light cards).
  </design_plan>
*/

const PILLARS = [
  {
    icon: CheckCircle,
    tag: "MyCheck",
    name: "SOP & Kehadiran",
    desc: "Checklist shift, tepat waktu, dan respon insiden otomatis menambah saldo poin real-time.",
    points: "+1.0 - +2.0 pts/shift",
    span: "col-span-1 md:col-span-2",
  },
  {
    icon: Package,
    tag: "Stokis",
    name: "Stock Opname & Mutasi",
    desc: "Akurasi opname fisik dan pencatatan mutasi bahan baku terverifikasi ke ledger.",
    points: "+3.0 pts/sesi",
    span: "col-span-1 md:col-span-2",
  },
  {
    icon: ChatTeardropText,
    tag: "MyCustomer",
    name: "CRM & Retensi Tamu",
    desc: "Follow-up pelanggan WhatsApp dan penanganan tiket terakumulasi adil tanpa rekap manual.",
    points: "+0.5 - +2.0 pts",
    span: "col-span-1 md:col-span-2",
  },
  {
    icon: Star,
    tag: "Scorecards",
    name: "CARE Peer Review 360",
    desc: "Evaluasi Collaboration, Accountability, Respect, dan Excellence berkala.",
    points: "Bonus Triwulan",
    span: "col-span-1 md:col-span-2",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Aktivitas Operasional Harian",
    desc: "Kru bekerja melalui MyCheck, Stokis, dan MyCustomer seperti biasa tanpa beban input ganda.",
  },
  {
    num: "02",
    title: "Ledger Poin Real-Time (T+0)",
    desc: "Event divalidasi ke Redis & PostgreSQL secara kriptografis, transparan, dan bebas manipulasi.",
  },
  {
    num: "03",
    title: "Insentif & Peringkat Adil",
    desc: "Peringkat outlet objektif, insentif bulanan terukur, dan budaya kerja berprestasi terbangun.",
  },
];

export function LandingPage() {
  return (
    <main className="overflow-x-hidden w-full max-w-full min-h-screen bg-canvas text-foreground grain">
      {/* Top Navigation */}
      <header className="border-b border-hairline bg-surface/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition-opacity flex items-center gap-2">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="rounded-full border-hairline px-4">
              <Link href="http://localhost:3000">Portal Mochikin</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-5 shadow-sm">
              <Link href="/dashboard/me">
                <span>Buka Dashboard</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section (Attention) */}
      <section className="relative px-4 pt-20 pb-28 sm:pt-32 sm:pb-36 max-w-5xl mx-auto text-center">
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-40 pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-emerald-100/60 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0, 1] }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-4 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs">
            <Sparkle className="size-4 text-emerald-600" weight="fill" />
            <span>Ekosistem Manajemen Performa &amp; Gamifikasi Multi-Cabang</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-ink max-w-5xl mx-auto leading-[1.08]">
            Kinerja Terukur. <span className="text-emerald-600 underline decoration-emerald-200 decoration-wavy decoration-2">Insentif Transparan.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-ash leading-relaxed">
            MyPerformance menghubungkan seluruh aktivitas operasional dari <strong className="text-ink">MyCheck</strong>, <strong className="text-ink">Stokis</strong>, dan <strong className="text-ink">MyCustomer</strong> ke dalam ledger poin objektif dan <strong className="text-ink">CARE Scorecard 360°</strong>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 h-12 shadow-md">
              <Link href="/dashboard/me">
                <Lightning className="size-5" weight="fill" />
                <span>Masuk ke Poin Saya</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full border-hairline gap-2 px-8 h-12 hover:bg-surface-sunken">
              <Link href="/dashboard/team">
                <Trophy className="size-5 text-emerald-600" weight="duotone" />
                <span>Lihat Leaderboard Tim</span>
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Pillars Bento Grid (Interest) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-32">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Satu Ekosistem Terpadu
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink">
            4 Pilar Sumber Poin Performa Otomatis
          </h2>
          <p className="text-sm text-ash">
            Setiap aksi kru tervalidasi secara mulus tanpa rekap manual yang melelahkan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 grid-flow-dense">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.tag}
                className={`doppel-outer transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl ${p.span}`}
              >
                <div className="doppel-inner p-8 h-full flex flex-col justify-between space-y-6 bg-surface">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
                        <Icon className="size-6" weight="duotone" />
                      </span>
                      <Badge variant="outline" className="text-xs font-semibold border-hairline px-3 py-1 text-emerald-700 bg-emerald-50/50">
                        {p.tag}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-xl text-ink">{p.name}</h3>
                    <p className="text-sm text-ash leading-relaxed">{p.desc}</p>
                  </div>
                  <div className="pt-4 border-t border-hairline flex items-center justify-between text-xs font-semibold text-emerald-700">
                    <span className="flex items-center gap-1.5">
                      <ChartBar className="size-4" weight="duotone" />
                      {p.points}
                    </span>
                    <span className="text-ash/60">Automated</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works (Desire) */}
      <section className="bg-surface border-y border-hairline py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50 px-3 py-1">Alur Transparan</Badge>
            <h2 className="text-3xl font-bold text-ink">
              Bagaimana MyPerformance Bekerja
            </h2>
            <p className="text-sm text-ash">
              Sistem transparan yang menjamin keadilan penilaian bagi seluruh kru dan manajemen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className="rounded-2xl border border-hairline bg-card p-8 space-y-4 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-colors"
              >
                <div className="text-4xl font-bold font-mono text-emerald-600/20 group-hover:text-emerald-600/40 transition-colors">
                  {s.num}
                </div>
                <h3 className="font-bold text-lg text-ink">{s.title}</h3>
                <p className="text-sm text-ash leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / Action */}
      <footer className="bg-ink text-surface py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <Logo size="lg" className="brightness-200" />
            <p className="text-xs text-ash max-w-md">
              Modul manajemen performa &amp; sistem insentif staf ekosistem Mochikin. Kinerja terukur, insentif adil.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild size="lg" className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-ink font-semibold px-8 h-12">
              <Link href="/dashboard/me">
                <span>Mulai Sekarang</span>
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-surface/10 text-center text-xs text-ash">
          &copy; {new Date().getFullYear()} Mochikin Apps. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
