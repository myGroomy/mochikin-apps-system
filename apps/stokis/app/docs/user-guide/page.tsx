"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { useLanguage } from "@/lib/LanguageContext";
import {
  ClipboardCheck,
  FileText,
  BarChart3,
  Package,
  Building2,
  Users,
  ArrowRight,
  Shield,
  Key,
} from "lucide-react";
import Link from "next/link";

const toc = [
  { id: "overview", label: "Panduan Pengguna", level: 1 },
  { id: "features", label: "Fitur yang Tersedia", level: 2 },
  { id: "roles", label: "Role & Akses", level: 2 },
];

const features = [
  {
    icon: ClipboardCheck,
    title: "Stock Opname (SO)",
    titleEn: "Stock Opname (SO)",
    description: "Form multi-step untuk menghitung stok fisik barang (S1 stock utuh & S2 stock terbuka).",
    descriptionEn: "Multi-step form for counting physical stock (S1 whole stock & S2 opened stock).",
    href: "/docs/user-guide/stock-opname",
  },
  {
    icon: FileText,
    title: "Laporan",
    titleEn: "Reports",
    description: "Riwayat laporan SO, generate ulang XLSX, dan bagikan via WhatsApp.",
    descriptionEn: "SO report history, XLSX regeneration, and WhatsApp sharing.",
    href: "/docs/user-guide/laporan",
  },
  {
    icon: BarChart3,
    title: "Dashboard",
    titleEn: "Dashboard",
    description: "Dashboard analitik harian dan mingguan dengan grafik interaktif.",
    descriptionEn: "Daily & weekly analytics dashboard with interactive charts.",
    href: "/docs/user-guide/dashboard",
  },
  {
    icon: Package,
    title: "Master Item",
    titleEn: "Master Items",
    description: "Kelola daftar barang, area penempatan, satuan, dan threshold minimum stok.",
    descriptionEn: "Manage item list, placement areas, units, and minimum stock thresholds.",
    href: "/docs/user-guide/master-item",
  },
  {
    icon: Building2,
    title: "Cabang",
    titleEn: "Branches",
    description: "Administrasi cabang operasional dengan spreadsheet terisolasi per cabang.",
    descriptionEn: "Branch administration with isolated spreadsheets per branch.",
    href: "/docs/user-guide/cabang",
  },
  {
    icon: Users,
    title: "Petugas",
    titleEn: "Staff",
    description: "Kelola akun pengguna, role, PIN, dan akses cabang.",
    descriptionEn: "Manage user accounts, roles, PINs, and branch access.",
    href: "/docs/user-guide/petugas",
  },
];

export default function UserGuidePage() {
  const { lang, t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{ href: "/docs/getting-started", label: "Getting Started", labelEn: "Getting Started" }}
      next={{ href: "/docs/user-guide/stock-opname", label: "Stock Opname (SO)", labelEn: "Stock Opname (SO)" }}
    >
      {/* Title */}
      <div id="overview" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("Panduan Pengguna", "User Guide")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Panduan lengkap penggunaan setiap fitur utama Stokis.",
            "Complete guide to using each main Stokis feature."
          )}
        </p>
      </div>

      {/* Features */}
      <section id="features" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          {t("Fitur yang Tersedia", "Available Features")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.href}
                href={feature.href}
                className="flex items-start gap-3 p-4 rounded-xl border border-base-300 hover:border-primary/20 hover:bg-primary/5 transition-colors group"
              >
                <div className="p-2 rounded-lg bg-base-200 group-hover:bg-primary/10 text-base-content/40 group-hover:text-primary transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-base-content group-hover:text-primary transition-colors">
                    {lang === "en" && feature.titleEn ? feature.titleEn : feature.title}
                  </p>
                  <p className="text-xs text-base-content/50 mt-0.5 leading-relaxed">
                    {lang === "en" && feature.descriptionEn ? feature.descriptionEn : feature.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-base-content/20 group-hover:text-primary mt-1 opacity-0 group-hover:opacity-100 transition-all" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {t("Role & Akses", "Roles & Access")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">Admin</span>
            </div>
            <p className="text-xs text-base-content/50">
              {t(
                "Akses penuh ke semua fitur: input SO, laporan, dashboard, dan manajemen master data (Master Item, Cabang, Petugas).",
                "Full access to all features: SO input, reports, dashboard, and master data management (Master Items, Branches, Staff)."
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-info" />
              <span className="text-xs font-bold text-base-content">Petugas</span>
            </div>
            <p className="text-xs text-base-content/50">
              {t(
                "Akses input SO dan melihat laporan. Tidak dapat mengelola master data atau melihat dashboard analitik.",
                "SO input access and view reports. Cannot manage master data or view analytics dashboard."
              )}
            </p>
          </div>
        </div>

        <Callout type="note">
          {t(
            "Setiap pengguna hanya dapat mengakses data cabang yang telah ditetapkan oleh admin. Data antar cabang terisolasi penuh.",
            "Each user can only access data for branches assigned by the admin. Data across branches is fully isolated."
          )}
        </Callout>
      </section>
    </DocsPage>
  );
}
