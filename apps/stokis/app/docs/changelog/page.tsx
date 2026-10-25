"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Sparkles,
  BarChart3,
  MessageSquare,
  Globe,
  CheckCircle2,
} from "lucide-react";

const toc = [
  { id: "overview", label: "Overview", level: 1 },
  { id: "v1-3-0", label: "v1.3.0 — Multi-Language", level: 1 },
  { id: "v1-2-0", label: "v1.2.0 — WhatsApp Integration", level: 1 },
  { id: "v1-1-0", label: "v1.1.0 — Dashboard", level: 1 },
  { id: "v1-0-0", label: "v1.0.0 — Initial Release", level: 1 },
];

const versions = [
  {
    version: "1.3.0",
    date: "2026",
    icon: Globe,
    color: "primary",
    title: "Multi-Language Support",
    titleId: "Dukungan Multi-Bahasa",
    changes: [
      { type: "added", en: "Indonesian and English language toggle", id: "Toggle bahasa Indonesia dan Inggris" },
      { type: "added", en: "Language persistence in localStorage", id: "Persistensi bahasa di localStorage" },
      { type: "added", en: "Bilingual documentation pages", id: "Halaman dokumentasi bilingual" },
      { type: "added", en: "Language context provider for app-wide language state", id: "Language context provider untuk status bahasa seluruh app" },
    ],
  },
  {
    version: "1.2.0",
    date: "2026",
    icon: MessageSquare,
    color: "success",
    title: "WhatsApp Integration",
    titleId: "Integrasi WhatsApp",
    changes: [
      { type: "added", en: "Auto-generate WhatsApp sharing link after SO submission", id: "Auto-generate link sharing WhatsApp setelah submit SO" },
      { type: "added", en: "WhatsApp status tracking per report", id: "Tracking status WhatsApp per laporan" },
      { type: "added", en: "Report summary formatted for WhatsApp groups", id: "Ringkasan laporan terformat untuk grup WhatsApp" },
      { type: "added", en: "One-click share to WhatsApp groups", id: "Share satu klik ke grup WhatsApp" },
    ],
  },
  {
    version: "1.1.0",
    date: "2026",
    icon: BarChart3,
    color: "info",
    title: "Analytics Dashboard",
    titleId: "Dashboard Analitik",
    changes: [
      { type: "added", en: "Daily analytics dashboard with charts", id: "Dashboard analitik harian dengan grafik" },
      { type: "added", en: "Weekly analytics dashboard with trend analysis", id: "Dashboard analitik mingguan dengan analisis tren" },
      { type: "added", en: "Interactive Recharts visualizations", id: "Visualisasi Recharts interaktif" },
      { type: "added", en: "Branch-filtered dashboard data", id: "Data dashboard difilter per cabang" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026",
    icon: Sparkles,
    color: "primary",
    title: "Initial Release",
    titleId: "Rilis Awal",
    changes: [
      { type: "added", en: "HMAC-SHA256 signed session tokens", id: "Session token signed dengan HMAC-SHA256" },
      { type: "added", en: "Multi-branch stock opname system", id: "Sistem stock opname multi-cabang" },
      { type: "added", en: "SO form with auto-save draft", id: "Form SO dengan auto-save draft" },
      { type: "added", en: "Automatic threshold status calculation (Critical/Low/Safe)", id: "Kalkulasi status threshold otomatis (Kritis/Hampir Habis/Aman)" },
      { type: "added", en: "XLSX report generation via ExcelJS", id: "Generasi laporan XLSX via ExcelJS" },
      { type: "added", en: "Google Sheets as primary database", id: "Google Sheets sebagai database utama" },
      { type: "added", en: "Google Drive integration for file storage", id: "Integrasi Google Drive untuk penyimpanan file" },
      { type: "added", en: "Apps Script fallback for file uploads", id: "Apps Script fallback untuk upload file" },
      { type: "added", en: "Master Item management with thresholds", id: "Manajemen Master Item dengan threshold" },
      { type: "added", en: "Branch management (CRUD)", id: "Manajemen Cabang (CRUD)" },
      { type: "added", en: "Staff management (CRUD)", id: "Manajemen Petugas (CRUD)" },
      { type: "added", en: "User management with role-based access", id: "Manajemen User dengan role-based access" },
      { type: "added", en: "Admin and Staff role permissions", id: "Izin role Admin dan Petugas" },
      { type: "added", en: "Vercel serverless deployment", id: "Deploy Vercel serverless" },
    ],
  },
];

export default function ChangelogPage() {
  const { lang, t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{
        href: "/docs/faq",
        label: "FAQ",
        labelEn: "FAQ",
      }}
      next={undefined}
    >
      {/* Title */}
      <div id="overview" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("Changelog", "Changelog")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Riwayat versi dan perubahan pada Stokis.",
            "Version history and changes in Stokis."
          )}
        </p>
      </div>

      <Callout type="note">
        {t(
          "Stokis mengikuti semantic versioning (MAJOR.MINOR.PATCH). Semua perubahan signifikan dicatat di halaman ini.",
          "Stokis follows semantic versioning (MAJOR.MINOR.PATCH). All significant changes are recorded on this page."
        )}
      </Callout>

      {/* Version Timeline */}
      <div className="space-y-8">
        {versions.map((v, idx) => {
          const Icon = v.icon;
          return (
            <section
              key={v.version}
              id={`v${v.version.replace(/\./g, "-")}`}
              className="scroll-mt-32 space-y-4"
            >
              {/* Version Header */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-${v.color}/10 flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-5 h-5 text-${v.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-base-content">
                      v{v.version}
                    </span>
                    <span className="text-xs text-base-content/40">
                      {v.date}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-base-content/70">
                    {t(v.titleId, v.title)}
                  </h2>
                </div>
              </div>

              {/* Changes */}
              <div className="ml-[52px] space-y-1.5">
                {v.changes.map((change, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span className="mt-0.5 flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    </span>
                    <span className="text-base-content/70">
                      {lang === "en" ? change.en : change.id}
                    </span>
                  </div>
                ))}
              </div>

              {/* Separator */}
              {idx < versions.length - 1 && (
                <div className="border-t border-base-300/50" />
              )}
            </section>
          );
        })}
      </div>

      <Callout type="tip">
        {t(
          "Untuk melihat perubahan teknis detail, kunjungi repository GitHub dan lihat commit history.",
          "For detailed technical changes, visit the GitHub repository and check the commit history."
        )}
      </Callout>
    </DocsPage>
  );
}
