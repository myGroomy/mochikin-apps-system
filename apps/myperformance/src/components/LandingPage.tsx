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
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FLUID_EASE, fadeUp } from "@/lib/motion";

const PILLARS = [
  {
    icon: CheckCircle,
    tag: "MyCheck",
    name: "SOP & Kehadiran",
    desc: "Checklist shift, tepat waktu, dan respon insiden langsung menambah saldo poin.",
    points: "+1.0 - +2.0 pts/shift",
  },
  {
    icon: Package,
    tag: "Stokis",
    name: "Stock Opname & Mutasi",
    desc: "Akurasi opname fisik dan pencatatan mutasi bahan baku tervalidasi ke ledger.",
    points: "+3.0 pts/sesi opname",
  },
  {
    icon: ChatTeardropText,
    tag: "MyCustomer",
    name: "CRM & Retensi Tamu",
    desc: "Setiap follow-up pelanggan WhatsApp dan penanganan tiket terakumulasi adil.",
    points: "+0.5 - +2.0 pts/interaksi",
  },
  {
    icon: Star,
    tag: "Scorecards",
    name: "CARE Peer Review 360°",
    desc: "Evaluasi berkala aspek Collaboration, Accountability, Respect, dan Excellence.",
    points: "Rating bintang & bonus triwulan",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Kerja Operasional Normal",
    desc: "Kru menjalankan tugas harian di MyCheck, Stokis, dan MyCustomer seperti biasa tanpa beban input manual ganda.",
  },
  {
    num: "02",
    title: "Mesin Poin Realtime (T+0)",
    desc: "Setiap event kerja divalidasi ke Redis & PostgreSQL ledger secara kriptografis dan bebas manipulasi.",
  },
  {
    num: "03",
    title: "Evaluasi Objektif & Apresiasi",
    desc: "Peringkat outlet transparan, insentif bulanan terukur, dan scorecard 360° menciptakan kultur kerja berprestasi.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-foreground selection:bg-accent/20 selection:text-accent-deep">
      {/* Top Banner Navigation */}
      <header className="border-b border-hairline bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="http://localhost:3000">Portal Mochikin</Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/dashboard/me">
                <span>Buka Dashboard</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 max-w-5xl mx-auto text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-accent shadow-2xs">
            <Sparkle className="size-3.5 text-accent" weight="fill" />
            <span>Ekosistem Manajemen Performa &amp; Gamifikasi Kinerja Multi Cabang</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink max-w-4xl mx-auto leading-[1.12]">
            Kinerja Terukur. <span className="text-accent underline decoration-indigo-200 decoration-wavy decoration-2">Insentif Transparan.</span> Kolaborasi Nyata.
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-ash leading-relaxed">
            MyPerformance menghubungkan seluruh aktivitas kerja dari <strong>MyCheck</strong>, <strong>Stokis</strong>, dan <strong>MyCustomer</strong> ke dalam ledger poin objektif dan <strong>CARE Scorecard 360°</strong>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="gap-2 px-6 shadow-sm">
              <Link href="/dashboard/me">
                <Lightning className="size-4.5" weight="fill" />
                <span>Masuk ke Poin Saya</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 px-6">
              <Link href="/dashboard/team">
                <Trophy className="size-4.5" weight="duotone" />
                <span>Lihat Leaderboard Tim</span>
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* 4 Multi-App Integration Pillars */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Satu Ekosistem Terintegrasi
          </p>
          <h2 className="text-2xl font-bold text-ink mt-1">
            4 Sumber Poin Performa Otomatis
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.tag}
                className="doppel-outer transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="doppel-inner p-5 h-full flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent shadow-2xs">
                        <Icon className="size-5" weight="duotone" />
                      </span>
                      <Badge variant="outline" className="text-[10px] font-semibold border-hairline">
                        {p.tag}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-base text-ink">{p.name}</h3>
                    <p className="text-xs text-ash leading-relaxed">{p.desc}</p>
                  </div>
                  <div className="pt-3 border-t border-hairline flex items-center justify-between text-xs font-semibold text-accent">
                    <span>{p.points}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface border-y border-hairline py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <Badge variant="accent" className="text-xs">Alur Kerja</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink">
              Bagaimana MyPerformance Menilai Kinerja
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className="rounded-xl border border-hairline bg-card p-6 space-y-3 shadow-xs relative overflow-hidden"
              >
                <div className="text-3xl font-bold font-mono text-accent/20">
                  {s.num}
                </div>
                <h3 className="font-bold text-base text-ink">{s.title}</h3>
                <p className="text-xs text-ash leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="rounded-2xl border border-hairline bg-gradient-to-br from-indigo-900 to-indigo-950 text-white p-8 sm:p-12 shadow-xl space-y-5">
          <Badge className="bg-white/10 text-white border-white/20">Portal Karyawan Mochikin</Badge>
          <h2 className="text-2xl sm:text-4xl font-bold max-w-xl mx-auto leading-tight">
            Pantau Akumulasi Skor dan Raih Target Insentif Bulanan Anda
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 max-w-md mx-auto">
            Gunakan akun resmi staf Anda yang tersinkronisasi di seluruh cabang Mochikin.
          </p>
          <div className="pt-2">
            <Button asChild size="lg" className="bg-white text-indigo-950 hover:bg-white/90 font-bold px-8">
              <Link href="/dashboard/me">Buka Poin Saya Sekarang</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline py-8 text-center text-xs text-muted-foreground bg-surface">
        <p>&copy; {new Date().getFullYear()} PT Mochikin Sukses Selaras. Ekosistem MyPerformance.</p>
      </footer>
    </div>
  );
}
