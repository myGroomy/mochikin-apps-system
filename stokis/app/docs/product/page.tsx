"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Building2,
  Database,
  ArrowRight,
  GitBranch,
  Shield,
  BarChart3,
  FileSpreadsheet,
  Smartphone,
  Link2,
  Upload,
  RefreshCw,
  Lock,
} from "lucide-react";

const toc = [
  { id: "architecture", label: "Arsitektur Sistem", level: 1 },
  { id: "overview", label: "Overview", level: 2 },
  { id: "tech-stack", label: "Tech Stack", level: 2 },
  { id: "data-flow", label: "Alur Data", level: 1 },
  { id: "so-submission", label: "SO Submission", level: 2 },
  { id: "report-generation", label: "Report Generation", level: 2 },
  { id: "business-logic", label: "Logika Bisnis", level: 1 },
  { id: "threshold", label: "Threshold & Status", level: 2 },
  { id: "shift", label: "Shift (S1/S2)", level: 2 },
  { id: "integrations", label: "Integrasi", level: 1 },
  { id: "google-sheets", label: "Google Sheets", level: 2 },
  { id: "google-drive", label: "Google Drive", level: 2 },
  { id: "apps-script", label: "Apps Script", level: 2 },
  { id: "whatsapp", label: "WhatsApp", level: 2 },
  { id: "roles", label: "Role & Permissions", level: 1 },
];

export default function ProductPage() {
  const { lang, t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{
        href: "/docs/getting-started",
        label: "Getting Started",
        labelEn: "Getting Started",
      }}
      next={{
        href: "/docs/developer",
        label: "Developer Docs",
        labelEn: "Developer Docs",
      }}
    >
      {/* Title */}
      <div id="architecture" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("Product & System", "Product & System")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Arsitektur sistem, alur data, logika bisnis, dan integrasi eksternal.",
            "System architecture, data flow, business logic, and external integrations."
          )}
        </p>
      </div>

      {/* Overview */}
      <section id="overview" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          {t("Overview", "Overview")}
        </h2>
        <div className="text-sm text-base-content/70 leading-relaxed space-y-3">
          <p>
            {t(
              "Stokis adalah aplikasi Stock Opname berbasis web yang menggunakan Google Sheets sebagai database utama. Tidak ada database tradisional — seluruh data tersimpan di spreadsheet yang diakses melalui Google Sheets API.",
              "Stokis is a web-based Stock Opname application that uses Google Sheets as its primary database. There is no traditional database — all data is stored in spreadsheets accessed via the Google Sheets API."
            )}
          </p>
          <p>
            {t(
              "Sistem ini berjalan di Vercel (serverless Next.js) dan berkomunikasi langsung dengan Google API menggunakan service account.",
              "The system runs on Vercel (serverless Next.js) and communicates directly with Google APIs using a service account."
            )}
          </p>
        </div>
      </section>

      {/* Tech Stack */}
      <section id="tech-stack" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          {t("Tech Stack", "Tech Stack")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              icon: FileSpreadsheet,
              title: "Next.js 16.3.3",
              desc: "App Router, React 19, TypeScript",
            },
            {
              icon: Smartphone,
              title: "DaisyUI v5 + Tailwind CSS v4",
              desc: "UI components & utility-first styling",
            },
            {
              icon: BarChart3,
              title: "Recharts",
              desc: "Interactive charts for dashboard",
            },
            {
              icon: Database,
              title: "Google Sheets API",
              desc: "Database (no traditional DB)",
            },
            {
              icon: Upload,
              title: "Google Drive API",
              desc: "File storage for XLSX reports",
            },
            {
              icon: Shield,
              title: "PIN + HMAC-SHA256",
              desc: "PIN-based auth & session signing",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-3 rounded-xl border border-base-300 flex items-start gap-3"
            >
              <item.icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-base-content">
                  {item.title}
                </p>
                <p className="text-xs text-base-content/50">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Data Flow */}
      <section id="data-flow" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-primary" />
          {t("Alur Data", "Data Flow")}
        </h2>

        <div id="so-submission" className="scroll-mt-32">
          <h3 className="text-sm font-bold text-base-content mb-3">
            {t("SO Submission Flow", "SO Submission Flow")}
          </h3>
          <div className="space-y-2">
            {[
              {
                step: "1",
                title: t("User mengisi form SO", "User fills SO form"),
                desc: t(
                  "Input stock utuh (S1), stock terbuka (S2), dan catatan.",
                  "Input whole stock (S1), opened stock (S2), and notes."
                ),
              },
              {
                step: "2",
                title: t("POST /api/so", "POST /api/so"),
                desc: t(
                  "Dispatcher merutekan ke so-service. Payload divalidasi.",
                  "Dispatcher routes to so-service. Payload is validated."
                ),
              },
              {
                step: "3",
                title: t("Validasi & Penulisan ke Sheets", "Validation & Write to Sheets"),
                desc: t(
                  "Data ditulis ke sheet SO_Transaksi di spreadsheet cabang.",
                  "Data is written to SO_Transaksi sheet in branch spreadsheet."
                ),
              },
              {
                step: "4",
                title: t("Generate XLSX", "Generate XLSX"),
                desc: t(
                  "Laporan Excel dibuat menggunakan ExcelJS.",
                  "Excel report is created using ExcelJS."
                ),
              },
              {
                step: "5",
                title: t("Upload ke Google Drive", "Upload to Google Drive"),
                desc: t(
                  "File diunggah ke folder Drive cabang terkait.",
                  "File is uploaded to the branch's Drive folder."
                ),
              },
              {
                step: "6",
                title: t("Return receipt + WA link", "Return receipt + WA link"),
                desc: t(
                  "Respons berisi data penerimaan dan link WhatsApp untuk dibagikan.",
                  "Response contains receipt data and WhatsApp link to share."
                ),
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-3 rounded-xl border border-base-300 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="text-xs font-bold text-base-content">
                    {item.title}
                  </p>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div id="report-generation" className="scroll-mt-32">
          <h3 className="text-sm font-bold text-base-content mb-3">
            {t("Report Generation", "Report Generation")}
          </h3>
          <div className="text-xs text-base-content/70 space-y-2">
            <p>
              {t(
                "Setelah SO disubmit, laporan XLSX di-generate dan disimpan ke Google Drive. File dapat diakses melalui:",
                "After SO is submitted, an XLSX report is generated and saved to Google Drive. The file can be accessed via:"
              )}
            </p>
            <ul className="list-disc list-inside space-y-1 text-base-content/60">
              <li>
                <code className="text-xs bg-base-200 px-1.5 py-0.5 rounded-lg">
                  /api/so/[laporanId]/xlsx
                </code>{" "}
                — {t("Download langsung", "Direct download")}
              </li>
              <li>
                <code className="text-xs bg-base-200 px-1.5 py-0.5 rounded-lg">
                  /api/so/[laporanId]/xlsx-file
                </code>{" "}
                — {t("Serve file", "Serve file")}
              </li>
              <li>
                <code className="text-xs bg-base-200 px-1.5 py-0.5 rounded-lg">
                  /api/so/[laporanId]/save-laporan
                </code>{" "}
                — {t("Simpan metadata laporan", "Save report metadata")}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Business Logic */}
      <section id="business-logic" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary" />
          {t("Logika Bisnis", "Business Logic")}
        </h2>

        <div id="threshold" className="scroll-mt-32">
          <h3 className="text-sm font-bold text-base-content mb-3">
            {t("Threshold & Status", "Threshold & Status")}
          </h3>
          <div className="text-xs text-base-content/70 space-y-3">
            <p>
              {t(
                "Setiap item di Master_Item memiliki threshold minimum. Sistem menentukan status stok berdasarkan stok gabungan (display + gudang):",
                "Each item in Master_Item has a minimum threshold. The system determines stock status based on combined stock (display + warehouse):"
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-error/20 bg-error/5 text-center">
                <p className="text-xs font-bold text-error">
                  {t("Kritis", "Critical")}
                </p>
                <p className="text-xs text-base-content/50 mt-1">
                  {t("Stok = 0", "Stock = 0")}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-warning/20 bg-warning/5 text-center">
                <p className="text-xs font-bold text-warning">
                  {t("Hampir Habis", "Low")}
                </p>
                <p className="text-xs text-base-content/50 mt-1">
                  {t("0 < Stok ≤ Threshold", "0 < Stock ≤ Threshold")}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-success/20 bg-success/5 text-center">
                <p className="text-xs font-bold text-success">
                  {t("Aman", "Safe")}
                </p>
                <p className="text-xs text-base-content/50 mt-1">
                  {t("Stok > Threshold", "Stock > Threshold")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Callout type="note">
          {t(
            "Jika threshold kosong (blank), status otomatis ditampilkan sebagai \"Tidak Dipantau\". Threshold diatur per-item oleh admin.",
            "If threshold is blank, status automatically shows \"Not Monitored\". Thresholds are set per-item by admins."
          )}
        </Callout>

        <div id="shift" className="scroll-mt-32">
          <h3 className="text-sm font-bold text-base-content mb-3">
            {t("Jenis Stok & Shift", "Stock Types & Shifts")}
          </h3>
          <div className="text-xs text-base-content/70 space-y-3">
            <p>
              {t(
                "Penghitungan stok menggunakan dua jenis stok (S1 dan S2) yang dihitung dua kali sehari:",
                "Stock counting uses two stock types (S1 and S2) counted twice daily:"
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                <p className="text-xs font-bold text-primary">S1 — Stock Utuh</p>
                <p className="text-xs text-base-content/50 mt-1">
                  {t(
                    "Stok dalam kemasan utuh / belum dibuka.",
                    "Stock in intact / unopened packaging."
                  )}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-info/20 bg-info/5">
                <p className="text-xs font-bold text-info">S2 — Stock Terbuka</p>
                <p className="text-xs text-base-content/50 mt-1">
                  {t(
                    "Stok yang sudah dibuka / dipakai sebagian.",
                    "Stock that has been opened / partially used."
                  )}
                </p>
              </div>
            </div>
            <p className="text-xs text-base-content/50">
              {t(
                "Penghitungan dilakukan saat shift Opening (pagi) dan shift Closing (malam). Total = S1 + S2.",
                "Counting is done during Opening shift (morning) and Closing shift (evening). Total = S1 + S2."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          {t("Integrasi", "Integrations")}
        </h2>

        <div id="google-sheets" className="scroll-mt-32">
          <h3 className="text-sm font-bold text-base-content mb-3">
            Google Sheets (Database)
          </h3>
          <div className="text-xs text-base-content/70 space-y-2">
            <p>
              {t(
                "Dua jenis spreadsheet digunakan:",
                "Two types of spreadsheets are used:"
              )}
            </p>
            <div className="p-3 rounded-xl border border-base-300 space-y-2">
              <p className="text-xs font-bold text-base-content">
                {t("Registry Spreadsheet", "Registry Spreadsheet")}
              </p>
              <ul className="text-xs text-base-content/60 space-y-1 list-disc list-inside">
                <li>
                  <code className="bg-base-200 px-1 py-0.5 rounded-lg">
                    Daftar_Cabang
                  </code>{" "}
                  — {t("ID cabang, nama, spreadsheet ID, folder Drive ID", "Branch ID, name, spreadsheet ID, Drive folder ID")}
                </li>
                <li>
                  <code className="bg-base-200 px-1 py-0.5 rounded-lg">
                    Users
                  </code>{" "}
                  — {t("ID user, username, PIN, nama, role, cabang ID", "User ID, username, PIN, name, role, branch ID")}
                </li>
                <li>
                  <code className="bg-base-200 px-1 py-0.5 rounded-lg">
                    Settings_Global
                  </code>{" "}
                  — {t("Pasangan key-value", "Key-value pairs")}
                </li>
                <li>
                  <code className="bg-base-200 px-1 py-0.5 rounded-lg">
                    Template_Referensi
                  </code>{" "}
                  — {t("ID spreadsheet template", "Template spreadsheet ID")}
                </li>
              </ul>
            </div>
            <div className="p-3 rounded-xl border border-base-300 space-y-2">
              <p className="text-xs font-bold text-base-content">
                {t("Per-Cabang Spreadsheet", "Per-Branch Spreadsheet")}
              </p>
              <ul className="text-xs text-base-content/60 space-y-1 list-disc list-inside">
                <li>
                  <code className="bg-base-200 px-1 py-0.5 rounded-lg">
                    Master_Item
                  </code>{" "}
                  — {t("Katalog barang dengan threshold", "Item catalog with thresholds")}
                </li>
                <li>
                  <code className="bg-base-200 px-1 py-0.5 rounded-lg">
                    SO_Transaksi
                  </code>{" "}
                  — {t("Catatan stock opname", "Stock opname records")}
                </li>
                <li>
                  <code className="bg-base-200 px-1 py-0.5 rounded-lg">
                    Laporan_PDF
                  </code>{" "}
                  — {t("Catatan laporan", "Report records")}
                </li>
                <li>
                  <code className="bg-base-200 px-1 py-0.5 rounded-lg">
                    Petugas
                  </code>{" "}
                  — {t("Staff tingkat cabang", "Branch-level staff")}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div id="google-drive" className="scroll-mt-32">
          <h3 className="text-sm font-bold text-base-content mb-3">
            Google Drive (File Storage)
          </h3>
          <p className="text-xs text-base-content/70">
            {t(
              "File XLSX laporan disimpan di folder Google Drive yang ditetapkan per cabang. Setiap cabang memiliki Folder_Drive_ID di sheet Daftar_Cabang.",
              "XLSX report files are saved in the Google Drive folder assigned per branch. Each branch has a Folder_Drive_ID in the Daftar_Cabang sheet."
            )}
          </p>
        </div>

        <div id="apps-script" className="scroll-mt-32">
          <h3 className="text-sm font-bold text-base-content mb-3">
            Google Apps Script (Fallback)
          </h3>
          <p className="text-xs text-base-content/70">
            {t(
              "Jika upload melalui Google Drive API gagal, sistem menggunakan Apps Script sebagai fallback. URL dikonfigurasi melalui environment variable APPS_SCRIPT_URL.",
              "If Google Drive API upload fails, the system uses Apps Script as a fallback. URL is configured via the APPS_SCRIPT_URL environment variable."
            )}
          </p>
        </div>

        <div id="whatsapp" className="scroll-mt-32">
          <h3 className="text-sm font-bold text-base-content mb-3">
            WhatsApp
          </h3>
          <p className="text-xs text-base-content/70">
            {t(
              "Setelah laporan selesai, sistem menghasilkan link WhatsApp (wa.me) yang berisi ringkasan laporan. Petugas cukup klik link untuk membagikan laporan ke grup.",
              "After a report is complete, the system generates a WhatsApp link (wa.me) containing a report summary. Staff only need to click the link to share the report to a group."
            )}
          </p>
        </div>

        <Callout type="tip">
          {t(
            "Link WhatsApp di-generate otomatis melalui endpoint /api/laporan/[laporanId]/wa-link. Status pengiriman dapat dilacak melalui /api/laporan/[laporanId]/status-wa.",
            "WhatsApp links are automatically generated via /api/laporan/[laporanId]/wa-link. Delivery status can be tracked via /api/laporan/[laporanId]/status-wa."
          )}
        </Callout>
      </section>

      {/* Roles & Permissions */}
      <section id="roles" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          {t("Role & Permissions", "Role & Permissions")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-3">
            <span className="badge badge-primary text-xs font-bold uppercase">
              Admin
            </span>
            <ul className="text-xs text-base-content/70 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                {t("Kelola Master Item (CRUD)", "Manage Master Items (CRUD)")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                {t("Kelola Cabang", "Manage Branches")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                {t("Kelola Petugas", "Manage Staff")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                {t("Kelola Users", "Manage Users")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                {t("Dashboard Analitik", "Analytics Dashboard")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                {t("Atur Threshold Item", "Set Item Thresholds")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                {t("Lihat Semua Laporan", "View All Reports")}
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-3">
            <span className="badge badge-info text-xs font-bold uppercase">
              Petugas
            </span>
            <ul className="text-xs text-base-content/70 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-info">✓</span>
                {t("Input Stock Opname", "Input Stock Opname")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-info">✓</span>
                {t("Lihat Laporan Sendiri", "View Own Reports")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-info">✓</span>
                {t("Share via WhatsApp", "Share via WhatsApp")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-error">✗</span>
                <span className="text-base-content/50">
                  {t("Tidak akses Master Item", "No Master Item access")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-error">✗</span>
                <span className="text-base-content/50">
                  {t("Tidak akses Dashboard", "No Dashboard access")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-error">✗</span>
                <span className="text-base-content/50">
                  {t("Tidak kelola Cabang", "Cannot manage Branches")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-error">✗</span>
                <span className="text-base-content/50">
                  {t("Tidak kelola Users", "Cannot manage Users")}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <Callout type="warning">
          {t(
            "Data di isolasi per cabang. Petugas hanya melihat data cabang yang ditugaskan. Admin dapat melihat semua cabang.",
            "Data is isolated per branch. Staff only see data for their assigned branch. Admin can view all branches."
          )}
        </Callout>
      </section>
    </DocsPage>
  );
}
