"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { useLanguage } from "@/lib/LanguageContext";
import {
  PlusCircle,
  Edit2,
  Folder,
  FileSpreadsheet,
  Shield,
  CheckCircle2,
  Store,
} from "lucide-react";

const toc = [
  { id: "overview", label: "Manajemen Cabang", level: 1 },
  { id: "add-branch", label: "Menambah Cabang", level: 2 },
  { id: "edit-branch", label: "Mengedit Cabang", level: 2 },
  { id: "data-isolation", label: "Isolasi Data", level: 2 },
  { id: "spreadsheet", label: "Spreadsheet & Drive", level: 2 },
  { id: "toggle-active", label: "Aktif/Nonaktif", level: 2 },
  { id: "admin-only", label: "Akses Admin", level: 2 },
];

export default function CabangGuidePage() {
  const { lang, t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{ href: "/docs/user-guide/master-item", label: "Master Item", labelEn: "Master Items" }}
      next={{ href: "/docs/user-guide/petugas", label: "Petugas", labelEn: "Staff" }}
    >
      {/* Title */}
      <div id="overview" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("Manajemen Cabang", "Branch Management")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Administrasi cabang operasional dengan data terisolasi per cabang.",
            "Branch administration with per-branch data isolation."
          )}
        </p>
      </div>

      <Callout type="important">
        {t(
          "Menu Cabang hanya dapat diakses oleh pengguna dengan role Admin. Petugas tidak memiliki akses ke menu ini.",
          "Branch menu can only be accessed by users with the Admin role. Staff do not have access to this menu."
        )}
      </Callout>

      {/* Add Branch */}
      <section id="add-branch" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-primary" />
          {t("Menambah Cabang Baru", "Adding a New Branch")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            'Klik tombol "Tambah Cabang Baru" untuk membuka form. Saat menambah cabang baru, sistem akan secara otomatis:',
            'Click "Add New Branch" button to open the form. When adding a new branch, the system will automatically:'
          )}
        </p>

        <div className="space-y-3">
          {[
            {
              num: "1",
              title: t("Menyalin Template Spreadsheet", "Copy Spreadsheet Template"),
              desc: t("Google Sheets baru dibuat dari template yang sudah ada.", "New Google Sheet is created from an existing template."),
            },
            {
              num: "2",
              title: t("Membuat Folder Google Drive", "Create Google Drive Folder"),
              desc: t("Folder baru dibuat khusus untuk menyimpan file XLSX laporan cabang ini.", "New folder is created specifically for storing XLSX reports for this branch."),
            },
            {
              num: "3",
              title: t("Menyimpan Link", "Save Links"),
              desc: t("Spreadsheet_ID dan Folder_Drive_ID disimpan ke database cabang.", "Spreadsheet_ID and Folder_Drive_ID are saved to the branch database."),
            },
          ].map((step) => (
            <div
              key={step.num}
              className="p-4 rounded-xl border border-base-300 flex items-start gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold flex-shrink-0">
                {step.num}
              </div>
              <div>
                <h3 className="text-xs font-bold text-base-content">{step.title}</h3>
                <p className="text-xs text-base-content/60 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Callout type="tip">
          {t(
            "Proses pembuatan spreadsheet dan folder Drive membutuhkan beberapa detik. Tunggu hingga proses selesai sebelum menutup form.",
            "Creating the spreadsheet and Drive folder takes a few seconds. Wait for the process to complete before closing the form."
          )}
        </Callout>
      </section>

      {/* Edit Branch */}
      <section id="edit-branch" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-primary" />
          {t("Mengedit Cabang", "Editing Branch")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Klik ikon Edit (Edit2) pada baris cabang untuk mengubah informasi. Field yang dapat diubah:",
            "Click the Edit icon (Edit2) on the branch row to change information. Editable fields:"
          )}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-base-200 border-b border-base-300">
              <tr className="font-semibold text-base-content/60">
                <th className="px-4 py-3">{t("Field", "Field")}</th>
                <th className="px-4 py-3">{t("Deskripsi", "Description")}</th>
              </tr>
            </thead>
            <tbody className="text-base-content">
              {[
                {
                  field: t("Nama Cabang", "Branch Name"),
                  desc: t("Nama tampilan cabang di navbar switcher dan laporan", "Branch display name in navbar switcher and reports"),
                },
                {
                  field: t("Alamat", "Address"),
                  desc: t("Alamat lengkap lokasi cabang (opsional)", "Full branch location address (optional)"),
                },
                {
                  field: t("PIC Nama", "PIC Name"),
                  desc: t("Nama penanggung jawab cabang (opsional)", "Branch person-in-charge name (optional)"),
                },
                {
                  field: t("Nomor WA Cabang", "Branch WA Number"),
                  desc: t("Nomor WhatsApp untuk distribusi laporan (opsional)", "WhatsApp number for report distribution (optional)"),
                },
              ].map((row) => (
                <tr key={row.field} className="border-b border-base-300">
                  <td className="px-4 py-3 font-semibold text-xs">{row.field}</td>
                  <td className="px-4 py-3 text-xs text-base-content/60">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Data Isolation */}
      <section id="data-isolation" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {t("Isolasi Data", "Data Isolation")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Setiap cabang memiliki data yang terisolasi penuh. Tidak ada data yang tumpang tindih antar cabang.",
            "Each branch has fully isolated data. There is no data overlap between branches."
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("Spreadsheet Terpisah", "Separate Spreadsheets")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Setiap cabang memiliki Google Sheets sendiri. Data SO dan master item tidak bercampur dengan cabang lain.",
                "Each branch has its own Google Sheet. SO data and master items do not mix with other branches."
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("Folder Drive Terpisah", "Separate Drive Folders")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "File XLSX laporan disimpan di folder Drive khusus cabang. Tidak ada akses silang antar cabang.",
                "Report XLSX files are stored in a branch-specific Drive folder. No cross-branch access."
              )}
            </p>
          </div>
        </div>

        <Callout type="note">
          {t(
            "Petugas hanya dapat melihat data cabang yang telah ditetapkan oleh admin. Switcher di navbar hanya menampilkan cabang yang diakses.",
            "Staff can only see data for branches assigned by the admin. The navbar switcher only shows accessible branches."
          )}
        </Callout>
      </section>

      {/* Spreadsheet & Drive */}
      <section id="spreadsheet" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          {t("Spreadsheet & Google Drive", "Spreadsheet & Google Drive")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Pada tabel cabang, terdapat badge yang menaut langsung ke Google Sheets dan Google Drive folder cabang:",
            "In the branch table, there are badges that link directly to the branch's Google Sheet and Google Drive folder:"
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-success/20 bg-success/5 space-y-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-success" />
              <span className="badge badge-success text-xs font-bold uppercase">Sheets</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Tautan ke spreadsheet Google Sheets milik cabang. Klik untuk membuka langsung.",
                "Link to the branch's Google Sheet. Click to open directly."
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-primary" />
              <span className="badge badge-primary text-xs font-bold uppercase">Drive</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Tautan ke folder Google Drive cabang. Semua file XLSX laporan tersimpan di sini.",
                "Link to the branch's Google Drive folder. All XLSX report files are stored here."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Toggle Active */}
      <section id="toggle-active" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          {t("Aktif / Nonaktif", "Active / Inactive")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Cabang dapat diaktifkan atau dinonaktifkan. Cabang nonaktif tidak akan muncul di switcher navbar untuk petugas, tetapi data tetap tersimpan.",
            "Branches can be activated or deactivated. Inactive branches will not appear in the navbar switcher for staff, but data remains saved."
          )}
        </p>

        <Callout type="warning">
          {t(
            "Nonaktifkan cabang hanya jika cabang sudah tidak beroperasi. Semua data historis tetap tersimpan dan dapat diaktifkan kembali.",
            "Deactivate a branch only if it is no longer operational. All historical data remains saved and can be reactivated."
          )}
        </Callout>
      </section>

      {/* Admin Only */}
      <section id="admin-only" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {t("Akses Admin", "Admin Access")}
        </h2>

        <div className="p-4 rounded-xl border border-base-300 space-y-2">
          <p className="text-xs text-base-content/70">
            {t(
              "Hanya admin yang dapat mengelola cabang. Fitur yang tersedia untuk admin:",
              "Only admins can manage branches. Features available to admins:"
            )}
          </p>
          <ul className="text-xs text-base-content/60 space-y-1">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Menambah cabang baru (otomatis buat spreadsheet & Drive)", "Add new branch (auto-create spreadsheet & Drive)")}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Mengedit informasi cabang", "Edit branch information")}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Mengaktifkan/menonaktifkan cabang", "Activate/deactivate branches")}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Membuka spreadsheet dan folder Drive langsung", "Open spreadsheet and Drive folder directly")}</span>
            </li>
          </ul>
        </div>
      </section>
    </DocsPage>
  );
}
