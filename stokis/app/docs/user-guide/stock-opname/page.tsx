"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { useLanguage } from "@/lib/LanguageContext";
import {
  ClipboardCheck,
  Calendar,
  Clock,
  User,
  Search,
  Send,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  StickyNote,
  Hash,
  Layers,
  FileSpreadsheet,
  MessageCircle,
} from "lucide-react";

const toc = [
  { id: "overview", label: "Stock Opname (SO)", level: 1 },
  { id: "gate", label: "Konfirmasi Cabang & Shift", level: 2 },
  { id: "session-header", label: "Header Sesi", level: 2 },
  { id: "counting", label: "Menghitung Stok", level: 2 },
  { id: "s1-s2", label: "Lokasi S1 & S2", level: 2 },
  { id: "threshold", label: "Sistem Threshold", level: 2 },
  { id: "submit", label: "Submit & Laporan", level: 2 },
  { id: "draft", label: "Auto-Save Draft", level: 2 },
  { id: "receipt", label: "Struk Transaksi", level: 2 },
  { id: "whatsapp", label: "WhatsApp Sharing", level: 2 },
];

export default function StockOpnameGuidePage() {
  const { t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{ href: "/docs/user-guide", label: "Panduan Pengguna", labelEn: "User Guide" }}
      next={{ href: "/docs/user-guide/laporan", label: "Laporan", labelEn: "Reports" }}
    >
      {/* Title */}
      <div id="overview" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("Stock Opname (SO)", "Stock Opname (SO)")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Formulir input stok fisik barang dengan alur multi-langkah dan auto-save draft.",
            "Physical stock input form with multi-step flow and auto-save draft."
          )}
        </p>
      </div>

      <Callout type="note">
        {t(
          "Fitur ini dapat diakses oleh admin dan petugas. Pilih cabang aktif terlebih dahulu melalui switcher di navbar.",
          "This feature is accessible to both admin and staff. Select an active branch first via the navbar switcher."
        )}
      </Callout>

      {/* Konfirmasi Cabang & Shift */}
      <section id="gate" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          {t("Konfirmasi Cabang & Shift", "Branch & Shift Confirmation")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Setiap kali membuka halaman Input SO, muncul popup 2 langkah untuk mengonfirmasi cabang dan shift sebelum mulai mengisi. Popup ini muncul setiap masuk (termasuk refresh), untuk mencegah laporan tersubmit ke cabang atau shift yang salah.",
            "Every time the SO Input page is opened, a 2-step popup appears to confirm the branch and shift before counting. The popup shows on every entry (including refresh), to prevent reports from being submitted to the wrong branch or shift."
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Langkah 1 — Pilih Cabang", "Step 1 — Select Branch")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Cabang yang dipilih terakhir otomatis tampil sebagai pilihan awal. Tinggal konfirmasi, atau ganti ke cabang lain.",
                  "The last selected branch is pre-filled. Just confirm it, or switch to another branch."
                )}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Langkah 2 — Pilih Shift", "Step 2 — Select Shift")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Pilih Opening atau Closing. Tombol untuk melanjutkan baru aktif setelah shift dipilih.",
                  "Choose Opening or Closing. The button to continue only activates after a shift is selected."
                )}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <AlertTriangle className="w-4 h-4 text-warning" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Interaksi dengan Draft", "Interaction with Drafts")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Jika ada draft tersimpan untuk kombinasi cabang+shift lain, muncul peringatan bahwa draft tersebut akan diabaikan.",
                  "If a saved draft exists for a different branch+shift combination, a warning appears that the draft will be ignored."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Session Header */}
      <section id="session-header" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          {t("Header Sesi", "Session Header")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Setiap sesi SO dimulai dengan mengisi informasi sesi:",
            "Each SO session starts by filling in session information:"
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Tanggal Operasional", "Operational Date")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Tanggal efektif pencatatan stok. Default ke hari ini.",
                  "Effective date for stock recording. Defaults to today."
                )}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Shift Kerja", "Work Shift")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Pilih Opening (pagi) atau Closing (sore/malam). Digunakan untuk membedakan sesi dalam satu hari.",
                  "Select Opening (morning) or Closing (evening/night). Used to distinguish sessions within a day."
                )}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Petugas", "Staff")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Nama petugas diambil otomatis dari akun yang sedang login. Tidak dapat diubah.",
                  "Staff name is automatically taken from the logged-in account. Cannot be changed."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Counting */}
      <section id="counting" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          {t("Menghitung Stok", "Counting Stock")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Setelah header sesi terisi, sistem akan memuat daftar semua item aktif dari Master Item. Item dikelompokkan berdasarkan area penempatan (misal: Meja Biru Depan, Chiller, Freezer, dll).",
            "After the session header is filled, the system loads all active items from Master Items. Items are grouped by placement area (e.g., Front Blue Table, Chiller, Freezer, etc)."
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("Pencarian & Filter", "Search & Filter")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Gunakan kolom pencarian untuk mencari barang berdasarkan nama atau ID item. Filter area untuk mempersempit tampilan ke area tertentu.",
                "Use the search field to find items by name or item ID. Filter by area to narrow the view to a specific area."
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("Input Angka", "Number Input")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Masukkan jumlah stok fisik yang ditemukan di setiap lokasi. Total dihitung otomatis (Total = S1 + S2).",
                "Enter the physical stock count found at each location. Total is calculated automatically (Total = S1 + S2)."
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("Keterangan (Opsional)", "Notes (Optional)")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Tambahkan catatan untuk item tertentu jika diperlukan, misal: 'Barang rusak', 'Sedang dalam pengiriman'.",
                "Add notes for specific items if needed, e.g., 'Damaged goods', 'Pending delivery'."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* S1 & S2 */}
      <section id="s1-s2" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          {t("Lokasi S1 & S2", "Locations S1 & S2")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Setiap item memiliki dua jenis stok yang dihitung secara terpisah:",
            "Each item has two types of stock counted separately:"
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <span className="badge badge-primary text-xs font-bold uppercase">
              {t("S1 — Stock Utuh", "S1 — Whole Stock")}
            </span>
            <p className="text-xs text-base-content/60 leading-relaxed">
              {t(
                "Jumlah stok dalam kemasan utuh / belum dibuka. Misal: dus belum dibuka, bungkus belum terjual, stok cadangan dalam kemasan asli.",
                "Stock count in intact / unopened packaging. Examples: unopened boxes, unsold sealed packages, reserve stock in original packaging."
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-info/20 bg-info/5 space-y-2">
            <span className="badge badge-info text-xs font-bold uppercase">
              {t("S2 — Stock Terbuka", "S2 — Opened Stock")}
            </span>
            <p className="text-xs text-base-content/60 leading-relaxed">
              {t(
                "Jumlah stok yang sudah dibuka / dipakai sebagian. Misal: produk sudah dibuka untuk display, sisa stok di rak yang tidak utuh lagi.",
                "Stock count that has been opened / partially used. Examples: products opened for display, remaining shelf stock that is no longer intact."
              )}
            </p>
          </div>
        </div>

        <Callout type="tip">
          {t(
            "Total stok = S1 + S2. Kolom total dihitung otomatis oleh sistem berdasarkan input S1 dan S2.",
            "Total stock = S1 + S2. The total column is automatically calculated by the system based on S1 and S2 inputs."
          )}
        </Callout>
      </section>

      {/* Threshold */}
      <section id="threshold" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          {t("Sistem Threshold", "Threshold System")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Setiap item memiliki threshold minimum (batas minimum stok) yang ditentukan oleh admin di Master Item. Sistem secara otomatis menentukan status stok berdasarkan perbandingan Total dengan threshold:",
            "Each item has a minimum threshold set by the admin in Master Items. The system automatically determines stock status based on comparing Total with the threshold:"
          )}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-base-200 border-b border-base-300">
              <tr className="font-semibold text-base-content/60">
                <th className="px-4 py-3">{t("Status", "Status")}</th>
                <th className="px-4 py-3">{t("Kondisi", "Condition")}</th>
                <th className="px-4 py-3">{t("Badge", "Badge")}</th>
              </tr>
            </thead>
            <tbody className="text-base-content">
              <tr className="border-b border-base-300">
                <td className="px-4 py-3">
                  <span className="badge badge-error gap-1 text-xs font-bold">
                    <AlertCircle className="w-3 h-3" />
                    {t("Kritis", "Critical")}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {t("Total ≤ Threshold", "Total ≤ Threshold")}
                </td>
                <td className="px-4 py-3">
                  <span className="badge badge-error text-xs">{t("Merah", "Red")}</span>
                </td>
              </tr>
              <tr className="border-b border-base-300">
                <td className="px-4 py-3">
                  <span className="badge badge-warning gap-1 text-xs font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    {t("Hampir Habis", "Low Stock")}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {t("Threshold < Total ≤ Threshold × 2", "Threshold < Total ≤ Threshold × 2")}
                </td>
                <td className="px-4 py-3">
                  <span className="badge badge-warning text-xs">{t("Kuning", "Yellow")}</span>
                </td>
              </tr>
              <tr className="border-b border-base-300">
                <td className="px-4 py-3">
                  <span className="badge badge-success gap-1 text-xs font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    {t("Aman", "Safe")}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {t("Total > Threshold × 2", "Total > Threshold × 2")}
                </td>
                <td className="px-4 py-3">
                  <span className="badge badge-success text-xs">{t("Hijau", "Green")}</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <span className="badge badge-ghost gap-1 text-xs font-medium">
                    <HelpCircle className="w-3 h-3" />
                    {t("Tidak Dipantau", "Not Monitored")}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {t("Threshold = 0 atau tidak diatur", "Threshold = 0 or not set")}
                </td>
                <td className="px-4 py-3">
                  <span className="badge badge-ghost text-xs">{t("Abu-abu", "Gray")}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Callout type="warning">
          {t(
            "Status Kritis akan muncul di laporan sebagai item yang perlu segera di-restock. Admin dapat mengatur threshold per item di menu Master Item.",
            "Critical status will appear in reports as items that need immediate restocking. Admin can set threshold per item in the Master Items menu."
          )}
        </Callout>
      </section>

      {/* Submit */}
      <section id="submit" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          {t("Submit & Laporan", "Submit & Reports")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Setelah semua item dihitung, klik tombol 'Simpan & Buat Laporan'. Sistem akan:",
            "After all items are counted, click 'Save & Generate Report'. The system will:"
          )}
        </p>

        <div className="space-y-3">
          {[
            {
              num: "1",
              title: t("Simpan Data SO", "Save SO Data"),
              desc: t("Data stok fisik disimpan ke Google Sheets cabang.", "Physical stock data is saved to the branch Google Sheet."),
            },
            {
              num: "2",
              title: t("Buat Catatan Laporan", "Create Report Record"),
              desc: t("Laporan record dibuat dengan metadata sesi.", "Report record is created with session metadata."),
            },
            {
              num: "3",
              title: t("Generate File XLSX", "Generate XLSX File"),
              desc: t("File Excel di-generate, diupload ke Google Drive, dan link disimpan.", "Excel file is generated, uploaded to Google Drive, and link is saved."),
            },
            {
              num: "4",
              title: t("Verifikasi & Redirect", "Verify & Redirect"),
              desc: t("Sistem memverifikasi link XLSX tersimpan, lalu redirect ke halaman struk.", "System verifies XLSX link is saved, then redirects to receipt page."),
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

        <Callout type="note">
          {t(
            "Sebelum submit, muncul modal ringkasan yang menampilkan jumlah item per status (Kritis, Hampir Habis, Aman). Periksa ringkasan ini sebelum mengkonfirmasi submit.",
            "Before submit, a summary modal appears showing item counts per status (Critical, Low Stock, Safe). Review this summary before confirming submit."
          )}
        </Callout>
      </section>

      {/* Draft */}
      <section id="draft" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          {t("Auto-Save Draft", "Auto-Save Draft")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Sistem menyimpan draft otomatis ke localStorage browser setiap Anda mengisi angka. Draft disimpan per cabang.",
            "The system automatically saves drafts to browser localStorage every time you enter numbers. Drafts are saved per branch."
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <h3 className="text-xs font-bold text-base-content">{t("Kapan Draft Disimpan?", "When is Draft Saved?")}</h3>
            <p className="text-xs text-base-content/60">
              {t(
                "Draft disimpan secara otomatis dengan debounce 400ms setiap Anda mengubah angka stok. Jika browser tertutup atau HP mati, data tetap tersimpan.",
                "Draft is automatically saved with 400ms debounce every time you change stock numbers. If the browser closes or phone dies, data remains saved."
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <h3 className="text-xs font-bold text-base-content">{t("Memulihkan Draft", "Restoring Draft")}</h3>
            <p className="text-xs text-base-content/60">
              {t(
                'Ketika membuka halaman Input SO dengan draft tersimpan, muncul banner peringatan. Klik "Lanjutkan" untuk memulihkan data atau "Buang & Mulai Baru" untuk menghapus draft.',
                'When opening the Input SO page with a saved draft, a warning banner appears. Click "Continue" to restore data or "Discard & Start New" to delete the draft.'
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <h3 className="text-xs font-bold text-base-content">{t("Kapan Draft Dihapus?", "When is Draft Deleted?")}</h3>
            <p className="text-xs text-base-content/60">
              {t(
                "Draft dihapus otomatis setelah submit berhasil atau saat Anda memilih 'Buang & Mulai Baru'.",
                "Draft is automatically deleted after successful submit or when you choose 'Discard & Start New'."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Receipt */}
      <section id="receipt" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          {t("Struk Transaksi", "Transaction Receipt")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Setelah submit berhasil, Anda akan diarahkan ke halaman struk transaksi. Halaman ini berisi:",
            "After a successful submit, you will be redirected to the transaction receipt page. This page contains:"
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-xs font-bold text-base-content">{t("Detail Laporan", "Report Details")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "ID Laporan, tanggal, shift, petugas, jumlah item kritis, dan jumlah item hampir habis.",
                "Report ID, date, shift, staff, critical item count, and low stock item count."
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-success" />
              <span className="text-xs font-bold text-base-content">{t("Link XLSX", "XLSX Link")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Tombol untuk membuka file XLSX langsung di Google Drive.",
                "Button to open the XLSX file directly in Google Drive."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* WhatsApp */}
      <section id="whatsapp" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-success" />
          {t("WhatsApp Sharing", "WhatsApp Sharing")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Dari halaman struk, Anda dapat langsung membagikan laporan ke grup WhatsApp. Klik tombol 'Siapkan Pesan WhatsApp' untuk membuka template pesan.",
            "From the receipt page, you can share the report directly to a WhatsApp group. Click 'Prepare WhatsApp Message' to open the message template."
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <h3 className="text-xs font-bold text-base-content">{t("Template Pesan", "Message Template")}</h3>
            <p className="text-xs text-base-content/60">
              {t(
                "Template pesan berisi informasi: nama cabang, tanggal, shift, total item, jumlah kritis, jumlah hampir habis, dan link file XLSX.",
                "Message template contains: branch name, date, shift, total items, critical count, low stock count, and XLSX file link."
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <h3 className="text-xs font-bold text-base-content">{t("Status Pengiriman", "Send Status")}</h3>
            <p className="text-xs text-base-content/60">
              {t(
                "Status 'Sudah Dikirim' ditandai otomatis setelah Anda mengirim pesan. Status ini terlihat di halaman Laporan.",
                "Status 'Sent' is automatically marked after you send the message. This status is visible on the Reports page."
              )}
            </p>
          </div>
        </div>

        <Callout type="tip">
          {t(
            "Anda juga dapat membagikan laporan dari halaman Riwayat Laporan dengan mengklik ikon Share pada baris laporan yang diinginkan.",
            "You can also share reports from the Report History page by clicking the Share icon on the desired report row."
          )}
        </Callout>
      </section>
    </DocsPage>
  );
}
