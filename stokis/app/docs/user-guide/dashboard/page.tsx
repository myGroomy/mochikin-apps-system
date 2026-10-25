"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { useLanguage } from "@/lib/LanguageContext";
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  Package,
  Shield,
  Calendar,
  Activity,
} from "lucide-react";

const toc = [
  { id: "overview", label: "Dashboard", level: 1 },
  { id: "daily", label: "Dashboard Harian", level: 2 },
  { id: "weekly", label: "Dashboard Mingguan", level: 2 },
  { id: "charts", label: "Jenis Grafik", level: 2 },
  { id: "admin-only", label: "Akses Admin", level: 2 },
];

export default function DashboardGuidePage() {
  const { t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{ href: "/docs/user-guide/laporan", label: "Laporan", labelEn: "Reports" }}
      next={{ href: "/docs/user-guide/master-item", label: "Master Item", labelEn: "Master Items" }}
    >
      {/* Title */}
      <div id="overview" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("Dashboard Analitik", "Analytics Dashboard")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Dashboard analitik harian dan mingguan dengan grafik interaktif untuk monitoring status stok.",
            "Daily and weekly analytics dashboard with interactive charts for stock status monitoring."
          )}
        </p>
      </div>

      <Callout type="important">
        {t(
          "Dashboard hanya dapat diakses oleh pengguna dengan role Admin. Petugas tidak memiliki akses ke menu ini.",
          "Dashboard can only be accessed by users with the Admin role. Staff do not have access to this menu."
        )}
      </Callout>

      {/* Daily */}
      <section id="daily" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          {t("Dashboard Harian", "Daily Dashboard")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Dashboard Harian menampilkan ringkasan data Stock Opname untuk satu tanggal tertentu. Akses melalui menu Dashboard di sidebar.",
            "The Daily Dashboard displays Stock Opname summary data for a specific date. Access via the Dashboard menu in the sidebar."
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("Filter Tanggal", "Date Filter")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Pilih tanggal untuk melihat data pada hari tersebut. Default ke hari ini.",
                "Select a date to view data for that day. Defaults to today."
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <SwitcherIcon />
              <span className="text-xs font-bold text-base-content">{t("Switcher Harian/Mingguan", "Daily/Weekly Switcher")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Toggle antara tampilan Harian dan Mingguan di bagian atas halaman.",
                "Toggle between Daily and Weekly views at the top of the page."
              )}
            </p>
          </div>
        </div>

        <h3 className="text-sm font-bold text-base-content pt-2">{t("Ringkasan Kartu", "Card Summary")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-1">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-base-content/60">{t("Total Item Terhitung", "Total Counted Items")}</span>
            </div>
            <p className="text-lg font-bold text-base-content">{t("Jumlah seluruh item yang dihitung pada tanggal tersebut", "Total items counted on that date")}</p>
          </div>
          <div className="p-4 rounded-xl border border-base-300 space-y-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-error" />
              <span className="text-xs font-semibold text-base-content/60">{t("Item Status Kritis", "Critical Items")}</span>
            </div>
            <p className="text-lg font-bold text-error">{t("Jumlah item yang perlu restock segera", "Items needing immediate restock")}</p>
          </div>
          <div className="p-4 rounded-xl border border-base-300 space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-warning" />
              <span className="text-xs font-semibold text-base-content/60">{t("Item Hampir Habis", "Low Stock Items")}</span>
            </div>
            <p className="text-lg font-bold text-warning">{t("Jumlah item yang mendekati batas minimum", "Items approaching minimum threshold")}</p>
          </div>
        </div>

        <h3 className="text-sm font-bold text-base-content pt-2">{t("Tabel Rincian", "Detail Table")}</h3>
        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Di bawah grafik, terdapat tabel rincian yang menampilkan semua item yang dihitung pada tanggal tersebut beserta shift, petugas, Step 1, Step 2, total, threshold, dan status.",
            "Below the chart, there is a detail table showing all items counted on that date along with shift, staff, Step 1, Step 2, total, threshold, and status."
          )}
        </p>
      </section>

      {/* Weekly */}
      <section id="weekly" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {t("Dashboard Mingguan", "Weekly Dashboard")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Dashboard Mingguan menampilkan tren aktivitas Stock Opname selama periode 7 hari (atau rentang tanggal yang dipilih).",
            "The Weekly Dashboard displays Stock Opname activity trends over a 7-day period (or selected date range)."
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("Rentang Tanggal", "Date Range")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Pilih tanggal awal dan akhir. Default adalah 7 hari terakhir hingga hari ini.",
                "Select start and end dates. Default is the last 7 days until today."
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("Total Transaksi", "Total Transactions")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Jumlah total item terhitung dalam periode yang dipilih.",
                "Total counted items within the selected period."
              )}
            </p>
          </div>
        </div>

        <h3 className="text-sm font-bold text-base-content pt-2">{t("Distribusi Aktivitas Harian", "Daily Activity Distribution")}</h3>
        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Grid kartu harian menampilkan jumlah item per hari dengan badge status Kritis (K), Hampir Habis (H), dan Aman (A).",
            "Daily card grid displays item counts per day with status badges Critical (K), Low Stock (H), and Safe (A)."
          )}
        </p>
      </section>

      {/* Charts */}
      <section id="charts" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          {t("Jenis Grafik", "Chart Types")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Dashboard menyediakan tiga jenis grafik yang dapat dipilih sesuai kebutuhan:",
            "The dashboard provides three chart types to choose from:"
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <span className="badge badge-primary text-xs font-bold uppercase">Bar Chart</span>
            <p className="text-xs text-base-content/60">
              {t(
                "Grafik batang untuk membandingkan jumlah antar kategori (Kritis, Hampir Habis, Aman) atau tren harian.",
                "Bar chart for comparing counts between categories (Critical, Low Stock, Safe) or daily trends."
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <span className="badge badge-primary text-xs font-bold uppercase">Line Chart</span>
            <p className="text-xs text-base-content/60">
              {t(
                "Grafik garis untuk melihat tren perubahan data dari waktu ke waktu.",
                "Line chart for viewing data change trends over time."
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <span className="badge badge-primary text-xs font-bold uppercase">Area Chart</span>
            <p className="text-xs text-base-content/60">
              {t(
                "Grafik area untuk visualisasi tren dengan area berwarna di bawah garis.",
                "Area chart for trend visualization with colored area below the line."
              )}
            </p>
          </div>
        </div>

        <Callout type="tip">
          {t(
            "Gunakan tombol toggle di pojok kanan atas kartu grafik untuk beralih antar jenis grafik.",
            "Use the toggle button in the top-right corner of the chart card to switch between chart types."
          )}
        </Callout>
      </section>

      {/* Admin Only */}
      <section id="admin-only" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {t("Akses Admin", "Admin Access")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <span className="badge badge-primary text-xs font-bold uppercase">Admin</span>
            <p className="text-xs text-base-content/60">
              {t(
                "Dapat mengakses Dashboard Harian dan Mingguan, mengubah filter tanggal, dan beralih jenis grafik.",
                "Can access Daily and Weekly Dashboards, change date filters, and switch chart types."
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <span className="badge badge-ghost text-xs font-bold uppercase">Petugas</span>
            <p className="text-xs text-base-content/60">
              {t(
                "Tidak memiliki akses ke menu Dashboard. Hanya dapat input SO dan melihat laporan.",
                "Does not have access to the Dashboard menu. Can only input SO and view reports."
              )}
            </p>
          </div>
        </div>

        <Callout type="note">
          {t(
            "Menu Dashboard hanya muncul di sidebar untuk pengguna dengan role Admin. Jika Anda petugas, menu ini tidak terlihat.",
            "The Dashboard menu only appears in the sidebar for users with the Admin role. If you are staff, this menu is not visible."
          )}
        </Callout>
      </section>
    </DocsPage>
  );
}

function SwitcherIcon() {
  return (
    <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
