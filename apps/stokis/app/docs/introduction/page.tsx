"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  Users,
  Zap,
  ShieldCheck,
  BarChart3,
  FileText,
  Smartphone,
} from "lucide-react";

const toc = [
  { id: "overview", label: "Overview", level: 1 },
  { id: "what-is-stokis", label: "Apa itu Stokis?", level: 2 },
  { id: "problem-solution", label: "Masalah & Solusi", level: 2 },
  { id: "key-features", label: "Fitur Utama", level: 2 },
  { id: "target-users", label: "Target Pengguna", level: 2 },
];

export default function IntroductionPage() {
  const { t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{ href: "/docs", label: "Overview", labelEn: "Overview" }}
      next={{ href: "/docs/getting-started", label: "Getting Started", labelEn: "Getting Started" }}
    >
      {/* Title */}
      <div id="overview" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("Introduction", "Introduction")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Mengenal Stokis — apa itu, untuk siapa, dan mengapa penting.",
            "Meet Stokis — what it is, who it's for, and why it matters."
          )}
        </p>
      </div>

      {/* What is Stokis */}
      <section id="what-is-stokis" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          {t("Apa itu Stokis?", "What is Stokis?")}
        </h2>
        <div className="text-sm text-base-content/70 leading-relaxed space-y-3">
          <p>
            {t(
              "Stokis adalah sistem Stock Opname (SO) multi-cabang yang dirancang untuk bisnis retail modern — terutama F&B, minimarket, dan toko dengan banyak cabang. Sistem ini membantu pemilik dan manajer cabang memantau stok fisik secara real-time tanpa spreadsheet manual.",
              "Stokis is a multi-branch Stock Opname (SO) system designed for modern retail businesses — especially F&B, minimarts, and multi-branch stores. It helps branch owners and managers monitor physical stock in real-time without manual spreadsheets."
            )}
          </p>
          <p>
            {t(
              "Dengan Stokis, petugas shift cukup menghitung stok fisik di dua lokasi (display dan gudang), dan sistem akan secara otomatis menghitung selisih, menentukan status stok (Kritis / Hampir Habis / Aman), serta menghasilkan laporan XLSX yang siap dibagikan ke grup WhatsApp.",
              "With Stokis, shift officers only need to count physical stock at two locations (display and warehouse), and the system automatically calculates variances, determines stock status (Critical / Low / Safe), and generates XLSX reports ready to share to WhatsApp groups."
            )}
          </p>
        </div>
      </section>

      {/* Problem & Solution */}
      <section id="problem-solution" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          {t("Masalah & Solusi", "Problem & Solution")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-error/20 bg-error/5 space-y-3">
            <h3 className="text-xs font-bold text-error uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t("Masalah", "Problem")}
            </h3>
            <ul className="text-xs text-base-content/70 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-error mt-0.5">•</span>
                <span>{t("Pencatatan stok manual di kertas/Excel rawan salah hitung", "Manual stock recording on paper/Excel is prone to miscalculation")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-error mt-0.5">•</span>
                <span>{t("Tidak ada visibilitas real-time antar cabang", "No real-time visibility across branches")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-error mt-0.5">•</span>
                <span>{t("Stok habis (stockout) tidak terdeteksi sampai terlambat", "Stockout goes undetected until it's too late")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-error mt-0.5">•</span>
                <span>{t("Laporan tidak konsisten antar cabang", "Reports are inconsistent across branches")}</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-success/20 bg-success/5 space-y-3">
            <h3 className="text-xs font-bold text-success uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t("Solusi Stokis", "Stokis Solution")}
            </h3>
            <ul className="text-xs text-base-content/70 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>{t("Form input terstruktur dengan validasi real-time", "Structured input form with real-time validation")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>{t("Dashboard analitik harian & mingguan untuk monitoring", "Daily & weekly analytics dashboard for monitoring")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>{t("Sistem threshold otomatis mendeteksi stok kritis", "Automatic threshold system detects critical stock")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>{t("Laporan XLSX terstandarisasi & distribusi via WhatsApp", "Standardized XLSX reports & distribution via WhatsApp")}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section id="key-features" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          {t("Fitur Utama", "Key Features")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              icon: Smartphone,
              title: t("Input Cepat", "Quick Input"),
              desc: t("Form multi-step dengan auto-save draft", "Multi-step form with auto-save draft"),
            },
            {
              icon: FileText,
              title: t("Laporan XLSX Otomatis", "Auto XLSX Reports"),
              desc: t("Ter generate setelah submit, siap share", "Generated after submit, ready to share"),
            },
            {
              icon: BarChart3,
              title: t("Dashboard Analitik", "Analytics Dashboard"),
              desc: t("Grafik harian & mingguan interaktif", "Interactive daily & weekly charts"),
            },
            {
              icon: ShieldCheck,
              title: t("Role-Based Access", "Role-Based Access"),
              desc: t("Admin dan Petugas dengan hak akses berbeda", "Admin and Staff with different permissions"),
            },
            {
              icon: Users,
              title: t("Multi-Cabang", "Multi-Branch"),
              desc: t("Isolasi data per cabang, switch mudah", "Per-branch data isolation, easy switching"),
            },
            {
              icon: Target,
              title: t("Threshold Status", "Threshold Status"),
              desc: t("Auto-detect Kritis, Hampir Habis, Aman", "Auto-detect Critical, Low, Safe"),
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-4 rounded-xl border border-base-300 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <feature.icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-base-content">
                    {feature.title}
                  </p>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    {feature.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Target Users */}
      <section id="target-users" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t("Target Pengguna", "Target Users")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <span className="badge badge-primary text-xs font-bold uppercase">
              Admin
            </span>
            <p className="text-xs text-base-content/70">
              {t(
                "Pemilik bisnis, manajer cabang, atau admin yang mengelola master data (barang, cabang, petugas), melihat dashboard analitik, dan mengatur threshold minimum stok.",
                "Business owners, branch managers, or admins who manage master data (items, branches, staff), view analytics dashboards, and set minimum stock thresholds."
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <span className="badge badge-info text-xs font-bold uppercase">
              Petugas
            </span>
            <p className="text-xs text-base-content/70">
              {t(
                "Staff operasional atau petugas shift yang bertugas menghitung stok fisik harian, mengisi form SO, dan membagikan laporan ke grup WhatsApp.",
                "Operational staff or shift officers tasked with daily physical stock counting, filling SO forms, and sharing reports to WhatsApp groups."
              )}
            </p>
          </div>
        </div>

        <Callout type="tip">
          {t(
            "Stokis dirancang untuk pengguna non-teknis. Tidak perlu install aplikasi — cukup buka browser di HP atau komputer.",
            "Stokis is designed for non-technical users. No app installation needed — just open a browser on your phone or computer."
          )}
        </Callout>
      </section>
    </DocsPage>
  );
}
