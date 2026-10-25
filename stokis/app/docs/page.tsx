"use client";

import React from "react";
import Link from "next/link";
import {
  BookOpen,
  Rocket,
  Users,
  Layers,
  Code2,
  AlertTriangle,
  HelpCircle,
  FileText,
  ArrowRight,
  Search,
  Package,
  Building2,
  ClipboardCheck,
  BarChart3,
  MessageCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const mainSections = [
  {
    icon: Rocket,
    title: "Getting Started",
    description: "Persyaratan, quick start, dan panduan setup awal.",
    descriptionEn: "Requirements, quick start, and initial setup guide.",
    href: "/docs/getting-started",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: BookOpen,
    title: "Introduction",
    description: "Apa itu Stokis, masalah yang diselesaikan, dan target pengguna.",
    descriptionEn: "What is Stokis, problems it solves, and target users.",
    href: "/docs/introduction",
    color: "text-info",
    bg: "bg-info/10",
  },
];

const userGuideItems = [
  {
    icon: ClipboardCheck,
    title: "Stock Opname",
    href: "/docs/user-guide/stock-opname",
  },
  {
    icon: FileText,
    title: "Laporan",
    href: "/docs/user-guide/laporan",
  },
  {
    icon: BarChart3,
    title: "Dashboard",
    href: "/docs/user-guide/dashboard",
  },
  {
    icon: Package,
    title: "Master Item",
    href: "/docs/user-guide/master-item",
  },
  {
    icon: Building2,
    title: "Cabang",
    href: "/docs/user-guide/cabang",
  },
  {
    icon: Users,
    title: "Petugas",
    href: "/docs/user-guide/petugas",
  },
];

const referenceSections = [
  {
    icon: Layers,
    title: "Product & System",
    description: "Arsitektur produk, alur data, integrasi, dan role & permissions.",
    descriptionEn: "Product architecture, data flow, integrations, and roles & permissions.",
    href: "/docs/product",
  },
  {
    icon: Code2,
    title: "Developer Docs",
    description: "Tech stack, API, struktur project, dan deployment.",
    descriptionEn: "Tech stack, API, project structure, and deployment.",
    href: "/docs/developer",
  },
  {
    icon: AlertTriangle,
    title: "Troubleshooting",
    description: "Masalah umum dan solusinya.",
    descriptionEn: "Common issues and their solutions.",
    href: "/docs/troubleshooting",
  },
  {
    icon: HelpCircle,
    title: "FAQ",
    description: "Pertanyaan yang sering diajukan oleh pengguna.",
    descriptionEn: "Frequently asked questions by users.",
    href: "/docs/faq",
  },
  {
    icon: FileText,
    title: "Changelog",
    description: "Riwayat perubahan versi produk.",
    descriptionEn: "Product version change history.",
    href: "/docs/changelog",
  },
];

export default function DocsIndexPage() {
  const { lang, t } = useLanguage();

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
              {t("Dokumentasi Stokis", "Stokis Documentation")}
            </h1>
          </div>
        </div>
        <p className="text-sm text-base-content/50 leading-relaxed max-w-2xl">
          {t(
            "Panduan lengkap menggunakan Stokis — sistem stock opname multi-cabang dengan laporan otomatis & integrasi WhatsApp.",
            "Complete guide for using Stokis — multi-branch stock opname system with automatic reports & WhatsApp integration."
          )}
        </p>
      </div>

      {/* Quick Start Banner */}
      <Link
        href="/docs/getting-started"
        className="group flex items-center gap-4 p-5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/[0.02] hover:from-primary/10 hover:to-primary/5 hover:shadow-md transition-all"
      >
        <div className="p-3 rounded-xl bg-primary text-primary-content flex-shrink-0">
          <Rocket className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-base-content group-hover:text-primary transition-colors">
            {t("Mulai di sini", "Start here")}
          </p>
          <p className="text-xs text-base-content/50 mt-0.5">
            {t("Quick start dalam 5 menit — dari setup hingga laporan pertama", "Quick start in 5 minutes — from setup to your first report")}
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-primary/40 group-hover:text-primary group-hover:translate-x-1 flex-shrink-0 transition-all" />
      </Link>

      {/* Main Sections - 2 column */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {mainSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group p-5 rounded-2xl border border-base-200 hover:border-primary/20 hover:bg-base-200/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl ${section.bg} ${section.color} flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-base-content group-hover:text-primary transition-colors">
                    {section.title}
                  </p>
                  <p className="text-xs text-base-content/45 mt-1 leading-relaxed">
                    {lang === "en" && section.descriptionEn
                      ? section.descriptionEn
                      : section.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-base-content/15 group-hover:text-primary/50 mt-1 flex-shrink-0 transition-all group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* User Guide Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-base-content uppercase tracking-wider">
            {t("Panduan Pengguna", "User Guide")}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {userGuideItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 p-4 rounded-xl border border-base-200 hover:border-primary/20 hover:bg-primary/5 transition-all"
              >
                <Icon className="w-4 h-4 text-base-content/30 group-hover:text-primary flex-shrink-0 transition-colors" />
                <span className="text-xs font-semibold text-base-content/70 group-hover:text-primary transition-colors">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Reference Sections */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-base-content uppercase tracking-wider">
            {t("Referensi", "Reference")}
          </h2>
        </div>
        <div className="space-y-2">
          {referenceSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                className="group flex items-center gap-4 p-4 rounded-xl border border-base-200 hover:border-primary/20 hover:bg-base-200/30 hover:shadow-sm transition-all"
              >
                <div className="p-2 rounded-lg bg-base-200 group-hover:bg-primary/10 text-base-content/30 group-hover:text-primary transition-colors flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-base-content group-hover:text-primary transition-colors">
                    {section.title}
                  </p>
                  <p className="text-xs text-base-content/45 mt-0.5 leading-relaxed">
                    {lang === "en" && section.descriptionEn
                      ? section.descriptionEn
                      : section.description}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-base-content/15 group-hover:text-primary/50 flex-shrink-0 transition-all group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Help Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl border border-base-200 bg-base-50">
        <div className="p-2.5 rounded-xl bg-base-200 flex-shrink-0">
          <MessageCircle className="w-5 h-5 text-base-content/40" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-base-content">
            {t("Butuh bantuan?", "Need help?")}
          </p>
          <p className="text-xs text-base-content/50 mt-0.5">
            {t(
              "Gunakan pencarian di atas atau hubungi admin cabang Anda.",
              "Use the search above or contact your branch admin."
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
          <Search className="w-3.5 h-3.5" />
          <span>{t("Cari dokumentasi", "Search docs")}</span>
        </div>
      </div>
    </div>
  );
}
