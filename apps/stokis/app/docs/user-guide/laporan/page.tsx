"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { useLanguage } from "@/lib/LanguageContext";
import {
  FileText,
  Search,
  Calendar,
  Clock,
  User,
  ExternalLink,
  RefreshCw,
  Table,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";

const toc = [
  { id: "overview", label: "Laporan", level: 1 },
  { id: "report-list", label: "Daftar Laporan", level: 2 },
  { id: "filters", label: "Filter & Pencarian", level: 2 },
  { id: "viewer", label: "Lihat di Aplikasi", level: 2 },
  { id: "xlsx", label: "File XLSX", level: 2 },
  { id: "regenerate", label: "Regenerate", level: 2 },
  { id: "whatsapp", label: "WhatsApp Sharing", level: 2 },
  { id: "status", label: "Status Kirim WA", level: 2 },
];

export default function LaporanGuidePage() {
  const { t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{ href: "/docs/user-guide/stock-opname", label: "Stock Opname (SO)", labelEn: "Stock Opname (SO)" }}
      next={{ href: "/docs/user-guide/dashboard", label: "Dashboard", labelEn: "Dashboard" }}
    >
      {/* Title */}
      <div id="overview" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("Laporan", "Reports")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Riwayat semua sesi Stock Opname yang telah disimpan, lengkap dengan file XLSX dan integrasi WhatsApp.",
            "History of all saved Stock Opname sessions, complete with XLSX files and WhatsApp integration."
          )}
        </p>
      </div>

      {/* Report List */}
      <section id="report-list" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {t("Daftar Laporan", "Report List")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Halaman Laporan menampilkan semua riwayat sesi SO yang telah disimpan untuk cabang aktif. Data ditampilkan dalam format tabel dengan kolom:",
            "The Reports page displays all saved SO session histories for the active branch. Data is displayed in a table format with columns:"
          )}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-base-200 border-b border-base-300">
              <tr className="font-semibold text-base-content/60">
                <th className="px-4 py-3">{t("Kolom", "Column")}</th>
                <th className="px-4 py-3">{t("Deskripsi", "Description")}</th>
              </tr>
            </thead>
            <tbody className="text-base-content">
              {[
                { col: "ID Laporan", desc: t("Identifier unik laporan sesi SO", "Unique identifier for the SO session report") },
                { col: t("Tanggal dan Shift", "Date & Shift"), desc: t("Tanggal operasional dan shift (Opening/Closing)", "Operational date and shift (Opening/Closing)") },
                { col: t("Waktu Dibuat", "Created At"), desc: t("Waktu saat data disimpan ke sistem", "Time when data was saved to the system") },
                { col: "Petugas", desc: t("Nama petugas yang mengisi sesi SO", "Name of staff who filled the SO session") },
                { col: t("Kritis", "Critical"), desc: t("Jumlah item dengan status Kritis (badge merah)", "Number of items with Critical status (red badge)") },
                { col: t("Hampir Habis", "Low Stock"), desc: t("Jumlah item dengan status Hampir Habis (badge kuning)", "Number of items with Low Stock status (yellow badge)") },
                { col: t("Status WhatsApp", "WhatsApp Status"), desc: t("Sudah Dikirim atau Belum", "Sent or Not Yet") },
                { col: t("Aksi", "Actions"), desc: t("Lihat laporan di aplikasi, unduh XLSX/PDF, edit, regenerate, atau bagikan ke WhatsApp", "View reports in-app, download XLSX/PDF, edit, regenerate, or share to WhatsApp") },
              ].map((row) => (
                <tr key={row.col} className="border-b border-base-300">
                  <td className="px-4 py-3 font-semibold text-xs">{row.col}</td>
                  <td className="px-4 py-3 text-xs text-base-content/60">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Filters */}
      <section id="filters" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          {t("Filter & Pencarian", "Search & Filters")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Gunakan filter untuk mempersempit hasil pencarian laporan:",
            "Use filters to narrow down report search results:"
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Filter Tanggal", "Date Filter")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Pilih tanggal spesifik untuk melihat laporan pada hari tersebut.",
                  "Select a specific date to view reports from that day."
                )}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Filter Shift", "Shift Filter")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  'Pilih "Semua Shift", "Opening", atau "Closing".',
                  'Select "All Shifts", "Opening", or "Closing".'
                )}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Pencarian Petugas", "Staff Search")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Ketik nama petugas untuk filter berdasarkan pencatat. Pencarian menggunakan debounce 300ms.",
                  "Type staff name to filter by recorder. Search uses 300ms debounce."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lihat di Aplikasi */}
      <section id="viewer" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {t("Lihat Laporan di Aplikasi", "View Reports In-App")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Setiap laporan dapat dilihat langsung di aplikasi tanpa mengunduh file, dengan klik tombol 'Lihat' (ikon mata) pada baris laporan. Halaman ini menampilkan representasi read-only isi laporan, dikelompokkan per area, dengan warna status yang sama seperti file XLSX.",
            "Each report can be viewed directly in the app without downloading a file, by clicking the 'View' (eye icon) button on the report row. This page shows a read-only representation of the report, grouped by area, with the same status colors as the XLSX file."
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Isi Tampilan", "What Is Shown")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Item per area, nilai stok sesuai tipe (S1/S2, status isi, tanggal, atau keterangan), status threshold (Kritis / Hampir Habis / Aman), dan ringkasan jumlah kritis di header.",
                  "Items per area, stock values per type (S1/S2, fill status, dates, or notes), threshold status (Critical / Low Stock / Safe), and a critical-count summary in the header."
                )}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ExternalLink className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Bukan Pengganti File", "Not a File Replacement")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Viewer hanya untuk cek cepat. Tombol 'Unduh XLSX' dan 'Unduh PDF' tetap tersedia di halaman viewer untuk export, print, atau berbagi.",
                  "The viewer is for quick checks only. The 'Unduh XLSX' and 'Unduh PDF' buttons remain available on the viewer page for export, printing, or sharing."
                )}
              </p>
            </div>
          </div>
        </div>

        <Callout type="tip">
          {t(
            "Perubahan data laporan tetap dilakukan lewat tombol 'Edit' yang mengarah ke halaman edit — viewer bersifat read-only.",
            "Report data changes are still made via the 'Edit' button which goes to the edit page — the viewer is read-only."
          )}
        </Callout>
      </section>

      {/* XLSX */}
      <section id="xlsx" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Table className="w-5 h-5 text-primary" />
          {t("File XLSX", "XLSX Files")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Setiap sesi SO yang berhasil di-submit akan menghasilkan file XLSX yang disimpan di Google Drive. File ini berisi:",
            "Each successfully submitted SO session will generate an XLSX file saved in Google Drive. This file contains:"
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <span className="badge badge-primary text-xs font-bold uppercase">XLSX</span>
            <p className="text-xs text-base-content/60">
              {t(
                "Data lengkap per item: nama barang, satuan, area, S1 (stock utuh), S2 (stock terbuka), total, pemakaian (MINES jika berkurang / PLUS jika bertambah), threshold, status, dan keterangan.",
                "Complete data per item: item name, unit, area, S1 (whole stock), S2 (opened stock), total, usage (MINES if decreased / PLUS if increased), threshold, status, and notes."
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <span className="badge badge-success text-xs font-bold uppercase">Google Drive</span>
            <p className="text-xs text-base-content/60">
              {t(
                "File tersimpan otomatis di folder Drive cabang. Klik ikon Table pada tabel laporan untuk membuka langsung.",
                "File is automatically saved in the branch Drive folder. Click the Table icon in the report table to open directly."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Regenerate */}
      <section id="regenerate" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary" />
          {t("Regenerate File", "Regenerate File")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Jika file XLSX perlu dibuat ulang (misal karena perubahan data atau file rusak), klik ikon regenerate (RefreshCw) pada baris laporan. Sistem akan:",
            "If the XLSX file needs to be regenerated (e.g., due to data changes or corrupted file), click the regenerate icon (RefreshCw) on the report row. The system will:"
          )}
        </p>

        <div className="space-y-3">
          {[
            t("Membaca ulang data SO dari Google Sheets", "Re-read SO data from Google Sheet"),
            t("Generate ulang file XLSX dengan data terbaru", "Regenerate XLSX file with latest data"),
            t("Upload file baru ke Google Drive", "Upload new file to Google Drive"),
            t("Update link XLSX di database laporan", "Update XLSX link in the report database"),
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-xs text-base-content/70">{step}</p>
            </div>
          ))}
        </div>

        <Callout type="warning">
          {t(
            "Regenerate hanya tersedia jika file XLSX sebelumnya tidak ditemukan di Google Drive atau link tidak valid.",
            "Regenerate is only available if the previous XLSX file is not found in Google Drive or the link is invalid."
          )}
        </Callout>
      </section>

      {/* WhatsApp */}
      <section id="whatsapp" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-success" />
          {t("WhatsApp Sharing", "WhatsApp Sharing")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Klik ikon Share (Share2) pada baris laporan untuk membuka template pesan WhatsApp. Template berisi:",
            "Click the Share icon on the report row to open the WhatsApp message template. Template contains:"
          )}
        </p>

        <div className="p-4 rounded-xl border border-success/20 bg-success/5 space-y-2">
          <ul className="text-xs text-base-content/70 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">•</span>
              <span>{t("Nama cabang", "Branch name")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">•</span>
              <span>{t("Tanggal dan shift", "Date and shift")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">•</span>
              <span>{t("Total item terhitung", "Total counted items")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">•</span>
              <span>{t("Jumlah item kritis dan hampir habis", "Critical and low stock item counts")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">•</span>
              <span>{t("Link file XLSX di Google Drive", "XLSX file link on Google Drive")}</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Status */}
      <section id="status" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          {t("Status Kirim WA", "WA Send Status")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Setelah Anda mengirim pesan WhatsApp, status pada kolom 'Status WhatsApp' akan berubah menjadi 'Sudah Dikirim'. Status ini juga terlihat di halaman Struk Transaksi.",
            "After you send the WhatsApp message, the status in the 'WhatsApp Status' column will change to 'Sent'. This status is also visible on the Transaction Receipt page."
          )}
        </p>

        <Callout type="note">
          {t(
            "Status dikirim secara otomatis ke backend setelah Anda menekan kirim di WhatsApp. Tidak perlu konfirmasi manual.",
            "Status is automatically sent to the backend after you press send on WhatsApp. No manual confirmation needed."
          )}
        </Callout>
      </section>
    </DocsPage>
  );
}
