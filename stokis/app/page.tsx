"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useCabang } from "@/lib/CabangContext";
import {
  ClipboardCheck,
  FileText,
  BarChart3,
  ShieldCheck,
  Smartphone,
  Users,
  ChevronRight,
  Package,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  Store,
  Clock,
  Calendar,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const steps = [
  {
    number: "1",
    title: "Setup Cabang & Item",
    description:
      "Buat cabang baru, tentukan area, dan daftarkan item inventaris beserta threshold minimum.",
  },
  {
    number: "2",
    title: "Isi Stock Opname",
    description:
      "Petugas mengisi Step 1 (selisih) dan Step 2 (actual count) per item. Sistem membandingkan dengan data sebelumnya.",
  },
  {
    number: "3",
    title: "Laporan Otomatis",
    description:
      "Excel XLSX tergenerate otomatis dengan status Kritis/Hampir Habis/Aman. Kirim ke WhatsApp grup cabang dalam satu klik.",
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-base-content/60">Memuat...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <MarketingLanding />;
  }

  return <UserHome />;
}

function MarketingLanding() {
  const { t } = useLanguage();

  return (
    <main className="overflow-x-hidden w-full max-w-full bg-base-100">
      {/* Hero */}
      <section className="px-8 pt-32 mx-auto md:px-12 lg:px-24 max-w-7xl relative">
        <div className="max-w-3xl text-center mx-auto lg:text-balance mb-10">
          <p className="text-sm leading-normal font-bold uppercase text-primary">
            {t('Sistem Stock Opname Multi Cabang', 'Multi-Branch Stock Opname System')}
          </p>
          <h1
            className="mt-4 font-semibold text-base-content"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              lineHeight: "1.15",
              letterSpacing: "-0.02em",
            }}
          >
            {t('Kelola Stok Lebih Cepat, Laporan Lebih Akurat', 'Manage Stock Faster, Report More Accurately')}
          </h1>
          <p className="text-base leading-normal mt-5 text-base-content/60 font-medium max-w-xl mx-auto">
            {t(
              'Satu platform untuk input stock opname, generate laporan XLSX, dan distribusi ke WhatsApp. Terisolasi per cabang, aman, dan mobile friendly.',
              'One unified platform for stock opname input, XLSX report generation, and instant WhatsApp sharing. Isolated per branch, secure, and mobile friendly.'
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3 justify-center mx-auto mt-10">
            <Link
              href="/login"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-white bg-primary hover:bg-primary/90 focus:ring-primary/50 h-10 px-6 text-sm font-medium rounded-lg"
            >
              {t('Mulai Sekarang', 'Get Started')}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-primary bg-primary/10 hover:bg-primary/20 focus:ring-primary/50 h-10 px-6 text-sm font-semibold rounded-lg gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>{t('Pelajari Cara Pakai', 'Learn how to use')}</span>
            </Link>
            <a
              href="#fitur"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-base-content/70 bg-base-200 hover:bg-base-300 hover:text-base-content ring-1 ring-base-300 focus:ring-primary/30 h-10 px-6 text-sm font-medium rounded-lg"
            >
              {t('Lihat Fitur', 'View Features')}
            </a>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="relative w-full mx-auto max-w-5xl items-center py-12">
          <div className="p-6 sm:p-10 bg-primary/5 rounded-2xl">
            <div className="w-full ring-4 ring-base-200 border border-base-300 rounded-xl overflow-hidden bg-base-100 shadow-2xl">
              {/* Mockup Top Bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-base-200/60 border-b border-base-300">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-error/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-base-100 text-xs text-base-content/50 font-medium">
                    <Package className="w-3 h-3" />
                    stokis.app/so/input
                  </div>
                </div>
              </div>
              {/* Mockup Content */}
              <div className="p-4 sm:p-6 space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="text-xs text-base-content/50 font-medium">
                      Total Item
                    </div>
                    <div className="text-lg font-bold text-base-content mt-1">
                      128
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-error/5 border border-error/10">
                    <div className="text-xs text-base-content/50 font-medium">
                      Kritis
                    </div>
                    <div className="text-lg font-bold text-error mt-1">7</div>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/5 border border-warning/10">
                    <div className="text-xs text-base-content/50 font-medium">
                      Hampir Habis
                    </div>
                    <div className="text-lg font-bold text-warning mt-1">
                      12
                    </div>
                  </div>
                </div>
                {/* Mockup Table Rows */}
                <div className="space-y-2">
                  {[
                    { name: "Indomie Goreng", area: "Rak A1", s1: "+2", s2: "45", status: "Aman" },
                    { name: "Kopi Kapal Api", area: "Rak A2", s1: "-15", s2: "3", status: "Kritis" },
                    { name: "Teh Pucuk 350ml", area: "Rak B1", s1: "+5", s2: "32", status: "Aman" },
                    { name: "Sabun Lifebuoy", area: "Rak B2", s1: "-8", s2: "6", status: "Hampir Habis" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-base-200/40 text-xs"
                    >
                      <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-base-content whitespace-normal break-words">
                          {item.name}
                        </div>
                        <div className="text-base-content/40">{item.area}</div>
                      </div>
                      <div className="text-right">
                        <span
                          className={
                            item.s1.startsWith("+")
                              ? "text-success font-medium"
                              : "text-error font-medium"
                          }
                        >
                          {item.s1}
                        </span>
                      </div>
                      <div className="text-right font-medium text-base-content w-8">
                        {item.s2}
                      </div>
                      <div
                        className={
                          item.status === "Kritis"
                            ? "px-2 py-0.5 rounded-lg text-xs font-semibold bg-error/10 text-error"
                            : item.status === "Hampir Habis"
                              ? "px-2 py-0.5 rounded-lg text-xs font-semibold bg-warning/10 text-warning"
                              : "px-2 py-0.5 rounded-lg text-xs font-semibold bg-success/10 text-success"
                        }
                      >
                        {item.status}
                      </div>
                    </div>
                  ))}
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
              "Input Cepat",
              "Laporan XLSX",
              "Multi Cabang",
              "Dashboard Analitik",
              "Keamanan Sesama",
              "Mobile Friendly",
              "WhatsApp Integration",
              "Draft Autosave",
              "Real-time Validation",
              "Threshold Monitoring",
              "Input Cepat",
              "Laporan XLSX",
              "Multi Cabang",
              "Dashboard Analitik",
              "Keamanan Sesama",
              "Mobile Friendly",
              "WhatsApp Integration",
              "Draft Autosave",
              "Real-time Validation",
              "Threshold Monitoring",
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
          <p className="text-sm leading-normal font-bold uppercase text-primary">
            Fitur Utama
          </p>
          <h2
            className="text-xl leading-tight tracking-tight sm:text-2xl md:text-3xl capitalize lg:text-4xl mt-4 font-semibold text-base-content lg:text-balance"
          >
            Yang Anda Butuhkan untuk Stock Opname Modern
          </h2>
          <p className="text-base leading-normal mt-4 text-base-content/60 font-medium">
            Dari input hingga distribusi laporan, semuanya terintegrasi dalam satu
            sistem.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {/* Large card - spans 2 cols */}
          <div className="sm:col-span-2 bg-base-200/50 p-8 rounded-2xl border border-base-300/50 hover:scale-[1.01] transition-transform duration-300">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-base-content">
                  Input Stock Opname Cepat
                </h3>
                <p className="text-sm text-base-content/60 mt-2 leading-relaxed">
                  Form multi-step yang dirancang untuk input cepat. Step 1
                  (selisih) dan Step 2 (actual count) dengan validasi real-time,
                  perbandingan data sebelumnya, dan draft autosave per cabang.
                </p>
              </div>
            </div>
          </div>

          {/* Tall card - spans 2 rows */}
          <div className="row-span-2 bg-primary text-primary-content p-8 rounded-2xl hover:scale-[1.01] transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-5">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold">
              Laporan XLSX Otomatis
            </h3>
            <p className="text-sm mt-2 opacity-90 leading-relaxed">
              Laporan XLSX tergenerate otomatis setelah submission. Threshold
              kritis, warna status (Merah/Hijau), distribusi via WhatsApp langsung
              ke grup cabang.
            </p>
            <div className="mt-6 space-y-2">
              {["Threshold otomatis", "Warna dinamis", "Multi-cabang"].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-sm opacity-90"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Small cards */}
          <div className="bg-base-200/50 p-6 rounded-2xl border border-base-300/50 hover:scale-[1.01] transition-transform duration-300">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-base-content">
              Dashboard Analitik
            </h3>
            <p className="text-sm text-base-content/60 mt-2">
              Grafik interaktif harian dan mingguan untuk tren stok.
            </p>
          </div>

          <div className="bg-base-200/50 p-6 rounded-2xl border border-base-300/50 hover:scale-[1.01] transition-transform duration-300">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-base-content">
              Keamanan Berlapis
            </h3>
            <p className="text-sm text-base-content/60 mt-2">
              PIN sederhana, sesi HMAC, otorisasi per-cabang.
            </p>
          </div>

          {/* Another wide card */}
          <div className="sm:col-span-2 bg-base-200/50 p-6 rounded-2xl border border-base-300/50 hover:scale-[1.01] transition-transform duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-base-content">
                  Multi Cabang
                </h3>
                <p className="text-sm text-base-content/60 mt-1.5">
                  Setiap cabang memiliki database Google Sheets terpisah. Data
                  terisolasi tapi bisa dikelola dari satu panel admin.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cara Kerja - Blue Section */}
      <section className="bg-primary py-20 text-white">
        <div className="max-w-7xl mx-auto px-8 md:px-12 lg:px-24">
          <div className="text-center mb-14">
            <p className="text-sm leading-normal font-bold uppercase text-white/80">
              Cara Kerja
            </p>
            <h2
              className="text-xl leading-tight tracking-tight sm:text-2xl md:text-3xl capitalize lg:text-4xl mt-4 font-semibold text-white"
            >
              Tiga Langkah Menuju Stock Opname yang Lebih Baik
            </h2>
            <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
              Proses sederhana dari setup hingga laporan terkirim.
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
                <p className="text-base text-white/80">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kenapa Stokis - Split Section */}
      <section className="px-8 py-24 mx-auto md:px-12 lg:px-24 max-w-7xl relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
          <div className="lg:order-last">
            <p className="text-sm leading-normal font-bold uppercase text-primary">
              Mengapa Stokis
            </p>
            <h2
              className="text-xl leading-tight tracking-tight sm:text-2xl md:text-3xl capitalize lg:text-4xl mt-4 font-semibold text-base-content"
            >
              Dirancang untuk Tim Gudang yang Butuh Kecepatan
            </h2>
            <p className="text-base leading-normal mt-4 text-base-content/60 font-medium">
              Setiap fitur dibuat berdasarkan kebutuhan nyata tim operasional.
              Tidak ada fitur yang tidak terpakai.
            </p>
            <div className="flex flex-wrap items-center gap-2 mx-auto mt-10">
              <Link
                href="/login"
                className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-white bg-primary hover:bg-primary/90 focus:ring-primary/50 h-10 px-6 text-sm font-medium rounded-lg"
              >
                Mulai Gratis
              </Link>
              <a
                href="#fitur"
                className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-base-content/70 bg-base-200 hover:bg-base-300 hover:text-base-content ring-1 ring-base-300 focus:ring-primary/30 h-10 px-6 text-sm font-medium rounded-lg"
              >
                Pelajari Fitur
              </a>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 text-center gap-x-6 gap-y-12">
              {[
                {
                  icon: ClipboardCheck,
                  title: "Input Instan",
                  desc: "Form yang dirancang untuk kecepatan. tidak perlu click kiri-kanan.",
                },
                {
                  icon: FileText,
                  title: "XLSX Otomatis",
                  desc: "Laporan tergenerate tanpa perlu export manual. Langsung siap kirim.",
                },
                {
                  icon: BarChart3,
                  title: "Visual Jelas",
                  desc: "Grafik dan tabel yang mudah dibaca. Status Kritis langsung terlihat.",
                },
                {
                  icon: Smartphone,
                  title: "Mobile First",
                  desc: "Bisa diakses dari HP petugas di lapangan. Tidak perlu laptop.",
                },
              ].map((item) => (
                <div key={item.title}>
                  <div className="flex flex-col gap-3 text-primary">
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

      {/* CTA */}
      <section className="bg-base-200/50">
        <div className="px-8 py-24 mx-auto md:px-12 lg:px-24 max-w-7xl text-center">
          <h2
            className="text-2xl leading-tight tracking-tight sm:text-3xl md:text-4xl capitalize font-semibold text-base-content"
          >
            Siap Kelola Stok Lebih Baik?
          </h2>
          <p className="text-base leading-normal mt-4 text-base-content/60 font-medium max-w-lg mx-auto">
            Mulai sekarang tanpa biaya. Setup cabang pertama Anda dalam hitungan
            menit.
          </p>
          <div className="flex flex-wrap items-center gap-3 justify-center mt-10">
            <Link
              href="/login"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-white bg-primary hover:bg-primary/90 focus:ring-primary/50 h-11 px-8 text-sm font-medium rounded-lg"
            >
              Mulai Sekarang
              <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center transition-all duration-200 focus:ring-2 focus:outline-none text-base-content/70 bg-base-200 hover:bg-base-300 hover:text-base-content ring-1 ring-base-300 focus:ring-primary/30 h-11 px-8 text-sm font-medium rounded-lg gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Baca Dokumentasi</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-base-300/50 bg-base-100">
        <div className="px-6 md:px-12 lg:px-24 py-12 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt="Stokis"
                className="w-8 h-8 rounded-lg object-cover"
                width={32}
                height={32}
              />
              <span className="text-sm font-semibold text-base-content">
                Stokis
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-base-content/50">
              <Link href="/login" className="hover:text-base-content transition">
                Masuk
              </Link>
              <a href="#fitur" className="hover:text-base-content transition">
                Fitur
              </a>
              <Link href="/docs" className="hover:text-base-content transition">
                Dokumentasi
              </Link>
            </div>
            <p className="text-xs text-base-content/60">
              &copy; {new Date().getFullYear()} Stokis. Hak cipta dilindungi.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

interface HomeLaporan {
  Laporan_ID: string;
  Sesi_ID: string;
  Tanggal_Operasional: string;
  Shift: string;
  Petugas: string;
  Waktu_Dibuat: string;
  Link_PDF: string;
  Jumlah_Kritis: number;
  Jumlah_Hampir_Habis: number;
  Status_Kirim_WA: string;
}

interface DashboardData {
  totalTransaksi: number;
  kritis: number;
  hampirHabis: number;
  aman: number;
  detail: unknown[];
}

function formatWaktu(value: string): string {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const date = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

const quickActions = [
  {
    href: "/so/input",
    icon: ClipboardCheck,
    title: "Input SO",
    desc: "Catat stock opname baru",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    href: "/laporan",
    icon: FileText,
    title: "Laporan",
    desc: "Lihat & kirim laporan SO",
    color: "text-info",
    bg: "bg-info/10",
  },
  {
    href: "/dashboard/harian",
    icon: BarChart3,
    title: "Dashboard",
    desc: "Analitik stok harian/mingguan",
    color: "text-success",
    bg: "bg-success/10",
    roles: ["admin"],
  },
  {
    href: "/docs",
    icon: BookOpen,
    title: "Dokumentasi",
    desc: "Panduan & cara penggunaan",
    color: "text-base-content/60",
    bg: "bg-base-200",
  },
];

const adminActions = [
  {
    href: "/master-item",
    icon: Package,
    title: "Master Item",
    desc: "Kelola daftar barang & threshold",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    href: "/petugas",
    icon: Users,
    title: "Petugas",
    desc: "Kelola akun & hak akses",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    href: "/cabang",
    icon: Store,
    title: "Cabang",
    desc: "Kelola data cabang",
    color: "text-info",
    bg: "bg-info/10",
  },
];

function UserHome() {
  const { user } = useAuth();
  const { selectedCabang } = useCabang();

  const [data, setData] = useState<DashboardData | null>(null);
  const [laporan, setLaporan] = useState<HomeLaporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [laporanLoading, setLaporanLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const isAdmin = user?.role === "admin";
  const cabang = selectedCabang?.Nama_Cabang || "Semua Cabang";

  const visibleQuickActions = quickActions.filter(
    (a) => !a.roles || a.roles.includes(user?.role || "petugas")
  );

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      if (!selectedCabang) {
        setLoading(false);
        setLaporanLoading(false);
        return;
      }

      setLoading(true);
      setLaporanLoading(true);
      const cabangId = selectedCabang.Cabang_ID;

      const dashPromise = isAdmin
        ? fetch(`/api/dashboard/harian?cabang=${cabangId}&tanggal=${today}`)
        : Promise.resolve(null);
      const lapPromise = fetch(`/api/laporan?cabang=${cabangId}`);

      const [dashRes, lapRes] = await Promise.all([dashPromise, lapPromise]);

      if (dashRes) {
        const dash = await dashRes.json();
        if (!cancelled && dash.success && dash.data) setData(dash.data);
      }

      const lap = await lapRes.json();
      if (!cancelled && lap.success && Array.isArray(lap.data)) {
        setLaporan([...lap.data].reverse().slice(0, 5));
      }

      if (!cancelled) {
        setLoading(false);
        setLaporanLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [selectedCabang, today, isAdmin]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 data-onboard="home-heading" className="text-xl sm:text-2xl font-semibold text-base-content flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            <span>Selamat datang, {user?.nama || "Petugas"} 👋</span>
          </h1>
          <p className="text-sm text-base-content/60 mt-1 flex items-center gap-1.5">
            <span className="badge badge-ghost badge-sm">
              {isAdmin ? "Admin" : "Petugas"}
            </span>
            Cabang: <span className="font-semibold text-base-content">{cabang}</span>
          </p>
        </div>
        <Link
          href="/so/input"
          className="btn btn-primary btn-sm"
        >
          <ClipboardCheck className="w-4 h-4" />
          Mulai Input SO
        </Link>
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-base-content/60 uppercase tracking-wider">
          Layanan
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-x-2 gap-y-6 sm:gap-3">
          {visibleQuickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="group flex min-h-[142px] flex-col items-center justify-start gap-2 p-2.5 sm:p-4 rounded-xl border border-base-200 hover:border-primary/20 hover:bg-primary/5 transition-all text-center"
              >
                <div className={`p-2.5 rounded-xl ${a.bg} ${a.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-base-content group-hover:text-primary transition-colors">
                    {a.title}
                  </h3>
                  <p className="text-xs text-base-content/45 mt-0.5 leading-tight">
                    {a.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {isAdmin && (
          <>
            <h2 className="text-sm font-semibold text-base-content/60 uppercase tracking-wider pt-2">
              Administrasi
            </h2>
            <div className="grid grid-cols-3 gap-x-2 gap-y-6 sm:gap-3">
              {adminActions.map((a) => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="group flex min-h-[142px] flex-col items-center justify-start gap-2 p-2.5 sm:p-4 rounded-xl border border-base-200 hover:border-primary/20 hover:bg-primary/5 transition-all text-center"
                  >
                    <div className={`p-2.5 rounded-xl ${a.bg} ${a.color} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-base-content group-hover:text-primary transition-colors">
                        {a.title}
                      </h3>
                      <p className="text-xs text-base-content/45 mt-0.5 leading-tight">
                        {a.desc}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Stock Summary (admin only) */}
      {isAdmin && selectedCabang ? (
        <div className="space-y-4">
          <h2 className="font-semibold text-base-content flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Ringkasan Stok Hari Ini
          </h2>

          {loading || !data ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card bg-base-100 border border-base-300 p-5 animate-pulse">
                  <div className="h-4 w-24 bg-base-200 rounded-lg mb-3" />
                  <div className="h-8 w-12 bg-base-200 rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card bg-base-100 border border-base-300 p-5 flex items-center gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-lg">
                  <Package className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-base-content/60 font-semibold">Total Item Terhitung</span>
                  <h3 className="text-2xl font-bold text-base-content tabular-nums">
                    {data?.totalTransaksi || 0}
                  </h3>
                </div>
              </div>
              <div className="card bg-base-100 border border-base-300 p-5 flex items-center gap-4">
                <div className="p-3 bg-error/10 text-error rounded-lg">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-base-content/60 font-semibold">Item Status Kritis</span>
                  <h3 className="text-2xl font-bold text-error tabular-nums">{data?.kritis || 0}</h3>
                </div>
              </div>
              <div className="card bg-base-100 border border-base-300 p-5 flex items-center gap-4">
                <div className="p-3 bg-warning/10 text-warning rounded-lg">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-base-content/60 font-semibold">Item Hampir Habis</span>
                  <h3 className="text-2xl font-bold text-warning tabular-nums">{data?.hampirHabis || 0}</h3>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : isAdmin ? (
        <div className="alert alert-warning text-sm" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Silakan pilih cabang aktif melalui dropdown di navbar untuk melihat ringkasan stok.</span>
        </div>
      ) : null}

      {/* Recent Laporan */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base-content flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-primary" />
            Laporan Terbaru
          </h2>
          <Link href="/laporan" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
            Lihat semua
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!selectedCabang ? (
          <div className="card bg-base-100 border border-base-300 p-8 text-center text-sm text-base-content/60">
            Pilih cabang untuk melihat laporan terbaru.
          </div>
        ) : laporanLoading ? (
          <div className="card bg-base-100 border border-base-300 p-6 animate-pulse space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 bg-base-200 rounded-lg" />
            ))}
          </div>
        ) : laporan.length === 0 ? (
          <div className="card bg-base-100 border border-base-300 p-8 text-center text-sm text-base-content/60">
            Belum ada laporan stock opname untuk cabang ini.
          </div>
        ) : (
          <div className="card bg-base-100 border border-base-300 overflow-hidden">
            <div className="divide-y divide-base-300">
              {laporan.map((l) => (
                <div key={l.Laporan_ID} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-base-200 transition-colors sm:flex sm:gap-3">
                  <div className="row-span-2 p-2 rounded-lg bg-base-200 text-base-content/60 flex-shrink-0 sm:row-span-1">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 sm:flex-1">
                    <div className="font-semibold text-sm text-base-content whitespace-normal break-words">
                      {l.Petugas || "Petugas"}
                    </div>
                    <div className="text-xs text-base-content/60 flex items-center gap-1.5 min-w-0">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span className="tabular-nums whitespace-nowrap">{formatWaktu(l.Waktu_Dibuat)}</span>
                    </div>
                  </div>
                  <div className="col-start-2 flex items-center gap-1.5 flex-wrap min-w-0 sm:ml-auto sm:flex-nowrap sm:justify-end">
                    {l.Shift ? <span className="badge badge-ghost badge-sm">{l.Shift}</span> : null}
                    {l.Jumlah_Kritis > 0 && (
                      <span className="badge badge-error badge-sm">{l.Jumlah_Kritis} Kritis</span>
                    )}
                    {l.Jumlah_Hampir_Habis > 0 && (
                      <span className="badge badge-warning badge-sm">{l.Jumlah_Hampir_Habis} HH</span>
                    )}
                    <span
                      className={`badge badge-outline badge-sm ${
                        l.Status_Kirim_WA === "Sent"
                          ? "text-success border-success/40"
                          : "text-base-content/40 border-base-300"
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {l.Status_Kirim_WA === "Sent" ? "WA" : "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
